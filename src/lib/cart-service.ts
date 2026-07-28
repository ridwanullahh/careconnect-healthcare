import { githubDB as db, collections } from './database';

export interface CartItem {
  id?: string;
  uid?: string;
  user_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
  variant?: string;
  added_at: string;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  item_count: number;
}

const TAX_RATE = 0.075;
const FREE_SHIPPING_THRESHOLD = 5000;
const STANDARD_SHIPPING = 500;

export class CartService {
  static async getCart(userId: string): Promise<CartItem[]> {
    return db.find(collections.carts, { user_id: userId }) as Promise<CartItem[]>;
  }

  static async getCartSummary(userId: string): Promise<CartSummary> {
    const items = await this.getCart(userId);
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (items.length > 0 ? STANDARD_SHIPPING : 0);
    return {
      items,
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  static async addItem(userId: string, product: {
    product_id: string;
    product_name: string;
    unit_price: number;
    image_url?: string;
    variant?: string;
  }, quantity: number = 1): Promise<CartItem> {
    const existing = await db.find(collections.carts, (item: any) =>
      item.user_id === userId && item.product_id === product.product_id && item.variant === product.variant
    ) as CartItem[];

    if (existing.length > 0) {
      const updated = await db.update(collections.carts, existing[0].id!, {
        quantity: existing[0].quantity + quantity,
        added_at: new Date().toISOString(),
      });
      return updated as CartItem;
    }

    const products = await db.find(collections.products, { id: product.product_id });
    const prod = products[0] as any;
    if (prod && prod.stock_quantity !== undefined && prod.stock_quantity < quantity) {
      throw new Error(`Insufficient stock. Only ${prod.stock_quantity} available.`);
    }

    return db.insert(collections.carts, {
      user_id: userId,
      product_id: product.product_id,
      product_name: product.product_name,
      quantity,
      unit_price: product.unit_price,
      image_url: product.image_url || '',
      variant: product.variant || '',
      added_at: new Date().toISOString(),
    }) as Promise<CartItem>;
  }

  static async updateQuantity(userId: string, cartItemId: string, quantity: number): Promise<CartItem> {
    if (quantity <= 0) {
      await db.delete(collections.carts, cartItemId);
      return {} as CartItem;
    }
    return db.update(collections.carts, cartItemId, { quantity }) as Promise<CartItem>;
  }

  static async removeItem(userId: string, cartItemId: string): Promise<void> {
    await db.delete(collections.carts, cartItemId);
  }

  static async clearCart(userId: string): Promise<void> {
    const items = await this.getCart(userId);
    for (const item of items) {
      await db.delete(collections.carts, item.id!);
    }
  }

  static async checkout(userId: string, paymentMethod: string = 'pending_review'): Promise<{
    order_id: string;
    order_number: string;
    total: number;
    status: string;
  }> {
    const summary = await this.getCartSummary(userId);
    if (summary.items.length === 0) throw new Error('Cart is empty');

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const order = await db.insert(collections.orders, {
      user_id: userId,
      order_number: orderNumber,
      items: summary.items.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total_amount: summary.total,
      status: paymentMethod === 'pay_on_delivery' ? 'confirmed' : 'pending_review',
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
    });

    for (const item of summary.items) {
      await db.insert(collections.order_items, {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.unit_price * item.quantity,
      });

      try {
        const products = await db.find(collections.products, { id: item.product_id });
        if (products[0]) {
          const prod = products[0] as any;
          await db.update(collections.products, item.product_id, {
            stock_quantity: Math.max(0, (prod.stock_quantity || 0) - item.quantity),
          });
        }
      } catch {}
    }

    await this.clearCart(userId);

    try {
      await db.insert(collections.notifications, {
        user_id: userId,
        type: 'order_created',
        title: 'Order Placed',
        message: `Your order ${orderNumber} has been placed successfully. Total: ${summary.total.toLocaleString()}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch {}

    return {
      order_id: order.id,
      order_number: orderNumber,
      total: summary.total,
      status: order.status,
    };
  }
}

export default CartService;
