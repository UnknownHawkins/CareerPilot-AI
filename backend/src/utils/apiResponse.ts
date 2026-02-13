import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: any[];
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string = 'Internal Server Error',
  statusCode: number = 500,
  errors?: any[]
): void => {
  const response: ApiResponse = {
    success: false,
    message,
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  res.status(statusCode).json(response);
};

export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): void => {
  const totalPages = Math.ceil(total / limit);
  
  successResponse(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages,
  });
};

export class ApiError extends Error {
  statusCode: number;
  errors?: any[];
  
  constructor(message: string, statusCode: number = 500, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
  
  static badRequest(message: string = 'Bad Request', errors?: any[]): ApiError {
    return new ApiError(message, 400, errors);
  }
  
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401);
  }
  
  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(message, 403);
  }
  
  static notFound(message: string = 'Not Found'): ApiError {
    return new ApiError(message, 404);
  }
  
  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError(message, 409);
  }
  
  static tooManyRequests(message: string = 'Too Many Requests'): ApiError {
    return new ApiError(message, 429);
  }
  
  static internal(message: string = 'Internal Server Error'): ApiError {
    return new ApiError(message, 500);
  }
}
