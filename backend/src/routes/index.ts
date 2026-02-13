import { Router } from 'express';
import authRoutes from './auth';
import resumeRoutes from './resume';
import interviewRoutes from './interview';
import linkedinRoutes from './linkedin';
import roadmapRoutes from './roadmap';
import jobMatchRoutes from './jobMatch';
import subscriptionRoutes from './subscription';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/resume`, resumeRoutes);
router.use(`${API_VERSION}/interview`, interviewRoutes);
router.use(`${API_VERSION}/linkedin`, linkedinRoutes);
router.use(`${API_VERSION}/roadmap`, roadmapRoutes);
router.use(`${API_VERSION}/jobs`, jobMatchRoutes);
router.use(`${API_VERSION}/subscription`, subscriptionRoutes);

export default router;
