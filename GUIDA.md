# FlexPay - White-Label Payment Gateway

**Versione:** 1.0
**Ultimo aggiornamento:** 4 Luglio 2026
**Stato:** Funzionante in Produzione

---

## URLs di Produzione

| Servizio | URL |
|----------|-----|
| **Frontend Checkout** | https://flexpay-checkout.pages.dev |
| **Backend API** | https://flexpay-backend-production.up.railway.app |
| **Stripe Dashboard** | https://dashboard.stripe.com |
| **GitHub Repository** | https://github.com/silvestrobruzzese-ui/flexpay |
| **Railway Dashboard** | https://railway.com/project/5cca468e-2709-4787-8dff-7e57c7a1af71 |

---

## Account Utilizzati

| Servizio | Account |
|----------|---------|
| **GitHub** | silvestrobruzzese-ui |
| **Railway** | silvestrobruzzese@gmail.com |
| **Cloudflare** | silvestrobruzzese@gmail.com |
| **Stripe** | Gianni Bruzzese (modalità test) |

---

## Funzionalità Attive

| Funzionalità | Stato | Note |
|--------------|-------|------|
| Pagamento con carta | ✅ | Visa, Mastercard, Amex |
| 3D Secure | ✅ | Autenticazione bancaria automatica |
| Apple Pay | ✅ | Via Stripe |
| Google Pay | ✅ | Via Stripe |
| Chiusura popup automatica | ✅ | Dopo pagamento completato |
| Redirect al merchant | ✅ | successUrl / cancelUrl |

---

## Come Funziona

### Flusso di Pagamento

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SITO MERCHANT  │     │    FLEXPAY      │     │     STRIPE      │
│                 │     │                 │     │                 │
│  [Paga €50]     │────►│  Popup checkout │────►│  Processa       │
│                 │     │  - Carta        │     │  pagamento      │
│                 │     │  - Apple Pay    │     │                 │
│                 │     │  - Google Pay   │     │  3D Secure?     │
│                 │◄────│                 │◄────│  ✓ Completato   │
│  Grazie!        │     │  Chiude popup   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Flusso Tecnico

1. **Merchant** chiama API per creare sessione di checkout
2. **Cliente** viene reindirizzato al popup FlexPay
3. **Cliente** sceglie metodo di pagamento
4. **Stripe** processa il pagamento (+ 3D Secure se richiesto)
5. **FlexPay** conferma e chiude popup
6. **Cliente** torna al sito del merchant

---

## Le Tue Commissioni

### Modello di Business

```
Transazione €100
     │
     ├── Stripe trattiene:  ~€1.65 (1.4% + €0.25)
     ├── FlexPay trattiene: €0.50 (0.5%)
     └── Merchant riceve:   ~€97.85
```

### Dove Vanno i Soldi

**Configurazione attuale (Test Mode):**
- Tutti i pagamenti vanno sul TUO account Stripe
- Modalità test = nessun soldo vero

**Per Produzione con Merchant Esterni:**
- Attiva **Stripe Connect** per gestire payout automatici
- Ogni merchant collega il suo account Stripe
- Le tue commissioni vengono trattenute automaticamente

### Come Ricevere i Soldi

1. Vai su https://dashboard.stripe.com
2. Settings → Payouts → Configura conto bancario
3. Stripe trasferisce automaticamente (giornaliero/settimanale)

---

## Guida Rapida: Creare un Pagamento

### 1. Crea Merchant (una volta)

```bash
curl -X POST https://flexpay-backend-production.up.railway.app/api/merchant/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tuaemail@esempio.com",
    "password": "password-sicura",
    "businessName": "Nome Negozio"
  }'
```

Risposta:
```json
{
  "merchant": {
    "secretKey": "sk_live_xxxxx"  ← SALVA QUESTA!
  }
}
```

### 2. Crea Sessione di Checkout

```bash
curl -X POST https://flexpay-backend-production.up.railway.app/api/checkout/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_TUA_SECRET_KEY" \
  -d '{
    "amount": 50.00,
    "currency": "EUR",
    "description": "Ordine #123",
    "successUrl": "https://tuosito.com/grazie",
    "cancelUrl": "https://tuosito.com/carrello"
  }'
```

Risposta:
```json
{
  "id": "abc-123-xyz",
  "url": "https://flexpay-checkout.pages.dev/abc-123-xyz",
  "expiresAt": "2026-07-04T14:00:00Z"
}
```

### 3. Reindirizza il Cliente

Apri l'URL in un popup o redirect:

```javascript
// Popup (consigliato)
window.open(url, 'FlexPay', 'width=450,height=700');

// Oppure redirect
window.location.href = url;
```

---

## Carte di Test

| Numero | Risultato |
|--------|-----------|
| `4242 4242 4242 4242` | Successo immediato |
| `4000 0025 0000 3155` | Richiede 3D Secure |
| `4000 0000 0000 0002` | Carta rifiutata |
| `4000 0000 0000 9995` | Fondi insufficienti |

**Per tutte:** Scadenza `12/30`, CVC `123`

---

## Integrazione nel Tuo Sito

### HTML + JavaScript

