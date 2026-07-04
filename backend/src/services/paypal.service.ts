/**
 * PayPal Integration Service
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ rel: string; href: string }>;
}

interface PayPalTokenResponse {
  access_token: string;
}

interface PayPalCaptureResponse {
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string }>;
    };
  }>;
  message?: string;
}

// Get PayPal access token
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json() as PayPalTokenResponse;
  return data.access_token;
}

// Create PayPal order
export async function createPayPalOrder(
  amount: number,
  currency: string,
  description: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ orderId: string; approvalUrl: string }> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          description,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'FlexPay',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    }),
  });

  const order = await response.json() as PayPalOrder;

  const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

  if (!approvalUrl) {
    throw new Error('PayPal approval URL not found');
  }

  return {
    orderId: order.id,
    approvalUrl,
  };
}

// Capture PayPal payment (after user approves)
export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json() as PayPalCaptureResponse;

  if (data.status === 'COMPLETED') {
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      success: true,
      transactionId: capture?.id || orderId,
    };
  }

  return {
    success: false,
    error: data.message || 'Payment not completed',
  };
}

// Verify PayPal order status
export async function getPayPalOrderStatus(orderId: string): Promise<string> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const order = await response.json() as PayPalOrder;
  return order.status;
}

export const isPayPalConfigured = (): boolean => {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
};
