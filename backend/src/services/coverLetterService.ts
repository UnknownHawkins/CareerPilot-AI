import { db } from '../config/database';
import { coverLetters, resumes } from '../models/schema';
import { GroqService } from './groqService';
import { logger } from '../utils/logger';
import { SubscriptionService } from './subscriptionService';
import { eq, desc, and } from 'drizzle-orm';

export class CoverLetterService {
  /**
   * Generate a Cover Letter
   */
  static async generate(
    userId: string,
    jobTitle: string,
    companyName: string,
    jobDescription: string,
    resumeId?: string
  ) {
    try {
      // 1. Check feature access
      const hasAccess = await SubscriptionService.checkFeatureAccess(userId, 'coverLetter');
      if (!hasAccess) {
        throw new Error('Upgrade to Pro to generate Cover Letters.');
      }

      // 2. Fetch Resume if provided
      let resumeText = '';
      if (resumeId) {
        const [resume] = await db.select().from(resumes).where(and(eq(resumes._id, resumeId), eq(resumes.userId, userId))).limit(1);
        if (resume && resume.parsedContent) {
          resumeText = JSON.stringify(resume.parsedContent);
        }
      } else {
        // Find latest resume if none provided
        const [latestResume] = await db.select()
          .from(resumes)
          .where(eq(resumes.userId, userId))
          .orderBy(desc(resumes.createdAt))
          .limit(1);
          
        if (latestResume && latestResume.parsedContent) {
          resumeText = JSON.stringify(latestResume.parsedContent);
        }
      }

      // 3. Generate using AI
      const aiResult = await GroqService.generateCoverLetter(
        resumeText,
        jobTitle,
        companyName,
        jobDescription
      );

      // 4. Save to DB
      const [coverLetter] = await db.insert(coverLetters).values({
        userId,
        resumeId: resumeId || null,
        jobTitle,
        companyName,
        jobDescription,
        generatedContent: aiResult.coverLetter,
      }).returning();

      // 5. Deduct token/usage
      await SubscriptionService.incrementUsage(userId, 'coverLetter');

      return coverLetter;
    } catch (error) {
      logger.error('Error generating cover letter:', error);
      throw error;
    }
  }

  /**
   * Get user's cover letter history
   */
  static async getUserHistory(userId: string) {
    return db.select()
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId))
      .orderBy(desc(coverLetters.createdAt));
  }
  
  /**
   * Delete a cover letter
   */
  static async delete(userId: string, id: string) {
    const [deleted] = await db.delete(coverLetters)
      .where(and(eq(coverLetters._id, id), eq(coverLetters.userId, userId)))
      .returning();
      
    if (!deleted) {
      throw new Error('Cover letter not found');
    }
    
    return deleted;
  }
}
