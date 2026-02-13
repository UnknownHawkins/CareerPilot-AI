import mongoose, { Document, Schema } from 'mongoose';

export interface IInterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'culture_fit' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswerPoints: string[];
  userAnswer?: string;
  aiFeedback?: {
    score: number;
    strengths: string[];
    improvements: string[];
    modelAnswer: string;
  };
  answeredAt?: Date;
  timeTaken?: number; // in seconds
}

export interface IInterviewSession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionType: 'practice' | 'mock' | 'assessment';
  jobRole?: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industry?: string;
  skills: string[];
  questions: IInterviewQuestion[];
  status: 'in_progress' | 'completed' | 'abandoned';
  overallScore?: number;
  feedback?: {
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    communicationSkills: number;
    technicalKnowledge: number;
    problemSolving: number;
    culturalFit: number;
    recommendations: string[];
  };
  startedAt: Date;
  completedAt?: Date;
  totalDuration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const InterviewQuestionSchema = new Schema<IInterviewQuestion>({
  id: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['technical', 'behavioral', 'situational', 'culture_fit', 'leadership'],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  expectedAnswerPoints: [String],
  userAnswer: String,
  aiFeedback: {
    score: { type: Number, min: 0, max: 100 },
    strengths: [String],
    improvements: [String],
    modelAnswer: String,
  },
  answeredAt: Date,
  timeTaken: Number,
});

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionType: {
      type: String,
      enum: ['practice', 'mock', 'assessment'],
      default: 'practice',
    },
    jobRole: {
      type: String,
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive'],
      required: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    skills: [String],
    questions: [InterviewQuestionSchema],
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    feedback: {
      summary: String,
      strengths: [String],
      areasForImprovement: [String],
      communicationSkills: { type: Number, min: 0, max: 100 },
      technicalKnowledge: { type: Number, min: 0, max: 100 },
      problemSolving: { type: Number, min: 0, max: 100 },
      culturalFit: { type: Number, min: 0, max: 100 },
      recommendations: [String],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    totalDuration: Number,
  },
  {
    timestamps: true,
  }
);

// Indexes
InterviewSessionSchema.index({ userId: 1, createdAt: -1 });
InterviewSessionSchema.index({ status: 1 });
InterviewSessionSchema.index({ sessionType: 1 });

// Virtual for answered questions count
InterviewSessionSchema.virtual('answeredQuestionsCount').get(function () {
  return this.questions.filter(q => q.userAnswer).length;
});

// Virtual for progress percentage
InterviewSessionSchema.virtual('progressPercentage').get(function () {
  if (this.questions.length === 0) return 0;
  return Math.round((this.answeredQuestionsCount / this.questions.length) * 100);
});

export const InterviewSession = mongoose.model<IInterviewSession>('InterviewSession', InterviewSessionSchema);
