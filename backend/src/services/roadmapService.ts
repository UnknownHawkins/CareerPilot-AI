import { CareerRoadmap, ICareerRoadmap } from '../models/CareerRoadmap';
import { User } from '../models/User';
import { GeminiService } from './geminiService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';
import { v4 as uuidv4 } from 'uuid';

export class RoadmapService {
  // Create new career roadmap
  static async createRoadmap(
    userId: string,
    targetRole: string,
    targetLevel: 'entry' | 'mid' | 'senior' | 'executive',
    industry: string
  ): Promise<ICareerRoadmap> {
    try {
      // Get user info
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Check if user already has max active roadmaps
      const activeRoadmapsCount = await CareerRoadmap.countDocuments({
        userId,
        status: 'active',
      });

      const maxRoadmaps = user.hasProAccess() ? 3 : 1;
      if (activeRoadmapsCount >= maxRoadmaps) {
        throw ApiError.forbidden(
          `You can have maximum ${maxRoadmaps} active roadmap(s). Complete or pause existing roadmaps.`
        );
      }

      // Generate roadmap with Gemini
      const currentRole = user.targetRole || 'Professional';
      const currentLevel = this.mapExperienceToLevel(user.yearsOfExperience);
      const currentSkills = user.skills || [];

      const roadmapData = await GeminiService.generateCareerRoadmap(
        currentRole,
        targetRole,
        currentLevel,
        targetLevel,
        industry,
        currentSkills,
        user.yearsOfExperience
      );

      // Add IDs to milestones
      const milestonesWithIds = roadmapData.milestones.map(m => ({
        ...m,
        id: m.id || uuidv4(),
        completed: false,
      }));

      // Create roadmap document
      const roadmap = new CareerRoadmap({
        userId,
        targetRole,
        currentLevel,
        targetLevel,
        industry,
        currentSkills,
        targetSkills: roadmapData.targetSkills,
        skillGaps: roadmapData.skillGaps,
        milestones: milestonesWithIds,
        timeline: roadmapData.timeline,
        estimatedTimeToGoal: roadmapData.estimatedTimeToGoal,
        progress: {
          completedMilestones: 0,
          totalMilestones: milestonesWithIds.length,
          percentage: 0,
        },
        status: 'active',
      });

      await roadmap.save();

      logger.info(`Career roadmap created for user ${userId}. Target: ${targetRole}`);

      return roadmap;
    } catch (error) {
      logger.error('Create roadmap error:', error);
      throw error;
    }
  }

  // Get user's roadmaps
  static async getUserRoadmaps(
    userId: string,
    status?: string
  ): Promise<ICareerRoadmap[]> {
    try {
      const query: any = { userId };
      if (status) {
        query.status = status;
      }

      const roadmaps = await CareerRoadmap.find(query)
        .sort({ createdAt: -1 })
        .exec();

      return roadmaps;
    } catch (error) {
      logger.error('Get user roadmaps error:', error);
      throw error;
    }
  }

  // Get roadmap by ID
  static async getRoadmapById(
    roadmapId: string,
    userId: string
  ): Promise<ICareerRoadmap> {
    try {
      const roadmap = await CareerRoadmap.findOne({
        _id: roadmapId,
        userId,
      });

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      return roadmap;
    } catch (error) {
      logger.error('Get roadmap by ID error:', error);
      throw error;
    }
  }

  // Complete milestone
  static async completeMilestone(
    roadmapId: string,
    milestoneId: string,
    userId: string
  ): Promise<ICareerRoadmap> {
    try {
      const roadmap = await CareerRoadmap.findOne({
        _id: roadmapId,
        userId,
      });

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      const milestone = roadmap.milestones.find(m => m.id === milestoneId);
      if (!milestone) {
        throw ApiError.notFound('Milestone not found');
      }

      if (milestone.completed) {
        throw ApiError.badRequest('Milestone already completed');
      }

      // Check dependencies
      if (milestone.dependencies && milestone.dependencies.length > 0) {
        const incompleteDependencies = milestone.dependencies.filter(depId => {
          const dep = roadmap.milestones.find(m => m.id === depId);
          return dep && !dep.completed;
        });

        if (incompleteDependencies.length > 0) {
          throw ApiError.badRequest('Complete dependent milestones first');
        }
      }

      milestone.completed = true;
      milestone.completedAt = new Date();

      // Recalculate progress
      const completedCount = roadmap.milestones.filter(m => m.completed).length;
      roadmap.progress.completedMilestones = completedCount;
      roadmap.progress.percentage = Math.round(
        (completedCount / roadmap.milestones.length) * 100
      );

      // Check if all milestones completed
      if (completedCount === roadmap.milestones.length) {
        roadmap.status = 'completed';
      }

      await roadmap.save();

      logger.info(`Milestone ${milestoneId} completed in roadmap ${roadmapId}`);

      return roadmap;
    } catch (error) {
      logger.error('Complete milestone error:', error);
      throw error;
    }
  }

