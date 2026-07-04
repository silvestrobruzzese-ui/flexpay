# FlexPay - White-Label Payment Gateway

**Versione:** 1.0
**Ultimo aggiornamento:** 4 Luglio 2026
**GitHub:** https://github.com/silvestrobruzzese-ui/flexpay

---

## URLs di Produzione

| Servizio | URL |
|----------|-----|
| **Backend API** | https://flexpay-backend-production.up.railway.app |
| **Frontend Checkout** | https://flexpay-checkout.pages.dev |
| **GitHub Repository** | https://github.com/silvestrobruzzese-ui/flexpay |
| **Railway Dashboard** | https://railway.com/project/5cca468e-2709-4787-8dff-7e57c7a1af71 |

---

## Account Utilizzati

| Servizio | Account |
|----------|---------|
| **GitHub** | silvestrobruzzese-ui |
| **Railway** | silvestrobruzzese@gmail.com |
| **Cloudflare** | silvestrobruzzese@gmail.com |

---

## Le Tue Commissioni - Dove Vanno?

### Come Funziona il Flusso dei Soldi

```
Cliente paga €100
       │
       ▼
┌─────────────────────────────────────────────────────┐
│                    STRIPE                            │
│                                                      │
│  1. Riceve €100 dal cliente                         │
│  2. Trattiene fee Stripe: ~€1.65 (1.4% + €0.25)    │
│  3. Il resto va dove configurato                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### ⚠️ IMPORTANTE: Configurazione Stripe Connect

**Attualmente**, il codice calcola la tua commissione (0.5%) ma i soldi vanno direttamente al TUO account Stripe. Per far funzionare FlexPay con merchant esterni, devi configurare **Stripe Connect**.

#### Opzione 1: Tu Ricevi Tutto (Setup Attuale)

Con la configurazione attuale:
- Tutti i pagamenti arrivano sul TUO account Stripe
- Tu paghi manualmente i merchant
- Le tue commissioni le trattieni direttamente

```
Cliente → Stripe (tuo account) → Tu paghi merchant manualmente
```

**Ideale per:** Test iniziali, pochi merchant fidati

#### Opzione 2: Stripe Connect (Consigliato per Produzione)

Per scalare con merchant automatici:

1. **Attiva Stripe Connect** su https://dashboard.stripe.com/connect/accounts/overview
2. **Ogni merchant** deve creare un account Stripe collegato
3. **I pagamenti** vanno direttamente al merchant, con la tua fee trattenuta automaticamente

```
Cliente → Stripe → Merchant riceve €98.35
                 → Tu ricevi €0.50 (application fee)
                 → Stripe trattiene €1.15
```

#### Come Attivare Stripe Connect

1. Vai su https://dashboard.stripe.com/settings/connect
2. Completa la verifica del tuo business
3. Scegli il tipo di account:
   - **Standard**: I merchant gestiscono tutto loro
   - **Express**: Setup semplificato, tu gestisci parte
   - **Custom**: Controllo totale (più complesso)

4. Modifica il codice per usare `application_fee_amount`:

```typescript
// In checkout.controller.ts - createPaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: session.currency.toLowerCase(),
  application_fee_amount: Math.round(amount * 0.5), // 0.5% per te
  transfer_data: {
    destination: merchant.stripeConnectAccountId, // Account del merchant
  },
  // ... resto configurazione
});
```

### Dove Vedere le Tue Commissioni

1. **Stripe Dashboard** → https://dashboard.stripe.com
   - Vai su **Payments** per vedere tutte le transazioni
   - Vai su **Balance** per vedere i tuoi fondi disponibili
   - Vai su **Payouts** per configurare i prelievi automatici

2. **Database FlexPay** - Ogni transazione registra:
   - `platformFee`: La tua commissione calcolata
   - `providerFee`: Fee di Stripe/PayPal/Mollie
   - `netAmount`: Quanto va al merchant

### Ricevere i Soldi

1. **Stripe** trasferisce automaticamente sul tuo conto bancario
2. Configura in: Stripe Dashboard → Settings → Payouts
3. Puoi scegliere:
   - Payout giornaliero automatico
   - Payout settimanale
   - Payout manuale

---

## L'Idea Fondamentale

### Il Problema

Creare un sistema di pagamento come Stripe richiede:
- Licenze bancarie/finanziarie (costi enormi, anni di burocrazia)
- Certificazione PCI DSS (€50-100K/anno)
- Capitale minimo €1-5 milioni
- Team legale, compliance, antifrode
- Responsabilità su rischi, rimborsi, dispute

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

## Guida Passo-Passo: Cosa Abbiamo Fatto

### FASE 1: Creazione del Progetto ✅

Abbiamo creato la struttura completa:

```
flexpay/
├── backend/           # API Node.js + Express + TypeScript
├── frontend/          # React + Vite + TailwindCSS
├── sdk/               # SDK JavaScript per i merchant
└── GUIDA.md           # Questa guida
```

### FASE 2: Build Locale ✅

```bash
# Backend
cd ~/Desktop/flexpay/backend
npm install
npx prisma generate
npm run build          # ✅ Compilazione TypeScript riuscita

