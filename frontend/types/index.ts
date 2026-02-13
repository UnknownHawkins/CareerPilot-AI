// User Types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: 'free' | 'pro' | 'admin';
  avatar?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  targetRole?: string;
  industry?: string;
  yearsOfExperience: number;
  subscription: SubscriptionInfo;
  usage: UsageInfo;
  preferences: UserPreferences;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}

export interface SubscriptionInfo {
  status: 'active' | 'cancelled' | 'expired' | 'none';
  plan: 'free' | 'pro' | 'enterprise';
  startDate?: string;
  endDate?: string;
}

export interface UsageInfo {
  resumeAnalysisCount: number;
  interviewSessionsCount: number;
  lastResetDate: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Resume Analysis Types
export interface ResumeAnalysis {
  _id: string;
  userId: string;
  originalFileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx' | 'doc';
  atsScore: number;
  analysis: {
    overallFeedback: string;
    strengths: string[];
    weaknesses: string[];
    sections: {
      contactInfo: SectionAnalysis;
      summary: SectionAnalysis;
      experience: SectionAnalysis;
      education: SectionAnalysis;
      skills: SkillsAnalysis;
    };
    keywordOptimization: KeywordAnalysis;
    formatting: FormattingAnalysis;
  };
  skillGapAnalysis: {
    currentSkills: string[];
    recommendedSkills: string[];
    prioritySkills: string[];
  };
  improvementSuggestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SectionAnalysis {
  score: number;
  feedback: string;
  suggestions: string[];
}

export interface SkillsAnalysis extends SectionAnalysis {
  detectedSkills: string[];
  missingSkills: string[];
}

export interface KeywordAnalysis {
  score: number;
  industryKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

export interface FormattingAnalysis {
  score: number;
  feedback: string;
  suggestions: string[];
}

// Interview Types
export interface InterviewSession {
  _id: string;
  userId: string;
  sessionType: 'practice' | 'mock' | 'assessment';
  jobRole?: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industry?: string;
  skills: string[];
  questions: InterviewQuestion[];
  status: 'in_progress' | 'completed' | 'abandoned';
  overallScore?: number;
  feedback?: OverallInterviewFeedback;
  startedAt: string;
  completedAt?: string;
  totalDuration?: number;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'culture_fit' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswerPoints: string[];
  userAnswer?: string;
  aiFeedback?: QuestionFeedback;
  answeredAt?: string;
  timeTaken?: number;
}

export interface QuestionFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

export interface OverallInterviewFeedback {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  communicationSkills: number;
  technicalKnowledge: number;
  problemSolving: number;
  culturalFit: number;
  recommendations: string[];
}

// LinkedIn Types
export interface LinkedInAnalysis {
  headline: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  summary: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  experience: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  skills: {
    score: number;
    feedback: string;
    suggestions: string[];
    topSkills: string[];
    missingSkills: string[];
  };
  overallScore: number;
  optimizationTips: string[];
  keywordDensity: {
    keywords: string[];
    score: number;
  };
}

// Career Roadmap Types
export interface CareerRoadmap {
  _id: string;
  userId: string;
  targetRole: string;
  currentLevel: 'entry' | 'mid' | 'senior' | 'executive';
  targetLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industry: string;
  currentSkills: string[];
  targetSkills: string[];
  skillGaps: SkillGap[];
  milestones: RoadmapMilestone[];
  timeline: {
    shortTerm: string[];
    midTerm: string[];
    longTerm: string[];
  };
  estimatedTimeToGoal: string;
  progress: {
    completedMilestones: number;
    totalMilestones: number;
    percentage: number;
  };
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface SkillGap {
  skill: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  currentProficiency: number;
  targetProficiency: number;
  learningResources: string[];
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'certification' | 'experience' | 'project' | 'networking';
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  resources: LearningResource[];
  completed: boolean;
  completedAt?: string;
  dependencies: string[];
}

export interface LearningResource {
  title: string;
  type: 'course' | 'book' | 'article' | 'video' | 'project';
  url?: string;
  provider?: string;
}

// Job Match Types
export interface JobMatch {
  _id: string;
  userId: string;
  jobTitle: string;
  company: string;
  companySize?: string;
  location: {
    city?: string;
    country?: string;
    remote: boolean;
    hybrid: boolean;
  };
  salary?: {
    min: number;
    max: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  jobDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequired: {
    min: number;
    max: number;
  };
  educationRequired?: string[];
  jobType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
  industry: string;
  matchScore: number;
  matchAnalysis: {
    skillMatch: {
      score: number;
      matchedSkills: string[];
      missingSkills: string[];
      additionalSkills: string[];
    };
    experienceMatch: {
      score: number;
      userYears: number;
      requiredYears: number;
      feedback: string;
    };
    educationMatch: {
      score: number;
      matched: boolean;
      feedback: string;
    };
    overallFit: {
      score: number;
      feedback: string;
      strengths: string[];
      gaps: string[];
    };
  };
  applicationStatus: 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offered' | 'hired';
  source: string;
  sourceUrl?: string;
  postedDate?: string;
  applicationDeadline?: string;
  notes?: string;
  aiRecommendations: {
    shouldApply: boolean;
    confidence: number;
    reasoning: string;
    suggestedActions: string[];
  };
  createdAt: string;
}

// Subscription Types
export interface Subscription {
  _id: string;
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'trial';
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  features: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
  resumeAnalysis: {
    enabled: boolean;
    monthlyLimit: number;
    used: number;
  };
  interviews: {
    enabled: boolean;
    monthlyLimit: number;
    used: number;
  };
  jobMatches: {
    enabled: boolean;
    weeklyLimit: number;
    used: number;
  };
  roadmaps: {
    enabled: boolean;
    maxActive: number;
  };
  linkedInReview: {
    enabled: boolean;
    monthlyLimit: number;
    used: number;
  };
  apiAccess: {
    enabled: boolean;
    rateLimit: number;
  };
  prioritySupport: boolean;
  customBranding: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: any[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// UI Types
export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
