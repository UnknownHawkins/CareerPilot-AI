import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from './apiResponse';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 'Validation failed', 400, errors.array());
    return;
  }
  next();
};

// Auth validators
export const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  handleValidationErrors,
];

export const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Resume validators
export const resumeUploadValidator = [
  body('targetRole')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Target role must be at least 2 characters'),
  body('industry')
    .optional()
    .trim(),
  handleValidationErrors,
];

// Interview validators
export const createInterviewValidator = [
  body('jobRole')
    .optional()
    .trim(),
  body('experienceLevel')
    .isIn(['entry', 'mid', 'senior', 'executive'])
    .withMessage('Invalid experience level'),
  body('industry')
    .optional()
    .trim(),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  handleValidationErrors,
];

export const answerQuestionValidator = [
  body('questionId')
    .notEmpty()
    .withMessage('Question ID is required'),
  body('answer')
    .notEmpty()
    .withMessage('Answer is required')
    .isLength({ min: 10 })
    .withMessage('Answer must be at least 10 characters'),
  handleValidationErrors,
];

// LinkedIn validators
export const linkedInReviewValidator = [
  body('headline')
    .optional()
    .trim()
    .isLength({ max: 220 })
    .withMessage('Headline must not exceed 220 characters'),
  body('summary')
    .optional()
    .trim()
    .isLength({ max: 2600 })
    .withMessage('Summary must not exceed 2600 characters'),
  body('experience')
    .optional()
    .isArray(),
  body('skills')
    .optional()
    .isArray(),
  body('profileUrl')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  handleValidationErrors,
];

// Job match validators
export const createJobMatchValidator = [
  body('jobTitle')
    .notEmpty()
    .withMessage('Job title is required'),
  body('company')
    .notEmpty()
    .withMessage('Company is required'),
  body('jobDescription')
    .notEmpty()
    .withMessage('Job description is required'),
  body('requiredSkills')
    .isArray()
    .withMessage('Required skills must be an array'),
  body('jobType')
    .isIn(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
    .withMessage('Invalid job type'),
  body('industry')
    .notEmpty()
    .withMessage('Industry is required'),
  handleValidationErrors,
];

// Roadmap validators
export const createRoadmapValidator = [
  body('targetRole')
    .notEmpty()
    .withMessage('Target role is required'),
  body('targetLevel')
    .isIn(['entry', 'mid', 'senior', 'executive'])
    .withMessage('Invalid target level'),
  body('industry')
    .notEmpty()
    .withMessage('Industry is required'),
  handleValidationErrors,
];

// Pagination validators
export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// ID param validator
export const idParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors,
];

// Subscription validators
export const createSubscriptionValidator = [
  body('plan')
    .isIn(['pro', 'enterprise'])
    .withMessage('Invalid plan'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Invalid billing cycle'),
  handleValidationErrors,
];

// Update profile validator
export const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 }),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 }),
  body('skills')
    .optional()
    .isArray(),
  body('targetRole')
    .optional()
    .trim(),
  body('industry')
    .optional()
    .trim(),
  body('yearsOfExperience')
    .optional()
    .isInt({ min: 0 }),
  handleValidationErrors,
];
