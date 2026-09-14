import assert from 'node:assert/strict';
import test from 'node:test';
import { GodStoreService } from '../src/god-store-service.js';
import type { CheckoutRequest } from '../src/contracts.js';

const baseRequest: CheckoutRequest = {
  customerId: 151, coupon: 'IA10', shippingZone: 'CABA',
  lines: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 2 }, { productId: 4, quantity: 1 }]
};

test('la cotización inicial fija los importes de referencia de la clase', () => {
  const result = new GodStoreService().checkout(baseRequest);
  assert.deepEqual(result, {
    subtotal: 691600, discount: 69160, shipping: 0, taxes: 145236,
    total: 767676, message: 'Cupón aplicado.', warnings: []
  });
});

for (const [id, segment] of [[100, 'nuevo'], [101, 'frecuente'], [199, 'frecuente'], [200, 'vip'], [499, 'vip'], [500, 'empresa']] as const) {
  test('el cliente ' + id + ' pertenece a ' + segment, () => {
    assert.equal(new GodStoreService().buildDashboard(id).segment, segment);
  });
}

test('el presupuesto del cliente de prueba difiere del nuevo habitual', () => {
  const store = new GodStoreService();
  assert.equal(store.buildDashboard(9).suggestedBudget, 10000);
  assert.equal(store.buildDashboard(10).suggestedBudget, 50000);
});

test('el cliente frecuente par múltiplo de cinco conserva su presupuesto especial', () => {
  const result = new GodStoreService().buildDashboard(150);
  assert.equal(result.suggestedBudget, 320000);
  assert.equal(result.risk, 51);
});

test('el riesgo VIP cambia al superar un millón y luego un millón y medio', () => {
  const store = new GodStoreService();
  assert.equal(store.calculateCustomerRisk(210, 'vip', 1000000), 35);
  assert.equal(store.calculateCustomerRisk(210, 'vip', 1000001), 83);
  assert.equal(store.calculateCustomerRisk(210, 'vip', 1500000), 83);
  assert.equal(store.calculateCustomerRisk(210, 'vip', 1500001), 94);
});

test('IA10 deja de aplicar al alcanzar riesgo 60 y tiene un tope de 80000', () => {
  const store = new GodStoreService();
  assert.equal(store.calculateDiscount('IA10', 'vip', 100000, 59), 25000);
  assert.equal(store.calculateDiscount('IA10', 'vip', 100000, 60), 0);
  assert.equal(store.calculateDiscount('IA10', 'vip', 1000000, 35), 80000);
});

test('CLASE2 exige superar 100000 y diferencia empresa de otros segmentos', () => {
  const store = new GodStoreService();
  assert.equal(store.calculateDiscount('CLASE2', 'empresa', 100000, 88), 0);
  assert.equal(store.calculateDiscount('CLASE2', 'empresa', 100001, 88), 45000);
  assert.equal(store.calculateDiscount('CLASE2', 'vip', 100001, 35), 25000);
});

test('envío CABA: el umbral de importe y el de riesgo son estrictos', () => {
  const store = new GodStoreService();
  assert.equal(store.calculateShipping('CABA', 250000, 69), 4500);
  assert.equal(store.calculateShipping('CABA', 250001, 69), 0);
  assert.equal(store.calculateShipping('CABA', 250001, 70), 4500);
});

test('envíos GBA, interior y zona desconocida conservan sus límites', () => {
  const store = new GodStoreService();
  assert.equal(store.calculateShipping('GBA', 350000, 50), 8500);
  assert.equal(store.calculateShipping('GBA', 350001, 50), 2500);
  assert.equal(store.calculateShipping('INTERIOR', 100, 80), 15000);
  assert.equal(store.calculateShipping('INTERIOR', 100, 81), 30000);
  assert.equal(store.calculateShipping('DESCONOCIDA', 100, 0), 22000);
});

test('cliente 210: el riesgo del dashboard y el aplicado al carrito son distintos', () => {
  const store = new GodStoreService();
  assert.equal(store.buildDashboard(210).risk, 35);
  const result = store.checkout({ ...baseRequest, customerId: 210, lines: [{ productId: 1, quantity: 2 }] });
  assert.equal(result.discount, 0);
  assert.equal(result.shipping, 4500);
  assert.equal(result.total, 1577500);
  assert.ok(result.warnings.includes('Riesgo alto: revisar identidad.'));
});

test('LEGACY: stock insuficiente advierte pero permite cotizar y no reserva stock', () => {
  const store = new GodStoreService();
  const request = { ...baseRequest, lines: [{ productId: 5, quantity: 4 }] };
  const first = store.checkout(request);
  assert.ok(first.warnings.some(warning => warning.includes('stock suficiente')));
  assert.equal(first.subtotal, 840000);
  assert.deepEqual(store.checkout(request), first);
  assert.equal(store.products.find(product => product.id === 5)?.stock, 3);
});

test('LEGACY: producto inexistente se ignora en subtotal y genera una advertencia', () => {
  const result = new GodStoreService().checkout({ ...baseRequest, coupon: '', lines: [{ productId: 9999, quantity: 1 }] });
  assert.equal(result.subtotal, 0);
  assert.deepEqual(result.warnings, ['Producto inexistente: 9999']);
});

test('LEGACY: cantidades negativas producen importes negativos', () => {
  const result = new GodStoreService().checkout({ ...baseRequest, lines: [{ productId: 1, quantity: -1 }] });
  assert.equal(result.subtotal, -650000);
  assert.ok(result.total < 0);
});

test('LEGACY: un carrito VIP vacío puede recibir un descuento mayor al subtotal', () => {
  const result = new GodStoreService().checkout({ ...baseRequest, customerId: 210, lines: [] });
  assert.equal(result.subtotal, 0);
  assert.equal(result.discount, 15000);
  assert.equal(result.total, -10500);
});

test('LEGACY: el mensaje afirma cupón aplicado aun cuando el riesgo lo impide', () => {
  const result = new GodStoreService().checkout({ ...baseRequest, customerId: 10, lines: [{ productId: 3, quantity: 1 }] });
  assert.equal(result.discount, 0);
  assert.equal(result.message, 'Cupón aplicado.');
});

test('riesgo extremo tiene prioridad sobre compra grande en el mensaje', () => {
  const result = new GodStoreService().checkout({ ...baseRequest, customerId: 999, lines: [{ productId: 1, quantity: 2 }] });
  assert.equal(result.message, 'Compra pausada por riesgo extremo.');
  assert.ok(result.warnings.includes('Operación grande: pedir autorización.'));
  assert.ok(result.warnings.includes('Riesgo alto: revisar identidad.'));
});
