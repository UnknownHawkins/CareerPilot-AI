import { Router } from 'express';
import { RoadmapController } from '../controllers/roadmapController';
import { authenticate } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { createRoadmapValidator, idParamValidator } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create career roadmap
router.post(
  '/',
  aiRateLimiter,
  createRoadmapValidator,
  RoadmapController.createRoadmap
);

// Get user's roadmaps
router.get('/', RoadmapController.getUserRoadmaps);

// Get roadmap statistics
router.get('/stats', RoadmapController.getRoadmapStats);

// Get upcoming milestones
router.get('/milestones/upcoming', RoadmapController.getUpcomingMilestones);

// Get roadmap by ID
router.get('/:id', idParamValidator, RoadmapController.getRoadmapById);

// Complete milestone
router.post(
  '/:id/milestones/:milestoneId/complete',
  idParamValidator,
  RoadmapController.completeMilestone
);

// Update roadmap status
router.put('/:id/status', idParamValidator, RoadmapController.updateStatus);

// Get skill gap analysis
router.get('/:id/skill-gap', idParamValidator, RoadmapController.getSkillGapAnalysis);

// Get learning resources
router.get('/:id/resources', idParamValidator, RoadmapController.getLearningResources);

// Delete roadmap
router.delete('/:id', idParamValidator, RoadmapController.deleteRoadmap);

export default router;
