import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { MerchantRequest } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate API keys
const generateApiKeys = () => {
  const publicKey = `pk_live_${uuidv4().replace(/-/g, '')}`;
  const secretKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
  return { publicKey, secretKey };
};

const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password minimo 8 caratteri'),
  businessName: z.string().min(2, 'Nome business richiesto'),
  website: z.string().url().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register new merchant
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.merchant.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      res.status(400).json({ error: 'Email già registrata' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const { publicKey, secretKey } = generateApiKeys();
    const webhookSecret = `whsec_${uuidv4().replace(/-/g, '')}`;

    const merchant = await prisma.merchant.create({
      data: {
        email: data.email,
        passwordHash,
        businessName: data.businessName,
        website: data.website,
        publicKey,
        secretKey,
        webhookSecret,
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        publicKey: true,
        secretKey: true,
        webhookSecret: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ merchantId: merchant.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registrazione completata',
      merchant,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Errore registrazione' });
  }
};

// Login merchant
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const merchant = await prisma.merchant.findUnique({
      where: { email: data.email },
    });

    if (!merchant) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, merchant.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    const token = jwt.sign({ merchantId: merchant.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Errore login' });
  }
};

// Get merchant profile
export const getProfile = async (req: MerchantRequest, res: Response): Promise<void> => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: {
        id: true,
        email: true,
        businessName: true,
        website: true,
        publicKey: true,
        secretKey: true,
        webhookUrl: true,
        webhookSecret: true,
        createdAt: true,
      },
    });

    res.json({ merchant });
  } catch (error) {
    console.error('GetProfile error:', error);
    res.status(500).json({ error: 'Errore recupero profilo' });
  }
};

// Get merchant transactions
export const getTransactions = async (req: MerchantRequest, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        checkoutSession: {
          select: {
            description: true,
            customerEmail: true,
          },
        },
      },
    });

    res.json({ transactions });
  } catch (error) {
    console.error('GetTransactions error:', error);
    res.status(500).json({ error: 'Errore recupero transazioni' });
  }
};

// Update webhook URL
export const updateWebhook = async (req: MerchantRequest, res: Response): Promise<void> => {
  try {
    const { webhookUrl } = req.body;

    const merchant = await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { webhookUrl },
      select: { webhookUrl: true, webhookSecret: true },
    });

    res.json({
      message: 'Webhook aggiornato',
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
    });
  } catch (error) {
    console.error('UpdateWebhook error:', error);
    res.status(500).json({ error: 'Errore aggiornamento webhook' });
  }
};

// Regenerate API keys
export const regenerateKeys = async (req: MerchantRequest, res: Response): Promise<void> => {
  try {
    const { publicKey, secretKey } = generateApiKeys();

    const merchant = await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { publicKey, secretKey },
      select: { publicKey: true, secretKey: true },
    });

    res.json({
      message: 'Chiavi rigenerate',
      publicKey: merchant.publicKey,
      secretKey: merchant.secretKey,
    });
  } catch (error) {
    console.error('RegenerateKeys error:', error);
    res.status(500).json({ error: 'Errore rigenerazione chiavi' });
  }
};
