import Stripe from 'stripe';
import { isPayPalConfigured } from '../services/paypal.service.js';
import { isMollieConfigured } from '../services/mollie.service.js';

// Stripe
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null;

// Provider configuration
export const PROVIDERS = {
  stripe: {
    id: 'stripe',
    name: 'Carta di Credito/Debito',
    icon: '💳',
    enabled: !!process.env.STRIPE_SECRET_KEY,
    supportsBNPL: false,
    description: 'Visa, Mastercard, American Express',
  },
  apple_pay: {
    id: 'apple_pay',
    name: 'Apple Pay',
    icon: '🍎',
    enabled: !!process.env.STRIPE_SECRET_KEY, // Uses Stripe
    supportsBNPL: false,
    description: 'Paga con Apple Pay',
    viaStripe: true,
  },
  google_pay: {
    id: 'google_pay',
    name: 'Google Pay',
    icon: '🔵',
    enabled: !!process.env.STRIPE_SECRET_KEY, // Uses Stripe
    supportsBNPL: false,
    description: 'Paga con Google Pay',
    viaStripe: true,
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    icon: '🅿️',
    enabled: isPayPalConfigured(),
    supportsBNPL: false,
    description: 'Paga con il tuo conto PayPal',
  },
  mollie: {
    id: 'mollie',
    name: 'Mollie',
    icon: '🟣',
    enabled: isMollieConfigured(),
    supportsBNPL: false,
    description: 'iDEAL, Bancontact, SOFORT e altri',
    submethods: true, // Has multiple payment methods
  },
  klarna: {
    id: 'klarna',
    name: 'Klarna',
    icon: '🛒',
    enabled: false, // Requires contract
    supportsBNPL: true,
    bnplOptions: [3, 6, 12],
    description: 'Paga in 3 rate senza interessi',
    requiresContract: true,
  },
  satispay: {
    id: 'satispay',
    name: 'Satispay',
    icon: '📱',
    enabled: false, // Requires contract
    supportsBNPL: false,
    description: 'Paga con Satispay',
    requiresContract: true,
  },
  scalapay: {
    id: 'scalapay',
    name: 'Scalapay',
    icon: '💜',
    enabled: false, // Requires contract
    supportsBNPL: true,
    bnplOptions: [3, 4],
    description: 'Paga in 3 o 4 rate',
    requiresContract: true,
  },
};

// Get all enabled providers
export const getEnabledProviders = () => {
  return Object.values(PROVIDERS).filter(p => p.enabled);
};

// Platform fee (your commission)
export const PLATFORM_FEE_PERCENT = 0.5; // 0.5% per transaction

// Provider fees (approximate)
export const PROVIDER_FEES = {
  stripe: { percent: 1.4, fixed: 0.25 },
  apple_pay: { percent: 1.4, fixed: 0.25 },
  google_pay: { percent: 1.4, fixed: 0.25 },
  paypal: { percent: 2.9, fixed: 0.35 },
  mollie: { percent: 1.8, fixed: 0.25 },
  klarna: { percent: 3.5, fixed: 0.30 },
  satispay: { percent: 1.5, fixed: 0.20 },
  scalapay: { percent: 3.0, fixed: 0.30 },
};
