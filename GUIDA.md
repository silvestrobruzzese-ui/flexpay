# FlexPay - White-Label Payment Gateway

**Versione:** 1.0
**Ultimo aggiornamento:** Luglio 2026

---

## Quick Start

```bash
# 1. Backend
cd ~/Desktop/flexpay/backend
cp .env.example .env
# Modifica .env con le tue chiavi (vedi sotto)
npm install && npx prisma generate && npx prisma db push && npm run dev

# 2. Frontend (nuovo terminale)
cd ~/Desktop/flexpay/frontend
npm install && npm run dev

# 3. Test (nuovo terminale)
curl -X POST http://localhost:3000/api/merchant/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"password123","businessName":"Test Shop"}'
```

---

## L'Idea Fondamentale

### Il Problema

Creare un sistema di pagamento come Stripe richiede:
- Licenze bancarie/finanziarie (costi enormi, anni di burocrazia)
- Certificazione PCI DSS (€50-100K/anno)
- Capitale minimo €1-5 milioni
- Team legale, compliance, antifrode
- Responsabilita su rischi, rimborsi, dispute

**Troppo complesso, troppo costoso, troppo rischioso.**

### La Soluzione: White-Label Payment Gateway

**FlexPay** non costruisce l'infrastruttura, ma diventa il **VOLTO** dei pagamenti.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   L'UTENTE VEDE:        "Paga con FlexPay"                             │
│                                                                         │
│   DIETRO LE QUINTE:     Stripe / PayPal / Mollie / Klarna              │
│                         (loro gestiscono TUTTO)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

FlexPay e un **ponte/aggregatore** tra:
- **Utenti** che vogliono pagare
- **Merchant** che vogliono vendere
- **Provider** (Stripe, PayPal, etc.) che gestiscono i soldi

### Il Nostro Obiettivo

| Vogliamo | Non vogliamo |
|----------|--------------|
| Essere il brand visibile | Gestire soldi direttamente |
| Guadagnare commissioni | Responsabilita legali |
| Esperienza utente fluida | Licenze bancarie |
| Scalare velocemente | Rischio di insolvenza |
| Integrare piu provider | Compliance PCI DSS |

### Come Funziona

```
MERCHANT SITE                    FLEXPAY POPUP                    PROVIDERS
     │                                │                               │
     │  [Paga con FlexPay]            │                               │
     │         │                      │                               │
     │    click│                      │                               │
     │         ▼                      │                               │
     │    ┌────────────────────────────────┐                         │
     │    │         FLEXPAY               │                         │
     │    │  ┌────────────────────────┐   │                         │
     │    │  │ Scegli come pagare:    │   │                         │
     │    │  │                        │   │                         │
     │    │  │ [Carta di Credito]     │───┼───► Stripe              │
     │    │  │ [PayPal]               │───┼───► PayPal              │
     │    │  │ [Mollie]               │───┼───► Mollie              │
     │    │  │ [Apple Pay]            │───┼───► Stripe              │
     │    │  │ [Google Pay]           │───┼───► Stripe              │
     │    │  └────────────────────────┘   │                         │
     │    │                               │                         │
     │    │     Pagamento completato!     │◄──────────────────────────
     │    └────────────────────────────────┘                         │
     │◄───────────────────────────────────────────────────────────────
```

**L'utente non esce MAI dalla finestra FlexPay.**

### Il Modello di Business

```
Transazione €100
     │
     ├── Provider prende: ~€1.50-2.00 (fee variabile)
     ├── FlexPay prende:  €0.50 (0.5% commissione fissa)
     └── Merchant riceve: ~€97.50-98.00 (netto)
```

**Guadagno stimato:**

| Volume mensile | Transazione media | Guadagno FlexPay |
|----------------|-------------------|------------------|
| 1.000 tx | €50 | €250/mese |
| 10.000 tx | €50 | €2.500/mese |
| 100.000 tx | €50 | €25.000/mese |

---

## Provider Integrati

### Stato Attuale

| Provider | Tipo | Stato | Fee Stimate |
|----------|------|-------|-------------|
| **Stripe** | Carte, Wallet | ✅ Attivo | 1.4% + €0.25 |
| **Apple Pay** | Wallet digitale | ✅ Attivo (via Stripe) | 1.4% + €0.25 |
| **Google Pay** | Wallet digitale | ✅ Attivo (via Stripe) | 1.4% + €0.25 |
| **PayPal** | Conto PayPal | ✅ Attivo | 2.9% + €0.35 |
| **Mollie** | iDEAL, Bancontact, SOFORT | ✅ Attivo | 1.8% + €0.25 |
| **Klarna** | BNPL (rate) | ⏸️ Richiede contratto | ~3.5% + €0.30 |
| **Satispay** | App italiana | ⏸️ Richiede contratto | ~1.5% + €0.20 |
| **Scalapay** | BNPL (rate) | ⏸️ Richiede contratto | ~3.0% + €0.30 |

