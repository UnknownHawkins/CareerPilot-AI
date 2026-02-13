import mongoose, { Document, Schema } from 'mongoose';

export interface IResumeAnalysis extends Document {
  userId: mongoose.Types.ObjectId;
  originalFileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx' | 'doc';
  extractedText: string;
  atsScore: number;
  analysis: {
    overallFeedback: string;
    strengths: string[];
    weaknesses: string[];
    sections: {
      contactInfo: {
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
      education: {
        score: number;
        feedback: string;
        suggestions: string[];
      };
      skills: {
        score: number;
        feedback: string;
        suggestions: string[];
        detectedSkills: string[];
        missingSkills: string[];
      };
    };
    keywordOptimization: {
      score: number;
      industryKeywords: string[];
      missingKeywords: string[];
      suggestions: string[];
    };
    formatting: {
      score: number;
      feedback: string;
      suggestions: string[];
    };
  };
  skillGapAnalysis: {
    currentSkills: string[];
    recommendedSkills: string[];
    prioritySkills: string[];
  };
  improvementSuggestions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ResumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'doc'],
      required: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    atsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    analysis: {
      overallFeedback: {
        type: String,
        required: true,
      },
      strengths: [String],
      weaknesses: [String],
      sections: {
        contactInfo: {
          score: { type: Number, min: 0, max: 100 },
          feedback: String,
          suggestions: [String],
        },
        summary: {
          score: { type: Number, min: 0, max: 100 },
          feedback: String,
          suggestions: [String],
        },
        experience: {
          score: { type: Number, min: 0, max: 100 },
          feedback: String,
          suggestions: [String],
        },
        education: {
          score: { type: Number, min: 0, max: 100 },
          feedback: String,
          suggestions: [String],
        },
        skills: {
          score: { type: Number, min: 0, max: 100 },
          feedback: String,
          suggestions: [String],
          detectedSkills: [String],
          missingSkills: [String],
        },
      },
      keywordOptimization: {
        score: { type: Number, min: 0, max: 100 },
        industryKeywords: [String],
        missingKeywords: [String],
        suggestions: [String],
      },
      formatting: {
        score: { type: Number, min: 0, max: 100 },
        feedback: String,
        suggestions: [String],
      },
    },
    skillGapAnalysis: {
      currentSkills: [String],
      recommendedSkills: [String],
      prioritySkills: [String],
    },
    improvementSuggestions: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
ResumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
ResumeAnalysisSchema.index({ atsScore: 1 });

export const ResumeAnalysis = mongoose.model<IResumeAnalysis>('ResumeAnalysis', ResumeAnalysisSchema);
