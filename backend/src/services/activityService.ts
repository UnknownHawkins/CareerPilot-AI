import { db } from '../config/database';
import { activities } from '../models/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class ActivityService {
  static async logActivity(
    userId: string,
    type: 'resume_analysis' | 'interview' | 'job_match' | 'roadmap_update' | 'linkedin_review' | 'subscription_change' | 'login',
    title: string,
    description: string,
    link?: string,
    metadata?: any,
    relatedEntityId?: string
  ) {
    try {
      const [activity] = await db.insert(activities).values({
        userId,
        type,
        title,
        description: description || '',
        metadata: { ...metadata, link },
        relatedEntityId
      }).returning();
      
      return activity;
    } catch (error) {
      logger.error('Log activity error:', error);
      throw error;
    }
  }

  static async getUserActivities(
    userId: string,
    limit: number = 10
  ) {
    try {
      return await db.select()
        .from(activities)
        .where(eq(activities.userId, userId))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
    } catch (error) {
      logger.error('Get user activities error:', error);
      throw error;
    }
  }
}
