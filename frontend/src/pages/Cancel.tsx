import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function Cancel() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    loadCancelData();
  }, [sessionId]);

  const loadCancelData = async () => {
    try {
      const res = await fetch(`/api/checkout/cancel/${sessionId}`);
      const data = await res.json();

      if (data.redirectUrl) {
        setRedirectUrl(data.redirectUrl);
        // Notify parent window
        window.parent.postMessage({ type: 'flexpay:cancel', sessionId }, '*');
      }
    } catch (error) {
      console.error('Error loading cancel data:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✕</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Pagamento annullato
        </h1>
        <p className="text-gray-500 mb-6">
          Il pagamento non è stato completato.
        </p>
        {redirectUrl && (
          <a
            href={redirectUrl}
            className="inline-block bg-gray-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-700 transition"
          >
            Torna al sito
          </a>
        )}
      </div>
    </div>
  );
}
