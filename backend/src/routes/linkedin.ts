import { Router } from 'express';
import { LinkedInController } from '../controllers/linkedinController';
import { authenticate } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { linkedInReviewValidator } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Analyze full profile
router.post(
  '/analyze',
  aiRateLimiter,
  linkedInReviewValidator,
  LinkedInController.analyzeProfile
);

// Analyze headline only
router.post('/analyze/headline', aiRateLimiter, LinkedInController.analyzeHeadline);

// Analyze summary only
router.post('/analyze/summary', aiRateLimiter, LinkedInController.analyzeSummary);

// Generate headline suggestions
router.post(
  '/suggestions/headline',
  aiRateLimiter,
  LinkedInController.generateHeadlineSuggestions
);

// Generate optimized summary
router.post('/generate/summary', aiRateLimiter, LinkedInController.generateSummary);

// Optimize skills
router.post('/optimize/skills', aiRateLimiter, LinkedInController.optimizeSkills);

// Calculate profile completion
router.post('/completion', LinkedInController.calculateProfileCompletion);

// Get optimization checklist
router.get('/checklist', LinkedInController.getOptimizationChecklist);

export default router;
