import mongoose, { Document, Schema } from 'mongoose';

export interface IRoadmapMilestone {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'certification' | 'experience' | 'project' | 'networking';
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  resources: {
    title: string;
    type: 'course' | 'book' | 'article' | 'video' | 'project';
    url?: string;
    provider?: string;
  }[];
  completed: boolean;
  completedAt?: Date;
  dependencies: string[]; // IDs of prerequisite milestones
}

export interface ICareerRoadmap extends Document {
  userId: mongoose.Types.ObjectId;
  targetRole: string;
  currentLevel: 'entry' | 'mid' | 'senior' | 'executive';
  targetLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industry: string;
  currentSkills: string[];
  targetSkills: string[];
  skillGaps: {
    skill: string;
    importance: 'critical' | 'important' | 'nice_to_have';
    currentProficiency: number;
    targetProficiency: number;
    learningResources: string[];
  }[];
  milestones: IRoadmapMilestone[];
  timeline: {
    shortTerm: string[]; // 0-3 months
    midTerm: string[]; // 3-6 months
    longTerm: string[]; // 6-12 months
  };
  estimatedTimeToGoal: string;
  progress: {
    completedMilestones: number;
    totalMilestones: number;
    percentage: number;
  };
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapMilestoneSchema = new Schema<IRoadmapMilestone>({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['skill', 'certification', 'experience', 'project', 'networking'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true,
  },
  estimatedDuration: {
    type: String,
    required: true,
  },
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['course', 'book', 'article', 'video', 'project'],
    },
    url: String,
    provider: String,
  }],
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: Date,
  dependencies: [String],
});

const CareerRoadmapSchema = new Schema<ICareerRoadmap>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
    },
    currentLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive'],
      required: true,
    },
    targetLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive'],
      required: true,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    currentSkills: [String],
    targetSkills: [String],
    skillGaps: [{
      skill: String,
      importance: {
        type: String,
        enum: ['critical', 'important', 'nice_to_have'],
      },
      currentProficiency: { type: Number, min: 0, max: 100 },
      targetProficiency: { type: Number, min: 0, max: 100 },
      learningResources: [String],
    }],
    milestones: [RoadmapMilestoneSchema],
    timeline: {
      shortTerm: [String],
      midTerm: [String],
      longTerm: [String],
    },
    estimatedTimeToGoal: {
      type: String,
      required: true,
    },
    progress: {
      completedMilestones: { type: Number, default: 0 },
      totalMilestones: { type: Number, default: 0 },
      percentage: { type: Number, default: 0, min: 0, max: 100 },
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CareerRoadmapSchema.index({ userId: 1, status: 1 });
CareerRoadmapSchema.index({ targetRole: 1 });
CareerRoadmapSchema.index({ industry: 1 });

// Pre-save middleware to calculate progress
CareerRoadmapSchema.pre('save', function (next) {
  if (this.milestones.length > 0) {
    const completed = this.milestones.filter(m => m.completed).length;
    this.progress.completedMilestones = completed;
    this.progress.totalMilestones = this.milestones.length;
    this.progress.percentage = Math.round((completed / this.milestones.length) * 100);
    
    if (completed === this.milestones.length) {
      this.status = 'completed';
    }
  }
  next();
});

export const CareerRoadmap = mongoose.model<ICareerRoadmap>('CareerRoadmap', CareerRoadmapSchema);