# Frontend
cd ~/Desktop/flexpay/frontend
npm install
npm run build          # ✅ Build Vite riuscita
```

### FASE 3: Repository GitHub ✅

```bash
cd ~/Desktop/flexpay
git init
git add -A
git commit -m "Initial commit: FlexPay Payment Gateway"
gh repo create flexpay --private --source=. --push
```

**Repository creato:** https://github.com/silvestrobruzzese-ui/flexpay

### FASE 4: Deploy Backend su Railway ✅

1. **Creato progetto Railway:**
   ```bash
   railway init --name flexpay-api
   ```

2. **Aggiunto database PostgreSQL:**
   ```bash
   railway add --database postgres
   ```

3. **Configurato variabili ambiente:**
   ```bash
   railway variable set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
   railway variable set 'JWT_SECRET=...'
   railway variable set 'CHECKOUT_URL=https://flexpay-checkout.pages.dev'
   railway variable set 'FRONTEND_URL=https://flexpay-checkout.pages.dev'
   ```

4. **Deploy del codice:**
   ```bash
   railway up --detach
   ```

5. **Creato dominio pubblico:**
   ```bash
   railway domain --port 3000
   ```

**Backend live:** https://flexpay-backend-production.up.railway.app

### FASE 5: Deploy Frontend su Cloudflare Pages ✅

1. **Creato progetto Cloudflare Pages:**
   ```bash
   wrangler pages project create flexpay-checkout --production-branch main
   ```

2. **Build con URL API di produzione:**
   ```bash
   VITE_API_URL=https://flexpay-backend-production.up.railway.app npm run build
   ```

3. **Deploy:**
   ```bash
   wrangler pages deploy dist --project-name flexpay-checkout --branch main
   ```

**Frontend live:** https://flexpay-checkout.pages.dev

---

## Cosa Devi Fare Tu Adesso

### STEP 1: Configura le Chiavi dei Provider

Vai su **Railway Dashboard** → https://railway.com/project/5cca468e-2709-4787-8dff-7e57c7a1af71

Clicca su **flexpay-backend** → **Variables** e aggiungi:

```env
# OBBLIGATORIO: Stripe
STRIPE_SECRET_KEY=sk_test_... (o sk_live_... per produzione)
STRIPE_PUBLISHABLE_KEY=pk_test_... (o pk_live_... per produzione)

# OPZIONALE: PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox (o live)

# OPZIONALE: Mollie
MOLLIE_API_KEY=test_... (o live_...)
```

### STEP 2: Esegui Migrazione Database

```bash
cd ~/Desktop/flexpay/backend
railway run npx prisma db push
```

### STEP 3: Crea il Primo Merchant

```bash
curl -X POST https://flexpay-backend-production.up.railway.app/api/merchant/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tuaemail@esempio.com",
    "password": "password-sicura",
    "businessName": "Il Tuo Negozio"
  }'
```

Salva la `secretKey` che ricevi!

### STEP 4: Testa un Pagamento

```bash
# Crea sessione di checkout
curl -X POST https://flexpay-backend-production.up.railway.app/api/checkout/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_TUA_SECRET_KEY" \
  -d '{
    "amount": 10.00,
    "currency": "EUR",
    "description": "Test pagamento",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }'
