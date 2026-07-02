import { Request, Response } from 'express';
import { ResumeService } from '../services/resumeService';
import { db } from '../config/database';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { hasProAccess } from '../middleware/auth';

function formatAnalysisResponse(resume: any) {
  const analysisData = resume.analysis || {};
  return {
    _id: resume._id,
    userId: resume.userId,
    originalFileName: resume.originalFileName,
    originalFileUrl: resume.originalFileUrl,
    atsScore: analysisData.atsScore || analysisData.score || 0,
    skillGapAnalysis: analysisData.skillGapAnalysis || { currentSkills: [], recommendedSkills: [], prioritySkills: [] },
    improvementSuggestions: analysisData.improvementSuggestions || analysisData.recommendations || [],
    jobSuggestions: analysisData.jobSuggestions || [],
    matchingRoles: analysisData.matchingRoles || [],
    analysis: {
      overallFeedback: analysisData.overallFeedback || '',
      strengths: analysisData.strengths || [],
      weaknesses: analysisData.weaknesses || [],
      sections: analysisData.sections || {
        contactInfo: { score: 0, feedback: '', suggestions: [] },
        summary: { score: 0, feedback: '', suggestions: [] },
        experience: { score: 0, feedback: '', suggestions: [] },
        education: { score: 0, feedback: '', suggestions: [] },
        skills: { score: 0, feedback: '', suggestions: [], detectedSkills: [], missingSkills: [] }
      },
      keywordOptimization: analysisData.keywordOptimization || { score: 0, industryKeywords: [], missingKeywords: [], suggestions: [] },
      formatting: analysisData.formatting || { score: 0, feedback: '', suggestions: [] },
    },
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt
  };
}

export class ResumeController {
  static async uploadAndAnalyze(req: Request, res: Response): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, req.user!._id.toString())).limit(1);
      if (!user) throw ApiError.notFound('User not found');

      const userId = user._id;
      const { targetRole, industry, resumeText } = req.body;

      let analysis;

      if (req.file) {
        const fileBuffer = req.file.buffer;
        const originalFileName = req.file.originalname;
        const mimetype = req.file.mimetype;
        let fileType: string = 'pdf';
        
        if (mimetype.includes('pdf')) fileType = 'pdf';
        else if (mimetype.includes('word') || mimetype.includes('officedocument')) fileType = 'docx';
        else if (mimetype.includes('image')) fileType = 'image';

        analysis = await ResumeService.uploadAndAnalyze(
          userId,
          fileBuffer,
          originalFileName,
          fileType,
          mimetype,
          targetRole,
          industry
        );
      } else if (resumeText) {
        analysis = await ResumeService.uploadAndAnalyze(
          userId,
          Buffer.from(resumeText),
          'pasted-content.txt',
          'email',
          'text/plain',
          targetRole,
          industry
        );
      } else {
        throw ApiError.badRequest('No file uploaded or text provided');
      }

      successResponse(
        res,
        formatAnalysisResponse(analysis),
        'Resume analyzed successfully',
        201
      );
    } catch (error) {
      logger.error('Upload and analyze error:', error);
      throw error;
    }
  }

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
        analyses.map(formatAnalysisResponse),
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

  static async getAnalysisById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const analysis = await ResumeService.getAnalysisById(id, userId);

      successResponse(res, formatAnalysisResponse(analysis));
    } catch (error) {
      logger.error('Get analysis by ID error:', error);
      throw error;
    }
  }

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

      successResponse(res, formatAnalysisResponse(analysis), 'Resume reanalyzed successfully');
    } catch (error) {
      logger.error('Reanalyze resume error:', error);
      throw error;
    }
  }

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
          atsScore: (a.analysis as any)?.score || (a.analysis as any)?.atsScore || 0,
          date: a.createdAt,
          sections: (a.analysis as any)?.sections,
        })),
        improvements: analyses.length > 1 ? {
          atsScoreChange: ((analyses[analyses.length - 1].analysis as any)?.score || (analyses[analyses.length - 1].analysis as any)?.atsScore || 0) - ((analyses[0].analysis as any)?.score || (analyses[0].analysis as any)?.atsScore || 0),
          bestPerforming: analyses.reduce((best, current) => 
            (((current.analysis as any)?.score || (current.analysis as any)?.atsScore || 0) > ((best.analysis as any)?.score || (best.analysis as any)?.atsScore || 0)) ? current : best
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
