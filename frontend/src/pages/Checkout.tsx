import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { checkoutApi } from '../services/api';

interface Provider {
  id: string;
  name: string;
  icon: string;
  description?: string;
  supportsBNPL: boolean;
  bnplOptions?: number[];
}

interface Session {
  id: string;
  amount: string;
  currency: string;
  description?: string;
  merchantName: string;
  expiresAt: string;
}

// Payment Form Component (inside Stripe Elements)
function PaymentForm({
  session,
  onSuccess,
  onCancel,
}: {
  session: Session;
  onSuccess: (redirectUrl: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Confirm payment with Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || 'Errore nel pagamento');
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        const data = await checkoutApi.confirmPayment(session.id, paymentIntent.id);
        if (data.success) {
          onSuccess(data.redirectUrl);
        } else {
          setError('Errore nella conferma');
          setProcessing(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nella conferma');
        setProcessing(false);
      }
    } else {
      setError('Pagamento non completato');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-brand-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
            Elaborazione...
          </span>
        ) : (
          `Paga ${session.currency} ${parseFloat(session.amount).toFixed(2)}`
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full mt-3 text-gray-500 py-2 hover:text-gray-700 transition"
      >
        Annulla
      </button>
    </form>
  );
}

// Main Checkout Component
export default function Checkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingProvider, setProcessingProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const data = await checkoutApi.getSession(sessionId!);

      setSession(data.session);
      setProviders(data.providers);

      // Initialize Stripe
      if (data.stripePublicKey) {
        setStripePromise(loadStripe(data.stripePublicKey));
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sessione non valida');
      setLoading(false);
    }
  };

  const handleSelectProvider = async (providerId: string) => {
    setSelectedProvider(providerId);
    setProcessingProvider(true);
    setError(null);

    try {
      const data = await checkoutApi.createPaymentIntent(sessionId!, providerId);

      // Handle different provider responses
      if (data.provider === 'stripe' && data.clientSecret) {
        // Stripe: use embedded payment form
        setClientSecret(data.clientSecret);
        setProcessingProvider(false);
      } else if (data.redirectUrl) {
        // PayPal, Mollie, etc: redirect within popup
        window.location.href = data.redirectUrl;
      } else {
        setError('Risposta provider non valida');
        setSelectedProvider(null);
        setProcessingProvider(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione del pagamento');
      setSelectedProvider(null);
      setProcessingProvider(false);
    }
  };

  const handleSuccess = (url: string) => {
    setSuccess(true);
    setRedirectUrl(url);

    // Notify parent window
    window.parent.postMessage({ type: 'flexpay:success', sessionId }, '*');
    window.opener?.postMessage({ type: 'flexpay:success', sessionId }, '*');

    // Auto redirect after 2 seconds
    setTimeout(() => {
      window.location.href = url;
    }, 2000);
  };

  const handleCancel = async () => {
    try {
      await checkoutApi.cancelSession(sessionId!);
    } catch {
      // Ignore cancel errors
    }

    window.parent.postMessage({ type: 'flexpay:cancel', sessionId }, '*');
    window.opener?.postMessage({ type: 'flexpay:cancel', sessionId }, '*');

    window.close();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">{error}</h1>
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento completato!</h1>
          <p className="text-gray-500 mb-6">Grazie per il tuo acquisto</p>
          {redirectUrl && (
            <a
              href={redirectUrl}
              className="inline-block bg-brand-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-700 transition"
            >
              Continua
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-bold">FlexPay</span>
            <button onClick={handleCancel} className="text-white/70 hover:text-white text-2xl">
              ×
            </button>
          </div>
          <p className="text-sm text-white/80">Pagamento a</p>
          <p className="text-lg font-semibold">{session?.merchantName}</p>
        </div>

        {/* Amount */}
        <div className="p-6 border-b bg-gray-50">
          <p className="text-sm text-gray-500">Totale</p>
          <p className="text-4xl font-bold text-gray-800">
            {session?.currency} {parseFloat(session?.amount || '0').toFixed(2)}
          </p>
          {session?.description && (
            <p className="text-gray-600 mt-1">{session.description}</p>
          )}
        </div>

        {/* Payment */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!selectedProvider ? (
            // Provider Selection
            <>
              <p className="text-sm font-medium text-gray-700 mb-4">
                Scegli come pagare
              </p>
              <div className="space-y-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleSelectProvider(provider.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 transition"
                  >
                    <span className="text-2xl">{provider.icon}</span>
                    <div className="text-left flex-1">
                      <p className="font-medium text-gray-800">{provider.name}</p>
                      {provider.description && (
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          ) : processingProvider ? (
            // Loading state while creating payment
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
              <p className="text-gray-600">Preparazione pagamento...</p>
              <p className="text-sm text-gray-400 mt-1">
                {providers.find(p => p.id === selectedProvider)?.name}
              </p>
            </div>
          ) : clientSecret && stripePromise ? (
            // Stripe Payment Form
            <>
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  setClientSecret(null);
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
              >
                ← Cambia metodo
              </button>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0284c7',
                      borderRadius: '8px',
                    },
                  },
                  locale: 'it',
                }}
              >
                <PaymentForm
                  session={session!}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </Elements>
            </>
          ) : (
            // Loading payment form
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          )}

          {/* Security Note */}
          <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Pagamento sicuro e crittografato
          </p>
        </div>
      </div>
    </div>
  );
}
