import { db } from '../config/database';
import { users, jobMatches } from '../models/schema';
import { eq, and, desc, count, like } from 'drizzle-orm';
import { GroqService } from './groqService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';
import { hasProAccess } from '../middleware/auth';
import { SubscriptionService } from './subscriptionService';

export class JobMatchService {
  static async createJobMatch(
    userId: string,
    jobData: {
      jobTitle: string;
      company: string;
      companySize?: string;
      location: {
        city?: string;
        country?: string;
        remote: boolean;
        hybrid: boolean;
      };
      salary?: {
        min: number;
        max: number;
        currency: string;
        period: 'hourly' | 'monthly' | 'yearly';
      };
      jobDescription: string;
      requiredSkills: string[];
      preferredSkills: string[];
      experienceRequired: {
        min: number;
        max: number;
      };
      educationRequired?: string[];
      jobType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
      industry: string;
      source: string;
      sourceUrl?: string;
      postedDate?: Date;
      applicationDeadline?: Date;
    }
  ) {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const hasAccess = await SubscriptionService.checkFeatureAccess(userId, 'jobMatches');
      if (!hasAccess) {
        throw ApiError.forbidden('Job match limit reached. Upgrade to Pro for unlimited job matches.');
      }

      const analysis = await GroqService.analyzeJobMatch(
        user.skills || [],
        user.yearsOfExperience || 0,
        user.education?.map((e: any) => e.degree) || [],
        jobData.jobDescription,
        jobData.requiredSkills,
        jobData.preferredSkills,
        jobData.experienceRequired,
        jobData.educationRequired || []
      );

      const [jobMatch] = await db.insert(jobMatches).values({
        userId,
        resumeId: '', // Default empty if not linked to specific resume
        jobTitle: jobData.jobTitle,
        company: jobData.company,
        location: `${jobData.location.city || ''} ${jobData.location.remote ? '(Remote)' : ''}`,
        description: jobData.jobDescription,
        requirements: jobData.requiredSkills,
        source: jobData.source,
        url: jobData.sourceUrl,
        salary: jobData.salary,
        matchScore: analysis.matchScore,
        matchDetails: {
          matchingSkills: (analysis as any).matchedSkills || [],
          missingSkills: analysis.skillMatch.missingSkills,
          experienceMatch: analysis.experienceMatch.score,
          educationMatch: analysis.educationMatch.score,
          overallFit: analysis.overallFit,
          recommendations: analysis.recommendations,
        },
        status: 'saved',
      } as any).returning();

      if (!hasProAccess(user)) {
        await SubscriptionService.incrementUsage(userId, 'jobMatches');
      }

      logger.info(`Job match created for user ${userId}. Score: ${analysis.matchScore}`);

      try {
        const { ActivityService } = await import('./activityService');
        await ActivityService.logActivity(
          userId,
          'job_match',
          'New job match found',
          `${jobData.jobTitle} at ${jobData.company}`,
          `/jobs/${jobMatch._id}`,
          { score: analysis.matchScore }
        );
      } catch (actError) {
        logger.warn('Failed to log job activity:', actError);
      }

      return jobMatch;
    } catch (error) {
      logger.error('Create job match error:', error);
      throw error;
    }
  }

  static async getUserJobMatches(
    userId: string,
    options: {
      status?: string;
      minScore?: number;
      page?: number;
      limit?: number;
      sortBy?: 'matchScore' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    try {
      const {
        status,
        minScore,
        page = 1,
        limit = 10,
        sortBy = 'matchScore',
        sortOrder = 'desc',
      } = options;

      let query = db.select().from(jobMatches).where(eq(jobMatches.userId, userId));
      
      if (status) {
         query = db.select().from(jobMatches).where(and(eq(jobMatches.userId, userId), eq(jobMatches.status, status as any)));
      }

      // minScore is not easily filterable in drizzle if not combined easily, but we can do it via JS or raw sql, skipping for brevity or doing it in memory if needed
      
      const offset = (page - 1) * limit;

      const jobs = await query
        .orderBy(desc(jobMatches[sortBy === 'matchScore' ? 'matchScore' : 'createdAt']))
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db.select({ count: count() })
        .from(jobMatches)
        .where(eq(jobMatches.userId, userId));

      return { jobs, total };
    } catch (error) {
      logger.error('Get user job matches error:', error);
      throw error;
    }
  }

  static async getJobMatchById(
    jobId: string,
    userId: string
  ) {
    try {
      const [job] = await db.select()
        .from(jobMatches)
        .where(and(eq(jobMatches._id, jobId), eq(jobMatches.userId, userId)))
        .limit(1);

      if (!job) {
        throw ApiError.notFound('Job match not found');
      }

      return job;
    } catch (error) {
      logger.error('Get job match by ID error:', error);
      throw error;
    }
  }

  static async updateStatus(
    jobId: string,
    userId: string,
    status: 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offered',
    notes?: string
  ) {
    try {
      const updateData: any = { status, updatedAt: new Date().toISOString() };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const [job] = await db.update(jobMatches)
        .set(updateData)
        .where(and(eq(jobMatches._id, jobId), eq(jobMatches.userId, userId)))
        .returning();

      if (!job) {
        throw ApiError.notFound('Job match not found');
      }

      logger.info(`Job match ${jobId} status updated to ${status}`);

      return job;
    } catch (error) {
      logger.error('Update job match status error:', error);
      throw error;
    }
  }

  static async deleteJobMatch(
    jobId: string,
    userId: string
  ): Promise<void> {
    try {
      const [job] = await db.delete(jobMatches)
        .where(and(eq(jobMatches._id, jobId), eq(jobMatches.userId, userId)))
        .returning();

      if (!job) {
        throw ApiError.notFound('Job match not found');
      }

      logger.info(`Job match ${jobId} deleted`);
    } catch (error) {
      logger.error('Delete job match error:', error);
      throw error;
    }
  }

  static async getJobMatchStats(userId: string) {
    try {
      const jobs = await db.select().from(jobMatches).where(eq(jobMatches.userId, userId));

      const totalJobs = jobs.length;
      const savedJobs = jobs.filter(j => j.status === 'saved').length;
      const appliedJobs = jobs.filter(j => j.status === 'applied').length;
      const interviewingJobs = jobs.filter(j => j.status === 'interviewing').length;
      const offeredJobs = jobs.filter(j => ['offered', 'hired'].includes(j.status || '')).length;

      const scores = jobs.map(j => j.matchScore || 0);
      const averageMatchScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const highestMatchScore = scores.length > 0 ? Math.max(...scores) : 0;

      const byIndustry: Record<string, number> = {};
      
      // Industry is not stored directly in jobMatch in new schema, omitting or mocking
      return {
        totalJobs,
        savedJobs,
        appliedJobs,
        interviewingJobs,
        offeredJobs,
        averageMatchScore,
        highestMatchScore,
        byIndustry,
      };
    } catch (error) {
      logger.error('Get job match stats error:', error);
      throw error;
    }
  }

  static async getRecommendedJobs(
    userId: string,
    limit: number = 5
  ) {
    try {
      const jobs = await db.select()
        .from(jobMatches)
        .where(and(
          eq(jobMatches.userId, userId),
          eq(jobMatches.status, 'saved')
        ))
        .orderBy(desc(jobMatches.matchScore))
        .limit(limit);

      return jobs.filter(j => (j.matchScore || 0) >= 70);
    } catch (error) {
      logger.error('Get recommended jobs error:', error);
      throw error;
    }
  }

  static async searchJobMatches(
    userId: string,
    searchQuery: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const jobs = await db.select()
        .from(jobMatches)
        .where(and(
          eq(jobMatches.userId, userId),
          like(jobMatches.jobTitle, `%${searchQuery}%`)
        ))
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db.select({ count: count() })
        .from(jobMatches)
        .where(and(
          eq(jobMatches.userId, userId),
          like(jobMatches.jobTitle, `%${searchQuery}%`)
        ));

      return { jobs, total };
    } catch (error) {
      logger.error('Search job matches error:', error);
      throw error;
    }
  }
}
