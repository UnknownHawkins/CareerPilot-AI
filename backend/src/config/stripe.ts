import Stripe from 'stripe';
import { logger } from '../utils/logger';

let stripeClient: Stripe | null = null;

export const initializeStripe = (): void => {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      logger.warn('STRIPE_SECRET_KEY is not defined. Stripe payments will be disabled.');
      return;
    }
    
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
    
    logger.info('Stripe initialized successfully');
  } catch (error) {
    logger.error('Stripe initialization error:', error);
    throw error;
  }
};

export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    initializeStripe();
  }
  if (!stripeClient) {
    throw new Error('Stripe client not initialized');
  }
  return stripeClient;
};

export const createStripeCustomer = async (
  email: string,
  name: string
): Promise<Stripe.Customer> => {
  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.create({
      email,
      name,
    });
    return customer;
  } catch (error) {
    logger.error('Stripe customer creation error:', error);
    throw error;
  }
};

export const createStripeSubscription = async (
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> => {
  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    return subscription;
  } catch (error) {
    logger.error('Stripe subscription creation error:', error);
    throw error;
  }
};

export const cancelStripeSubscription = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error('Stripe subscription cancellation error:', error);
    throw error;
  }
};

export const createStripeCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> => {
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
    return session;
  } catch (error) {
    logger.error('Stripe checkout session creation error:', error);
    throw error;
  }
};

export const constructStripeEvent = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  try {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
    }
    
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error('Stripe webhook event construction error:', error);
    throw error;
  }
};

export const getStripeInvoice = async (invoiceId: string): Promise<Stripe.Invoice> => {
  try {
    const stripe = getStripeClient();
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice;
  } catch (error) {
    logger.error('Stripe invoice retrieval error:', error);
    throw error;
  }
};
