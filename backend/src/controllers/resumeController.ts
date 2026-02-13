import { Request, Response } from 'express';
import { ResumeService } from '../services/resumeService';
import { successResponse, errorResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class ResumeController {
  // Upload and analyze resume
  static async uploadAndAnalyze(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }

      const userId = req.user!._id.toString();
      const { targetRole, industry } = req.body;

      const fileBuffer = req.file.buffer;
      const originalFileName = req.file.originalname;
      const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'docx';

      const analysis = await ResumeService.uploadAndAnalyze(
        userId,
        fileBuffer,
        originalFileName,
        fileType,
        targetRole,
        industry
      );

      successResponse(
        res,
        analysis,
        'Resume analyzed successfully',
        201
      );
    } catch (error) {
      logger.error('Upload and analyze error:', error);
      throw error;
    }
  }

  // Get user's resume analyses
  static async getUserAnalyses(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { analyses, total } = await ResumeService.getUserAnalyses(
        userId,
        page,
        limit
      );

      successResponse(
        res,
        analyses,
        'Analyses retrieved successfully',
        200,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      logger.error('Get user analyses error:', error);
      throw error;
    }
  }

  // Get analysis by ID
  static async getAnalysisById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const analysis = await ResumeService.getAnalysisById(id, userId);

      successResponse(res, analysis);
    } catch (error) {
      logger.error('Get analysis by ID error:', error);
      throw error;
    }
  }

  // Delete analysis
  static async deleteAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await ResumeService.deleteAnalysis(id, userId);

      successResponse(res, null, 'Analysis deleted successfully');
    } catch (error) {
      logger.error('Delete analysis error:', error);
      throw error;
    }
  }

  // Get analysis statistics
  static async getAnalysisStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const stats = await ResumeService.getAnalysisStats(userId);

      successResponse(res, stats);
    } catch (error) {
      logger.error('Get analysis stats error:', error);
      throw error;
    }
  }

  // Reanalyze resume
  static async reanalyzeResume(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { targetRole, industry } = req.body;

      const analysis = await ResumeService.reanalyzeResume(
        id,
        userId,
        targetRole,
        industry
      );

      successResponse(res, analysis, 'Resume reanalyzed successfully');
    } catch (error) {
      logger.error('Reanalyze resume error:', error);
      throw error;
    }
  }

  // Compare resumes (Pro feature)
  static async compareResumes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { analysisIds } = req.body;

      if (!Array.isArray(analysisIds) || analysisIds.length < 2) {
        throw ApiError.badRequest('Please provide at least 2 analysis IDs to compare');
      }

      const analyses = await Promise.all(
        analysisIds.map(id => ResumeService.getAnalysisById(id, userId))
      );

      const comparison = {
        analyses: analyses.map(a => ({
          id: a._id,
          fileName: a.originalFileName,
          atsScore: a.atsScore,
          date: a.createdAt,
          sections: a.analysis.sections,
        })),
        improvements: analyses.length > 1 ? {
          atsScoreChange: analyses[analyses.length - 1].atsScore - analyses[0].atsScore,
          bestPerforming: analyses.reduce((best, current) => 
            current.atsScore > best.atsScore ? current : best
          ),
        } : null,
      };

      successResponse(res, comparison);
    } catch (error) {
      logger.error('Compare resumes error:', error);
      throw error;
    }
  }
}
