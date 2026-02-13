import { Request, Response } from 'express';
import { InterviewService } from '../services/interviewService';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class InterviewController {
  // Create new interview session
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const {
        sessionType = 'practice',
        jobRole,
        experienceLevel,
        industry,
        skills,
      } = req.body;

      if (!jobRole || !experienceLevel || !industry) {
        throw ApiError.badRequest('Job role, experience level, and industry are required');
      }

      const session = await InterviewService.createSession(
        userId,
        sessionType,
        jobRole,
        experienceLevel,
        industry,
        skills || []
      );

      successResponse(
        res,
        session,
        'Interview session created successfully',
        201
      );
    } catch (error) {
      logger.error('Create interview session error:', error);
      throw error;
    }
  }

  // Get user's interview sessions
  static async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { sessions, total } = await InterviewService.getUserSessions(
        userId,
        page,
        limit
      );

      successResponse(
        res,
        sessions,
        'Sessions retrieved successfully',
        200,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      logger.error('Get user sessions error:', error);
      throw error;
    }
  }

  // Get session by ID
  static async getSessionById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const session = await InterviewService.getSessionById(id, userId);

      successResponse(res, session);
    } catch (error) {
      logger.error('Get session by ID error:', error);
      throw error;
    }
  }

  // Submit answer
  static async submitAnswer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { questionId, answer, timeTaken } = req.body;

      if (!questionId || !answer) {
        throw ApiError.badRequest('Question ID and answer are required');
      }

      const session = await InterviewService.submitAnswer(
        id,
        userId,
        questionId,
        answer,
        timeTaken || 0
      );

      // Get the updated question with feedback
      const question = session.questions.find(q => q.id === questionId);

      successResponse(res, {
        session,
        questionFeedback: question?.aiFeedback,
      }, 'Answer submitted successfully');
    } catch (error) {
      logger.error('Submit answer error:', error);
      throw error;
    }
  }

  // Complete interview session
  static async completeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const session = await InterviewService.completeSession(id, userId);

      successResponse(res, session, 'Interview completed successfully');
    } catch (error) {
      logger.error('Complete session error:', error);
      throw error;
    }
  }

  // Abandon session
  static async abandonSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const session = await InterviewService.abandonSession(id, userId);

      successResponse(res, session, 'Session abandoned');
    } catch (error) {
      logger.error('Abandon session error:', error);
      throw error;
    }
  }

  // Get interview statistics
  static async getInterviewStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const stats = await InterviewService.getInterviewStats(userId);

      successResponse(res, stats);
    } catch (error) {
      logger.error('Get interview stats error:', error);
      throw error;
    }
  }

  // Delete session
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await InterviewService.deleteSession(id, userId);

      successResponse(res, null, 'Session deleted successfully');
    } catch (error) {
      logger.error('Delete session error:', error);
      throw error;
    }
  }

  // Get interview tips
  static async getInterviewTips(req: Request, res: Response): Promise<void> {
    try {
      const { category, experienceLevel } = req.query;

      const tips = {
        general: [
          'Research the company thoroughly before the interview',
          'Prepare specific examples using the STAR method',
          'Dress professionally and arrive early',
          'Bring extra copies of your resume',
          'Prepare thoughtful questions to ask the interviewer',
        ],
        technical: [
          'Review fundamental concepts related to the role',
          'Practice coding problems on platforms like LeetCode',
          'Be ready to explain your thought process',
          'Prepare to discuss your past projects in detail',
          'Stay updated with latest technologies in your field',
        ],
        behavioral: [
          'Use the STAR method: Situation, Task, Action, Result',
          'Be specific and provide concrete examples',
          'Focus on your individual contributions in team settings',
          'Prepare for common questions like "Tell me about yourself"',
          'Show how you\'ve grown from past challenges',
        ],
        entry: [
          'Emphasize your willingness to learn',
          'Highlight relevant coursework and projects',
          'Discuss internships and part-time experiences',
          'Show enthusiasm for the industry',
          'Demonstrate soft skills and teamwork abilities',
        ],
        senior: [
          'Focus on leadership and mentorship experience',
          'Discuss strategic decisions and their impact',
          'Highlight cross-functional collaboration',
          'Show evidence of driving organizational change',
          'Demonstrate thought leadership in your domain',
        ],
      };

      const responseTips: string[] = [];
      
      if (category && tips[category as string]) {
        responseTips.push(...tips[category as string]);
      } else {
        responseTips.push(...tips.general);
      }

      if (experienceLevel && tips[experienceLevel as string]) {
        responseTips.push(...tips[experienceLevel as string]);
      }

      successResponse(res, { tips: responseTips });
    } catch (error) {
      logger.error('Get interview tips error:', error);
      throw error;
    }
  }
}
