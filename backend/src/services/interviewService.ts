import { InterviewSession, IInterviewSession } from '../models/InterviewSession';
import { User } from '../models/User';
import { GeminiService, InterviewQuestion, InterviewFeedback } from './geminiService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';
import { v4 as uuidv4 } from 'uuid';

export class InterviewService {
  // Create new interview session
  static async createSession(
    userId: string,
    sessionType: 'practice' | 'mock' | 'assessment',
    jobRole: string,
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive',
    industry: string,
    skills: string[]
  ): Promise<IInterviewSession> {
    try {
      // Check user limits
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const isPro = user.hasProAccess();
      
      // Free users can only create practice sessions
      if (!isPro && sessionType !== 'practice') {
        throw ApiError.forbidden('Pro subscription required for this interview type');
      }

      if (!user.canUseInterview()) {
        throw ApiError.forbidden('Interview limit reached. Upgrade to Pro for unlimited interviews.');
      }

      // Generate questions based on user tier
      const questionCount = isPro ? 10 : 3;
      
      const questions = await GeminiService.generateInterviewQuestions(
        jobRole,
        experienceLevel,
        industry,
        skills,
        questionCount
      );

      // Add IDs to questions
      const questionsWithIds = questions.map(q => ({
        ...q,
        id: uuidv4(),
      }));

      // Create session
      const session = new InterviewSession({
        userId,
        sessionType,
        jobRole,
        experienceLevel,
        industry,
        skills,
        questions: questionsWithIds,
        status: 'in_progress',
      });

      await session.save();

      // Increment user usage for free users
      if (!isPro) {
        user.usage.interviewSessionsCount += 1;
        await user.save();
      }

      logger.info(`Interview session created for user ${userId}. Session ID: ${session._id}`);

      return session;
    } catch (error) {
      logger.error('Create interview session error:', error);
      throw error;
    }
  }

  // Get session by ID
  static async getSessionById(
    sessionId: string,
    userId: string
  ): Promise<IInterviewSession> {
    try {
      const session = await InterviewSession.findOne({
        _id: sessionId,
        userId,
      });

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      return session;
    } catch (error) {
      logger.error('Get interview session error:', error);
      throw error;
    }
  }

  // Get user's interview sessions
  static async getUserSessions(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ sessions: IInterviewSession[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        InterviewSession.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-questions.expectedAnswerPoints')
          .exec(),
        InterviewSession.countDocuments({ userId }),
      ]);

      return { sessions, total };
    } catch (error) {
      logger.error('Get user interview sessions error:', error);
      throw error;
    }
  }

  // Submit answer
  static async submitAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    answer: string,
    timeTaken: number
  ): Promise<IInterviewSession> {
    try {
      const session = await InterviewSession.findOne({
        _id: sessionId,
        userId,
      });

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      if (session.status !== 'in_progress') {
        throw ApiError.badRequest('Interview session is not active');
      }

      const question = session.questions.find(q => q.id === questionId);
      if (!question) {
        throw ApiError.notFound('Question not found');
      }

      if (question.userAnswer) {
        throw ApiError.badRequest('Question already answered');
      }

      // Analyze answer with Gemini
      const feedback = await GeminiService.analyzeInterviewAnswer(
        question.question,
        answer,
        question.expectedAnswerPoints,
        question.category
      );

      // Update question
      question.userAnswer = answer;
      question.aiFeedback = feedback;
      question.answeredAt = new Date();
      question.timeTaken = timeTaken;

      await session.save();

      logger.info(`Answer submitted for session ${sessionId}, question ${questionId}`);

      return session;
    } catch (error) {
      logger.error('Submit answer error:', error);
      throw error;
    }
  }

  // Complete interview session
  static async completeSession(
    sessionId: string,
    userId: string
  ): Promise<IInterviewSession> {
    try {
      const session = await InterviewSession.findOne({
        _id: sessionId,
        userId,
      });

      if (!session) {
        throw ApiError.notFound('Interview session not found');
      }

      if (session.status !== 'in_progress') {
        throw ApiError.badRequest('Interview session is not active');
      }

      // Calculate overall score
      const answeredQuestions = session.questions.filter(q => q.aiFeedback);
      
      if (answeredQuestions.length === 0) {
        throw ApiError.badRequest('No answers submitted yet');
      }

      const totalScore = answeredQuestions.reduce(
        (sum, q) => sum + (q.aiFeedback?.score || 0),
        0
      );
      const overallScore = Math.round(totalScore / answeredQuestions.length);

      // Generate overall feedback
      const questionsForFeedback = answeredQuestions.map(q => ({
        question: q.question,
        answer: q.userAnswer || '',
        feedback: q.aiFeedback as InterviewFeedback,
      }));

      const overallFeedback = await GeminiService.generateOverallInterviewFeedback(
        questionsForFeedback
      );

      // Update session
      session.status = 'completed';
      session.overallScore = overallScore;
      session.feedback = overallFeedback;
      session.completedAt = new Date();
      
      // Calculate total duration
      const startTime = new Date(session.startedAt).getTime();
      const endTime = new Date(session.completedAt).getTime();
      session.totalDuration = Math.round((endTime - startTime) / 1000);

      await session.save();

      logger.info(`Interview session ${sessionId} completed. Overall score: ${overallScore}`);

      return session;
    } catch (error) {
      logger.error('Complete session error:', error);
      throw error;
    }
  }

  // Abandon session
  static async abandonSession(
    sessionId: string,
    userId: string
  ): Promise<IInterviewSession> {
    try {
      const session = await InterviewSession.findOneAndUpdate(
        {
          _id: sessionId,
          userId,
          status: 'in_progress',
        },
        {
          status: 'abandoned',
        },
        { new: true }
      );

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

  // Get interview statistics
  static async getInterviewStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    highestScore: number;
    byCategory: {
      technical: { count: number; avgScore: number };
      behavioral: { count: number; avgScore: number };
      situational: { count: number; avgScore: number };
    };
    recentSessions: IInterviewSession[];
  }> {
    try {
      const sessions = await InterviewSession.find({
        userId,
        status: 'completed',
      }).exec();

      const completedSessions = sessions;
      const totalSessions = await InterviewSession.countDocuments({ userId });

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

      const scores = completedSessions.map(s => s.overallScore || 0);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Calculate by category
      const categoryStats: any = {
        technical: { scores: [], count: 0 },
        behavioral: { scores: [], count: 0 },
        situational: { scores: [], count: 0 },
      };

      completedSessions.forEach(session => {
        session.questions.forEach(q => {
          if (q.aiFeedback) {
            const cat = q.category;
            if (categoryStats[cat]) {
              categoryStats[cat].scores.push(q.aiFeedback.score);
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
        recentSessions: completedSessions.slice(0, 5),
      };
    } catch (error) {
      logger.error('Get interview stats error:', error);
      throw error;
    }
  }

  // Delete session
  static async deleteSession(
    sessionId: string,
    userId: string
  ): Promise<void> {
    try {
      const session = await InterviewSession.findOneAndDelete({
        _id: sessionId,
        userId,
      });

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
