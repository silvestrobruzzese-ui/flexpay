import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Checkout from './pages/Checkout';
import PayPalReturn from './pages/PayPalReturn';
import MollieReturn from './pages/MollieReturn';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:sessionId" element={<Checkout />} />
        <Route path="/checkout/:sessionId" element={<Checkout />} />
        <Route path="/paypal-return/:sessionId" element={<PayPalReturn />} />
        <Route path="/paypal-cancel/:sessionId" element={<Checkout />} />
        <Route path="/mollie-return/:sessionId" element={<MollieReturn />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Sessione non trovata</h1>
        <p className="text-gray-500 mt-2">Il link di pagamento non è valido</p>
      </div>
    </div>
  );
}

export default App;
