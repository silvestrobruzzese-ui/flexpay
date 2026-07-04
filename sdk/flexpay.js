/**
 * FlexPay SDK
 * Integra FlexPay nel tuo sito per accettare pagamenti
 *
 * Uso:
 * 1. Includi lo script: <script src="https://cdn.flexpay.com/sdk.js"></script>
 * 2. Inizializza: FlexPay.init('pk_live_xxx')
 * 3. Crea checkout: FlexPay.checkout({ amount: 100, ... })
 */

(function (window) {
  'use strict';

  const FLEXPAY_API = 'https://api.flexpay.com'; // Change to your domain
  const FLEXPAY_CHECKOUT = 'https://checkout.flexpay.com'; // Change to your domain

  let publicKey = null;
  let popupWindow = null;

  const FlexPay = {
    /**
     * Initialize SDK with your public key
     * @param {string} key - Your FlexPay public key (pk_live_xxx)
     */
    init: function (key) {
      if (!key || !key.startsWith('pk_')) {
        console.error('FlexPay: Invalid public key. Use pk_live_xxx or pk_test_xxx');
        return;
      }
      publicKey = key;
      console.log('FlexPay SDK initialized');

      // Listen for messages from checkout popup
      window.addEventListener('message', handlePopupMessage);
    },

    /**
     * Create a checkout session and open popup
     * @param {Object} options - Checkout options
     * @param {number} options.amount - Amount in EUR
     * @param {string} options.currency - Currency (default: EUR)
     * @param {string} options.description - Payment description
     * @param {string} options.customerEmail - Customer email (optional)
     * @param {string} options.successUrl - Redirect URL on success
     * @param {string} options.cancelUrl - Redirect URL on cancel
     * @param {Object} options.metadata - Custom metadata
     * @param {Function} options.onSuccess - Success callback
     * @param {Function} options.onCancel - Cancel callback
     * @param {Function} options.onError - Error callback
     */
    checkout: async function (options) {
      if (!publicKey) {
        console.error('FlexPay: SDK not initialized. Call FlexPay.init() first');
        options.onError?.({ error: 'SDK non inizializzato' });
        return;
      }

      const {
        amount,
        currency = 'EUR',
        description,
        customerEmail,
        successUrl = window.location.href,
        cancelUrl = window.location.href,
        metadata = {},
        onSuccess,
        onCancel,
        onError,
      } = options;

      if (!amount || amount < 1) {
        onError?.({ error: 'Importo non valido' });
        return;
      }

      // Store callbacks
      FlexPay._callbacks = { onSuccess, onCancel, onError };

      try {
        // Note: In production, this call should come from your backend
        // The frontend should NOT have access to the secret key
        // This is a simplified demo flow

        // Open popup immediately to avoid popup blockers
        const width = 450;
        const height = 700;
        const left = (window.innerWidth - width) / 2 + window.screenX;
        const top = (window.innerHeight - height) / 2 + window.screenY;

        popupWindow = window.open(
          'about:blank',
          'FlexPayCheckout',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );

        if (!popupWindow) {
          onError?.({ error: 'Popup bloccato. Abilita i popup per questo sito.' });
          return;
        }

        popupWindow.document.write(`
          <html>
            <head>
              <title>FlexPay - Caricamento...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .loader {
                  text-align: center;
                  color: white;
                }
                .spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid rgba(255,255,255,0.3);
                  border-top-color: white;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="loader">
                <div class="spinner"></div>
                <p>Caricamento checkout...</p>
              </div>
            </body>
          </html>
        `);

        // In a real implementation, your backend creates the session
        // and returns the checkout URL. For demo, we show the flow:

        // This should be called from YOUR backend, not frontend:
        // const session = await yourBackend.createFlexPaySession({ amount, ... });
        // popupWindow.location.href = session.url;

        // Demo: redirect to checkout URL (in production, get this from your backend)
        const checkoutUrl = `${FLEXPAY_CHECKOUT}/demo?amount=${amount}&currency=${currency}`;

        // For demo purposes, show a message
        setTimeout(() => {
          if (popupWindow && !popupWindow.closed) {
            popupWindow.document.body.innerHTML = `
              <div style="padding: 40px; font-family: sans-serif; text-align: center;">
                <h2>Demo Mode</h2>
                <p>In produzione, il tuo backend crea la sessione e l'utente viene reindirizzato al checkout.</p>
                <p><strong>Importo:</strong> ${currency} ${amount}</p>
                <p><strong>Descrizione:</strong> ${description || 'N/A'}</p>
                <button onclick="window.opener.postMessage({type:'flexpay:success'},'*');window.close();"
                        style="background:#10b981;color:white;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;margin:8px;">
                  Simula Successo
                </button>
                <button onclick="window.opener.postMessage({type:'flexpay:cancel'},'*');window.close();"
                        style="background:#ef4444;color:white;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;margin:8px;">
                  Simula Annulla
                </button>
              </div>
            `;
          }
        }, 1000);

      } catch (error) {
        popupWindow?.close();
        onError?.({ error: 'Errore nella creazione del checkout' });
      }
    },

    /**
     * Create a payment button
     * @param {string} selector - CSS selector for button container
     * @param {Object} options - Same as checkout options
     */
    createButton: function (selector, options) {
      const container = document.querySelector(selector);
      if (!container) {
        console.error('FlexPay: Container not found:', selector);
        return;
      }

      const button = document.createElement('button');
      button.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
          </svg>
          Paga con FlexPay
        </span>
      `;
      button.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 14px 28px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
      });

      button.addEventListener('click', () => {
        FlexPay.checkout(options);
      });

      container.appendChild(button);
    },
  };

  function handlePopupMessage(event) {
    const { type, sessionId } = event.data || {};

    if (type === 'flexpay:success') {
      FlexPay._callbacks?.onSuccess?.({ sessionId });
      popupWindow?.close();
    } else if (type === 'flexpay:cancel') {
      FlexPay._callbacks?.onCancel?.({ sessionId });
      popupWindow?.close();
    }
  }

  // Expose to window
  window.FlexPay = FlexPay;

})(window);
