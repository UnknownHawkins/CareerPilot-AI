import { Request, Response } from 'express';
import { LinkedInService } from '../services/linkedinService';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class LinkedInController {
  // Analyze LinkedIn profile
  static async analyzeProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const {
        headline,
        summary,
        experience,
        skills,
        targetRole,
        profileUrl,
      } = req.body;

      // Validate input
      if (!headline && !summary && (!experience || experience.length === 0) && (!skills || skills.length === 0)) {
        throw ApiError.badRequest('Please provide at least one profile section to analyze');
      }

      const analysis = await LinkedInService.analyzeProfile(
        userId,
        headline || '',
        summary || '',
        experience || [],
        skills || [],
        targetRole
      );

      successResponse(res, analysis);
    } catch (error) {
      logger.error('Analyze LinkedIn profile error:', error);
      throw error;
    }
  }

  // Analyze headline only
  static async analyzeHeadline(req: Request, res: Response): Promise<void> {
    try {
      const { headline } = req.body;

      if (!headline) {
        throw ApiError.badRequest('Headline is required');
      }

      const analysis = await LinkedInService.analyzeHeadline(headline);

      successResponse(res, analysis);
    } catch (error) {
      logger.error('Analyze headline error:', error);
      throw error;
    }
  }

  // Analyze summary only
  static async analyzeSummary(req: Request, res: Response): Promise<void> {
    try {
      const { summary } = req.body;

      if (!summary) {
        throw ApiError.badRequest('Summary is required');
      }

      const analysis = await LinkedInService.analyzeSummary(summary);

      successResponse(res, analysis);
    } catch (error) {
      logger.error('Analyze summary error:', error);
      throw error;
    }
  }

  // Generate headline suggestions
  static async generateHeadlineSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { currentTitle, skills, industry } = req.body;

      if (!currentTitle || !industry) {
        throw ApiError.badRequest('Current title and industry are required');
      }

      const suggestions = await LinkedInService.generateHeadlineSuggestions(
        currentTitle,
        skills || [],
        industry
      );

      successResponse(res, { suggestions });
    } catch (error) {
      logger.error('Generate headline suggestions error:', error);
      throw error;
    }
  }

  // Generate optimized summary
  static async generateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { experience, skills, achievements, targetRole } = req.body;

      if (!experience || !skills) {
        throw ApiError.badRequest('Experience and skills are required');
      }

      const result = await LinkedInService.generateSummary(
        experience,
        skills,
        achievements || [],
        targetRole
      );

      successResponse(res, result);
    } catch (error) {
      logger.error('Generate summary error:', error);
      throw error;
    }
  }

  // Optimize skills
  static async optimizeSkills(req: Request, res: Response): Promise<void> {
    try {
      const { currentSkills, targetRole, industry } = req.body;

      if (!currentSkills || !targetRole || !industry) {
        throw ApiError.badRequest('Current skills, target role, and industry are required');
      }

      const optimization = await LinkedInService.optimizeSkills(
        currentSkills,
        targetRole,
        industry
      );

      successResponse(res, optimization);
    } catch (error) {
      logger.error('Optimize skills error:', error);
      throw error;
    }
  }

  // Calculate profile completion
  static async calculateProfileCompletion(req: Request, res: Response): Promise<void> {
    try {
      const {
        headline,
        summary,
        experience,
        education,
        skills,
        recommendations,
        connections,
      } = req.body;

      const completion = LinkedInService.calculateProfileCompletion({
        headline,
        summary,
        experience,
        education,
        skills,
        recommendations,
        connections,
      });

      successResponse(res, completion);
    } catch (error) {
      logger.error('Calculate profile completion error:', error);
      throw error;
    }
  }

  // Get LinkedIn optimization checklist
  static async getOptimizationChecklist(req: Request, res: Response): Promise<void> {
    try {
      const checklist = {
        profile: [
          { item: 'Professional headshot', importance: 'high', completed: false },
          { item: 'Custom background image', importance: 'medium', completed: false },
          { item: 'Compelling headline with keywords', importance: 'high', completed: false },
          { item: 'Detailed summary (40+ words)', importance: 'high', completed: false },
          { item: 'Complete experience section', importance: 'high', completed: false },
          { item: 'Education details', importance: 'medium', completed: false },
          { item: 'Skills (50+ recommended)', importance: 'high', completed: false },
          { item: 'Recommendations (3+)', importance: 'medium', completed: false },
          { item: 'Featured section with work samples', importance: 'medium', completed: false },
          { item: 'Custom LinkedIn URL', importance: 'low', completed: false },
        ],
        activity: [
          { item: 'Post regularly (2-3x per week)', importance: 'high', completed: false },
          { item: 'Engage with others\' content', importance: 'high', completed: false },
          { item: 'Join relevant groups', importance: 'medium', completed: false },
          { item: 'Share industry insights', importance: 'high', completed: false },
          { item: 'Request recommendations', importance: 'medium', completed: false },
        ],
        network: [
          { item: '500+ connections', importance: 'high', completed: false },
          { item: 'Connect with industry leaders', importance: 'medium', completed: false },
          { item: 'Follow target companies', importance: 'medium', completed: false },
          { item: 'Engage with recruiters', importance: 'high', completed: false },
        ],
      };

      successResponse(res, checklist);
    } catch (error) {
      logger.error('Get optimization checklist error:', error);
      throw error;
    }
  }
}
