import { JobMatch, IJobMatch } from '../models/JobMatch';
import { User } from '../models/User';
import { GeminiService } from './geminiService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';

export class JobMatchService {
  // Create job match analysis
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
  ): Promise<IJobMatch> {
    try {
      // Get user info
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Analyze job match with Gemini
      const analysis = await GeminiService.analyzeJobMatch(
        user.skills || [],
        user.yearsOfExperience,
        user.education?.map(e => e.degree) || [],
        jobData.jobDescription,
        jobData.requiredSkills,
        jobData.preferredSkills,
        jobData.experienceRequired,
        jobData.educationRequired || []
      );

      // Create job match document
      const jobMatch = new JobMatch({
        userId,
        ...jobData,
        matchScore: analysis.matchScore,
        matchAnalysis: {
          skillMatch: analysis.skillMatch,
          experienceMatch: analysis.experienceMatch,
          educationMatch: analysis.educationMatch,
          overallFit: analysis.overallFit,
        },
        applicationStatus: 'saved',
        aiRecommendations: analysis.recommendations,
      });

      await jobMatch.save();

      logger.info(`Job match created for user ${userId}. Score: ${analysis.matchScore}`);

      return jobMatch;
    } catch (error) {
      logger.error('Create job match error:', error);
      throw error;
    }
  }

  // Get user's job matches
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
  ): Promise<{ jobs: IJobMatch[]; total: number }> {
    try {
      const {
        status,
        minScore,
        page = 1,
        limit = 10,
        sortBy = 'matchScore',
        sortOrder = 'desc',
      } = options;

      const query: any = { userId };

      if (status) {
        query.applicationStatus = status;
      }

      if (minScore !== undefined) {
        query.matchScore = { $gte: minScore };
      }

      const skip = (page - 1) * limit;

      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [jobs, total] = await Promise.all([
        JobMatch.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-jobDescription')
          .exec(),
        JobMatch.countDocuments(query),
      ]);

      return { jobs, total };
    } catch (error) {
      logger.error('Get user job matches error:', error);
      throw error;
    }
  }

  // Get job match by ID
  static async getJobMatchById(
    jobId: string,
    userId: string
  ): Promise<IJobMatch> {
    try {
      const job = await JobMatch.findOne({
        _id: jobId,
        userId,
      });

      if (!job) {
        throw ApiError.notFound('Job match not found');
      }

      return job;
    } catch (error) {
      logger.error('Get job match by ID error:', error);
      throw error;
    }
  }

  // Update application status
  static async updateStatus(
    jobId: string,
    userId: string,
    status: IJobMatch['applicationStatus'],
    notes?: string
  ): Promise<IJobMatch> {
    try {
      const updateData: any = { applicationStatus: status };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const job = await JobMatch.findOneAndUpdate(
        {
          _id: jobId,
          userId,
        },
        updateData,
        { new: true }
      );

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

  // Delete job match
  static async deleteJobMatch(
    jobId: string,
    userId: string
  ): Promise<void> {
    try {
      const job = await JobMatch.findOneAndDelete({
        _id: jobId,
        userId,
      });

      if (!job) {
        throw ApiError.notFound('Job match not found');
      }

      logger.info(`Job match ${jobId} deleted`);
    } catch (error) {
      logger.error('Delete job match error:', error);
      throw error;
    }
  }

  // Get job match statistics
  static async getJobMatchStats(userId: string): Promise<{
    totalJobs: number;
    savedJobs: number;
    appliedJobs: number;
    interviewingJobs: number;
    offeredJobs: number;
    averageMatchScore: number;
    highestMatchScore: number;
    byIndustry: Record<string, number>;
  }> {
    try {
      const jobs = await JobMatch.find({ userId }).exec();

      const totalJobs = jobs.length;
      const savedJobs = jobs.filter(j => j.applicationStatus === 'saved').length;
      const appliedJobs = jobs.filter(j => j.applicationStatus === 'applied').length;
      const interviewingJobs = jobs.filter(j => j.applicationStatus === 'interviewing').length;
      const offeredJobs = jobs.filter(j => ['offered', 'hired'].includes(j.applicationStatus)).length;

      const scores = jobs.map(j => j.matchScore);
      const averageMatchScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const highestMatchScore = scores.length > 0 ? Math.max(...scores) : 0;

      const byIndustry: Record<string, number> = {};
      jobs.forEach(job => {
        byIndustry[job.industry] = (byIndustry[job.industry] || 0) + 1;
      });

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

  // Get recommended jobs (high match score)
  static async getRecommendedJobs(
    userId: string,
    limit: number = 5
  ): Promise<IJobMatch[]> {
    try {
      const jobs = await JobMatch.find({
        userId,
        applicationStatus: 'saved',
        matchScore: { $gte: 70 },
      })
        .sort({ matchScore: -1 })
        .limit(limit)
        .select('-jobDescription')
        .exec();

      return jobs;
    } catch (error) {
      logger.error('Get recommended jobs error:', error);
      throw error;
    }
  }

  // Search job matches
  static async searchJobMatches(
    userId: string,
    searchQuery: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ jobs: IJobMatch[]; total: number }> {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const jobs = await JobMatch.find(
        {
          userId,
          $text: { $search: searchQuery },
        },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await JobMatch.countDocuments({
        userId,
        $text: { $search: searchQuery },
      });

      return { jobs, total };
    } catch (error) {
      logger.error('Search job matches error:', error);
      throw error;
    }
  }

  // Bulk create job matches from external source
  static async bulkCreateJobMatches(
    userId: string,
    jobs: Array<{
      jobTitle: string;
      company: string;
      jobDescription: string;
      requiredSkills: string[];
      industry: string;
      source: string;
      sourceUrl?: string;
    }>
  ): Promise<{ created: number; failed: number }> {
    try {
      let created = 0;
      let failed = 0;

      for (const jobData of jobs) {
        try {
          await this.createJobMatch(userId, {
            ...jobData,
            location: { remote: false, hybrid: false },
            experienceRequired: { min: 0, max: 10 },
            jobType: 'full_time',
            source: jobData.source,
          });
          created++;
        } catch (error) {
          failed++;
          logger.warn(`Failed to create job match for ${jobData.jobTitle}:`, error);
        }
      }

      return { created, failed };
    } catch (error) {
      logger.error('Bulk create job matches error:', error);
      throw error;
    }
  }
}
