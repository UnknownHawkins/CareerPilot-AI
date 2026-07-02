import { Request, Response } from 'express';
import { InterviewService } from '../services/interviewService';
import { db } from '../config/database';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class InterviewController {
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const {
        sessionType,
        jobRole,
        experienceLevel,
        industry,
        skills,
      } = req.body;

      if (!jobRole || !experienceLevel || !industry) {
        throw ApiError.badRequest('Missing required fields for interview session');
      }

      const session = await InterviewService.createSession(
        userId,
        sessionType || 'practice',
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
        'Interview sessions retrieved successfully',
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

      const updatedQuestion = (session.questions || []).find((q: any) => q.id === questionId);

      successResponse(
        res,
        {
          session,
          feedback: updatedQuestion?.feedback,
        },
        'Answer submitted successfully'
      );
    } catch (error) {
      logger.error('Submit answer error:', error);
      throw error;
    }
  }

  static async completeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const session = await InterviewService.completeSession(id, userId);

      successResponse(
        res,
        session,
        'Interview session completed successfully'
      );
    } catch (error) {
      logger.error('Complete session error:', error);
      throw error;
    }
  }

  static async abandonSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const session = await InterviewService.abandonSession(id, userId);

      successResponse(
        res,
        session,
        'Interview session abandoned'
      );
    } catch (error) {
      logger.error('Abandon session error:', error);
      throw error;
    }
  }

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

  static async transcribe(req: Request, res: Response): Promise<void> {
    throw ApiError.badRequest('Not implemented yet');
  }

  static async getInterviewTips(req: Request, res: Response): Promise<void> {
    throw ApiError.badRequest('Not implemented yet');
  }

  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await InterviewService.deleteSession(id, userId);

      successResponse(res, null, 'Interview session deleted successfully');
    } catch (error) {
      logger.error('Delete session error:', error);
      throw error;
    }
  }
}
