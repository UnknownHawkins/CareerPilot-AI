import { db } from '../config/database';
import { users, interviewSessions } from '../models/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { GroqService, InterviewFeedback } from './groqService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';
import { v4 as uuidv4 } from 'uuid';
import { hasProAccess } from '../middleware/auth';
import { SubscriptionService } from './subscriptionService';

export class InterviewService {
  static async createSession(
    userId: string,
    sessionType: 'practice' | 'mock' | 'assessment',
    jobRole: string,
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive',
    industry: string,
    skills: string[]
  ) {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const isPro = hasProAccess(user);
      
      if (!isPro && sessionType !== 'practice') {
        throw ApiError.forbidden('Pro subscription required for this interview type');
      }

      const hasAccess = await SubscriptionService.checkFeatureAccess(userId, 'interviews');
      if (!hasAccess) {
        throw ApiError.forbidden('Interview limit reached. Upgrade to Pro for unlimited interviews.');
      }

      const questionCount = isPro ? 10 : 3;
      
      const questions = await GroqService.generateInterviewQuestions(
        jobRole,
        experienceLevel,
        industry,
        skills,
        questionCount
      );

      const questionsWithIds = questions.map((q: any) => ({
        ...q,
        id: uuidv4(),
      }));

      const [session] = await db.insert(interviewSessions).values({
        userId,
        status: 'in-progress',
        jobRole,
        company: '',
        difficulty: experienceLevel === 'entry' ? 'beginner' : (experienceLevel === 'executive' ? 'advanced' : 'intermediate'),
        industry,
        skills,
        questions: questionsWithIds,
        startTime: new Date().toISOString()
      } as any).returning();

      if (!isPro) {
        await SubscriptionService.incrementUsage(userId, 'interviews');
      }

      logger.info(`Interview session created for user ${userId}. Session ID: ${session._id}`);

      return session;
    } catch (error) {
      logger.error('Create interview session error:', error);
      throw error;
    }
  }

  static async getSessionById(
    sessionId: string,
    userId: string
  ) {
    try {
      const [session] = await db.select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions._id, sessionId), eq(interviewSessions.userId, userId)))
        .limit(1);

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      return session;
    } catch (error) {
      logger.error('Get interview session error:', error);
      throw error;
    }
  }

  static async getUserSessions(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const offset = (page - 1) * limit;

      const sessions = await db.select()
        .from(interviewSessions)
        .where(eq(interviewSessions.userId, userId))
        .orderBy(desc(interviewSessions.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db.select({ count: count() })
        .from(interviewSessions)
        .where(eq(interviewSessions.userId, userId));

      return { sessions, total };
    } catch (error) {
      logger.error('Get user interview sessions error:', error);
      throw error;
    }
  }

  static async submitAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    answer: string,
    timeTaken: number
  ) {
    try {
      let [session] = await db.select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions._id, sessionId), eq(interviewSessions.userId, userId)))
        .limit(1);

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      if (session.status !== 'in-progress') {
        throw ApiError.badRequest('Interview session is not active');
      }

      const questions = [...(session.questions || [])];
      const questionIndex = questions.findIndex((q: any) => q.id === questionId);
      
      if (questionIndex === -1) {
        throw ApiError.notFound('Question not found');
      }

      const question = questions[questionIndex];

      if (question.userAnswer) {
        throw ApiError.badRequest('Question already answered');
      }

      const q = question as any;
      const feedback = await GroqService.analyzeInterviewAnswer(
        q.text || q.question,
        answer,
        q.expectedAnswerPoints || [],
        q.category || q.type
      );

      questions[questionIndex] = {
        ...question,
        userAnswer: answer,
        feedback: feedback as any,
        duration: timeTaken,
        timestamp: new Date().toISOString()
      };

      [session] = await db.update(interviewSessions)
        .set({ questions })
        .where(eq(interviewSessions._id, sessionId))
        .returning();

      logger.info(`Answer submitted for session ${sessionId}, question ${questionId}`);

      return session;
    } catch (error) {
      logger.error('Submit answer error:', error);
      throw error;
    }
  }

  static async completeSession(
    sessionId: string,
    userId: string
  ) {
    try {
      let [session] = await db.select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions._id, sessionId), eq(interviewSessions.userId, userId)))
        .limit(1);

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      if (session.status !== 'in-progress') {
        throw ApiError.badRequest('Interview session is not active');
      }

      const answeredQuestions = (session.questions || []).filter((q: any) => q.feedback);
      
      if (answeredQuestions.length === 0) {
        throw ApiError.badRequest('No answers submitted yet');
      }

      const totalScore = answeredQuestions.reduce(
        (sum: number, q: any) => sum + (q.feedback?.score || 0),
        0
      );
      const overallScore = Math.round(totalScore / answeredQuestions.length);

      const questionsForFeedback = answeredQuestions.map((q: any) => ({
        question: q.text || q.question,
        answer: q.userAnswer || '',
        feedback: q.feedback,
      }));

      const overallFeedbackData = await GroqService.generateOverallInterviewFeedback(
        questionsForFeedback
      );

      const endTime = new Date();
      const startTime = session.startTime ? new Date(session.startTime) : endTime;
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      [session] = await db.update(interviewSessions)
        .set({
          status: 'completed',
          overallFeedback: { ...overallFeedbackData, score: overallScore } as any,
          endTime: endTime.toISOString(),
          duration
        })
        .where(eq(interviewSessions._id, sessionId))
        .returning();

      logger.info(`Interview session ${sessionId} completed. Overall score: ${overallScore}`);

      try {
        const { ActivityService } = await import('./activityService');
        await ActivityService.logActivity(
          userId,
          'interview',
          'Mock interview completed',
          `Score: ${overallScore}%`,
          `/interview/${session._id}`,
          { score: overallScore }
        );
      } catch (actError) {
        logger.warn('Failed to log interview activity:', actError);
      }

      return session;
    } catch (error) {
      logger.error('Complete session error:', error);
      throw error;
    }
  }

  static async abandonSession(
    sessionId: string,
    userId: string
  ) {
    try {
      const [session] = await db.update(interviewSessions)
        .set({ status: 'cancelled' })
        .where(and(
          eq(interviewSessions._id, sessionId),
          eq(interviewSessions.userId, userId),
          eq(interviewSessions.status, 'in-progress')
        ))
        .returning();

      if (!session) {
        throw ApiError.notFound('Interview session not found or not active');
      }

      logger.info(`Interview session ${sessionId} abandoned`);

      return session;
    } catch (error) {
      logger.error('Abandon session error:', error);
      throw error;
    }
  }

  static async getInterviewStats(userId: string) {
    try {
      const completedSessions = await db.select()
        .from(interviewSessions)
        .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.status, 'completed')));

      const [{ count: totalSessions }] = await db.select({ count: count() })
        .from(interviewSessions)
        .where(eq(interviewSessions.userId, userId));

      if (completedSessions.length === 0) {
        return {
          totalSessions,
          completedSessions: 0,
          averageScore: 0,
          highestScore: 0,
          byCategory: {
            technical: { count: 0, avgScore: 0 },
            behavioral: { count: 0, avgScore: 0 },
            situational: { count: 0, avgScore: 0 },
          },
          recentSessions: [],
        };
      }

      const scores = completedSessions.map(s => s.overallFeedback?.score || 0);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      const categoryStats: any = {
        technical: { scores: [], count: 0 },
        behavioral: { scores: [], count: 0 },
        situational: { scores: [], count: 0 },
      };

      completedSessions.forEach(session => {
        (session.questions || []).forEach((q: any) => {
          if (q.feedback) {
            const cat = q.type || q.category;
            if (categoryStats[cat]) {
              categoryStats[cat].scores.push(q.feedback.score);
              categoryStats[cat].count++;
            }
          }
        });
      });

      return {
        totalSessions,
        completedSessions: completedSessions.length,
        averageScore: Math.round(averageScore),
        highestScore: Math.max(...scores),
        byCategory: {
          technical: {
            count: categoryStats.technical.count,
            avgScore: categoryStats.technical.scores.length > 0
              ? Math.round(categoryStats.technical.scores.reduce((a: number, b: number) => a + b, 0) / categoryStats.technical.scores.length)
              : 0,
          },
          behavioral: {
            count: categoryStats.behavioral.count,
            avgScore: categoryStats.behavioral.scores.length > 0
              ? Math.round(categoryStats.behavioral.scores.reduce((a: number, b: number) => a + b, 0) / categoryStats.behavioral.scores.length)
              : 0,
          },
          situational: {
            count: categoryStats.situational.count,
            avgScore: categoryStats.situational.scores.length > 0
              ? Math.round(categoryStats.situational.scores.reduce((a: number, b: number) => a + b, 0) / categoryStats.situational.scores.length)
              : 0,
          },
        },
        recentSessions: completedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
      };
    } catch (error) {
      logger.error('Get interview stats error:', error);
      throw error;
    }
  }

  static async deleteSession(
    sessionId: string,
    userId: string
  ): Promise<void> {
    try {
      const [session] = await db.delete(interviewSessions)
        .where(and(eq(interviewSessions._id, sessionId), eq(interviewSessions.userId, userId)))
        .returning();

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      logger.info(`Interview session ${sessionId} deleted`);
    } catch (error) {
      logger.error('Delete session error:', error);
      throw error;
    }
  }
}
