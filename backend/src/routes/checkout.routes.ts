import { Router } from 'express';
import {
  createSession,
  getSession,
  createPaymentIntent,
  confirmPayment,
  handlePayPalReturn,
  handleMollieReturn,
  handleCancel,
} from '../controllers/checkout.controller.js';
import { apiKeyAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Create session (from merchant server, requires API key)
router.post('/sessions', apiKeyAuth, createSession);

// Public routes (for checkout popup)
router.get('/sessions/:sessionId', getSession);
router.post('/sessions/:sessionId/payment-intent', createPaymentIntent);
router.post('/sessions/:sessionId/confirm', confirmPayment);
router.post('/sessions/:sessionId/cancel', handleCancel);

// Provider return handlers
router.get('/paypal-return/:sessionId', handlePayPalReturn);
router.get('/paypal-cancel/:sessionId', handleCancel);
router.get('/mollie-return/:sessionId', handleMollieReturn);

export default router;
