import { Request, Response, NextFunction } from 'express';
import { ApiError, errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?._id,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    errorResponse(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    const mongoError = err as any;
    
    // Duplicate key error
    if (mongoError.code === 11000) {
      const field = Object.keys(mongoError.keyValue)[0];
      errorResponse(res, `${field} already exists`, 409);
      return;
    }
    
    errorResponse(res, 'Database error', 500);
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const validationError = err as any;
    const errors = Object.values(validationError.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    errorResponse(res, 'Validation failed', 400, errors);
    return;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    errorResponse(res, 'Invalid ID format', 400);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse(res, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse(res, 'Token expired', 401);
    return;
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    const multerError = err as any;
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      errorResponse(res, 'File too large', 400);
      return;
    }
    if (multerError.code === 'LIMIT_FILE_COUNT') {
      errorResponse(res, 'Too many files', 400);
      return;
    }
    errorResponse(res, 'File upload error', 400);
    return;
  }

  // Handle SyntaxError (JSON parsing)
  if (err instanceof SyntaxError && 'body' in err) {
    errorResponse(res, 'Invalid JSON', 400);
    return;
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  errorResponse(
    res,
    isDevelopment ? err.message : 'Internal server error',
    500,
    isDevelopment ? [{ stack: err.stack }] : undefined
  );
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
