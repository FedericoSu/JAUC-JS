import './styles.css';
import screen from './screen.html?raw';

type Product = { id: number; name: string; category: string; price: number; stock: number; popularity: number };
type Dashboard = { customerName: string; segment: string; risk: number; products: Product[]; warnings: string[]; suggestedBudget: number };
type Checkout = { subtotal: number; discount: number; shipping: number; taxes: number; total: number; message: string; warnings: string[] };

document.querySelector<HTMLDivElement>('#app')!.innerHTML = screen;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error('Elemento ausente: ' + id);
  return found as T;
}

// Se mantienen juntas UI, estado, HTTP y reglas para el ejercicio de extracción.
let dashboard: Dashboard | undefined;
let customerId = 151;
let coupon = 'IA10';
let shippingZone = 'CABA';
let selectedCategory = 'all';
const quantities: Record<number, number> = { 1: 1, 2: 2, 3: 0, 4: 1, 5: 0 };
let loading = false;
let quoting = false;
let loadVersion = 0;
let cartVersion = 0;

function money(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value: string): string {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

function showWarnings(id: string, warnings: string[]): void {
  element(id).replaceChildren(...warnings.map(warning => {
    const item = document.createElement('li');
    item.textContent = warning;
    return item;
  }));
}

function filteredProducts(): Product[] {
  const result: Product[] = [];
  for (const product of dashboard?.products ?? []) {
    if (selectedCategory === 'all') {
      result.push(product);
    } else {
      if (product.category === selectedCategory) result.push(product);
    }
  }
  return result;
}

function calculateLocalSubtotal(): number {
  let subtotal = 0;
  for (const product of dashboard?.products ?? []) {
    if ((quantities[product.id] || 0) > 0) {
      subtotal = subtotal + product.price * (quantities[product.id] || 0);
    }
  }
  return subtotal;
}

function calculateLocalDiscount(): number {
  const subtotal = calculateLocalSubtotal();
  let discount = 0;
  const segment = dashboard?.segment ?? 'nuevo';
  const risk = dashboard?.risk ?? 50;
  if (coupon === 'IA10') {
    if (risk < 60) {
      discount = subtotal * 0.10;
      if (segment === 'vip') {
        discount = discount + 15000;
      }
    }
  } else {
    if (coupon === 'CLASE2') {
      if (subtotal > 100000) {
        discount = 25000;
        if (segment === 'empresa') {
          discount = 45000;
        }
      }
    } else {
      if (segment === 'nuevo') {
        if (subtotal > 30000) {
          discount = 3000;
        }
      }
    }
  }
  if (discount > 80000) discount = 80000;
  return discount;
}

function calculateLocalShipping(): number {
  const subtotal = calculateLocalSubtotal();
  const risk = dashboard?.risk ?? 50;
  if (shippingZone === 'CABA') {
    if (subtotal > 250000 && risk < 70) return 0;
    return 4500;
  }
  if (shippingZone === 'GBA') {
    if (subtotal > 350000) return 2500;
    return 8500;
  }
  if (shippingZone === 'INTERIOR') {
    if (risk > 80) return 30000;
    return 15000;
  }
  return 22000;
}

function localRiskLabel(): string {
  const risk = dashboard?.risk ?? 0;
  if (risk > 90) {
    return 'Bloqueado';
  } else {
    if (risk > 75) {
      return 'Riesgo alto';
    } else {
      if (risk > 45) {
        return 'Riesgo medio';
      } else {
        if (risk > 20) {
          return 'Riesgo bajo';
        } else {
          return 'Riesgo mínimo';
        }
      }
    }
  }
}

function refreshButton(): void {
  element<HTMLButtonElement>('checkout-button').disabled = !dashboard || loading || quoting || calculateLocalSubtotal() <= 0;
}

function updateTotals(): void {
  element('subtotal').textContent = money(calculateLocalSubtotal());
  element('discount').textContent = '− ' + money(calculateLocalDiscount());
  element('shipping').textContent = money(calculateLocalShipping());
  element('taxes').textContent = money(calculateLocalSubtotal() * 0.21);
  element('total').textContent = money(calculateLocalSubtotal() - calculateLocalDiscount() + calculateLocalShipping() + calculateLocalSubtotal() * 0.21);
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  element('selection-count').textContent = count + (count === 1 ? ' unidad en el carrito' : ' unidades en el carrito');
  refreshButton();
}

function invalidateQuote(): void {
  cartVersion++;
  element('result').hidden = true;
  updateTotals();
}

function renderProducts(): void {
  const products = filteredProducts();
  const categories: Record<string, string> = { tech: 'Tecnología', office: 'Oficina', home: 'Hogar' };
  const marks: Record<number, string> = { 1: 'NB', 2: 'MS', 3: 'SL', 4: 'LD', 5: 'MN' };
  element('product-count').textContent = String(products.length);
  element('products').replaceChildren(...products.map(product => {
    const row = document.createElement('article');
    row.className = 'product-row';
    row.innerHTML = '<div class="product-info"><span class="product-mark mark-' + product.category + '" aria-hidden="true">' + marks[product.id]
      + '</span><div><h3>' + escapeHtml(product.name) + '</h3><p>' + escapeHtml(categories[product.category] ?? product.category)
      + ' <span>·</span> <span class="stock">Stock: ' + product.stock + '</span></p></div></div>'
      + '<strong class="unit-price">' + money(product.price) + '</strong>'
      + '<div class="quantity-control"><button type="button" data-step="-1" aria-label="Quitar una unidad de ' + escapeHtml(product.name) + '">−</button>'
      + '<input type="number" min="0" step="1" value="' + (quantities[product.id] || 0) + '" aria-label="Cantidad de ' + escapeHtml(product.name) + '" />'
      + '<button type="button" data-step="1" aria-label="Agregar una unidad de ' + escapeHtml(product.name) + '">+</button></div>';
    const input = row.querySelector('input')!;
    input.addEventListener('input', () => {
      quantities[product.id] = Math.max(0, Math.trunc(Number(input.value) || 0));
      invalidateQuote();
    });
    input.addEventListener('change', () => { input.value = String(quantities[product.id]); });
    row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => {
      button.addEventListener('click', () => {
        quantities[product.id] = Math.max(0, (quantities[product.id] || 0) + Number(button.dataset.step));
        input.value = String(quantities[product.id]);
        invalidateQuote();
      });
    });
    return row;
  }));
}

