import { db } from '../config/database';
import { users, subscriptions } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import {
  createStripeCustomer,
  createStripeSubscription,
  createStripeCheckoutSession,
  cancelStripeSubscription,
  getStripeClient,
} from '../config/stripe';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';

const PLAN_LIMITS = {
  free: {
    resumeAnalysis: 3,
    interviews: 1,
    jobMatches: 0,
    linkedInReview: 1,
    roadmaps: 1,
    coverLetter: 0,
  },
  pro: {
    resumeAnalysis: -1,
    interviews: -1,
    jobMatches: -1,
    linkedInReview: -1,
    roadmaps: -1,
    coverLetter: -1,
  },
  enterprise: {
    resumeAnalysis: -1,
    interviews: -1,
    jobMatches: -1,
    linkedInReview: -1,
    roadmaps: -1,
    coverLetter: -1,
  }
};

export class SubscriptionService {
  static async createSubscription(
    userId: string,
    plan: 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const [existingSubscription] = await db.select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
        .limit(1);

      if (existingSubscription) {
        throw ApiError.conflict('User already has an active subscription');
      }

      const prices = {
        pro: { monthly: 29, yearly: 290 },
        enterprise: { monthly: 99, yearly: 990 },
      };

      const price = prices[plan][billingCycle];

      let stripeCustomerId = user.subscription?.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await createStripeCustomer(user.email, `${user.firstName} ${user.lastName}`);
        stripeCustomerId = customer.id;
        
        await db.update(users)
          .set({ subscription: { ...(user.subscription as any), stripeCustomerId } })
          .where(eq(users._id, userId));
      }

      const [subscription] = await db.insert(subscriptions).values({
        userId,
        plan,
        status: 'none',
        stripeCustomerId,
        startDate: new Date().toISOString(),
        endDate: this.calculateEndDate(billingCycle).toISOString(),
      }).returning();

      const priceId = process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}_${billingCycle.toUpperCase()}`];
      
      if (!priceId) {
        throw ApiError.internal('Stripe price ID not configured');
      }

      const successUrl = `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${process.env.CLIENT_URL}/subscription/cancel`;

      const checkoutSession = await createStripeCheckoutSession(
        stripeCustomerId,
        priceId,
        successUrl,
        cancelUrl,
        {
          subscriptionId: subscription._id,
          userId,
          plan,
        }
      );

      await db.update(subscriptions)
        .set({ stripeSubscriptionId: checkoutSession.subscription as string })
        .where(eq(subscriptions._id, subscription._id));

      logger.info(`Subscription created for user ${userId}. Plan: ${plan}`);

      return {
        subscription,
        checkoutUrl: checkoutSession.url || undefined,
      };
    } catch (error) {
      logger.error('Create subscription error:', error);
      throw error;
    }
  }

  static async activateSubscription(
    subscriptionId: string,
    stripeSubscriptionId: string
  ) {
    try {
      const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions._id, subscriptionId)).limit(1);
      if (!subscription) {
        throw ApiError.notFound('Subscription not found');
      }

      const [updatedSub] = await db.update(subscriptions)
        .set({ 
          status: 'active',
          stripeSubscriptionId 
        })
        .where(eq(subscriptions._id, subscriptionId))
        .returning();

      const [user] = await db.select().from(users).where(eq(users._id, subscription.userId)).limit(1);
      
      if (user) {
        await db.update(users)
          .set({
            role: 'pro',
            subscription: {
              ...(user.subscription as any),
              status: 'active',
              plan: subscription.plan,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              stripeSubscriptionId
            }
          })
          .where(eq(users._id, user._id));
      }

      logger.info(`Subscription ${subscriptionId} activated`);

      return updatedSub;
    } catch (error) {
      logger.error('Activate subscription error:', error);
      throw error;
    }
  }

  static async cancelSubscription(
    userId: string,
    reason?: string,
    feedback?: string
  ) {
    try {
      let [subscription] = await db.select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
        .limit(1);

      if (!subscription) {
        const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
        if (user && user.subscription && user.subscription.status === 'active') {
           await db.update(users)
            .set({
              role: 'free',
              subscription: {
                ...(user.subscription as any),
                status: 'cancelled'
              }
            }).where(eq(users._id, userId));
           return user.subscription;
        }
        throw ApiError.notFound('No active subscription found');
      }

      if (subscription.stripeSubscriptionId) {
        await cancelStripeSubscription(subscription.stripeSubscriptionId);
      }

      [subscription] = await db.update(subscriptions)
        .set({ status: 'cancelled' })
        .where(eq(subscriptions._id, subscription._id))
        .returning();

      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (user) {
        await db.update(users)
          .set({
            role: 'free',
            subscription: {
              ...(user.subscription as any),
              status: 'cancelled'
            }
          })
          .where(eq(users._id, userId));
      }

      logger.info(`Subscription cancelled for user ${userId}`);

      return subscription;
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }

  static async getSubscriptionByUserId(userId: string) {
    try {
      const [subscription] = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);
      return subscription || null;
    } catch (error) {
      logger.error('Get subscription error:', error);
      throw error;
    }
  }

  static async checkFeatureAccess(
    userId: string,
    featureName: keyof typeof PLAN_LIMITS.free
  ): Promise<boolean> {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) return false;

      const plan = (user.subscription && user.subscription.status === 'active') 
        ? user.subscription.plan 
        : 'free';

      const limit = PLAN_LIMITS[plan as 'free' | 'pro' | 'enterprise'][featureName];
      if (limit === -1) return true; // Unlimited

      const usageKey = `${featureName}Count`;
      let used = 0;
      if (user.usage && (user.usage as any)[usageKey]) {
        used = (user.usage as any)[usageKey];
      }

      return used < limit;
    } catch (error) {
      logger.error('Check feature access error:', error);
      throw error;
    }
  }

  static async incrementUsage(
    userId: string,
    featureName: string
  ): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (user) {
        const usageKey = `${featureName}Count`;
        const currentUsage = user.usage || {} as any;
        const currentCount = currentUsage[usageKey] || 0;
        
        await db.update(users)
          .set({
            usage: {
              ...currentUsage,
              [usageKey]: currentCount + 1
            }
          })
          .where(eq(users._id, userId));
      }
    } catch (error) {
      logger.error('Increment usage error:', error);
      throw error;
    }
  }

  static async handleWebhookEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const { subscriptionId } = session.metadata;
          await this.activateSubscription(subscriptionId, session.subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          logger.info(`Payment succeeded for subscription: ${invoice.subscription}`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          logger.warn(`Payment failed for subscription: ${invoice.subscription}`);
          break;
        }

        case 'customer.subscription.deleted': {
          const stripeSubscription = event.data.object;
          const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id)).limit(1);
          if (sub) {
            await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions._id, sub._id));
            
            const [user] = await db.select().from(users).where(eq(users._id, sub.userId)).limit(1);
            if (user) {
               await db.update(users)
                .set({
                  role: 'free',
                  subscription: {
                    ...(user.subscription as any),
                    status: 'expired'
                  }
                })
                .where(eq(users._id, user._id));
            }
          }
          logger.info(`Subscription expired and removed: ${stripeSubscription.id}`);
          break;
        }

        default:
          logger.info(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Webhook handling error:', error);
      throw error;
    }
  }

  private static calculateEndDate(billingCycle: 'monthly' | 'yearly'): Date {
    const endDate = new Date();
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    return endDate;
  }
}
