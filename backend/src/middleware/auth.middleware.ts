import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Auth for merchant dashboard (JWT)
export interface MerchantRequest extends Request {
  merchant?: {
    id: string;
    email: string;
    businessName: string;
  };
}

export const merchantAuth = async (
  req: MerchantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token mancante' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { merchantId: string };

    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.merchantId },
      select: { id: true, email: true, businessName: true, isActive: true },
    });

    if (!merchant || !merchant.isActive) {
      res.status(401).json({ error: 'Merchant non trovato o disabilitato' });
      return;
    }

    req.merchant = merchant;
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido' });
  }
};

// Auth for API calls from merchant's server (API Key)
export interface ApiKeyRequest extends Request {
  merchant?: {
    id: string;
    businessName: string;
  };
}

export const apiKeyAuth = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key mancante' });
      return;
    }

    // Check if it's a secret key (sk_)
    if (!apiKey.startsWith('sk_')) {
      res.status(401).json({ error: 'Usa la secret key (sk_...) per le chiamate server' });
      return;
    }

    const merchant = await prisma.merchant.findUnique({
      where: { secretKey: apiKey },
      select: { id: true, businessName: true, isActive: true },
    });

    if (!merchant || !merchant.isActive) {
      res.status(401).json({ error: 'API key non valida' });
      return;
    }

    req.merchant = merchant;
    next();
  } catch {
    res.status(401).json({ error: 'Errore autenticazione' });
  }
};