async function loadDashboard(): Promise<void> {
  const version = ++loadVersion;
  loading = true;
  invalidateQuote();
  element('error').hidden = true;
  element('connection').textContent = 'Consultando…';
  element<HTMLButtonElement>('load-button').disabled = true;
  try {
    const response = await fetch('/api/dashboard/' + customerId, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data: Dashboard = await response.json();
    if (version !== loadVersion) return;
    dashboard = data;
    element('customer-name').textContent = data.customerName;
    element('segment').textContent = data.segment;
    element('risk').textContent = String(data.risk);
    element('risk-label').textContent = localRiskLabel();
    element('budget').textContent = money(data.suggestedBudget);
    element('profile').hidden = false;
    element('notes').hidden = data.warnings.length === 0;
    showWarnings('warnings', data.warnings);
    element('connection').textContent = '● Servicio conectado';
    renderProducts();
    updateTotals();
  } catch {
    if (version !== loadVersion) return;
    dashboard = undefined;
    element('profile').hidden = true;
    element('notes').hidden = true;
    element('products').innerHTML = '<p class="empty">Consultá un cliente cuando el servicio esté disponible.</p>';
    element('product-count').textContent = '0';
    element('connection').textContent = '○ Sin conexión';
    element('error').textContent = 'No se pudo consultar al cliente. Verificá que la API esté iniciada y volvé a intentarlo.';
    element('error').hidden = false;
    updateTotals();
  } finally {
    if (version === loadVersion) {
      loading = false;
      element<HTMLButtonElement>('load-button').disabled = false;
      refreshButton();
    }
  }
}

function showResult(data: Checkout, local: boolean): void {
  element('result-source').textContent = local ? 'Estimación local · sin confirmar' : 'Cotización recibida';
  element('result-total').textContent = money(data.total);
  element('result-message').textContent = data.message;
  showWarnings('result-warnings', data.warnings);
  element('result').hidden = false;
  element('result').classList.toggle('unconfirmed', local);
}

async function checkoutNow(): Promise<void> {
  const lines = [];
  for (const product of dashboard?.products ?? []) {
    if ((quantities[product.id] || 0) > 0) {
      lines.push({ productId: product.id, quantity: quantities[product.id] });
    }
  }
  const version = cartVersion;
  quoting = true;
  refreshButton();
  element('checkout-button').textContent = 'Consultando cotización…';
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, coupon, shippingZone, lines }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data: Checkout = await response.json();
    if (version === cartVersion) showResult(data, false);
  } catch {
    if (version !== cartVersion) return;
    showResult({
      subtotal: calculateLocalSubtotal(),
      discount: calculateLocalDiscount(),
      shipping: calculateLocalShipping(),
      taxes: calculateLocalSubtotal() * 0.21,
      total: calculateLocalSubtotal() - calculateLocalDiscount() + calculateLocalShipping() + calculateLocalSubtotal() * 0.21,
      message: 'No pudimos confirmar la cotización. Estos importes son una estimación.',
      warnings: ['Volvé a cotizar cuando el servicio esté disponible.']
    }, true);
  } finally {
    quoting = false;
    element('checkout-button').textContent = 'Cotizar pedido →';
    refreshButton();
  }
}

element<HTMLFormElement>('customer-form').addEventListener('submit', event => {
  event.preventDefault();
  customerId = Number(element<HTMLInputElement>('customer-id').value);
  void loadDashboard();
});
document.querySelectorAll<HTMLButtonElement>('[data-customer]').forEach(button => {
  button.addEventListener('click', () => {
    customerId = Number(button.dataset.customer);
    element<HTMLInputElement>('customer-id').value = String(customerId);
    void loadDashboard();
  });
});
element<HTMLSelectElement>('category').addEventListener('change', event => {
  selectedCategory = (event.target as HTMLSelectElement).value;
  renderProducts();
});
element<HTMLSelectElement>('coupon').addEventListener('change', event => {
  coupon = (event.target as HTMLSelectElement).value;
  invalidateQuote();
});
element<HTMLSelectElement>('zone').addEventListener('change', event => {
  shippingZone = (event.target as HTMLSelectElement).value;
  invalidateQuote();
});
element('checkout-button').addEventListener('click', () => { void checkoutNow(); });

void loadDashboard();
