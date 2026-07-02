import { db } from '../config/database';
import { users, roadmaps } from '../models/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { GroqService } from './groqService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';
import { v4 as uuidv4 } from 'uuid';
import { hasProAccess } from '../middleware/auth';

export class RoadmapService {
  static async createRoadmap(
    userId: string,
    targetRole: string,
    targetLevel: 'entry' | 'mid' | 'senior' | 'executive',
    industry: string
  ) {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const [{ count: activeRoadmapsCount }] = await db.select({ count: count() })
        .from(roadmaps)
        .where(and(eq(roadmaps.userId, userId), eq(roadmaps.status, 'active')));

      const maxRoadmaps = hasProAccess(user) ? 3 : 1;
      if (activeRoadmapsCount >= maxRoadmaps) {
        throw ApiError.forbidden(
          `You can have maximum ${maxRoadmaps} active roadmap(s). Complete or pause existing roadmaps.`
        );
      }

      const currentRole = user.targetRole || 'Professional';
      const currentLevel = this.mapExperienceToLevel(user.yearsOfExperience || 0);
      const currentSkills = user.skills || [];

      const roadmapData = await GroqService.generateCareerRoadmap(
        currentRole,
        targetRole,
        currentLevel,
        targetLevel,
        industry,
        currentSkills,
        user.yearsOfExperience || 0
      );

      const milestonesWithIds = roadmapData.milestones.map((m: any) => ({
        ...m,
        id: m.id || uuidv4(),
        status: 'pending',
      }));

      const [roadmap] = await db.insert(roadmaps).values({
        userId,
        targetRole,
        currentRole,
        industry,
        timeframe: '1_year', // fallback or calculate from timeline
        status: 'active',
        progress: 0,
        milestones: milestonesWithIds,
        skillsGap: {
          currentSkills,
          requiredSkills: roadmapData.targetSkills || [],
          missingSkills: Array.isArray(roadmapData.skillGaps)
            ? roadmapData.skillGaps.map((g: any) => g.skill || g)
            : [],
        }
      }).returning();

      logger.info(`Career roadmap created for user ${userId}. Target: ${targetRole}`);

      return roadmap;
    } catch (error) {
      logger.error('Create roadmap error:', error);
      throw error;
    }
  }

  static async getUserRoadmaps(
    userId: string,
    status?: string
  ) {
    try {
      let query = db.select().from(roadmaps).where(eq(roadmaps.userId, userId));
      
      if (status) {
         query = db.select().from(roadmaps).where(and(eq(roadmaps.userId, userId), eq(roadmaps.status, status as any)));
      }

      return await query.orderBy(desc(roadmaps.createdAt));
    } catch (error) {
      logger.error('Get user roadmaps error:', error);
      throw error;
    }
  }

  static async getRoadmapById(
    roadmapId: string,
    userId: string
  ) {
    try {
      const [roadmap] = await db.select()
        .from(roadmaps)
        .where(and(eq(roadmaps._id, roadmapId), eq(roadmaps.userId, userId)))
        .limit(1);

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      return roadmap;
    } catch (error) {
      logger.error('Get roadmap by ID error:', error);
      throw error;
    }
  }

  static async completeMilestone(
    roadmapId: string,
    milestoneId: string,
    userId: string
  ) {
    try {
      let [roadmap] = await db.select()
        .from(roadmaps)
        .where(and(eq(roadmaps._id, roadmapId), eq(roadmaps.userId, userId)))
        .limit(1);

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      const milestones = [...(roadmap.milestones || [])];
      const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);
      
      if (milestoneIndex === -1) {
        throw ApiError.notFound('Milestone not found');
      }

      const milestone = milestones[milestoneIndex];

      if (milestone.status === 'completed') {
        throw ApiError.badRequest('Milestone already completed');
      }

      if (milestone.dependencies && milestone.dependencies.length > 0) {
        const incompleteDependencies = milestone.dependencies.filter(depId => {
          const dep = milestones.find(m => m.id === depId);
          return dep && dep.status !== 'completed';
        });

        if (incompleteDependencies.length > 0) {
          throw ApiError.badRequest('Complete dependent milestones first');
        }
      }

      milestone.status = 'completed';
      milestone.completedAt = new Date().toISOString();

      const completedCount = milestones.filter(m => m.status === 'completed').length;
      const progress = Math.round((completedCount / milestones.length) * 100);
      let status = roadmap.status;

      if (completedCount === milestones.length) {
        status = 'completed';
      }

      [roadmap] = await db.update(roadmaps)
        .set({
          milestones,
          progress,
          status,
          updatedAt: new Date().toISOString()
        })
        .where(eq(roadmaps._id, roadmapId))
        .returning();

      logger.info(`Milestone ${milestoneId} completed in roadmap ${roadmapId}`);

      return roadmap;
    } catch (error) {
      logger.error('Complete milestone error:', error);
      throw error;
    }
  }

  static async updateStatus(
    roadmapId: string,
    userId: string,
    status: 'active' | 'completed' | 'abandoned'
  ) {
    try {
      const [roadmap] = await db.update(roadmaps)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(and(eq(roadmaps._id, roadmapId), eq(roadmaps.userId, userId)))
        .returning();

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

  static async deleteRoadmap(
    roadmapId: string,
    userId: string
  ): Promise<void> {
    try {
      const [roadmap] = await db.delete(roadmaps)
        .where(and(eq(roadmaps._id, roadmapId), eq(roadmaps.userId, userId)))
        .returning();

      if (!roadmap) {
        throw ApiError.notFound('Roadmap not found');
      }

      logger.info(`Roadmap ${roadmapId} deleted`);
    } catch (error) {
      logger.error('Delete roadmap error:', error);
      throw error;
    }
  }

  static async getRoadmapStats(userId: string) {
    try {
      const allRoadmaps = await db.select().from(roadmaps).where(eq(roadmaps.userId, userId));

      const totalRoadmaps = allRoadmaps.length;
      const activeRoadmaps = allRoadmaps.filter(r => r.status === 'active').length;
      const completedRoadmaps = allRoadmaps.filter(r => r.status === 'completed').length;

      const totalMilestones = allRoadmaps.reduce(
        (sum, r) => sum + (r.milestones?.length || 0),
        0
      );
      const milestonesCompleted = allRoadmaps.reduce(
        (sum, r) => sum + (r.milestones?.filter(m => m.status === 'completed').length || 0),
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

  static async getUpcomingMilestones(
    userId: string,
    limit: number = 5
  ) {
    try {
      const activeRoadmaps = await db.select().from(roadmaps).where(and(eq(roadmaps.userId, userId), eq(roadmaps.status, 'active')));

      const upcomingMilestones: any[] = [];

      activeRoadmaps.forEach(roadmap => {
        const incompleteMilestones = (roadmap.milestones || []).filter(
          m => m.status !== 'completed' && m.priority === 'high'
        );

        incompleteMilestones.forEach(milestone => {
          upcomingMilestones.push({
            roadmapId: roadmap._id,
            roadmapTitle: roadmap.targetRole,
            milestone,
          });
        });
      });

      return upcomingMilestones.slice(0, limit);
    } catch (error) {
      logger.error('Get upcoming milestones error:', error);
      throw error;
    }
  }

  private static mapExperienceToLevel(
    years: number
  ): 'entry' | 'mid' | 'senior' | 'executive' {
    if (years < 2) return 'entry';
    if (years < 5) return 'mid';
    if (years < 10) return 'senior';
    return 'executive';
  }
}
