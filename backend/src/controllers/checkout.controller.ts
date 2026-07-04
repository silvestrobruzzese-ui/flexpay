import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { stripe, PLATFORM_FEE_PERCENT, PROVIDER_FEES, getEnabledProviders } from '../config/providers.js';
import { ApiKeyRequest } from '../middleware/auth.middleware.js';
import { createPayPalOrder, capturePayPalOrder } from '../services/paypal.service.js';
import { createMolliePayment, getMolliePayment } from '../services/mollie.service.js';

const createSessionSchema = z.object({
  amount: z.number().min(1, 'Importo minimo 1 EUR'),
  currency: z.string().default('EUR'),
  description: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  successUrl: z.string().url('Success URL non valida'),
  cancelUrl: z.string().url('Cancel URL non valida'),
  metadata: z.record(z.string()).optional(),
});

// Create checkout session (called by merchant's server)
export const createSession = async (req: ApiKeyRequest, res: Response): Promise<void> => {
  try {
    const data = createSessionSchema.parse(req.body);

    const session = await prisma.checkoutSession.create({
      data: {
        merchantId: req.merchant!.id,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        description: data.description,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
        metadata: data.metadata,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const checkoutUrl = `${process.env.CHECKOUT_URL}/${session.id}`;

    res.status(201).json({
      id: session.id,
      url: checkoutUrl,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('CreateSession error:', error);
    res.status(500).json({ error: 'Errore creazione sessione' });
  }
};

// Get session details (for checkout popup)
export const getSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        merchant: {
          select: { businessName: true, publicKey: true },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Sessione non trovata' });
      return;
    }

    if (session.status !== 'PENDING') {
      res.status(400).json({ error: 'Sessione non più valida', status: session.status });
      return;
    }

    if (new Date() > session.expiresAt) {
      await prisma.checkoutSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      res.status(400).json({ error: 'Sessione scaduta' });
      return;
    }

    // Get enabled providers
    const availableProviders = getEnabledProviders().map(provider => ({
      id: provider.id,
      name: provider.name,
      icon: provider.icon,
      description: provider.description,
      supportsBNPL: provider.supportsBNPL,
      bnplOptions: (provider as any).bnplOptions,
    }));

    res.json({
      session: {
        id: session.id,
        amount: session.amount,
        currency: session.currency,
        description: session.description,
        merchantName: session.merchant.businessName,
        expiresAt: session.expiresAt,
      },
      providers: availableProviders,
      stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error('GetSession error:', error);
    res.status(500).json({ error: 'Errore recupero sessione' });
  }
};

// Create Payment Intent for Stripe (embedded payment)
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const { provider } = req.body;

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: { merchant: true },
    });

    if (!session || session.status !== 'PENDING') {
      res.status(400).json({ error: 'Sessione non valida' });
      return;
    }

    const amount = Number(session.amount);

    // Handle different providers
    switch (provider) {
      case 'stripe':
      case 'apple_pay':
      case 'google_pay': {
        if (!stripe) {
          res.status(400).json({ error: 'Stripe non configurato' });
          return;
        }

        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: session.currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            flexpaySessionId: sessionId,
            merchantId: session.merchantId,
            provider: provider as string,
          },
          description: session.description || `Pagamento a ${session.merchant.businessName}`,
        });

        await prisma.checkoutSession.update({
          where: { id: sessionId },
          data: {
            status: 'PROCESSING',
            paymentMethod: provider as string,
            providerSessionId: paymentIntent.id,
          },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          provider: 'stripe',
        });
        break;
      }

      case 'paypal': {
        const returnUrl = `${process.env.CHECKOUT_URL}/paypal-return/${sessionId}`;
        const cancelUrl = `${process.env.CHECKOUT_URL}/paypal-cancel/${sessionId}`;

        const { orderId, approvalUrl } = await createPayPalOrder(
          amount,
          session.currency,
          session.description || `Pagamento a ${session.merchant.businessName}`,
          returnUrl,
          cancelUrl
        );

        await prisma.checkoutSession.update({
          where: { id: sessionId },
          data: {
            status: 'PROCESSING',
            paymentMethod: 'paypal',
            providerSessionId: orderId,
          },
        });

        res.json({
          redirectUrl: approvalUrl,
          orderId,
          provider: 'paypal',
        });
        break;
      }

      case 'mollie': {
        const redirectUrl = `${process.env.CHECKOUT_URL}/mollie-return/${sessionId}`;
        const webhookUrl = `${process.env.FRONTEND_URL}/webhooks/mollie`;

        const { paymentId, checkoutUrl } = await createMolliePayment(
          amount,
          session.currency,
          session.description || `Pagamento a ${session.merchant.businessName}`,
          redirectUrl,
          webhookUrl,
          { sessionId, merchantId: session.merchantId }
        );

        await prisma.checkoutSession.update({
          where: { id: sessionId },
          data: {
            status: 'PROCESSING',
            paymentMethod: 'mollie',
            providerSessionId: paymentId,
          },
        });

        res.json({
          redirectUrl: checkoutUrl,
          paymentId,
          provider: 'mollie',
        });
        break;
      }

      default:
        res.status(400).json({ error: 'Provider non supportato' });
    }
  } catch (error) {
    console.error('CreatePaymentIntent error:', error);
    res.status(500).json({ error: 'Errore creazione pagamento' });
  }
};

