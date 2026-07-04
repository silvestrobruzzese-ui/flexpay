import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { paypalApi } from '../services/api';

export default function PayPalReturn() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      capturePayment();
    }
  }, [sessionId]);

  const capturePayment = async () => {
    try {
      const token = searchParams.get('token') || '';
      const data = await paypalApi.handleReturn(sessionId!, token);

      if (data.success) {
        setStatus('success');
        setRedirectUrl(data.redirectUrl || null);

        // Notify parent window
        window.parent.postMessage({ type: 'flexpay:success', sessionId }, '*');
        window.opener?.postMessage({ type: 'flexpay:success', sessionId }, '*');

        // Auto redirect after 2 seconds
        setTimeout(() => {
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
          }
        }, 2000);
      } else {
        setStatus('error');
        setError(data.error || 'Pagamento non completato');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    }
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Elaborazione pagamento...</h1>
          <p className="text-gray-500">Stiamo completando il tuo pagamento PayPal</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento non riuscito</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

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
