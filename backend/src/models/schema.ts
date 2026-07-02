import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export const users = sqliteTable('users', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clerkId: text('clerk_id').unique(),
  email: text('email').notNull().unique(),
  password: text('password'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role', { enum: ['free', 'pro', 'enterprise', 'admin'] }).default('free'),
  avatar: text('avatar'),
  skills: text('skills', { mode: 'json' }).$type<string[]>(),
  experience: text('experience', { mode: 'json' }).$type<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }[]>(),
  education: text('education', { mode: 'json' }).$type<{
    degree: string;
    institution: string;
    year: string;
  }[]>(),
  targetRole: text('target_role'),
  industry: text('industry'),
  yearsOfExperience: integer('years_of_experience').default(0),
  subscription: text('subscription', { mode: 'json' }).$type<{
    status: 'active' | 'cancelled' | 'expired' | 'none';
    plan: 'free' | 'pro' | 'enterprise';
    startDate?: Date;
    endDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }>(),
  usage: text('usage', { mode: 'json' }).$type<{
    resumeAnalysisCount: number;
    interviewSessionsCount: number;
    linkedinReviewCount: number;
    jobMatchCount: number;
    lastResetDate: Date;
    adCredits: number;
    adsWatchedThisSession: number;
  }>(),
  preferences: text('preferences', { mode: 'json' }).$type<{
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    language: string;
  }>(),
  isEmailVerified: integer('is_email_verified', { mode: 'boolean' }).default(false),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const subscriptions = sqliteTable('subscriptions', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).notNull().default('free'),
  status: text('status', { enum: ['active', 'cancelled', 'expired', 'none'] }).notNull().default('none'),
  startDate: text('start_date').notNull().default(sql`CURRENT_TIMESTAMP`),
  endDate: text('end_date'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  paymentDetails: text('payment_details', { mode: 'json' }).$type<{
    last4?: string;
    cardBrand?: string;
    nextBillingDate?: string;
  }>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const resumes = sqliteTable('resumes', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  originalFileUrl: text('original_file_url').notNull(),
  originalFileName: text('original_file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  parsedContent: text('parsed_content', { mode: 'json' }).$type<{
    personalInfo: any;
    summary: string;
    experience: any[];
    education: any[];
    skills: string[];
    certifications?: string[];
  }>(),
  analysis: text('analysis', { mode: 'json' }).$type<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    keywordMatch: number;
    formattingScore: number;
    impactScore: number;
    industryFit: string;
  }>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const coverLetters = sqliteTable('cover_letters', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  resumeId: text('resume_id').references(() => resumes._id),
  jobTitle: text('job_title').notNull(),
  companyName: text('company_name').notNull(),
  jobDescription: text('job_description').notNull(),
  generatedContent: text('generated_content').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const interviewSessions = sqliteTable('interview_sessions', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  jobRole: text('job_role').notNull(),
  company: text('company'),
  difficulty: text('difficulty', { enum: ['beginner', 'intermediate', 'advanced'] }).default('intermediate'),
  status: text('status', { enum: ['scheduled', 'in-progress', 'completed', 'cancelled'] }).default('scheduled'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  duration: integer('duration'),
  resumeId: text('resume_id').references(() => resumes._id),
  jobDescription: text('job_description'),
  questions: text('questions', { mode: 'json' }).$type<{
    id: string;
    text: string;
    type: 'behavioral' | 'technical' | 'situational' | 'system-design' | 'general';
    difficulty: string;
    expectedSkills: string[];
    userAnswer?: string;
    audioUrl?: string;
    feedback?: {
      score: number;
      strengths: string[];
      weaknesses: string[];
      suggestedAnswer: string;
    };
    duration?: number;
    timestamp?: string;
  }[]>(),
  overallFeedback: text('overall_feedback', { mode: 'json' }).$type<{
    score: number;
    summary: string;
    technicalSkillsScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    strengths: string[];
    areasForImprovement: string[];
    actionItems: string[];
  }>(),
  transcriptionUrl: text('transcription_url'),
  recordingUrl: text('recording_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const jobMatches = sqliteTable('job_matches', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  resumeId: text('resume_id').notNull().references(() => resumes._id),
  jobTitle: text('job_title').notNull(),
  company: text('company').notNull(),
  location: text('location'),
  description: text('description').notNull(),
  requirements: text('requirements', { mode: 'json' }).$type<string[]>(),
  source: text('source'),
  url: text('url'),
  salary: text('salary', { mode: 'json' }).$type<{
    min?: number;
    max?: number;
    currency?: string;
  }>(),
  matchScore: integer('match_score').notNull(),
  matchDetails: text('match_details', { mode: 'json' }).$type<{
    matchingSkills: string[];
    missingSkills: string[];
    experienceMatch: number;
    educationMatch: number;
    overallFit: string;
    recommendations: string[];
  }>(),
  status: text('status', { enum: ['saved', 'applied', 'interviewing', 'rejected', 'offered'] }).default('saved'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const roadmaps = sqliteTable('roadmaps', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  targetRole: text('target_role').notNull(),
  currentRole: text('current_role').notNull(),
  industry: text('industry'),
  timeframe: text('timeframe', { enum: ['3_months', '6_months', '1_year', '3_years', '5_years'] }).notNull(),
  status: text('status', { enum: ['active', 'completed', 'abandoned'] }).default('active'),
  progress: integer('progress').default(0),
  milestones: text('milestones', { mode: 'json' }).$type<{
    id: string;
    title: string;
    description: string;
    type: 'skill' | 'experience' | 'education' | 'networking' | 'project';
    status: 'pending' | 'in-progress' | 'completed';
    estimatedDuration: string;
    priority: 'low' | 'medium' | 'high';
    dependencies: string[];
    resources: {
      title: string;
      url: string;
      type: 'course' | 'book' | 'article' | 'video' | 'tool';
      isPremium: boolean;
    }[];
    skillsAcquired: string[];
    completionCriteria: string;
    completedAt?: string;
  }[]>(),
  skillsGap: text('skills_gap', { mode: 'json' }).$type<{
    currentSkills: string[];
    requiredSkills: string[];
    missingSkills: string[];
  }>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const activities = sqliteTable('activities', {
  _id: text('_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users._id),
  type: text('type', { enum: ['resume_analysis', 'interview', 'job_match', 'roadmap_update', 'linkedin_review', 'subscription_change', 'login'] }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }).$type<any>(),
  relatedEntityId: text('related_entity_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
