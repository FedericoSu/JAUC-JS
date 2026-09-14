import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import type { CheckoutResponse, DashboardResponse } from '../src/contracts.js';

let server: Server;
let url: string;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('health responde con el estado de la demo', async () => {
  const response = await fetch(url + '/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'jauc-js', mode: 'demo' });
});

test('dashboard expone el catálogo y segmento por HTTP', async () => {
  const response = await fetch(url + '/api/dashboard/151');
  assert.equal(response.status, 200);
  const body = await response.json() as DashboardResponse;
  assert.equal(body.segment, 'frecuente');
  assert.equal(body.products.length, 5);
});

test('identificador inválido devuelve 400', async () => {
  const response = await fetch(url + '/api/dashboard/abc');
  assert.equal(response.status, 400);
});

test('checkout calcula el caso inicial por HTTP', async () => {
  const response = await fetch(url + '/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: 151, coupon: 'IA10', shippingZone: 'CABA',
      lines: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 2 }, { productId: 4, quantity: 1 }] })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as CheckoutResponse).total, 767676);
});

test('checkout rechaza una estructura incompleta', async () => {
  const response = await fetch(url + '/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: 151, lines: null })
  });
  assert.equal(response.status, 400);
});

test('JSON mal formado devuelve un error legible', async () => {
  const response = await fetch(url + '/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json() as { error: string }).error, 'El cuerpo debe ser JSON válido.');
});

test('rutas inexistentes devuelven 404 en JSON', async () => {
  const response = await fetch(url + '/api/missing');
  assert.equal(response.status, 404);
  assert.equal((await response.json() as { error: string }).error, 'Ruta inexistente.');
});

test('LEGACY HTTP: el contrato de tipos permite cantidades negativas', async () => {
  const response = await fetch(url + '/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: 151, coupon: '', shippingZone: 'CABA',
      lines: [{ productId: 1, quantity: -1 }] })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as CheckoutResponse).subtotal, -650000);
});
