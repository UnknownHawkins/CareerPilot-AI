import { db } from '../config/database';
import { users, resumes } from '../models/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { GroqService } from './groqService';
import { parseResume, cleanExtractedText } from '../utils/fileParser';
import { uploadFileToFirebase } from '../config/firebase';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';
import { hasProAccess } from '../middleware/auth';
import { SubscriptionService } from './subscriptionService';

export class ResumeService {
  static async uploadAndAnalyze(
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string,
    fileType: string,
    mimetype: string,
    targetRole?: string,
    industry?: string
  ) {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const hasAccess = await SubscriptionService.checkFeatureAccess(userId, 'resumeAnalysis');
      if (!hasAccess) {
        throw ApiError.forbidden('Resume analysis limit reached. Upgrade to Pro for unlimited analyses.');
      }

      const extractedText = await parseResume(fileBuffer, fileType);
      const cleanedText = cleanExtractedText(extractedText);

      if (fileType !== 'image' && fileType !== 'email' && cleanedText.length < 100) {
        throw ApiError.badRequest('Could not extract sufficient text from the resume. Please check the file.');
      }

      let fileUrl = '';
      try {
        fileUrl = await uploadFileToFirebase(
          fileBuffer,
          originalFileName,
          fileType === 'pdf' ? 'application/pdf' : 
          fileType === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
          fileType === 'image' ? (mimetype || 'image/jpeg') : 'text/plain',
          'resumes'
        );
      } catch (err: any) {
        logger.warn('Firebase upload failed:', err.message);
      }

      const analysisResult = await GroqService.analyzeResume(
        fileType === 'image' ? 'Analyze this resume image.' : cleanedText,
        targetRole,
        industry,
        fileType === 'image' ? {
          buffer: fileBuffer,
          mimeType: mimetype
        } : undefined
      );

      const [resume] = await db.insert(resumes).values({
        userId,
        originalFileName,
        originalFileUrl: fileUrl,
        fileType,
        fileSize: fileBuffer.length,
        parsedContent: {
          personalInfo: {},
          summary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          ...((fileType === 'image' ? { extractedText: 'IMAGE_CONTENT' } : { extractedText: cleanedText }) as any)
        },
        analysis: {
          score: analysisResult.atsScore || 0,
          recommendations: analysisResult.improvementSuggestions || [],
          keywordMatch: 0,
          formattingScore: 0,
          impactScore: 0,
          industryFit: '',
          ...analysisResult,
        },
      } as any).returning();

      if (!hasProAccess(user)) {
        await SubscriptionService.incrementUsage(userId, 'resumeAnalysis');
      }

      logger.info(`Resume analyzed for user ${userId}. ATS Score: ${analysisResult.atsScore}`);
      
      try {
        const { ActivityService } = await import('./activityService');
        await ActivityService.logActivity(
          userId,
          'resume_analysis',
          'Resume analyzed',
          `ATS Score: ${analysisResult.atsScore}%`,
          `/resume/${resume._id}`,
          { score: analysisResult.atsScore }
        );
      } catch (actError) {
        logger.warn('Failed to log resume activity:', actError);
      }

      try {
        const { getFirestore } = await import('../config/firebase');
        const dbFirestore = getFirestore();
        const firestoreData = { ...resume } as any;
        await dbFirestore.collection('analyses').doc(resume._id.toString()).set({
          ...firestoreData,
          userId: userId.toString()
        });
        logger.info(`Resume analysis ${resume._id} mirrored to Firebase Firestore.`);
      } catch (fbError: any) {
        logger.warn(`Failed to mirror analysis ${resume._id} to Firebase: ${fbError.message}`);
      }

      return resume;
    } catch (error: any) {
      logger.error('Resume upload and analysis error:', error);
      throw error;
    }
  }

  static async getUserAnalyses(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const offset = (page - 1) * limit;

      const analyses = await db.select({
        _id: resumes._id,
        userId: resumes.userId,
        originalFileName: resumes.originalFileName,
        originalFileUrl: resumes.originalFileUrl,
        analysis: resumes.analysis,
        createdAt: resumes.createdAt,
        updatedAt: resumes.updatedAt
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt))
      .limit(limit)
      .offset(offset);

      const [{ count: total }] = await db.select({ count: count() })
        .from(resumes)
        .where(eq(resumes.userId, userId));

      return { analyses, total };
    } catch (error) {
      logger.error('Get user analyses error:', error);
      throw error;
    }
  }

  static async getAnalysisById(
    analysisId: string,
    userId: string
  ) {
    try {
      const [analysis] = await db.select()
        .from(resumes)
        .where(and(eq(resumes._id, analysisId), eq(resumes.userId, userId)))
        .limit(1);

      if (!analysis) {
        throw ApiError.notFound('Analysis not found');
      }

      return analysis;
    } catch (error) {
      logger.error('Get analysis by ID error:', error);
      throw error;
    }
  }

  static async deleteAnalysis(
    analysisId: string,
    userId: string
  ): Promise<void> {
    try {
      const [analysis] = await db.delete(resumes)
        .where(and(eq(resumes._id, analysisId), eq(resumes.userId, userId)))
        .returning();

      if (!analysis) {
        throw ApiError.notFound('Analysis not found');
      }

      if (analysis.originalFileUrl) {
        try {
          const { deleteFileFromFirebase } = await import('../config/firebase');
          await deleteFileFromFirebase(analysis.originalFileUrl);
        } catch (firebaseError) {
          logger.warn('Failed to delete file from Firebase:', firebaseError);
        }
      }

      logger.info(`Analysis ${analysisId} deleted for user ${userId}`);
    } catch (error) {
      logger.error('Delete analysis error:', error);
      throw error;
    }
  }

  static async getAnalysisStats(userId: string) {
    try {
      const analyses = await db.select({
        _id: resumes._id,
        analysis: resumes.analysis,
        originalFileName: resumes.originalFileName,
        createdAt: resumes.createdAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt));

      if (analyses.length === 0) {
        return {
          totalAnalyses: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          recentAnalyses: [],
        };
      }

      const scores = analyses.map(a => (a.analysis as any)?.score || 0);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      return {
        totalAnalyses: analyses.length,
        averageScore: Math.round(averageScore),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        recentAnalyses: analyses.slice(0, 5),
      };
    } catch (error) {
      logger.error('Get analysis stats error:', error);
      throw error;
    }
  }

  static async reanalyzeResume(
    analysisId: string,
    userId: string,
    targetRole?: string,
    industry?: string
  ) {
    try {
      const [existingAnalysis] = await db.select()
        .from(resumes)
        .where(and(eq(resumes._id, analysisId), eq(resumes.userId, userId)))
        .limit(1);

      if (!existingAnalysis) {
        throw ApiError.notFound('Analysis not found');
      }

      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const hasAccess = await SubscriptionService.checkFeatureAccess(userId, 'resumeAnalysis');
      if (!hasAccess) {
        throw ApiError.forbidden('Resume analysis limit reached. Upgrade to Pro for unlimited analyses.');
      }

      const analysisResult = await GroqService.analyzeResume(
        (existingAnalysis.parsedContent as any)?.extractedText || '',
        targetRole,
        industry
      );

      const [updatedAnalysis] = await db.update(resumes)
        .set({
          analysis: {
            score: analysisResult.atsScore || 0,
            recommendations: analysisResult.improvementSuggestions || [],
            keywordMatch: 0,
            formattingScore: 0,
            impactScore: 0,
            industryFit: '',
            ...analysisResult, // Spread for backwards compat if needed in JSON
          },
          updatedAt: new Date().toISOString()
        } as any)
        .where(eq(resumes._id, analysisId))
        .returning();

      if (!hasProAccess(user)) {
        await SubscriptionService.incrementUsage(userId, 'resumeAnalysis');
      }

      logger.info(`Resume reanalyzed for user ${userId}. New ATS Score: ${analysisResult.atsScore}`);

      return updatedAnalysis;
    } catch (error) {
      logger.error('Reanalyze resume error:', error);
      throw error;
    }
  }
}
