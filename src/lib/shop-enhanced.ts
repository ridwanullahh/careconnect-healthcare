// Enhanced Shop System with Cart and Inventory Management
import { githubDB, collections } from './database';
import PaymentService, { PaymentIntent } from './payments-enhanced';

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productImage?: string;
  selectedVariants?: Record<string, string>;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: 'cart' | 'pending_payment' | 'pending_review' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  paymentIntentId?: string;
  shippingAddress: Address;
  billingAddress: Address;
  customerNotes?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productSku?: string;
  selectedVariants?: Record<string, string>;
}

export interface Address {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export class ShopService {
  // Get or create cart for user
  static async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await githubDB.findOne(collections.carts, { userId });
    
    if (!cart || new Date(cart.expiresAt) < new Date()) {
      // Create new cart
      cart = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      await githubDB.create(collections.carts, cart);
    }
    
    return cart;
  }

  // Add item to cart
  static async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    selectedVariants?: Record<string, string>
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const product = await githubDB.findById(collections.products, productId);
    
    if (!product) throw new Error('Product not found');
    if (product.inventory_qty < quantity) throw new Error('Insufficient inventory');
    
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants)
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (product.inventory_qty < newQuantity) throw new Error('Insufficient inventory');
      
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].totalPrice = newQuantity * product.price;
    } else {
      // Add new item
      const cartItem: CartItem = {
        productId,
        quantity,
        unitPrice: product.price,
        totalPrice: quantity * product.price,
        productName: product.name,
        productImage: product.images?.[0],
        selectedVariants
      };
      
      cart.items.push(cartItem);
    }
    
    // Recalculate totals
    await this.recalculateCart(cart);
    
    await githubDB.update(collections.carts, cart.id, cart);
    return cart;
  }

  // Remove item from cart
  static async removeFromCart(userId: string, productId: string, selectedVariants?: Record<string, string>): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    
    cart.items = cart.items.filter(
      item => !(item.productId === productId && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants))
    );
    
    await this.recalculateCart(cart);
    await githubDB.update(collections.carts, cart.id, cart);
    return cart;
  }

  // Update item quantity
  static async updateCartItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
    selectedVariants?: Record<string, string>
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const product = await githubDB.findById(collections.products, productId);
    
    if (!product) throw new Error('Product not found');
    if (product.inventory_qty < quantity) throw new Error('Insufficient inventory');
    
    const itemIndex = cart.items.findIndex(
      item => item.productId === productId && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants)
    );
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].totalPrice = quantity * product.price;
      }
      
      await this.recalculateCart(cart);
      await githubDB.update(collections.carts, cart.id, cart);
    }
    
    return cart;
  }

  // Recalculate cart totals
  private static async recalculateCart(cart: Cart): Promise<void> {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.tax = cart.subtotal * 0.1; // 10% tax rate (configurable)
    cart.shipping = cart.subtotal > 100 ? 0 : 15; // Free shipping over $100
    cart.total = cart.subtotal + cart.tax + cart.shipping;
    cart.updatedAt = new Date().toISOString();
  }

  // Clear cart
  static async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    await this.recalculateCart(cart);
    await githubDB.update(collections.carts, cart.id, cart);
  }

  // Convert cart to order
  static async createOrderFromCart(
    userId: string,
    shippingAddress: Address,
    billingAddress: Address,
    customerNotes?: string
  ): Promise<Order> {
    const cart = await this.getOrCreateCart(userId);
    
    if (cart.items.length === 0) throw new Error('Cart is empty');
    
    // Validate inventory
    for (const item of cart.items) {
      const product = await githubDB.findById(collections.products, item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.inventory_qty < item.quantity) {
        throw new Error(`Insufficient inventory for ${item.productName}`);
      }
    }
    
    const orderNumber = `ORD${Date.now().toString().slice(-8)}`;
    
    const order: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      orderNumber,
      status: 'pending_payment',
      items: cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        productName: item.productName,
        selectedVariants: item.selectedVariants
      })),
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
      currency: cart.currency,
      shippingAddress,
      billingAddress,
      customerNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await githubDB.create(collections.orders, order);
    return order;
  }

  // Process order payment
  static async processOrderPayment(orderId: string, paymentIntentId: string): Promise<Order> {
    const order = await githubDB.findById(collections.orders, orderId);
    if (!order) throw new Error('Order not found');
    
    const paymentIntent = await githubDB.findById(collections.payments, paymentIntentId);
    if (!paymentIntent) throw new Error('Payment intent not found');
    
    // Update order with payment info
    const updatedOrder = {
      ...order,
      paymentIntentId,
      status: paymentIntent.status === 'completed' ? 'confirmed' : 'pending_review',
      updatedAt: new Date().toISOString(),
      confirmedAt: paymentIntent.status === 'completed' ? new Date().toISOString() : undefined
    };
    
    await githubDB.update(collections.orders, orderId, updatedOrder);
    
    // If payment is completed, reserve inventory
    if (paymentIntent.status === 'completed') {
      await this.reserveInventory(order);
      await this.clearCart(order.userId);
    }
    
    return updatedOrder;
  }

  // Reserve inventory for order
  private static async reserveInventory(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await githubDB.findById(collections.products, item.productId);
      if (product) {
        const newInventory = Math.max(0, product.inventory_qty - item.quantity);
        await githubDB.update(collections.products, item.productId, {
          inventory_qty: newInventory,
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  // Update order status
  static async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    trackingNumber?: string
  ): Promise<Order> {
    const order = await githubDB.findById(collections.orders, orderId);
    if (!order) throw new Error('Order not found');
    
    const updates: Partial<Order> = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (trackingNumber) updates.trackingNumber = trackingNumber;
    if (status === 'shipped') updates.shippedAt = new Date().toISOString();
    if (status === 'delivered') updates.deliveredAt = new Date().toISOString();
    
    await githubDB.update(collections.orders, orderId, updates);
    
    // Send notification
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: order.userId,
      type: 'order_status_update',
      title: 'Order Status Updated',
      message: `Your order ${order.orderNumber} is now ${status.replace('_', ' ')}`,
      data: { orderId, orderNumber: order.orderNumber, status, trackingNumber },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'normal'
    });
    
    return { ...order, ...updates };
  }

  // Get user orders
  static async getUserOrders(userId: string): Promise<Order[]> {
    return await githubDB.findMany(collections.orders, { userId });
  }

  // Get order by ID
  static async getOrderById(orderId: string): Promise<Order | null> {
    return await githubDB.findById(collections.orders, orderId);
  }

  // Cancel order
  static async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const order = await githubDB.findById(collections.orders, orderId);
    if (!order) throw new Error('Order not found');
    
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      throw new Error('Order cannot be cancelled');
    }
    
    // Restore inventory if order was confirmed
    if (order.status === 'confirmed' || order.status === 'processing') {
      for (const item of order.items) {
        const product = await githubDB.findById(collections.products, item.productId);
        if (product) {
          await githubDB.update(collections.products, item.productId, {
            inventory_qty: product.inventory_qty + item.quantity,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    
    const updatedOrder = {
      ...order,
      status: 'cancelled' as const,
      customerNotes: `${order.customerNotes || ''}\nCancellation reason: ${reason}`,
      updatedAt: new Date().toISOString()
    };
    
    await githubDB.update(collections.orders, orderId, updatedOrder);
    
    // Initiate refund if payment was made
    if (order.paymentIntentId) {
      await PaymentService.reconcilePayment(
        order.paymentIntentId,
        'mark_refunded',
        { notes: `Order cancellation: ${reason}` },
        'system'
      );
    }
    
    return updatedOrder;
  }
}

export default ShopService;