import { Request, Response } from 'express';
import { JobMatchService } from '../services/jobMatchService';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class JobMatchController {
  // Create job match
  static async createJobMatch(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const jobData = req.body;

      // Validate required fields
      const requiredFields = ['jobTitle', 'company', 'jobDescription', 'requiredSkills', 'jobType', 'industry'];
      const missingFields = requiredFields.filter(field => !jobData[field]);
      
      if (missingFields.length > 0) {
        throw ApiError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const jobMatch = await JobMatchService.createJobMatch(userId, jobData);

      successResponse(
        res,
        jobMatch,
        'Job match created successfully',
        201
      );
    } catch (error) {
      logger.error('Create job match error:', error);
      throw error;
    }
  }

  // Get user's job matches
  static async getUserJobMatches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const {
        status,
        minScore,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const options = {
        status: status as string,
        minScore: minScore ? parseInt(minScore as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        sortBy: sortBy as 'matchScore' | 'createdAt',
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const { jobs, total } = await JobMatchService.getUserJobMatches(
        userId,
        options
      );

      successResponse(
        res,
        jobs,
        'Job matches retrieved successfully',
        200,
        {
          page: options.page,
          limit: options.limit,
          total,
          totalPages: Math.ceil(total / (options.limit || 10)),
        }
      );
    } catch (error) {
      logger.error('Get user job matches error:', error);
      throw error;
    }
  }

  // Get job match by ID
  static async getJobMatchById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const jobMatch = await JobMatchService.getJobMatchById(id, userId);

      successResponse(res, jobMatch);
    } catch (error) {
      logger.error('Get job match by ID error:', error);
      throw error;
    }
  }

  // Update application status
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        throw ApiError.badRequest('Status is required');
      }

      const validStatuses = ['saved', 'applied', 'interviewing', 'rejected', 'offered', 'hired'];
      if (!validStatuses.includes(status)) {
        throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const jobMatch = await JobMatchService.updateStatus(id, userId, status, notes);

      successResponse(res, jobMatch, 'Status updated successfully');
    } catch (error) {
      logger.error('Update job match status error:', error);
      throw error;
    }
  }

  // Delete job match
  static async deleteJobMatch(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await JobMatchService.deleteJobMatch(id, userId);

      successResponse(res, null, 'Job match deleted successfully');
    } catch (error) {
      logger.error('Delete job match error:', error);
      throw error;
    }
  }

  // Get job match statistics
  static async getJobMatchStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const stats = await JobMatchService.getJobMatchStats(userId);

      successResponse(res, stats);
    } catch (error) {
      logger.error('Get job match stats error:', error);
      throw error;
    }
  }

  // Get recommended jobs
  static async getRecommendedJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const limit = parseInt(req.query.limit as string) || 5;

      const jobs = await JobMatchService.getRecommendedJobs(userId, limit);

      successResponse(res, jobs);
    } catch (error) {
      logger.error('Get recommended jobs error:', error);
      throw error;
    }
  }

  // Search job matches
  static async searchJobMatches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { q } = req.query;

      if (!q) {
        throw ApiError.badRequest('Search query is required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { jobs, total } = await JobMatchService.searchJobMatches(
        userId,
        q as string,
        { page, limit }
      );

      successResponse(
        res,
        jobs,
        'Search results',
        200,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      logger.error('Search job matches error:', error);
      throw error;
    }
  }

  // Bulk create job matches
  static async bulkCreateJobMatches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { jobs } = req.body;

      if (!Array.isArray(jobs) || jobs.length === 0) {
        throw ApiError.badRequest('Jobs array is required');
      }

      const result = await JobMatchService.bulkCreateJobMatches(userId, jobs);

      successResponse(
        res,
        result,
        `Created ${result.created} job matches, ${result.failed} failed`
      );
    } catch (error) {
      logger.error('Bulk create job matches error:', error);
      throw error;
    }
  }
}
