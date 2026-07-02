import { Request, Response } from 'express';
import { CoverLetterService } from '../services/coverLetterService';
import { logger } from '../utils/logger';

export class CoverLetterController {
  /**
   * Generate a Cover Letter
   */
  static async generate(req: Request, res: Response) {
    try {
      const { jobTitle, companyName, jobDescription, resumeId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!jobTitle || !companyName || !jobDescription) {
        return res.status(400).json({ 
          success: false, 
          message: 'Job Title, Company Name, and Job Description are required' 
        });
      }

      const coverLetter = await CoverLetterService.generate(
        userId,
        jobTitle,
        companyName,
        jobDescription,
        resumeId
      );

      res.status(201).json({
        success: true,
        data: coverLetter,
      });
    } catch (error: any) {
      logger.error('CoverLetterController.generate error:', error);
      
      // Handle subscription errors explicitly
      if (error.message.includes('Upgrade to Pro')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate cover letter',
      });
    }
  }

  /**
   * Get user's cover letter history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const history = await CoverLetterService.getUserHistory(userId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error('CoverLetterController.getHistory error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch history',
      });
    }
  }

  /**
   * Delete a cover letter
   */
  static async delete(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      await CoverLetterService.delete(userId, id);

      res.status(200).json({
        success: true,
        message: 'Cover letter deleted successfully',
      });
    } catch (error: any) {
      logger.error('CoverLetterController.delete error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete cover letter',
      });
    }
  }
}
