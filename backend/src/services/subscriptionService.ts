import { Subscription, ISubscription } from '../models/Subscription';
import { User } from '../models/User';
import {
  createStripeCustomer,
  createStripeSubscription,
  createStripeCheckoutSession,
  cancelStripeSubscription,
  getStripeClient,
} from '../config/stripe';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';

export class SubscriptionService {
  // Create subscription
  static async createSubscription(
    userId: string,
    plan: 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{
    subscription: ISubscription;
    checkoutUrl?: string;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({ userId });
      if (existingSubscription?.status === 'active') {
        throw ApiError.conflict('User already has an active subscription');
      }

      // Calculate price
      const prices = {
        pro: { monthly: 29, yearly: 290 },
        enterprise: { monthly: 99, yearly: 990 },
      };

      const price = prices[plan][billingCycle];

      // Create Stripe customer if not exists
      let stripeCustomerId = user.subscription?.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await createStripeCustomer(user.email, user.getFullName());
        stripeCustomerId = customer.id;
        user.subscription!.stripeCustomerId = stripeCustomerId;
        await user.save();
      }

      // Create subscription in database
      const subscription = new Subscription({
        userId,
        plan,
        status: 'pending',
        billingCycle,
        price,
        currency: 'USD',
        startDate: new Date(),
        endDate: this.calculateEndDate(billingCycle),
        paymentProvider: 'stripe',
        paymentDetails: {
          stripeCustomerId,
        },
      });

      await subscription.save();

      // Create Stripe checkout session
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
          subscriptionId: subscription._id.toString(),
          userId,
          plan,
        }
      );

      subscription.paymentDetails.stripeSubscriptionId = checkoutSession.subscription as string;
      await subscription.save();

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

  // Handle successful subscription
  static async activateSubscription(
    subscriptionId: string,
    stripeSubscriptionId: string
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw ApiError.notFound('Subscription not found');
      }

      subscription.status = 'active';
      subscription.paymentDetails.stripeSubscriptionId = stripeSubscriptionId;
      await subscription.save();

      // Update user role
      const user = await User.findById(subscription.userId);
      if (user) {
        user.role = 'pro';
        user.subscription!.status = 'active';
        user.subscription!.plan = subscription.plan;
        user.subscription!.startDate = subscription.startDate;
        user.subscription!.endDate = subscription.endDate;
        user.subscription!.stripeSubscriptionId = stripeSubscriptionId;
        await user.save();
      }

      logger.info(`Subscription ${subscriptionId} activated`);

      return subscription;
    } catch (error) {
      logger.error('Activate subscription error:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(
    userId: string,
    reason?: string,
    feedback?: string
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        throw ApiError.notFound('No active subscription found');
      }

      // Cancel in Stripe
      if (subscription.paymentDetails.stripeSubscriptionId) {
        await cancelStripeSubscription(subscription.paymentDetails.stripeSubscriptionId);
      }

      // Update subscription
      subscription.status = 'cancelled';
      subscription.cancellation = {
        cancelledAt: new Date(),
        reason,
        feedback,
      };
      await subscription.save();

      // Update user
      const user = await User.findById(userId);
      if (user) {
        user.role = 'free';
        user.subscription!.status = 'cancelled';
        await user.save();
      }

      logger.info(`Subscription cancelled for user ${userId}`);

      return subscription;
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }

  // Get subscription by user ID
  static async getSubscriptionByUserId(
    userId: string
  ): Promise<ISubscription | null> {
    try {
      const subscription = await Subscription.findOne({ userId });
      return subscription;
    } catch (error) {
      logger.error('Get subscription error:', error);
      throw error;
    }
  }

  // Get subscription details
  static async getSubscriptionDetails(
    userId: string
  ): Promise<{
    subscription: ISubscription | null;
    usage: {
      resumeAnalysis: { used: number; limit: number };
      interviews: { used: number; limit: number };
      jobMatches: { used: number; limit: number };
      linkedInReview: { used: number; limit: number };
    };
  }> {
    try {
      const subscription = await Subscription.findOne({ userId });

      if (!subscription) {
        // Return free tier limits
        return {
          subscription: null,
          usage: {
            resumeAnalysis: { used: 0, limit: 3 },
            interviews: { used: 0, limit: 1 },
            jobMatches: { used: 0, limit: 0 },
            linkedInReview: { used: 0, limit: 1 },
          },
        };
      }

      return {
        subscription,
        usage: {
          resumeAnalysis: {
            used: subscription.features.resumeAnalysis.used,
            limit: subscription.features.resumeAnalysis.monthlyLimit,
          },
          interviews: {
            used: subscription.features.interviews.used,
            limit: subscription.features.interviews.monthlyLimit,
          },
          jobMatches: {
            used: subscription.features.jobMatches.used,
            limit: subscription.features.jobMatches.weeklyLimit,
          },
          linkedInReview: {
            used: subscription.features.linkedInReview.used,
            limit: subscription.features.linkedInReview.monthlyLimit,
          },
        },
      };
    } catch (error) {
      logger.error('Get subscription details error:', error);
      throw error;
    }
  }

  // Check feature access
  static async checkFeatureAccess(
    userId: string,
    featureName: string
  ): Promise<{
    hasAccess: boolean;
    limit?: number;
    used?: number;
    message?: string;
  }> {
    try {
      const subscription = await Subscription.findOne({ userId });

      if (!subscription) {
        // Free tier checks
        const freeLimits: Record<string, number> = {
          resumeAnalysis: 3,
          interviews: 1,
          jobMatches: 0,
          linkedInReview: 1,
          roadmaps: 1,
        };

        const user = await User.findById(userId);
        const used = user?.usage?.[`${featureName}Count`] || 0;
        const limit = freeLimits[featureName] || 0;

        return {
          hasAccess: used < limit,
          limit,
          used,
          message: used >= limit ? 'Free tier limit reached. Upgrade to Pro.' : undefined,
        };
      }

      const feature = subscription.features[featureName as keyof typeof subscription.features];
      
      if (typeof feature !== 'object' || feature === null) {
        return { hasAccess: false, message: 'Feature not available' };
      }

      if (!('enabled' in feature) || !feature.enabled) {
        return { hasAccess: false, message: 'Feature not enabled for your plan' };
      }

      const limit = 'monthlyLimit' in feature ? feature.monthlyLimit : -1;
      const used = 'used' in feature ? feature.used : 0;

      // -1 means unlimited
      if (limit === -1) {
        return { hasAccess: true, limit: -1, used };
      }

      return {
        hasAccess: used < limit,
        limit,
        used,
        message: used >= limit ? 'Monthly limit reached. Upgrade your plan.' : undefined,
      };
    } catch (error) {
      logger.error('Check feature access error:', error);
      throw error;
    }
  }

  // Increment feature usage
  static async incrementFeatureUsage(
    userId: string,
    featureName: string
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({ userId });

      if (subscription) {
        await subscription.incrementUsage(featureName);
      } else {
        // Update user usage for free tier
        const user = await User.findById(userId);
        if (user) {
          const usageField = `${featureName}Count`;
          if (usageField in user.usage) {
            (user.usage as any)[usageField] += 1;
            await user.save();
          }
        }
      }
    } catch (error) {
      logger.error('Increment feature usage error:', error);
      throw error;
    }
  }

  // Handle webhook events
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
          // Handle successful payment
          logger.info(`Payment succeeded for subscription: ${invoice.subscription}`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          // Handle failed payment
          logger.warn(`Payment failed for subscription: ${invoice.subscription}`);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          // Handle subscription cancellation
          logger.info(`Subscription cancelled: ${subscription.id}`);
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

  // Helper method to calculate end date
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
