// API Configuration
const API_URL = import.meta.env.VITE_API_URL || '';

// Helper function to build API URLs
export function apiUrl(path: string): string {
  // In development, use relative URLs (proxy handles it)
  // In production, use the full API URL
  if (!API_URL) {
    return path;
  }
  return `${API_URL}${path}`;
}

// API client with common configurations
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(path);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Checkout API
export const checkoutApi = {
  getSession: (sessionId: string) =>
    apiFetch<{
      session: {
        id: string;
        amount: string;
        currency: string;
        description?: string;
        merchantName: string;
        expiresAt: string;
      };
      providers: Array<{
        id: string;
        name: string;
        icon: string;
        description?: string;
        supportsBNPL: boolean;
        bnplOptions?: number[];
      }>;
      stripePublicKey?: string;
    }>(`/api/checkout/sessions/${sessionId}`),

  createPaymentIntent: (sessionId: string, provider: string) =>
    apiFetch<{
      clientSecret?: string;
      paymentIntentId?: string;
      redirectUrl?: string;
      orderId?: string;
      paymentId?: string;
      provider: string;
    }>(`/api/checkout/sessions/${sessionId}/payment-intent`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),

  confirmPayment: (sessionId: string, paymentIntentId: string) =>
    apiFetch<{
      success: boolean;
      redirectUrl: string;
    }>(`/api/checkout/sessions/${sessionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    }),

  cancelSession: (sessionId: string) =>
    apiFetch<{
      status: string;
      redirectUrl: string;
    }>(`/api/checkout/sessions/${sessionId}/cancel`, {
      method: 'POST',
    }),
};

// PayPal return handler
export const paypalApi = {
  handleReturn: (sessionId: string, token: string) =>
    apiFetch<{
      success: boolean;
      redirectUrl?: string;
      error?: string;
    }>(`/api/checkout/paypal-return/${sessionId}?token=${token}`),
};

// Mollie return handler
export const mollieApi = {
  handleReturn: (sessionId: string) =>
    apiFetch<{
      success: boolean;
      redirectUrl?: string;
      error?: string;
      status?: string;
    }>(`/api/checkout/mollie-return/${sessionId}`),
};
