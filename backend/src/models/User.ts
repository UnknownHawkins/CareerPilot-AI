import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'free' | 'pro' | 'admin';
  avatar?: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    description?: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  targetRole?: string;
  industry?: string;
  yearsOfExperience: number;
  subscription: {
    status: 'active' | 'cancelled' | 'expired' | 'none';
    plan: 'free' | 'pro' | 'enterprise';
    startDate?: Date;
    endDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    resumeAnalysisCount: number;
    interviewSessionsCount: number;
    lastResetDate: Date;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    language: string;
  };
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
  hasProAccess(): boolean;
  canUseResumeAnalysis(): boolean;
  canUseInterview(): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['free', 'pro', 'admin'],
      default: 'free',
    },
    avatar: {
      type: String,
      default: null,
    },
    skills: [{
      type: String,
      trim: true,
    }],
    experience: [{
      title: { type: String, required: true },
      company: { type: String, required: true },
      duration: { type: String, required: true },
      description: { type: String },
    }],
    education: [{
      degree: { type: String, required: true },
      institution: { type: String, required: true },
      year: { type: String, required: true },
    }],
    targetRole: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscription: {
      status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'none'],
        default: 'none',
      },
      plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free',
      },
      startDate: Date,
      endDate: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
    },
    usage: {
      resumeAnalysisCount: {
        type: Number,
        default: 0,
      },
      interviewSessionsCount: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'subscription.status': 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
UserSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Check if user has pro access
UserSchema.methods.hasProAccess = function (): boolean {
  return (
    this.role === 'pro' ||
    this.role === 'admin' ||
    (this.subscription.status === 'active' && this.subscription.plan === 'pro')
  );
};

// Check if user can use resume analysis (free: 3/month)
UserSchema.methods.canUseResumeAnalysis = function (): boolean {
  if (this.hasProAccess()) return true;
  
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  const monthDiff = now.getMonth() - lastReset.getMonth() + 
    (now.getFullYear() - lastReset.getFullYear()) * 12;
  
  if (monthDiff > 0) {
    this.usage.resumeAnalysisCount = 0;
    this.usage.lastResetDate = now;
  }
  
  return this.usage.resumeAnalysisCount < 3;
};

// Check if user can use interview (free: 1 session with 3 questions)
UserSchema.methods.canUseInterview = function (): boolean {
  if (this.hasProAccess()) return true;
  return this.usage.interviewSessionsCount < 1;
};

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const User = mongoose.model<IUser>('User', UserSchema);