```html
<button id="pay-button">Paga €50.00</button>

<script>
document.getElementById('pay-button').onclick = async () => {
  // Chiama il tuo backend per creare la sessione
  const response = await fetch('/api/crea-pagamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 50.00 })
  });

  const { url } = await response.json();

  // Apri popup FlexPay
  const popup = window.open(url, 'FlexPay', 'width=450,height=700');

  // Ascolta messaggio di completamento
  window.addEventListener('message', (event) => {
    if (event.data.type === 'flexpay:success') {
      popup.close();
      alert('Pagamento completato!');
      // Aggiorna la pagina o mostra conferma
    }
  });
};
</script>
```

### Dal Tuo Backend (Node.js)

```javascript
// routes/pagamento.js
app.post('/api/crea-pagamento', async (req, res) => {
  const response = await fetch(
    'https://flexpay-backend-production.up.railway.app/api/checkout/sessions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FLEXPAY_SECRET_KEY
      },
      body: JSON.stringify({
        amount: req.body.amount,
        currency: 'EUR',
        description: `Ordine #${req.body.orderId}`,
        successUrl: 'https://tuosito.com/grazie',
        cancelUrl: 'https://tuosito.com/carrello',
        metadata: {
          orderId: req.body.orderId,
          customerId: req.body.customerId
        }
      })
    }
  );

  const data = await response.json();
  res.json({ url: data.url });
});
```

---

## API Reference

### Autenticazione

Tutte le richieste API richiedono header:
```
X-API-Key: sk_live_xxxxx
```

### Endpoints

#### POST /api/merchant/register
Registra un nuovo merchant.

#### POST /api/merchant/login
Login merchant, restituisce JWT token.

#### POST /api/checkout/sessions
Crea nuova sessione di checkout.

#### GET /api/checkout/sessions/:id
Ottiene dettagli sessione (per il frontend).

---

## Variabili Ambiente (Railway)

| Variabile | Valore |
|-----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | (generato automaticamente) |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `CHECKOUT_URL` | `https://flexpay-checkout.pages.dev` |
| `FRONTEND_URL` | `https://flexpay-checkout.pages.dev` |
| `PORT` | `3000` |

---

## Passare in Produzione (Live)

### 1. Attiva Stripe Live Mode

1. Vai su https://dashboard.stripe.com
2. Clicca "Modalità di test" → "Modalità live"
3. Completa verifica account (dati aziendali, conto bancario)
4. Copia le nuove chiavi live

### 2. Aggiorna Railway

```bash
railway variable set 'STRIPE_SECRET_KEY=sk_live_...'
railway variable set 'STRIPE_PUBLISHABLE_KEY=pk_live_...'
```

### 3. Checklist Produzione

- [ ] Account Stripe verificato (documenti, conto bancario)
- [ ] Chiavi Stripe live configurate su Railway
- [ ] Webhook Stripe configurato (opzionale)
- [ ] Dominio personalizzato (opzionale)
- [ ] SSL attivo (automatico con Cloudflare)
- [ ] Test con carta reale (importo minimo €0.50)

---

## Aggiungere Altri Provider

### PayPal

1. Registrati su https://developer.paypal.com
2. Crea app e ottieni Client ID + Secret
3. Aggiungi su Railway:
   ```
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_MODE=sandbox  (o "live")
   ```

### Mollie

1. Registrati su https://my.mollie.com
2. Ottieni API Key
3. Aggiungi su Railway:
   ```
   MOLLIE_API_KEY=test_...  (o "live_...")
   ```

---

## Struttura del Progetto

```
flexpay/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Entry point
│   │   ├── config/
│   │   │   ├── database.ts        # Prisma client
│   │   │   └── providers.ts       # Configurazione provider
│   │   ├── controllers/
│   │   │   ├── checkout.controller.ts
│   │   │   └── merchant.controller.ts
│   │   ├── services/
│   │   │   ├── paypal.service.ts
│   │   │   └── mollie.service.ts
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   ├── routes/
│   │   └── prisma/
│   │       └── schema.prisma
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Checkout.tsx       # Pagina principale checkout
│   │   │   ├── PayPalReturn.tsx
│   │   │   └── MollieReturn.tsx
│   │   └── services/
│   │       └── api.ts
│   ├── public/
│   │   ├── _redirects
│   │   └── _headers
│   └── package.json
│
├── sdk/
│   ├── flexpay.js
│   └── example.html
│
└── GUIDA.md
```

---

## Comandi Utili

```bash
# Backend - vedere log
railway logs --service flexpay-backend

# Backend - aprire dashboard
railway open

# Backend - rideploy
cd backend && railway up

# Frontend - build e deploy
cd frontend
npm run build
wrangler pages deploy dist --project-name flexpay-checkout

# Database - push schema
railway run npx prisma db push

# Git - commit e push
git add -A && git commit -m "descrizione" && git push
```

---

## Troubleshooting

### "Sessione non trovata"
- La sessione è scaduta (30 minuti) o già completata
- Crea una nuova sessione

### "Providers vuoti" / Nessun metodo di pagamento
- Verifica STRIPE_SECRET_KEY su Railway
- Fai redeploy: `railway up --service flexpay-backend`

### "3D Secure non funziona"
- In test mode usa carta: `4000 0025 0000 3155`
- In produzione dipende dalla banca del cliente

### Pagamento fallito
- Controlla Stripe Dashboard → Payments
- Verifica i log: `railway logs`

---

## Supporto

- **Stripe Docs:** https://stripe.com/docs
- **Railway Docs:** https://docs.railway.app
- **Cloudflare Pages:** https://developers.cloudflare.com/pages

---

*FlexPay - Creato con Claude Code*
*4 Luglio 2026*
