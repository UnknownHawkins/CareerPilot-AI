import { ResumeAnalysis, IResumeAnalysis } from '../models/Resume';
import { User } from '../models/User';
import { GeminiService, ResumeAnalysisResult } from './geminiService';
import { parseResume, cleanExtractedText } from '../utils/fileParser';
import { uploadFileToFirebase } from '../config/firebase';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';

export class ResumeService {
  // Upload and analyze resume
  static async uploadAndAnalyze(
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string,
    fileType: string,
    targetRole?: string,
    industry?: string
  ): Promise<IResumeAnalysis> {
    try {
      // Check user limits
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (!user.canUseResumeAnalysis()) {
        throw ApiError.forbidden('Resume analysis limit reached. Upgrade to Pro for unlimited analyses.');
      }

      // Parse resume text
      const extractedText = await parseResume(fileBuffer, fileType);
      const cleanedText = cleanExtractedText(extractedText);

      if (cleanedText.length < 100) {
        throw ApiError.badRequest('Could not extract sufficient text from the resume. Please check the file.');
      }

      // Upload file to Firebase
      const fileUrl = await uploadFileToFirebase(
        fileBuffer,
        originalFileName,
        fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'resumes'
      );

      // Analyze with Gemini
      const analysisResult = await GeminiService.analyzeResume(
        cleanedText,
        targetRole,
        industry
      );

      // Save analysis to database
      const resumeAnalysis = new ResumeAnalysis({
        userId,
        originalFileName,
        fileUrl,
        fileType: fileType as 'pdf' | 'docx' | 'doc',
        extractedText: cleanedText,
        atsScore: analysisResult.atsScore,
        analysis: {
          overallFeedback: analysisResult.overallFeedback,
          strengths: analysisResult.strengths,
          weaknesses: analysisResult.weaknesses,
          sections: analysisResult.sections,
          keywordOptimization: analysisResult.keywordOptimization,
          formatting: analysisResult.formatting,
        },
        skillGapAnalysis: analysisResult.skillGapAnalysis,
        improvementSuggestions: analysisResult.improvementSuggestions,
      });

      await resumeAnalysis.save();

      // Increment user usage
      user.usage.resumeAnalysisCount += 1;
      await user.save();

      logger.info(`Resume analyzed for user ${userId}. ATS Score: ${analysisResult.atsScore}`);

      return resumeAnalysis;
    } catch (error) {
      logger.error('Resume upload and analysis error:', error);
      throw error;
    }
  }

  // Get user's resume analyses
  static async getUserAnalyses(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ analyses: IResumeAnalysis[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [analyses, total] = await Promise.all([
        ResumeAnalysis.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-extractedText')
          .exec(),
        ResumeAnalysis.countDocuments({ userId }),
      ]);

      return { analyses, total };
    } catch (error) {
      logger.error('Get user analyses error:', error);
      throw error;
    }
  }

  // Get single analysis
  static async getAnalysisById(
    analysisId: string,
    userId: string
  ): Promise<IResumeAnalysis> {
    try {
      const analysis = await ResumeAnalysis.findOne({
        _id: analysisId,
        userId,
      });

      if (!analysis) {
        throw ApiError.notFound('Analysis not found');
      }

      return analysis;
    } catch (error) {
      logger.error('Get analysis by ID error:', error);
      throw error;
    }
  }

  // Delete analysis
  static async deleteAnalysis(
    analysisId: string,
    userId: string
  ): Promise<void> {
    try {
      const analysis = await ResumeAnalysis.findOneAndDelete({
        _id: analysisId,
        userId,
      });

      if (!analysis) {
        throw ApiError.notFound('Analysis not found');
      }

      // Delete file from Firebase
      try {
        const { deleteFileFromFirebase } = await import('../config/firebase');
        await deleteFileFromFirebase(analysis.fileUrl);
      } catch (firebaseError) {
        logger.warn('Failed to delete file from Firebase:', firebaseError);
      }

      logger.info(`Analysis ${analysisId} deleted for user ${userId}`);
    } catch (error) {
      logger.error('Delete analysis error:', error);
      throw error;
    }
  }

  // Get analysis statistics
  static async getAnalysisStats(userId: string): Promise<{
    totalAnalyses: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    recentAnalyses: IResumeAnalysis[];
  }> {
    try {
      const analyses = await ResumeAnalysis.find({ userId })
        .sort({ createdAt: -1 })
        .select('atsScore createdAt originalFileName')
        .exec();

      if (analyses.length === 0) {
        return {
          totalAnalyses: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          recentAnalyses: [],
        };
      }

      const scores = analyses.map(a => a.atsScore);
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

  // Reanalyze existing resume
  static async reanalyzeResume(
    analysisId: string,
    userId: string,
    targetRole?: string,
    industry?: string
  ): Promise<IResumeAnalysis> {
    try {
      const existingAnalysis = await ResumeAnalysis.findOne({
        _id: analysisId,
        userId,
      });

      if (!existingAnalysis) {
        throw ApiError.notFound('Analysis not found');
      }

      // Check user limits
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (!user.hasProAccess() && user.usage.resumeAnalysisCount >= 3) {
        throw ApiError.forbidden('Free tier limit reached. Upgrade to Pro for more analyses.');
      }

      // Reanalyze with new parameters
      const analysisResult = await GeminiService.analyzeResume(
        existingAnalysis.extractedText,
        targetRole,
        industry
      );

      // Update analysis
      existingAnalysis.atsScore = analysisResult.atsScore;
      existingAnalysis.analysis = {
        overallFeedback: analysisResult.overallFeedback,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        sections: analysisResult.sections,
        keywordOptimization: analysisResult.keywordOptimization,
        formatting: analysisResult.formatting,
      };
      existingAnalysis.skillGapAnalysis = analysisResult.skillGapAnalysis;
      existingAnalysis.improvementSuggestions = analysisResult.improvementSuggestions;

      await existingAnalysis.save();

      // Increment usage for free users
      if (!user.hasProAccess()) {
        user.usage.resumeAnalysisCount += 1;
        await user.save();
      }

      logger.info(`Resume reanalyzed for user ${userId}. New ATS Score: ${analysisResult.atsScore}`);

      return existingAnalysis;
    } catch (error) {
      logger.error('Reanalyze resume error:', error);
      throw error;
    }
  }
}
