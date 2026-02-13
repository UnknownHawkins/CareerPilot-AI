import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    errorResponse(res, 'Too many requests, please try again later', 429);
  },
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    errorResponse(res, 'Too many authentication attempts, please try again later', 429);
  },
});

// Rate limiter for AI features (more restrictive)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI requests per hour
  handler: (req, res) => {
    logger.warn(`AI rate limit exceeded for IP: ${req.ip}`);
    errorResponse(res, 'AI feature limit reached, please try again later', 429);
  },
});

// Rate limiter for file uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    errorResponse(res, 'Upload limit reached, please try again later', 429);
  },
});

// Rate limiter based on user role
export const roleBasedRateLimiter = (req: any, res: any, next: any) => {
  const user = req.user;
  
  // Pro users get higher limits
  if (user && user.hasProAccess()) {
    return rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 100,
      handler: (req, res) => {
        errorResponse(res, 'Rate limit reached', 429);
      },
    })(req, res, next);
  }
  
  // Free users get lower limits
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    handler: (req, res) => {
      errorResponse(res, 'Free tier rate limit reached. Upgrade to Pro for more.', 429);
    },
  })(req, res, next);
};

// Custom rate limiter factory
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    handler: (req, res) => {
      logger.warn(`Custom rate limit exceeded for IP: ${req.ip}`);
      errorResponse(res, options.message || 'Rate limit exceeded', 429);
    },
  });
};