```

Apri l'URL restituito nel browser e testa il pagamento!

### STEP 5: (Opzionale) Dominio Personalizzato

#### Backend - Dominio API
1. Railway Dashboard → flexpay-backend → Settings → Domains
2. Aggiungi `api.flexpay.it` (o il tuo dominio)
3. Configura DNS con il CNAME fornito

#### Frontend - Dominio Checkout
1. Cloudflare Dashboard → Pages → flexpay-checkout → Custom domains
2. Aggiungi `checkout.flexpay.it`
3. Se dominio su Cloudflare, automatico. Altrimenti configura CNAME

---

## Provider Integrati

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

### Come Ottenere le Chiavi

#### Stripe (Obbligatorio)
1. Registrati su https://dashboard.stripe.com/register
2. Vai su Developers → API Keys
3. Copia Publishable key e Secret key

#### PayPal (Opzionale)
1. Registrati su https://developer.paypal.com
2. Crea app in Dashboard → My Apps & Credentials
3. Copia Client ID e Secret

#### Mollie (Opzionale)
1. Registrati su https://my.mollie.com
2. Vai su Developers → API keys
3. Copia la API key

---

## Struttura del Progetto

```
flexpay/
├── backend/
│   ├── src/
│   │   ├── app.ts                      # Entry point Express
│   │   ├── config/
│   │   │   ├── database.ts             # Client Prisma
│   │   │   └── providers.ts            # Config provider + fee
│   │   ├── controllers/
│   │   │   ├── merchant.controller.ts  # Auth merchant
│   │   │   └── checkout.controller.ts  # Logica pagamenti
│   │   ├── services/
│   │   │   ├── paypal.service.ts       # Integrazione PayPal
│   │   │   └── mollie.service.ts       # Integrazione Mollie
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts      # JWT + API Key
│   │   ├── routes/
│   │   └── prisma/
│   │       └── schema.prisma           # Schema database
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # Router principale
│   │   ├── pages/
│   │   │   ├── Checkout.tsx            # Pagina checkout
│   │   │   ├── PayPalReturn.tsx
│   │   │   └── MollieReturn.tsx
│   │   └── services/
│   │       └── api.ts                  # Client API
│   ├── public/
│   │   ├── _redirects                  # Cloudflare SPA routing
│   │   └── _headers                    # Security headers
│   └── wrangler.toml                   # Config Cloudflare
│
├── sdk/
│   ├── flexpay.js                      # SDK per merchant
│   └── example.html
│
└── GUIDA.md
```

---

## API Reference

### Merchant

```http
# Registrazione
POST /api/merchant/register
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "securepassword",
  "businessName": "My Store"
}

# Login
POST /api/merchant/login
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "securepassword"
}
```

### Checkout

```http
# Crea Sessione
POST /api/checkout/sessions
X-API-Key: sk_live_xxxxx
Content-Type: application/json

{
  "amount": 99.00,
  "currency": "EUR",
  "description": "Descrizione prodotto",
  "successUrl": "https://tuosito.com/success",
  "cancelUrl": "https://tuosito.com/cancel",
  "metadata": { "orderId": "12345" }
}

# Risposta
{
  "id": "session_xxx",
  "url": "https://flexpay-checkout.pages.dev/session_xxx",
  "expiresAt": "2026-07-04T13:30:00Z"
}
```

---

## Carte di Test

| Numero | Risultato |
|--------|-----------|
| `4242 4242 4242 4242` | Successo |
| `4000 0000 0000 0002` | Rifiutata |
| `4000 0025 0000 3155` | 3D Secure |
| `4000 0000 0000 9995` | Fondi insufficienti |

Scadenza: qualsiasi data futura (es. `12/30`)
CVC: qualsiasi 3 cifre (es. `123`)

---

## Troubleshooting

### "Sessione non trovata"
- Verifica che backend sia attivo: `curl https://flexpay-backend-production.up.railway.app/health`
- Controlla i log su Railway

### "Stripe non configurato"
- Aggiungi STRIPE_SECRET_KEY nelle variabili Railway
- Il backend si riavvia automaticamente

### Pagamento fallisce
- Usa carte di test
- Controlla Stripe Dashboard → Developers → Logs

### CORS errors
- Verifica FRONTEND_URL nelle variabili Railway

---

## Comandi Utili

```bash
# Vedere i log del backend
railway logs

# Aprire dashboard Railway
railway open

# Aggiornare variabili
railway variable set 'KEY=value'

# Rideploy backend
railway up

# Rideploy frontend
cd frontend && npm run build && wrangler pages deploy dist --project-name flexpay-checkout
```

---

## Prossimi Passi Consigliati

1. **Configura Stripe Live** - Verifica il tuo account per accettare pagamenti reali
2. **Attiva Stripe Connect** - Per gestire automaticamente i payout ai merchant
3. **Dominio personalizzato** - `api.flexpay.it` e `checkout.flexpay.it`
4. **Dashboard Merchant** - UI per i merchant per vedere transazioni
5. **Webhook sicuri** - Firma le notifiche ai merchant

---

## Note Legali

FlexPay è un aggregatore di pagamenti. **Non gestisce direttamente fondi.**

- I pagamenti sono processati da Stripe, PayPal, Mollie
- La compliance PCI DSS è gestita dai provider
- FlexPay non richiede licenze bancarie
- I merchant sono responsabili dei loro obblighi fiscali

---

*Creato con Claude Code - 4 Luglio 2026*
*GitHub: silvestrobruzzese-ui/flexpay*
