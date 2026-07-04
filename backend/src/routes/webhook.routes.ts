import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/database.js';
import { stripe, PLATFORM_FEE_PERCENT } from '../config/providers.js';

const router = Router();

// Stripe webhook
router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret || !stripe) {
    res.status(400).json({ error: 'Webhook non configurato' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature failed:', err.message);
    res.status(400).json({ error: 'Signature non valida' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleStripeSuccess(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleStripeExpired(session);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleStripeSuccess(stripeSession: Stripe.Checkout.Session) {
  const flexpaySessionId = stripeSession.metadata?.flexpaySessionId;
  if (!flexpaySessionId) return;

  const session = await prisma.checkoutSession.findUnique({
    where: { id: flexpaySessionId },
  });

  if (!session) return;

  const amount = Number(session.amount);
  const providerFee = amount * 0.014 + 0.25; // Stripe ~1.4% + €0.25
  const platformFee = amount * (PLATFORM_FEE_PERCENT / 100);
  const netAmount = amount - providerFee - platformFee;

  // Create transaction
  await prisma.transaction.create({
    data: {
      merchantId: session.merchantId,
      checkoutSessionId: session.id,
      amount: session.amount,
      currency: session.currency,
      provider: 'stripe',
      providerTxId: stripeSession.payment_intent as string,
      providerFee,
      platformFee,
      netAmount,
      status: 'COMPLETED',
    },
  });

  // Update session status
  await prisma.checkoutSession.update({
    where: { id: flexpaySessionId },
    data: { status: 'COMPLETED' },
  });

  // Notify merchant webhook
  await notifyMerchant(session.merchantId, {
    event: 'payment.completed',
    sessionId: flexpaySessionId,
    amount,
    currency: session.currency,
  });

  console.log(`Payment completed: ${flexpaySessionId}`);
}

async function handleStripeExpired(stripeSession: Stripe.Checkout.Session) {
  const flexpaySessionId = stripeSession.metadata?.flexpaySessionId;
  if (!flexpaySessionId) return;

  await prisma.checkoutSession.update({
    where: { id: flexpaySessionId },
    data: { status: 'EXPIRED' },
  });
}

async function notifyMerchant(merchantId: string, payload: any) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { webhookUrl: true, webhookSecret: true },
  });

  if (!merchant?.webhookUrl) return;

  try {
    await fetch(merchant.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FlexPay-Signature': merchant.webhookSecret || '',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to notify merchant:', error);
  }
}

export default router;