### Configurazione Provider

#### Stripe (Obbligatorio)

1. Registrati su https://dashboard.stripe.com/register
2. Vai su Developers → API Keys
3. Copia Publishable key (`pk_test_...`) e Secret key (`sk_test_...`)

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

#### PayPal (Opzionale)

1. Registrati su https://developer.paypal.com
2. Crea app in Dashboard → My Apps & Credentials
3. Copia Client ID e Secret

```env
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_MODE="sandbox"  # o "live"
```

#### Mollie (Opzionale)

1. Registrati su https://my.mollie.com
2. Vai su Developers → API keys
3. Copia la API key

```env
MOLLIE_API_KEY="test_..."  # o "live_..."
```

#### Apple Pay / Google Pay

Funzionano automaticamente tramite Stripe Elements. Nessuna configurazione aggiuntiva richiesta.

---

## Setup Completo Step-by-Step

### Prerequisiti

- **Node.js 18+** - Scarica da https://nodejs.org
- **PostgreSQL** - Database (vedi opzioni sotto)
- **Account Stripe** - Gratuito, modalita test

### STEP 1: Database PostgreSQL

**Opzione A: Neon.tech (Consigliato - Gratuito)**

1. Vai su https://neon.tech
2. Registrati con GitHub/Google
3. Crea progetto "flexpay"
4. Copia la Connection string

**Opzione B: Docker**

```bash
docker run --name flexpay-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=flexpay \
  -p 5432:5432 \
  -d postgres
```

Connection string: `postgresql://postgres:password@localhost:5432/flexpay`

**Opzione C: PostgreSQL Locale**

```bash
createdb flexpay
```

Connection string: `postgresql://localhost:5432/flexpay`

### STEP 2: Configura Backend

```bash
cd ~/Desktop/flexpay/backend

# Crea file configurazione
cp .env.example .env
```

Modifica `.env`:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST/flexpay"

# JWT (cambia con stringa random)
JWT_SECRET="tua-stringa-segreta-molto-lunga-12345"

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CHECKOUT_URL=http://localhost:5173

# Stripe (OBBLIGATORIO)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# PayPal (opzionale)
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_MODE="sandbox"

# Mollie (opzionale)
MOLLIE_API_KEY="test_..."
```

### STEP 3: Avvia Backend

```bash
cd ~/Desktop/flexpay/backend

# Installa dipendenze
npm install

# Genera client Prisma
npx prisma generate

# Crea tabelle database
npx prisma db push

# Avvia server
npm run dev
```

Output atteso:
```
FlexPay Gateway running on port 3000
```

**Lascia questo terminale aperto!**

### STEP 4: Avvia Frontend

Apri un **nuovo terminale**:

```bash
cd ~/Desktop/flexpay/frontend

npm install
npm run dev
```

Output atteso:
```
VITE v5.x.x ready

  ➜  Local:   http://localhost:5173/
```

**Lascia anche questo terminale aperto!**

### STEP 5: Crea Merchant di Test

Apri un **terzo terminale**:

```bash
curl -X POST http://localhost:3000/api/merchant/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@test.com",
    "password": "password123",
    "businessName": "Negozio Demo"
  }'
```

Risposta:
```json
{
  "merchant": {
    "secretKey": "sk_live_xxxxxxxx"  <-- COPIA QUESTA
  }
}
```

### STEP 6: Crea Sessione Checkout

```bash
curl -X POST http://localhost:3000/api/checkout/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_XXXXXXXX" \
  -d '{
    "amount": 99.00,
    "currency": "EUR",
    "description": "Prodotto di test",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }'
