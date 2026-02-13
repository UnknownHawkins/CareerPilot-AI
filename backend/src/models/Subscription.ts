import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'trial';
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  paymentProvider: 'stripe' | 'razorpay' | 'manual';
  paymentDetails: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    razorpaySubscriptionId?: string;
    razorpayCustomerId?: string;
  };
  features: {
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
  };
  cancellation?: {
    cancelledAt: Date;
    reason?: string;
    feedback?: string;
  };
  renewals: {
    date: Date;
    amount: number;
    status: 'success' | 'failed';
    transactionId?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending', 'trial'],
      default: 'free',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    trialEndsAt: Date,
    paymentProvider: {
      type: String,
      enum: ['stripe', 'razorpay', 'manual'],
      default: 'manual',
    },
    paymentDetails: {
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      stripePriceId: String,
      razorpaySubscriptionId: String,
      razorpayCustomerId: String,
    },
    features: {
      resumeAnalysis: {
        enabled: { type: Boolean, default: true },
        monthlyLimit: { type: Number, default: 3 },
        used: { type: Number, default: 0 },
      },
      interviews: {
        enabled: { type: Boolean, default: true },
        monthlyLimit: { type: Number, default: 1 },
        used: { type: Number, default: 0 },
      },
      jobMatches: {
        enabled: { type: Boolean, default: false },
        weeklyLimit: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
      },
      roadmaps: {
        enabled: { type: Boolean, default: true },
        maxActive: { type: Number, default: 1 },
      },
      linkedInReview: {
        enabled: { type: Boolean, default: true },
        monthlyLimit: { type: Number, default: 1 },
        used: { type: Number, default: 0 },
      },
      apiAccess: {
        enabled: { type: Boolean, default: false },
        rateLimit: { type: Number, default: 100 },
      },
      prioritySupport: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
    },
    cancellation: {
      cancelledAt: Date,
      reason: String,
      feedback: String,
    },
    renewals: [{
      date: Date,
      amount: Number,
      status: {
        type: String,
        enum: ['success', 'failed'],
      },
      transactionId: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ 'paymentDetails.stripeSubscriptionId': 1 });

// Pre-save middleware to set features based on plan
SubscriptionSchema.pre('save', function (next) {
  const planFeatures = {
    free: {
      resumeAnalysis: { enabled: true, monthlyLimit: 3, used: 0 },
      interviews: { enabled: true, monthlyLimit: 1, used: 0 },
      jobMatches: { enabled: false, weeklyLimit: 0, used: 0 },
      roadmaps: { enabled: true, maxActive: 1 },
      linkedInReview: { enabled: true, monthlyLimit: 1, used: 0 },
      apiAccess: { enabled: false, rateLimit: 100 },
      prioritySupport: false,
      customBranding: false,
    },
    pro: {
      resumeAnalysis: { enabled: true, monthlyLimit: -1, used: 0 }, // -1 = unlimited
      interviews: { enabled: true, monthlyLimit: -1, used: 0 },
      jobMatches: { enabled: true, weeklyLimit: 10, used: 0 },
      roadmaps: { enabled: true, maxActive: 3 },
      linkedInReview: { enabled: true, monthlyLimit: -1, used: 0 },
      apiAccess: { enabled: true, rateLimit: 1000 },
      prioritySupport: true,
      customBranding: false,
    },
    enterprise: {
      resumeAnalysis: { enabled: true, monthlyLimit: -1, used: 0 },
      interviews: { enabled: true, monthlyLimit: -1, used: 0 },
      jobMatches: { enabled: true, weeklyLimit: -1, used: 0 },
      roadmaps: { enabled: true, maxActive: 10 },
      linkedInReview: { enabled: true, monthlyLimit: -1, used: 0 },
      apiAccess: { enabled: true, rateLimit: 10000 },
      prioritySupport: true,
      customBranding: true,
    },
  };

  if (this.isModified('plan')) {
    this.features = planFeatures[this.plan];
  }
  next();
});

// Method to check if feature is available
SubscriptionSchema.methods.isFeatureAvailable = function (featureName: string): boolean {
  const feature = this.features[featureName as keyof typeof this.features];
  if (typeof feature === 'object' && feature !== null) {
    return 'enabled' in feature ? feature.enabled : false;
  }
  return false;
};

// Method to check usage limit
SubscriptionSchema.methods.checkUsageLimit = function (featureName: string): boolean {
  const feature = this.features[featureName as keyof typeof this.features];
  if (typeof feature === 'object' && feature !== null && 'monthlyLimit' in feature) {
    const limit = feature.monthlyLimit;
    const used = feature.used;
    return limit === -1 || used < limit;
  }
  return true;
};

// Method to increment usage
SubscriptionSchema.methods.incrementUsage = async function (featureName: string) {
  const feature = this.features[featureName as keyof typeof this.features];
  if (typeof feature === 'object' && feature !== null && 'used' in feature) {
    feature.used += 1;
    await this.save();
  }
};

// Method to reset monthly usage
SubscriptionSchema.methods.resetMonthlyUsage = async function () {
  this.features.resumeAnalysis.used = 0;
  this.features.interviews.used = 0;
  this.features.linkedInReview.used = 0;
  await this.save();
};

// Method to reset weekly usage
SubscriptionSchema.methods.resetWeeklyUsage = async function () {
  this.features.jobMatches.used = 0;
  await this.save();
};

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
