import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import { constructStripeEvent, createStripeCheckoutSession, createStripeCustomer, getStripeClient } from '../config/stripe';
import { successResponse, ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

export class SubscriptionController {
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

  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const details = await SubscriptionService.getSubscriptionByUserId(userId);
      successResponse(res, details);
    } catch (error) {
      logger.error('Get subscription error:', error);
      throw error;
    }
  }

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

  static async checkFeatureAccess(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { feature } = req.params;
      const access = await SubscriptionService.checkFeatureAccess(userId, feature as any);
      successResponse(res, access);
    } catch (error) {
      logger.error('Check feature access error:', error);
      throw error;
    }
  }

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
          feature as any
        );
      }

      successResponse(res, accessMap);
    } catch (error) {
      logger.error('Get all features error:', error);
      throw error;
    }
  }

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

  static async getPricingPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = {
        free: {
          name: 'Free',
          price: { monthly: 0, yearly: 0 },
          features: {
            resumeAnalysis: { limit: 2, period: 'month' },
            interviews: { limit: 2, period: 'month' },
            jobMatches: { limit: 2, period: 'month' },
            roadmaps: { limit: 'unlimited', period: 'total' },
            linkedInReview: { limit: 2, period: 'month' },
            apiAccess: false,
            prioritySupport: false,
          },
        },
        pro: {
          name: 'Pro',
          price: { monthly: 9, yearly: 90 },
          features: {
            resumeAnalysis: { limit: 'unlimited', period: 'month' },
            interviews: { limit: 'unlimited', period: 'month' },
            jobMatches: { limit: 'unlimited', period: 'month' },
            roadmaps: { limit: 'unlimited', period: 'total' },
            linkedInReview: { limit: 'unlimited', period: 'month' },
            apiAccess: { limit: 1000, period: 'month' },
            prioritySupport: true,
          },
        },
        enterprise: {
          name: 'Enterprise',
          price: { monthly: 29, yearly: 290 },
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

  static async getBillingHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const billingHistory = [
        {
          id: 'inv_1',
          date: new Date(),
          amount: 2900,
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

  static async mockUpgrade(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { plan = 'pro' } = req.body;

      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) throw ApiError.notFound('User not found');

      await db.update(users)
        .set({
          role: plan,
          subscription: {
            ...(user.subscription as any || {}),
            status: 'active',
            plan: plan as any,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        })
        .where(eq(users._id, userId));

      const [updated] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      successResponse(res, updated, `Account successfully upgraded to ${plan}`);
    } catch (error) {
      logger.error('Mock upgrade error:', error);
      throw error;
    }
  }

  static async earnAdCredit(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) throw ApiError.notFound('User not found');

      const currentUsage = user.usage as any || {};
      const adsWatched = (currentUsage.adsWatchedThisSession || 0) + 1;
      let adCredits = currentUsage.adCredits || 0;
      let credited = false;

      if (adsWatched % 2 === 0) {
        adCredits += 1;
        credited = true;
      }

      await db.update(users)
        .set({
          usage: {
            ...currentUsage,
            adsWatchedThisSession: adsWatched,
            adCredits
          }
        })
        .where(eq(users._id, userId));

      successResponse(res, {
        credited,
        adsWatched,
        adCredits,
        message: credited
          ? `🎉 Credit earned! You now have ${adCredits} ad credit(s).`
          : `Ad ${adsWatched % 2 === 1 ? 1 : 2} of 2 watched. Watch 1 more to earn a credit.`,
      }, 'Ad recorded');
    } catch (error) {
      logger.error('Earn ad credit error:', error);
      throw error;
    }
  }

  static async getCredits(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) throw ApiError.notFound('User not found');

      const role = user.role;
      const isPro = role === 'pro' || role === 'enterprise' || role === 'admin';

      const limits = { free: 2, pro: -1, enterprise: -1, admin: -1 };
      const monthlyLimit = limits[role as keyof typeof limits] ?? 2;

      const usage = user.usage as any || {};

      successResponse(res, {
        role,
        isPro,
        monthlyLimit,
        usage: {
          resumeAnalysis: usage.resumeAnalysisCount || 0,
          interviews:     usage.interviewSessionsCount || 0,
          linkedin:       usage.linkedinReviewCount || 0,
          jobMatch:       usage.jobMatchCount || 0,
        },
        adCredits: usage.adCredits || 0,
        adsWatchedThisSession: usage.adsWatchedThisSession || 0,
      });
    } catch (error) {
      logger.error('Get credits error:', error);
      throw error;
    }
  }

  static async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { plan = 'pro', billingCycle = 'monthly' } = req.body;

      if (!['pro', 'enterprise'].includes(plan)) {
        throw ApiError.badRequest('Valid plan required (pro or enterprise)');
      }

      const priceId = process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}_${billingCycle.toUpperCase()}`];

      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) throw ApiError.notFound('User not found');

      if (!priceId) {
        await db.update(users)
          .set({
            role: plan,
            subscription: {
              ...(user.subscription as any || {}),
              status: 'active',
              plan: plan as any,
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }
          })
          .where(eq(users._id, userId));

        const [updated] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
        successResponse(res, { user: updated, checkoutUrl: null, mock: true }, 'Plan upgraded (mock mode — no Stripe price IDs set)');
        return;
      }

      let stripeCustomerId = user.subscription?.stripeCustomerId;
      if (!stripeCustomerId) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const customer = await createStripeCustomer(user.email, fullName);
        stripeCustomerId = customer.id;
        await db.update(users)
          .set({ subscription: { ...(user.subscription as any || {}), stripeCustomerId } })
          .where(eq(users._id, userId));
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const session = await createStripeCheckoutSession(
        stripeCustomerId,
        priceId,
        `${clientUrl}/payment/success?plan=${plan}`,
        `${clientUrl}/pricing?cancelled=true`,
        { userId, plan, billingCycle }
      );

      successResponse(res, { checkoutUrl: session.url, sessionId: session.id, mock: false }, 'Checkout session created');
    } catch (error) {
      logger.error('Create checkout session error:', error);
      throw error;
    }
  }
}
