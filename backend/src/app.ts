import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import merchantRoutes from './routes/merchant.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - allow checkout popup from any origin
app.use(cors({
  origin: true,
  credentials: true,
}));

// Webhooks need raw body
app.use('/webhooks', express.raw({ type: 'application/json' }));

// JSON for other routes
app.use(express.json());

// Routes
app.use('/api/merchant', merchantRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FlexPay Gateway' });
});

app.listen(PORT, () => {
  console.log(`FlexPay Gateway running on port ${PORT}`);
});

export default app;
