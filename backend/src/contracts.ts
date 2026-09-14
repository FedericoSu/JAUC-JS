export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  popularity: number;
};

export type CheckoutRequest = {
  customerId: number;
  coupon: string;
  shippingZone: string;
  lines: { productId: number; quantity: number }[];
};

export type DashboardResponse = {
  customerName: string;
  segment: string;
  risk: number;
  products: Product[];
  warnings: string[];
  suggestedBudget: number;
};

export type CheckoutResponse = {
  subtotal: number;
  discount: number;
  shipping: number;
  taxes: number;
  total: number;
  message: string;
  warnings: string[];
};
