import mongoose, { Document, Schema } from 'mongoose';

export interface IJobMatch extends Document {
  userId: mongoose.Types.ObjectId;
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
  postedDate?: Date;
  applicationDeadline?: Date;
  notes?: string;
  aiRecommendations: {
    shouldApply: boolean;
    confidence: number;
    reasoning: string;
    suggestedActions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const JobMatchSchema = new Schema<IJobMatch>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    companySize: String,
    location: {
      city: String,
      country: String,
      remote: { type: Boolean, default: false },
      hybrid: { type: Boolean, default: false },
    },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
    },
    jobDescription: {
      type: String,
      required: true,
    },
    requiredSkills: [String],
    preferredSkills: [String],
    experienceRequired: {
      min: { type: Number, default: 0 },
      max: Number,
    },
    educationRequired: [String],
    jobType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
      required: true,
    },
    industry: {
      type: String,
      required: true,
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    matchAnalysis: {
      skillMatch: {
        score: { type: Number, min: 0, max: 100 },
        matchedSkills: [String],
        missingSkills: [String],
        additionalSkills: [String],
      },
      experienceMatch: {
        score: { type: Number, min: 0, max: 100 },
        userYears: Number,
        requiredYears: Number,
        feedback: String,
      },
      educationMatch: {
        score: { type: Number, min: 0, max: 100 },
        matched: Boolean,
        feedback: String,
      },
      overallFit: {
        score: { type: Number, min: 0, max: 100 },
        feedback: String,
        strengths: [String],
        gaps: [String],
      },
    },
    applicationStatus: {
      type: String,
      enum: ['saved', 'applied', 'interviewing', 'rejected', 'offered', 'hired'],
      default: 'saved',
    },
    source: {
      type: String,
      required: true,
    },
    sourceUrl: String,
    postedDate: Date,
    applicationDeadline: Date,
    notes: String,
    aiRecommendations: {
      shouldApply: Boolean,
      confidence: { type: Number, min: 0, max: 100 },
      reasoning: String,
      suggestedActions: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
JobMatchSchema.index({ userId: 1, createdAt: -1 });
JobMatchSchema.index({ matchScore: -1 });
JobMatchSchema.index({ applicationStatus: 1 });
JobMatchSchema.index({ industry: 1 });
JobMatchSchema.index({ jobTitle: 'text', company: 'text', jobDescription: 'text' });

// Virtual for match category
JobMatchSchema.virtual('matchCategory').get(function () {
  const score = this.matchScore;
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
});

// Static method to find best matches for a user
JobMatchSchema.statics.findBestMatches = function (userId: mongoose.Types.ObjectId, limit: number = 10) {
  return this.find({ userId })
    .sort({ matchScore: -1, createdAt: -1 })
    .limit(limit)
    .exec();
};

// Static method to find matches by status
JobMatchSchema.statics.findByStatus = function (
  userId: mongoose.Types.ObjectId,
  status: string
) {
  return this.find({ userId, applicationStatus: status })
    .sort({ createdAt: -1 })
    .exec();
};

export const JobMatch = mongoose.model<IJobMatch>('JobMatch', JobMatchSchema);
