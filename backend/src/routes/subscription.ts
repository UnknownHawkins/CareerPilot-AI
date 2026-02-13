import express, { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';
import { createSubscriptionValidator } from '../utils/validators';

const router = Router();

// Public webhook route
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  SubscriptionController.handleWebhook
);

router.use(authenticate);

router.get('/plans', SubscriptionController.getPricingPlans);
router.get('/', SubscriptionController.getSubscription);

router.post(
  '/',
  createSubscriptionValidator,
  SubscriptionController.createSubscription
);

router.post('/cancel', SubscriptionController.cancelSubscription);
router.get('/features/:feature', SubscriptionController.checkFeatureAccess);
router.get('/features', SubscriptionController.getAllFeatures);
router.get('/billing/history', SubscriptionController.getBillingHistory);

export default router;
