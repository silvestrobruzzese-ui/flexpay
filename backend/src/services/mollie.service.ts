/**
 * Mollie Integration Service
 * Docs: https://docs.mollie.com/reference/v2/payments-api/create-payment
 */

const MOLLIE_API = 'https://api.mollie.com/v2';

interface MolliePayment {
  id: string;
  status: string;
  _links: {
    checkout?: { href: string };
    self: { href: string };
  };
}

interface MollieError {
  detail?: string;
}

interface MollieMethodsResponse {
  _embedded?: {
    methods?: Array<{
      id: string;
      description: string;
      image?: { svg?: string; size2x?: string };
    }>;
  };
}

// Create Mollie payment
export async function createMolliePayment(
  amount: number,
  currency: string,
  description: string,
  redirectUrl: string,
  webhookUrl: string,
  metadata: Record<string, string>
): Promise<{ paymentId: string; checkoutUrl: string }> {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    throw new Error('Mollie API key not configured');
  }

  const response = await fetch(`${MOLLIE_API}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: {
        currency: currency.toUpperCase(),
        value: amount.toFixed(2),
      },
      description,
      redirectUrl,
      webhookUrl,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json() as MollieError;
    throw new Error(error.detail || 'Mollie payment creation failed');
  }

  const payment = await response.json() as MolliePayment;

  if (!payment._links.checkout?.href) {
    throw new Error('Mollie checkout URL not found');
  }

  return {
    paymentId: payment.id,
    checkoutUrl: payment._links.checkout.href,
  };
}

// Get Mollie payment status
export async function getMolliePayment(paymentId: string): Promise<{
  status: string;
  paid: boolean;
  transactionId?: string;
}> {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    throw new Error('Mollie API key not configured');
  }

  const response = await fetch(`${MOLLIE_API}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const payment = await response.json() as MolliePayment;

  return {
    status: payment.status,
    paid: payment.status === 'paid',
    transactionId: payment.id,
  };
}

// Available Mollie payment methods
export async function getMollieMethods(amount: number, currency: string): Promise<Array<{
  id: string;
  description: string;
  image: string;
}>> {
  const apiKey = process.env.MOLLIE_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(
      `${MOLLIE_API}/methods?amount[value]=${amount.toFixed(2)}&amount[currency]=${currency}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const data = await response.json() as MollieMethodsResponse;

    return (data._embedded?.methods || []).map((method) => ({
      id: method.id,
      description: method.description,
      image: method.image?.svg || method.image?.size2x || '',
    }));
  } catch {
    return [];
  }
}

export const isMollieConfigured = (): boolean => {
  return !!process.env.MOLLIE_API_KEY;
};
