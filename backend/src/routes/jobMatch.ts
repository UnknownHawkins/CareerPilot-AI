import { Router } from 'express';
import { JobMatchController } from '../controllers/jobMatchController';
import { authenticate, requirePro } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import {
  createJobMatchValidator,
  paginationValidator,
  idParamValidator,
} from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create job match
router.post(
  '/',
  aiRateLimiter,
  createJobMatchValidator,
  JobMatchController.createJobMatch
);

// Get user's job matches
router.get('/', paginationValidator, JobMatchController.getUserJobMatches);

// Get job match statistics
router.get('/stats', JobMatchController.getJobMatchStats);

// Get recommended jobs (Pro feature)
router.get('/recommended', requirePro, JobMatchController.getRecommendedJobs);

// Search job matches
router.get('/search', JobMatchController.searchJobMatches);

// Bulk create job matches (Pro feature)
router.post('/bulk', requirePro, JobMatchController.bulkCreateJobMatches);

// Get job match by ID
router.get('/:id', idParamValidator, JobMatchController.getJobMatchById);

// Update application status
router.put('/:id/status', idParamValidator, JobMatchController.updateStatus);

// Delete job match
router.delete('/:id', idParamValidator, JobMatchController.deleteJobMatch);

export default router;
