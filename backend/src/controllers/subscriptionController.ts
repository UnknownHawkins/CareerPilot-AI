import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import { constructStripeEvent } from '../config/stripe';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class SubscriptionController {
  // Create subscription
  static async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { plan, billingCycle = 'monthly' } = req.body;

      if (!plan || !['pro', 'enterprise'].includes(plan)) {
        throw ApiError.badRequest('Valid plan is required (pro or enterprise)');
      }

      const result = await SubscriptionService.createSubscription(
        userId,
        plan,
        billingCycle
      );

      successResponse(
        res,
        result,
        'Subscription created successfully',
        201
      );
    } catch (error) {
      logger.error('Create subscription error:', error);
      throw error;
    }
  }

  // Get subscription details
  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const details = await SubscriptionService.getSubscriptionDetails(userId);

      successResponse(res, details);
    } catch (error) {
      logger.error('Get subscription error:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { reason, feedback } = req.body;

      const subscription = await SubscriptionService.cancelSubscription(
        userId,
        reason,
        feedback
      );

      successResponse(res, subscription, 'Subscription cancelled successfully');
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }

  // Check feature access
  static async checkFeatureAccess(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { feature } = req.params;

      const access = await SubscriptionService.checkFeatureAccess(userId, feature);

      successResponse(res, access);
    } catch (error) {
      logger.error('Check feature access error:', error);
      throw error;
    }
  }

  // Get all features
  static async getAllFeatures(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const features = [
        'resumeAnalysis',
        'interviews',
        'jobMatches',
        'roadmaps',
        'linkedInReview',
        'apiAccess',
      ];

      const accessMap: Record<string, any> = {};

      for (const feature of features) {
        accessMap[feature] = await SubscriptionService.checkFeatureAccess(
          userId,
          feature
        );
      }

      successResponse(res, accessMap);
    } catch (error) {
      logger.error('Get all features error:', error);
      throw error;
    }
  }

  // Handle Stripe webhook
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        throw ApiError.badRequest('Stripe signature is required');
      }

      const event = constructStripeEvent(req.body, signature);

      await SubscriptionService.handleWebhookEvent(event);

      successResponse(res, null, 'Webhook handled successfully');
    } catch (error) {
      logger.error('Webhook handling error:', error);
      throw error;
    }
  }

  // Get pricing plans
  static async getPricingPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = {
        free: {
          name: 'Free',
          price: { monthly: 0, yearly: 0 },
          features: {
            resumeAnalysis: { limit: 3, period: 'month' },
            interviews: { limit: 1, period: 'month' },
            jobMatches: { limit: 0, period: 'week' },
            roadmaps: { limit: 1, period: 'total' },
            linkedInReview: { limit: 1, period: 'month' },
            apiAccess: false,
            prioritySupport: false,
          },
        },
        pro: {
          name: 'Pro',
          price: { monthly: 29, yearly: 290 },
          features: {
            resumeAnalysis: { limit: 'unlimited', period: 'month' },
            interviews: { limit: 'unlimited', period: 'month' },
            jobMatches: { limit: 10, period: 'week' },
            roadmaps: { limit: 3, period: 'total' },
            linkedInReview: { limit: 'unlimited', period: 'month' },
            apiAccess: { limit: 1000, period: 'month' },
            prioritySupport: true,
          },
        },
        enterprise: {
          name: 'Enterprise',
          price: { monthly: 99, yearly: 990 },
          features: {
            resumeAnalysis: { limit: 'unlimited', period: 'month' },
            interviews: { limit: 'unlimited', period: 'month' },
            jobMatches: { limit: 'unlimited', period: 'week' },
            roadmaps: { limit: 10, period: 'total' },
            linkedInReview: { limit: 'unlimited', period: 'month' },
            apiAccess: { limit: 10000, period: 'month' },
            prioritySupport: true,
            customBranding: true,
          },
        },
      };

      successResponse(res, plans);
    } catch (error) {
      logger.error('Get pricing plans error:', error);
      throw error;
    }
  }

  // Get billing history (placeholder)
  static async getBillingHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      // This would typically fetch from Stripe
      // For now, return placeholder
      const billingHistory = [
        {
          id: 'inv_1',
          date: new Date(),
          amount: 29,
          currency: 'USD',
          status: 'paid',
          description: 'Pro Plan - Monthly',
        },
      ];

      successResponse(res, billingHistory);
    } catch (error) {
      logger.error('Get billing history error:', error);
      throw error;
    }
  }
}
