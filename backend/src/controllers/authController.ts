import { Request, Response } from 'express';
import { db } from '../config/database';
import { users, subscriptions } from '../models/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateTokens } from '../middleware/auth';
import { successResponse, errorResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser) {
        throw ApiError.conflict('User with this email already exists');
      }

      // Hash password
      let hashedPassword = null;
      if (password) {
        const salt = await bcrypt.genSalt(12);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      // Create new user
      const [user] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'free',
        subscription: {
          status: 'none',
          plan: 'free',
        },
        usage: {
          resumeAnalysisCount: 0,
          interviewSessionsCount: 0,
          linkedinReviewCount: 0,
          jobMatchCount: 0,
          adCredits: 0,
          adsWatchedThisSession: 0,
          lastResetDate: new Date(),
        },
      }).returning();

      // Create free subscription
      const [subscription] = await db.insert(subscriptions).values({
        userId: user._id,
        plan: 'free',
        status: 'active',
        endDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).returning();

      // Dual write to Firebase Firestore (Optional fallback)
      try {
        const { getFirestore } = await import('../config/firebase');
        const firestoreDb = getFirestore();
        await firestoreDb.collection('users').doc(user._id).set({
          ...user,
          password: user.password
        });
        logger.info(`User ${user.email} mirrored to Firebase Firestore successfully.`);
      } catch (fbError: any) {
        logger.warn(`Failed to mirror user ${user.email} to Firebase: ${fbError.message}`);
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      logger.info(`New user registered: ${email}`);

      successResponse(
        res,
        {
          user: userResponse,
          tokens: { accessToken, refreshToken },
        },
        'User registered successfully',
        201
      );
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user
      let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      let isFirebaseUser = false;
      let firebaseUserData: any = null;

      if (!user) {
        // Fallback to Firebase
        try {
          const { getFirestore } = await import('../config/firebase');
          const firestoreDb = getFirestore();
          const snapshot = await firestoreDb.collection('users').where('email', '==', email).limit(1).get();
          if (!snapshot.empty) {
            firebaseUserData = snapshot.docs[0].data();
            firebaseUserData._id = snapshot.docs[0].id;
            isFirebaseUser = true;
            logger.info(`Successfully fetched user ${email} from Firebase fallback.`);
          }
        } catch (fbError: any) {
          logger.warn(`Firebase fallback failed for ${email}: ${fbError.message}`);
        }

        if (!isFirebaseUser) {
          throw ApiError.unauthorized('Invalid email or password');
        }
      }

      // Check password
      let isPasswordValid = false;
      if (isFirebaseUser && firebaseUserData) {
        isPasswordValid = await bcrypt.compare(password, firebaseUserData.password);
      } else if (user && user.password) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      }

      if (!isPasswordValid) {
        throw ApiError.unauthorized('Invalid email or password');
      }

      // Update last login
      if (user) {
        [user] = await db.update(users)
          .set({ lastLoginAt: new Date().toISOString() })
          .where(eq(users._id, user._id))
          .returning();
      } else if (isFirebaseUser && firebaseUserData) {
        // Fallback hydrating
        user = firebaseUserData;
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      logger.info(`User logged in: ${email}`);

      successResponse(res, {
        user: userResponse,
        tokens: { accessToken, refreshToken },
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw ApiError.badRequest('Refresh token is required');
      }

      // Verify refresh token
      const { verifyRefreshToken } = await import('../middleware/auth');
      const decoded = verifyRefreshToken(refreshToken);

      // Find user
      const [user] = await db.select().from(users).where(eq(users._id, decoded.userId)).limit(1);
      if (!user) {
        throw ApiError.unauthorized('User not found');
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      successResponse(res, { tokens });
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  // Get current user
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      
      if (!user) {
        throw ApiError.unauthorized('Not authenticated');
      }

      // Get subscription details
      const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user._id)).limit(1);

      successResponse(res, {
        user,
        subscription,
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }

  // Update profile
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const updateData = req.body;

      // Fields that can be updated
      const allowedUpdates = [
        'firstName',
        'lastName',
        'skills',
        'experience',
        'education',
        'targetRole',
        'industry',
        'yearsOfExperience',
        'preferences',
      ];

      const updates: any = {};
      allowedUpdates.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });
      
      updates.updatedAt = new Date().toISOString();

      const [user] = await db.update(users)
        .set(updates)
        .where(eq(users._id, userId))
        .returning();

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      logger.info(`Profile updated for user ${userId}`);

      successResponse(res, user, 'Profile updated successfully');
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

  // Change password
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { currentPassword, newPassword } = req.body;

      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Verify current password
      let isValid = false;
      if (user.password) {
         isValid = await bcrypt.compare(currentPassword, user.password);
      }
      
      if (!isValid) {
        throw ApiError.badRequest('Current password is incorrect');
      }

      // Update password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      await db.update(users).set({ password: hashedPassword }).where(eq(users._id, userId));

      logger.info(`Password changed for user ${userId}`);

      successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  // Logout
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`User logged out: ${req.user?._id}`);
      successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        successResponse(res, null, 'If an account exists, a reset email will be sent');
        return;
      }

      logger.info(`Password reset requested for: ${email}`);

      successResponse(res, null, 'If an account exists, a reset email will be sent');
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  // Get user stats
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;

      const [
        resumeStats,
        interviewStats,
        roadmapStats,
        jobMatchStats,
      ] = await Promise.all([
        import('../services/resumeService').then(s => s.ResumeService.getAnalysisStats(userId)),
        import('../services/interviewService').then(s => s.InterviewService.getInterviewStats(userId)),
        import('../services/roadmapService').then(s => s.RoadmapService.getRoadmapStats(userId)),
        import('../services/jobMatchService').then(s => s.JobMatchService.getJobMatchStats(userId)),
      ]);

      successResponse(res, {
        resume: resumeStats,
        interview: interviewStats,
        roadmap: roadmapStats,
        jobMatch: jobMatchStats,
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw error;
    }
  }
}
