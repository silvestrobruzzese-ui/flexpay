import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function Success() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSuccessData();
  }, [sessionId]);

  const loadSuccessData = async () => {
    try {
      const res = await fetch(`/api/checkout/success/${sessionId}`);
      const data = await res.json();

      if (data.redirectUrl) {
        setRedirectUrl(data.redirectUrl);
        // Notify parent window
        window.parent.postMessage({ type: 'flexpay:success', sessionId }, '*');
        // Auto redirect after 3 seconds
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 3000);
      }
    } catch (error) {
      console.error('Error loading success data:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Pagamento completato!
        </h1>
        <p className="text-gray-500 mb-6">
          Grazie per il tuo acquisto. Verrai reindirizzato automaticamente.
        </p>
        {redirectUrl && (
          <a
            href={redirectUrl}
            className="inline-block bg-brand-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-700 transition"
          >
            Torna al sito
          </a>
        )}
      </div>
    </div>
  );
}
