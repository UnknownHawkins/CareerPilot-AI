import { Request, Response } from 'express';
import { RoadmapService } from '../services/roadmapService';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class RoadmapController {
  // Create new career roadmap
  static async createRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { targetRole, targetLevel, industry } = req.body;

      if (!targetRole || !targetLevel || !industry) {
        throw ApiError.badRequest('Target role, target level, and industry are required');
      }

      const roadmap = await RoadmapService.createRoadmap(
        userId,
        targetRole,
        targetLevel,
        industry
      );

      successResponse(
        res,
        roadmap,
        'Career roadmap created successfully',
        201
      );
    } catch (error) {
      logger.error('Create roadmap error:', error);
      throw error;
    }
  }

  // Get user's roadmaps
  static async getUserRoadmaps(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { status } = req.query;

      const roadmaps = await RoadmapService.getUserRoadmaps(
        userId,
        status as string
      );

      successResponse(res, roadmaps);
    } catch (error) {
      logger.error('Get user roadmaps error:', error);
      throw error;
    }
  }

  // Get roadmap by ID
  static async getRoadmapById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const roadmap = await RoadmapService.getRoadmapById(id, userId);

      successResponse(res, roadmap);
    } catch (error) {
      logger.error('Get roadmap by ID error:', error);
      throw error;
    }
  }

  // Complete milestone
  static async completeMilestone(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id, milestoneId } = req.params;

      const roadmap = await RoadmapService.completeMilestone(
        id,
        milestoneId,
        userId
      );

      successResponse(res, roadmap, 'Milestone completed successfully');
    } catch (error) {
      logger.error('Complete milestone error:', error);
      throw error;
    }
  }

  // Update roadmap status
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'paused', 'completed'].includes(status)) {
        throw ApiError.badRequest('Valid status is required (active, paused, or completed)');
      }

      const roadmap = await RoadmapService.updateStatus(id, userId, status);

      successResponse(res, roadmap, `Roadmap status updated to ${status}`);
    } catch (error) {
      logger.error('Update roadmap status error:', error);
      throw error;
    }
  }

  // Delete roadmap
  static async deleteRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await RoadmapService.deleteRoadmap(id, userId);

      successResponse(res, null, 'Roadmap deleted successfully');
    } catch (error) {
      logger.error('Delete roadmap error:', error);
      throw error;
    }
  }

  // Get roadmap statistics
  static async getRoadmapStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const stats = await RoadmapService.getRoadmapStats(userId);

      successResponse(res, stats);
    } catch (error) {
      logger.error('Get roadmap stats error:', error);
      throw error;
    }
  }

  // Get upcoming milestones
  static async getUpcomingMilestones(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const limit = parseInt(req.query.limit as string) || 5;

      const milestones = await RoadmapService.getUpcomingMilestones(userId, limit);

      successResponse(res, milestones);
    } catch (error) {
      logger.error('Get upcoming milestones error:', error);
      throw error;
    }
  }

  // Get skill gap analysis
  static async getSkillGapAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const roadmap = await RoadmapService.getRoadmapById(id, userId);

      const analysis = {
        currentSkills: roadmap.currentSkills,
        targetSkills: roadmap.targetSkills,
        skillGaps: roadmap.skillGaps,
        prioritySkills: roadmap.skillGaps
          .filter(sg => sg.importance === 'critical')
          .map(sg => sg.skill),
      };

      successResponse(res, analysis);
    } catch (error) {
      logger.error('Get skill gap analysis error:', error);
      throw error;
    }
  }

  // Get learning resources
  static async getLearningResources(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const roadmap = await RoadmapService.getRoadmapById(id, userId);

      // Collect all resources from milestones
      const resources: any[] = [];
      roadmap.milestones.forEach(milestone => {
        milestone.resources.forEach(resource => {
          resources.push({
            ...resource,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            category: milestone.category,
            priority: milestone.priority,
          });
        });
      });

      // Group by category
      const groupedResources = resources.reduce((acc, resource) => {
        const category = resource.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(resource);
        return acc;
      }, {} as Record<string, any[]>);

      successResponse(res, {
        allResources: resources,
        groupedByCategory: groupedResources,
      });
    } catch (error) {
      logger.error('Get learning resources error:', error);
      throw error;
    }
  }
}
