import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { db } from '../config/database';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { createClerkClient, verifyToken } from '@clerk/backend';

let clerkClient: any = null;

const getClerkClient = () => {
  if (!clerkClient && process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return clerkClient;
};

export const hasProAccess = (user: any): boolean => {
  if (user.role === 'admin' || user.role === 'enterprise') return true;
  if (user.role === 'pro') return true;
  
  // Check subscription
  if (user.subscription && user.subscription.status === 'active') {
    return user.subscription.plan === 'pro' || user.subscription.plan === 'enterprise';
  }
  return false;
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'Access denied. No token provided.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      errorResponse(res, 'Access denied. Invalid token format.', 401);
      return;
    }

    // 1. Try Clerk authentication if a secret key is available
    const clerk = getClerkClient();
    if (clerk) {
      try {
        const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        const clerkId = payload.sub;

        if (clerkId) {
          let [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

            if (!user) {
              // Retrieve user details from Clerk to sync on the fly
              try {
                const clerkUser = await clerk.users.getUser(clerkId);
                const email = clerkUser.emailAddresses[0]?.emailAddress;

                if (email) {
                  // Fallback: look up by email in case they were created locally first
                  [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
                  if (user) {
                    [user] = await db.update(users)
                      .set({ 
                        clerkId, 
                        avatar: clerkUser.imageUrl || user.avatar 
                      })
                      .where(eq(users._id, user._id))
                      .returning();
                  } else {
                    // Create new user
                    const firstName = clerkUser.firstName || 'User';
                    const lastName = clerkUser.lastName || '';
                    const avatar = clerkUser.imageUrl || '';
                    const isAdmin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

                    [user] = await db.insert(users).values({
                      clerkId,
                      email,
                      firstName,
                      lastName,
                      avatar,
                      role: isAdmin ? 'admin' : 'free',
                      subscription: {
                        status: 'none',
                        plan: 'free'
                      }
                    }).returning();
                    logger.info(`Successfully synced new Clerk user: ${email} (Role: ${user.role})`);
                  }
                }
              } catch (clerkApiError: any) {
                logger.error(`Error querying user from Clerk API: ${clerkApiError.message}`);
              }
            }

            if (user) {
              req.user = user;
              req.token = token;
              next();
              return;
            }
          }
      } catch (clerkError: any) {
        logger.debug(`Clerk token auth skipped: ${clerkError.message}. Proceeding to legacy JWT check.`);
      }
    }

    // 2. Legacy JWT Fallback
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not defined');
      errorResponse(res, 'Server configuration error', 500);
      return;
    }

    const decoded = jwt.verify(token, jwtSecret as Secret) as JwtPayload;

    let [user] = await db.select().from(users).where(eq(users._id, decoded.userId)).limit(1);

    if (!user) {
      // Fallback to Firebase
      try {
        const { getFirestore } = await import('../config/firebase');
        const firestoreDb = getFirestore();
        const doc = await firestoreDb.collection('users').doc(decoded.userId).get();
        if (doc.exists) {
          user = doc.data() as any;
          user._id = doc.id;
          logger.info(`Successfully authenticated user ${decoded.userId} from Firebase fallback.`);
        }
      } catch (fbError: any) {
        logger.warn(`Firebase fallback failed for ${decoded.userId}: ${fbError.message}`);
      }
    }

    if (!user) {
      errorResponse(res, 'User not found or database unavailable', 401);
      return;
    }

    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      errorResponse(res, 'Token expired. Please login again.', 401);
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      errorResponse(res, 'Invalid token', 401);
      return;
    }

    logger.error('Authentication error:', error);
    errorResponse(res, 'Authentication failed', 401);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  }
};

export const requirePro = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!hasProAccess(req.user)) {
      errorResponse(res, 'Pro subscription required', 403);
      return;
    }

    next();
  } catch (error) {
    logger.error('Pro check error:', error);
    errorResponse(res, 'Failed to verify subscription', 500);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    // 1. Try Clerk Verification
    const clerk = getClerkClient();
    if (clerk) {
      try {
        const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        const clerkId = payload.sub;

        if (clerkId) {
          const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
          if (user) {
            req.user = user;
            req.token = token;
            next();
            return;
          }
        }
      } catch {
        // Fallback to legacy JWT
      }
    }

    // 2. Legacy JWT Fallback
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret as Secret) as JwtPayload;
    const [user] = await db.select().from(users).where(eq(users._id, decoded.userId)).limit(1);

    if (user) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch {
    next();
  }
};

export const generateTokens = (
  user: any
): { accessToken: string; refreshToken: string } => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets are not defined');
  }

  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, jwtSecret as Secret, {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, jwtRefreshSecret as Secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  return jwt.verify(token, jwtRefreshSecret as Secret) as JwtPayload;
};
