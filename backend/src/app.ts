import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { CheckoutRequest } from './contracts.js';
import { GodStoreService } from './god-store-service.js';

export const app = express();
const store = new GodStoreService();

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'jauc-js', mode: 'demo' });
});

app.get('/api/dashboard/:customerId', (request, response) => {
  const customerId = Number(request.params.customerId);
  if (!Number.isSafeInteger(customerId) || customerId < 1) {
    response.status(400).json({ error: 'El cliente debe ser un entero positivo.' });
    return;
  }
  response.json(store.buildDashboard(customerId));
});

function hasCheckoutShape(value: unknown): value is CheckoutRequest {
  if (!value || typeof value !== 'object') return false;
  const body = value as Partial<CheckoutRequest>;
  return Number.isSafeInteger(body.customerId) && Number(body.customerId) > 0
    && typeof body.coupon === 'string'
    && typeof body.shippingZone === 'string'
    && Array.isArray(body.lines)
    && body.lines.every(line => line && Number.isSafeInteger(line.productId)
      && Number.isSafeInteger(line.quantity));
}

app.post('/api/checkout', (request, response) => {
  if (!hasCheckoutShape(request.body)) {
    response.status(400).json({ error: 'Se esperan customerId, coupon, shippingZone y lines con enteros productId/quantity.' });
    return;
  }
  response.json(store.checkout(request.body));
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Ruta inexistente.' });
});

const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'El cuerpo debe ser JSON válido.' });
    return;
  }
  if (error.type === 'entity.too.large') {
    response.status(413).json({ error: 'El cuerpo supera el límite de 64 KB.' });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'No se pudo procesar la solicitud.' });
};
app.use(handleError);