  // Update roadmap status
  static async updateStatus(
    roadmapId: string,
    userId: string,
    status: 'active' | 'paused' | 'completed'
  ): Promise<ICareerRoadmap> {
    try {
      const roadmap = await CareerRoadmap.findOneAndUpdate(
        {
          _id: roadmapId,
          userId,
        },
        { status },
        { new: true }
      );

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      logger.info(`Roadmap ${roadmapId} status updated to ${status}`);

      return roadmap;
    } catch (error) {
      logger.error('Update roadmap status error:', error);
      throw error;
    }
  }

  // Delete roadmap
  static async deleteRoadmap(
    roadmapId: string,
    userId: string
  ): Promise<void> {
    try {
      const roadmap = await CareerRoadmap.findOneAndDelete({
        _id: roadmapId,
        userId,
      });

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      logger.info(`Roadmap ${roadmapId} deleted`);
    } catch (error) {
      logger.error('Delete roadmap error:', error);
      throw error;
    }
  }

  // Get roadmap statistics
  static async getRoadmapStats(userId: string): Promise<{
    totalRoadmaps: number;
    activeRoadmaps: number;
    completedRoadmaps: number;
    overallProgress: number;
    milestonesCompleted: number;
    totalMilestones: number;
  }> {
    try {
      const roadmaps = await CareerRoadmap.find({ userId }).exec();

      const totalRoadmaps = roadmaps.length;
      const activeRoadmaps = roadmaps.filter(r => r.status === 'active').length;
      const completedRoadmaps = roadmaps.filter(r => r.status === 'completed').length;

      const totalMilestones = roadmaps.reduce(
        (sum, r) => sum + r.milestones.length,
        0
      );
      const milestonesCompleted = roadmaps.reduce(
        (sum, r) => sum + r.milestones.filter(m => m.completed).length,
        0
      );

      const overallProgress =
        totalMilestones > 0
          ? Math.round((milestonesCompleted / totalMilestones) * 100)
          : 0;

      return {
        totalRoadmaps,
        activeRoadmaps,
        completedRoadmaps,
        overallProgress,
        milestonesCompleted,
        totalMilestones,
      };
    } catch (error) {
      logger.error('Get roadmap stats error:', error);
      throw error;
    }
  }

  // Get upcoming milestones
  static async getUpcomingMilestones(
    userId: string,
    limit: number = 5
  ): Promise<
    {
      roadmapId: string;
      roadmapTitle: string;
      milestone: any;
    }[]
  > {
    try {
      const roadmaps = await CareerRoadmap.find({
        userId,
        status: 'active',
      }).exec();

      const upcomingMilestones: any[] = [];

      roadmaps.forEach(roadmap => {
        const incompleteMilestones = roadmap.milestones.filter(
          m => !m.completed && m.priority === 'high'
        );

        incompleteMilestones.forEach(milestone => {
          upcomingMilestones.push({
            roadmapId: roadmap._id,
            roadmapTitle: roadmap.targetRole,
            milestone,
          });
        });
      });

      // Sort by priority and return top N
      return upcomingMilestones.slice(0, limit);
    } catch (error) {
      logger.error('Get upcoming milestones error:', error);
      throw error;
    }
  }

  // Helper method to map years of experience to level
  private static mapExperienceToLevel(
    years: number
  ): 'entry' | 'mid' | 'senior' | 'executive' {
    if (years < 2) return 'entry';
    if (years < 5) return 'mid';
    if (years < 10) return 'senior';
    return 'executive';
  }
}