// Confirm Stripe payment
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const { paymentIntentId } = req.body;

    if (!stripe) {
      res.status(400).json({ error: 'Stripe non configurato' });
      return;
    }

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Sessione non trovata' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      res.status(400).json({ error: 'Pagamento non completato', status: paymentIntent.status });
      return;
    }

    await completePayment(session, 'stripe', paymentIntentId);

    res.json({
      success: true,
      redirectUrl: session.successUrl,
    });
  } catch (error) {
    console.error('ConfirmPayment error:', error);
    res.status(500).json({ error: 'Errore conferma pagamento' });
  }
};

// Handle PayPal return
export const handlePayPalReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const token = req.query.token as string | undefined;

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.providerSessionId) {
      res.status(404).json({ error: 'Sessione non trovata' });
      return;
    }

    // Capture the payment
    const result = await capturePayPalOrder(session.providerSessionId);

    if (result.success) {
      await completePayment(session, 'paypal', result.transactionId!);
      res.json({
        success: true,
        redirectUrl: session.successUrl,
      });
    } else {
      res.status(400).json({ error: result.error || 'Pagamento non completato' });
    }
  } catch (error) {
    console.error('HandlePayPalReturn error:', error);
    res.status(500).json({ error: 'Errore PayPal' });
  }
};

// Handle Mollie return
export const handleMollieReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.providerSessionId) {
      res.status(404).json({ error: 'Sessione non trovata' });
      return;
    }

    const payment = await getMolliePayment(session.providerSessionId);

    if (payment.paid) {
      await completePayment(session, 'mollie', payment.transactionId!);
      res.json({
        success: true,
        redirectUrl: session.successUrl,
      });
    } else {
      res.status(400).json({
        error: 'Pagamento non completato',
        status: payment.status,
      });
    }
  } catch (error) {
    console.error('HandleMollieReturn error:', error);
    res.status(500).json({ error: 'Errore Mollie' });
  }
};

// Complete payment and create transaction
async function completePayment(
  session: any,
  provider: string,
  providerTxId: string
) {
  const amount = Number(session.amount);
  const fees = PROVIDER_FEES[provider as keyof typeof PROVIDER_FEES] || { percent: 2, fixed: 0.25 };

  const providerFee = amount * (fees.percent / 100) + fees.fixed;
  const platformFee = amount * (PLATFORM_FEE_PERCENT / 100);
  const netAmount = amount - providerFee - platformFee;

  // Create transaction
  await prisma.transaction.create({
    data: {
      merchantId: session.merchantId,
      checkoutSessionId: session.id,
      amount: session.amount,
      currency: session.currency,
      provider,
      providerTxId,
      providerFee,
      platformFee,
      netAmount,
      status: 'COMPLETED',
    },
  });

  // Update session
  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: { status: 'COMPLETED' },
  });

  // Notify merchant
  await notifyMerchant(session.merchantId, {
    event: 'payment.completed',
    sessionId: session.id,
    amount,
    currency: session.currency,
    provider,
  });

  console.log(`Payment completed: ${session.id} via ${provider}`);
}

// Handle cancel
export const handleCancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Sessione non trovata' });
      return;
    }

    await prisma.checkoutSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
    });

    res.json({
      status: 'cancelled',
      redirectUrl: session.cancelUrl,
    });
  } catch (error) {
    console.error('HandleCancel error:', error);
    res.status(500).json({ error: 'Errore' });
  }
};

// Notify merchant webhook
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
