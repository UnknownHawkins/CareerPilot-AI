import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
} from '../utils/validators';

const router = Router();

// Public routes
router.post('/register', registerValidator, AuthController.register);
router.post('/login', authRateLimiter, loginValidator, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);

// Protected routes
router.use(authenticate);

router.get('/me', AuthController.getCurrentUser);
router.put('/profile', updateProfileValidator, AuthController.updateProfile);
router.put('/change-password', AuthController.changePassword);
router.post('/logout', AuthController.logout);
router.get('/stats', AuthController.getUserStats);

export default router;