```

Risposta:
```json
{
  "id": "abc-123-xyz",
  "url": "http://localhost:5173/abc-123-xyz"  <-- APRI NEL BROWSER
}
```

### STEP 7: Testa il Pagamento

1. Apri la URL nel browser
2. Seleziona "Carta di Credito/Debito"
3. Usa i dati di test:

| Campo | Valore |
|-------|--------|
| Numero | `4242 4242 4242 4242` |
| Scadenza | `12/30` |
| CVC | `123` |

4. Clicca "Paga"
5. Vedrai "Pagamento completato!"

---

## Carte di Test

### Stripe

| Numero | Risultato |
|--------|-----------|
| `4242 4242 4242 4242` | Successo |
| `4000 0000 0000 0002` | Rifiutata |
| `4000 0025 0000 3155` | 3D Secure |
| `4000 0000 0000 9995` | Fondi insufficienti |

### PayPal Sandbox

Usa account buyer creato in https://developer.paypal.com/dashboard/accounts

---

## Struttura Progetto

```
flexpay/
├── backend/
│   ├── src/
│   │   ├── app.ts                      # Entry point Express
│   │   ├── config/
│   │   │   ├── database.ts             # Client Prisma
│   │   │   └── providers.ts            # Config tutti i provider
│   │   ├── controllers/
│   │   │   ├── merchant.controller.ts  # Auth merchant
│   │   │   └── checkout.controller.ts  # Logica pagamenti
│   │   ├── services/
│   │   │   ├── paypal.service.ts       # Integrazione PayPal
│   │   │   └── mollie.service.ts       # Integrazione Mollie
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts      # JWT + API Key
│   │   ├── routes/
│   │   │   ├── merchant.routes.ts
│   │   │   ├── checkout.routes.ts
│   │   │   └── webhook.routes.ts
│   │   └── prisma/
│   │       └── schema.prisma           # Schema database
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # Router principale
│   │   ├── pages/
│   │   │   ├── Checkout.tsx            # Pagina checkout principale
│   │   │   ├── PayPalReturn.tsx        # Ritorno da PayPal
│   │   │   └── MollieReturn.tsx        # Ritorno da Mollie
│   │   ├── services/
│   │   │   └── api.ts                  # Client API centralizzato
│   │   └── index.css                   # Stili Tailwind
│   ├── public/
│   │   ├── _redirects                  # Config Cloudflare SPA
│   │   └── _headers                    # Security headers
│   ├── wrangler.toml                   # Config Cloudflare Pages
│   └── package.json
│
├── sdk/
│   ├── flexpay.js                      # SDK JavaScript
│   └── example.html                    # Esempio integrazione
│
└── GUIDA.md                            # Questo file
```

---

## API Reference

### Merchant

#### Registrazione
```http
POST /api/merchant/register
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "securepassword",
  "businessName": "My Store"
}
```

#### Login
```http
POST /api/merchant/login
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "securepassword"
}
```

### Checkout

#### Crea Sessione
```http
POST /api/checkout/sessions
X-API-Key: sk_live_xxxxx
Content-Type: application/json

{
  "amount": 99.00,
  "currency": "EUR",
  "description": "Descrizione prodotto",
  "customerEmail": "cliente@email.com",
  "customerName": "Mario Rossi",
  "successUrl": "https://tuosito.com/success",
  "cancelUrl": "https://tuosito.com/cancel",
  "metadata": {
    "orderId": "12345"
  }
}
```

Risposta:
```json
{
  "id": "session_xxx",
  "url": "https://checkout.flexpay.it/session_xxx",
  "expiresAt": "2024-01-01T12:30:00Z"
}
```

#### Ottieni Sessione
```http
GET /api/checkout/sessions/:sessionId
```

---

## Integrazione SDK

### HTML/JavaScript

```html
<script src="https://cdn.flexpay.it/sdk/flexpay.js"></script>

<button id="pay-button">Paga €99.00</button>

<script>
FlexPay.init('pk_live_xxxxx');

document.getElementById('pay-button').onclick = async () => {
  const { url } = await FlexPay.createSession({
    amount: 99.00,
    currency: 'EUR',
    description: 'Il tuo prodotto'
  });

  FlexPay.openCheckout(url);
};
</script>
```

### Da Server (Node.js)

```javascript
const response = await fetch('https://api.flexpay.it/checkout/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sk_live_xxxxx'
  },
  body: JSON.stringify({
    amount: 99.00,
    currency: 'EUR',
    successUrl: 'https://tuosito.com/success',
    cancelUrl: 'https://tuosito.com/cancel'
  })
});

const { url } = await response.json();
// Redirect utente a `url`
```

---

## Webhook

I merchant possono configurare un webhook URL per ricevere notifiche:

```json
{
  "event": "payment.completed",
  "sessionId": "session_xxx",
  "amount": 99.00,
  "currency": "EUR",
  "provider": "stripe"
}
```

---

## Deploy in Produzione

### 1. Backend (Railway)

```bash
cd backend

# Installa Railway CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway init
railway up
```

Configura le variabili ambiente nel dashboard Railway:
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `FRONTEND_URL`
- `CHECKOUT_URL`

### 2. Frontend (Cloudflare Pages)

#### Opzione A: Deploy da CLI

```bash
cd frontend

