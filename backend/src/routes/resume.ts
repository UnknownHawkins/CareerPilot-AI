import { Router } from 'express';
import { ResumeController } from '../controllers/resumeController';
import { authenticate, requirePro } from '../middleware/auth';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { resumeUpload } from '../middleware/upload';
import { resumeUploadValidator, paginationValidator, idParamValidator } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload and analyze resume
router.post(
  '/upload',
  uploadRateLimiter,
  resumeUpload.single('resume'),
  resumeUploadValidator,
  ResumeController.uploadAndAnalyze
);

// Get user's analyses
router.get('/', paginationValidator, ResumeController.getUserAnalyses);

// Get analysis statistics
router.get('/stats', ResumeController.getAnalysisStats);

// Compare resumes (Pro feature)
router.post('/compare', requirePro, ResumeController.compareResumes);

// Reanalyze resume
router.post('/:id/reanalyze', idParamValidator, ResumeController.reanalyzeResume);

// Get analysis by ID
router.get('/:id', idParamValidator, ResumeController.getAnalysisById);

// Delete analysis
router.delete('/:id', idParamValidator, ResumeController.deleteAnalysis);

export default router;
