import type { CheckoutRequest, CheckoutResponse, DashboardResponse, Product } from './contracts.js';

// Punto de partida deliberado para el taller: las reglas se refactorizan durante la clase.
export class GodStoreService {
  products: Product[] = [
    { id: 1, name: 'Notebook reacondicionada', category: 'tech', price: 650000, stock: 6, popularity: 91 },
    { id: 2, name: 'Mouse inalámbrico', category: 'tech', price: 7800, stock: 44, popularity: 61 },
    { id: 3, name: 'Silla de oficina', category: 'office', price: 115000, stock: 9, popularity: 73 },
    { id: 4, name: 'Lámpara LED', category: 'home', price: 26000, stock: 18, popularity: 44 },
    { id: 5, name: 'Monitor de 24 pulgadas', category: 'tech', price: 210000, stock: 3, popularity: 88 }
  ];

  buildDashboard(customerId: number): DashboardResponse {
    const customerName = 'Cliente ' + customerId;
    let segment = 'nuevo';
    const warnings: string[] = [];
    let suggestedBudget = 50000;

    if (customerId > 100) {
      if (customerId < 200) {
        segment = 'frecuente';
        suggestedBudget = 180000;
        if (customerId % 2 === 0) {
          if (customerId % 5 === 0) {
            warnings.push('Tiene compras recientes muy grandes.');
            suggestedBudget = 320000;
          } else {
            warnings.push('Tiene actividad normal.');
          }
        } else {
          if (customerId % 3 === 0) {
            warnings.push('No abre promociones hace semanas.');
          } else {
            warnings.push('Podría recibir un cupón pequeño.');
          }
        }
      } else {
        if (customerId < 500) {
          segment = 'vip';
          suggestedBudget = 700000;
          if (customerId % 7 === 0) {
            warnings.push('VIP con posible fraude por patrón 7.');
          } else {
            warnings.push('VIP habilitado para envío bonificado.');
          }
        } else {
          segment = 'empresa';
          suggestedBudget = 1400000;
          if (customerId > 900) {
            if (customerId === 999) {
              warnings.push('Cliente bloqueado manualmente.');
            } else {
              warnings.push('Empresa requiere aprobación comercial.');
            }
          }
        }
      }
    } else {
      if (customerId < 10) {
        warnings.push('Cuenta de prueba.');
        suggestedBudget = 10000;
      } else {
        if (customerId % 4 === 0) {
          warnings.push('Cliente nuevo con historial incompleto.');
        }
      }
    }

    return {
      customerName, segment, warnings, suggestedBudget,
      risk: this.calculateCustomerRisk(customerId, segment, suggestedBudget),
      products: this.products
    };
  }

  checkout(request: CheckoutRequest): CheckoutResponse {
    const warnings: string[] = [];
    let subtotal = 0;

    for (const line of request.lines) {
      const product = this.products.find(p => p.id === line.productId);
      if (product) {
        subtotal += product.price * line.quantity;
        if (line.quantity > product.stock) {
          warnings.push(product.name + ' no tiene stock suficiente.');
        }
      } else {
        warnings.push('Producto inexistente: ' + line.productId);
      }
    }

    const segment = this.buildDashboard(request.customerId).segment;
    const risk = this.calculateCustomerRisk(request.customerId, segment, subtotal);
    const discount = this.calculateDiscount(request.coupon, segment, subtotal, risk);
    const shipping = this.calculateShipping(request.shippingZone, subtotal, risk);
    const taxes = subtotal * 0.21;
    const total = subtotal - discount + shipping + taxes;
    const message = this.buildMessage(total, risk, request.shippingZone, request.coupon);

    if (total > 1000000) warnings.push('Operación grande: pedir autorización.');
    if (risk > 75) warnings.push('Riesgo alto: revisar identidad.');

    return { subtotal, discount, shipping, taxes, total, message, warnings };
  }

  calculateCustomerRisk(customerId: number, segment: string, amount: number): number {
    let risk = 0;
    if (segment === 'vip') {
      if (amount > 1000000) {
        risk = 45;
        if (customerId % 7 === 0) {
          risk = 83;
          if (amount > 1500000) {
            risk = 94;
          }
        }
      } else {
        if (customerId % 5 === 0) {
          risk = 35;
        } else {
          risk = 12;
        }
      }
    } else {
      if (segment === 'empresa') {
        if (amount > 1200000) {
          risk = 68;
          if (customerId > 900) {
            risk = 88;
            if (customerId === 999) {
              risk = 100;
            }
          }
        } else {
          risk = 33;
        }
      } else {
        if (segment === 'frecuente') {
          if (amount > 300000) {
            risk = 51;
          } else {
            risk = 22;
          }
        } else {
          if (amount > 90000) {
            risk = 72;
          } else {
            risk = 40;
          }
        }
      }
    }
    return risk;
  }

  calculateDiscount(coupon: string, segment: string, subtotal: number, risk: number): number {
    let discount = 0;
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
    if (discount > 80000) {
      discount = 80000;
    }
    return discount;
  }

  calculateShipping(zone: string, subtotal: number, risk: number): number {
    if (zone === 'CABA') {
      if (subtotal > 250000 && risk < 70) return 0;
      return 4500;
    }
    if (zone === 'GBA') {
      if (subtotal > 350000) return 2500;
      return 8500;
    }
    if (zone === 'INTERIOR') {
      if (risk > 80) return 30000;
      return 15000;
    }
    return 22000;
  }

  buildMessage(total: number, risk: number, zone: string, coupon: string): string {
    if (risk > 90) return 'Compra pausada por riesgo extremo.';
    if (total > 1000000) return 'Compra grande lista para revisión.';
    if (coupon === 'IA10') return 'Cupón aplicado.';
    if (zone === 'INTERIOR') return 'Envío al interior calculado.';
    return 'Compra lista.';
  }
}
