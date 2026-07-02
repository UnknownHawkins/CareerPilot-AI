import { Router } from 'express';
import { CoverLetterController } from '../controllers/coverLetterController';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protect all routes
router.use(authenticate);

// Apply rate limiting specifically to the generate endpoint to prevent spam
const generateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many cover letters generated, please try again later.',
});

// Routes
router.post('/generate', generateLimiter as any, CoverLetterController.generate);
router.get('/history', CoverLetterController.getHistory);
router.delete('/:id', CoverLetterController.delete);

export default router;
