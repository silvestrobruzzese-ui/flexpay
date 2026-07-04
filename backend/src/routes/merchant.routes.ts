import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  getTransactions,
  updateWebhook,
  regenerateKeys,
} from '../controllers/merchant.controller.js';
import { merchantAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require JWT)
router.get('/profile', merchantAuth, getProfile);
router.get('/transactions', merchantAuth, getTransactions);
router.put('/webhook', merchantAuth, updateWebhook);
router.post('/regenerate-keys', merchantAuth, regenerateKeys);

export default router;
