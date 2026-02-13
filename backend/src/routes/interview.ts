import { Router } from 'express';
import { InterviewController } from '../controllers/interviewController';
import { authenticate, requirePro } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import {
  createInterviewValidator,
  answerQuestionValidator,
  paginationValidator,
  idParamValidator,
} from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create interview session
router.post(
  '/',
  aiRateLimiter,
  createInterviewValidator,
  InterviewController.createSession
);

// Get user's sessions
router.get('/', paginationValidator, InterviewController.getUserSessions);

// Get interview statistics
router.get('/stats', InterviewController.getInterviewStats);

// Get interview tips
router.get('/tips', InterviewController.getInterviewTips);

// Get session by ID
router.get('/:id', idParamValidator, InterviewController.getSessionById);

// Submit answer
router.post(
  '/:id/answer',
  idParamValidator,
  answerQuestionValidator,
  InterviewController.submitAnswer
);

// Complete session
router.post('/:id/complete', idParamValidator, InterviewController.completeSession);

// Abandon session
router.post('/:id/abandon', idParamValidator, InterviewController.abandonSession);

// Delete session
router.delete('/:id', idParamValidator, InterviewController.deleteSession);

export default router;