# Installa Wrangler (CLI Cloudflare)
npm install -g wrangler

# Login
wrangler login

# Build del progetto
npm run build

# Deploy
wrangler pages deploy dist --project-name=flexpay
```

#### Opzione B: Deploy da GitHub (Consigliato)

1. Vai su https://dash.cloudflare.com → **Pages**
2. Clicca **Create a project** → **Connect to Git**
3. Seleziona il repository GitHub con FlexPay
4. Configura il build:

| Campo | Valore |
|-------|--------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `frontend` |

5. Aggiungi variabile ambiente:
   - `VITE_API_URL` = `https://api.flexpay.it` (URL del tuo backend)

6. Clicca **Save and Deploy**

#### Configurazione Dominio Personalizzato

1. In Cloudflare Pages → Il tuo progetto → **Custom domains**
2. Aggiungi il tuo dominio (es. `checkout.flexpay.it`)
3. Se il dominio e gia su Cloudflare DNS, si configura automaticamente
4. Altrimenti, aggiungi il record CNAME indicato

### 3. Variabili Ambiente Produzione

**Backend (.env produzione):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-production-secret
FRONTEND_URL=https://checkout.flexpay.it
CHECKOUT_URL=https://checkout.flexpay.it
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=live
MOLLIE_API_KEY=live_...
```

**Frontend (Cloudflare Pages → Settings → Environment variables):**
```
VITE_API_URL=https://api.flexpay.it
```

### 4. Checklist Produzione

- [ ] Dominio personalizzato configurato
- [ ] HTTPS attivo (automatico con Cloudflare)
- [ ] Stripe Live mode attivato e verificato
- [ ] Variabili ambiente aggiornate (backend + frontend)
- [ ] Webhook Stripe configurato con URL produzione
- [ ] Database produzione (PostgreSQL dedicato)
- [ ] PayPal Live mode (se usato)
- [ ] Mollie Live mode (se usato)
- [ ] Backup database configurato
- [ ] Monitoring/Logging attivo

---

## Vantaggi Cloudflare Pages

| Feature | Beneficio |
|---------|-----------|
| **HTTPS automatico** | Certificato SSL gratuito |
| **CDN globale** | Contenuti serviti dal server piu vicino |
| **Protezione DDoS** | Inclusa gratuitamente |
| **Deploy automatico** | Push su GitHub → Deploy |
| **Preview deployments** | Ogni PR ha un URL di preview |
| **Bandwidth illimitato** | Piano gratuito molto generoso |
| **Analytics** | Metriche di traffico incluse |

---

## Troubleshooting

### "Sessione non trovata"
- Verifica che backend sia in esecuzione
- Controlla che DATABASE_URL sia corretto
- Esegui `npx prisma db push` se tabelle mancanti

### "Stripe non configurato"
- Verifica STRIPE_SECRET_KEY nel .env
- Riavvia il backend dopo modifiche a .env

### "PayPal/Mollie non appare"
- Verifica che le chiavi API siano configurate
- Controlla i log del backend per errori

### Pagamento fallisce
- Usa carte di test corrette
- Controlla Stripe Dashboard → Developers → Logs
- Verifica la console del browser (F12)

### CORS errors
- Verifica FRONTEND_URL nel .env backend
- Assicurati che corrisponda all'URL del frontend

### Build fallisce su Cloudflare
- Verifica che `npm run build` funzioni localmente
- Controlla i log di build su Cloudflare Pages
- Verifica la versione Node.js (usa 18+)

---

## Roadmap

| Feature | Priorita | Stato |
|---------|----------|-------|
| Dashboard Merchant | Alta | Pianificato |
| Refund API | Alta | Pianificato |
| Multi-valuta | Media | Pianificato |
| SDK React Native | Media | Pianificato |
| Klarna integration | Bassa | Richiede contratto |
| Subscription/Recurring | Bassa | Pianificato |

---

## Note Legali

FlexPay e un aggregatore di pagamenti. **Non gestisce direttamente fondi.**

- I pagamenti sono processati da Stripe, PayPal, Mollie
- La compliance PCI DSS e gestita dai provider
- FlexPay non richiede licenze bancarie
- I merchant sono responsabili dei loro obblighi fiscali

---

## Supporto

Per problemi o domande:
- Controlla i log del backend
- Controlla la console del browser (F12)
- Dashboard Stripe → Developers → Logs
- Dashboard Cloudflare → Pages → Deployments

---

*Creato con Claude Code - Luglio 2026*
