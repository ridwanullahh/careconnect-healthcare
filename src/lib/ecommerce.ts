// E-commerce System for CareConnect Healthcare Platform
import { githubDB, collections } from './database';
import { PaymentService, PaymentType } from './payments';

// Product Categories
export enum ProductCategory {
  MEDICATIONS = 'medications',
  MEDICAL_DEVICES = 'medical_devices',
  SUPPLEMENTS = 'supplements',
  HEALTH_PRODUCTS = 'health_products',
  WELLNESS = 'wellness',
  FIRST_AID = 'first_aid',
  MOBILITY_AIDS = 'mobility_aids',
  PERSONAL_CARE = 'personal_care'
}

// Order Status
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

// Prescription Status
export enum PrescriptionStatus {
  PENDING_UPLOAD = 'pending_upload',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPENSED = 'dispensed'
}

// Product Interface
export interface Product {
  id: string;
  entity_id: string; // Pharmacy/entity selling
  
  // Basic Information
  name: string;
  description: string;
  category: ProductCategory;
  brand: string;
  manufacturer: string;
  
  // Pricing
  price: number;
  discounted_price?: number;
  currency: string;
  
  // Inventory
  stock_quantity: number;
  low_stock_threshold: number;
  sku: string;
  barcode?: string;
  
  // Prescription Requirements
  requires_prescription: boolean;
  controlled_substance: boolean;
  prescription_types: string[]; // ['chronic', 'acute', 'maintenance']
  
  // Product Details
  images: string[];
  specifications: {
    dosage?: string;
    form?: string; // tablet, capsule, liquid
    strength?: string;
    size?: string;
    weight?: string;
    dimensions?: string;
  };
  
  // Safety Information
  warnings: string[];
  contraindications: string[];
  side_effects: string[];
  storage_instructions: string;
  expiry_tracking: boolean;
  
  // Search & Discovery
  tags: string[];
  search_keywords: string[];
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  requires_age_verification: boolean;
  min_age?: number;
  
  // Ratings
  rating: number;
  review_count: number;
  
  created_at: string;
  updated_at: string;
}

// Order Interface
export interface Order {
  id: string;
  user_id: string;
  entity_id: string; // Pharmacy/entity
  
  // Order Details
  order_number: string;
  status: OrderStatus;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  
  // Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  tax_amount: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  
  // Addresses
  shipping_address: Address;
  billing_address: Address;
  
  // Prescription
  requires_prescription: boolean;
  prescription_status?: PrescriptionStatus;
  prescription_documents?: string[];
  pharmacist_review?: {
    reviewed_by: string;
    reviewed_at: string;
    notes: string;
    approved: boolean;
  };
  
  // Shipping
  shipping_method: string;
  tracking_number?: string;
  estimated_delivery: string;
  
  // Customer Information
  customer_notes?: string;
  
  // Timestamps
  placed_at: string;
  confirmed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  prescription_required: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

// Shopping Cart Interface
export interface CartItem {
  product_id: string;
  quantity: number;
  selected_for_checkout: boolean;
}

// E-commerce Service
export class ECommerceService {
  // Product Management
  static async createProduct(productData: Partial<Product>): Promise<Product> {
    const product = await githubDB.insert(collections.products, {
      ...productData,
      stock_quantity: productData.stock_quantity || 0,
      low_stock_threshold: productData.low_stock_threshold || 10,
      rating: 0,
      review_count: 0,
      is_active: true,
      is_featured: false
    });
    
    return product;
  }
  
  static async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    return await githubDB.update(collections.products, productId, updates);
  }
  
  static async searchProducts(filters: {
    query?: string;
    category?: ProductCategory;
    entity_id?: string;
    price_min?: number;
    price_max?: number;
    requires_prescription?: boolean;
    in_stock_only?: boolean;
    brand?: string;
    rating_min?: number;
  }) {
    let products = await githubDB.find(collections.products, { is_active: true });
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    
    if (filters.category) {
      products = products.filter(product => product.category === filters.category);
    }
    
    if (filters.entity_id) {
      products = products.filter(product => product.entity_id === filters.entity_id);
    }
    
    if (filters.price_min !== undefined) {
      products = products.filter(product => product.price >= filters.price_min!);
    }
    
    if (filters.price_max !== undefined) {
      products = products.filter(product => product.price <= filters.price_max!);
    }
    
    if (filters.requires_prescription !== undefined) {
      products = products.filter(product => product.requires_prescription === filters.requires_prescription);
    }
    
    if (filters.in_stock_only) {
      products = products.filter(product => product.stock_quantity > 0);
    }
    
    if (filters.brand) {
      products = products.filter(product => product.brand === filters.brand);
    }
    
    if (filters.rating_min) {
      products = products.filter(product => product.rating >= filters.rating_min!);
    }
    
    return products;
  }

  static async getProduct(productId: string): Promise<Product | null> {
    return await githubDB.findById(collections.products, productId);
  }
  
  // Cart Management
  static async addToCart(userId: string, productId: string, quantity: number): Promise<boolean> {
    // Check if product exists and is available
    const product = await githubDB.findById(collections.products, productId);
    if (!product || !product.is_active) {
      throw new Error('Product not available');
    }
    
    if (quantity > product.stock_quantity) {
      throw new Error('Insufficient stock');
    }
    
    // Check if item already in cart
    const existingCart = await githubDB.find('user_carts', {
      user_id: userId,
      product_id: productId
    });
    
    if (existingCart.length > 0) {
      // Update quantity
      const newQuantity = existingCart[0].quantity + quantity;
      if (newQuantity > product.stock_quantity) {
        throw new Error('Insufficient stock');
      }
      
      await githubDB.update('user_carts', existingCart[0].id, {
        quantity: newQuantity
      });
    } else {
      // Add new item
      await githubDB.insert('user_carts', {
        user_id: userId,
        product_id: productId,
        quantity,
        selected_for_checkout: true
      });
    }
    
    return true;
  }
  
  static async getCart(userId: string): Promise<any[]> {
    const cartItems = await githubDB.find('user_carts', { user_id: userId });
    
    // Get product details for each cart item
    const cartWithProducts = await Promise.all(
      cartItems.map(async (item: any) => {
        const product = await githubDB.findById(collections.products, item.product_id);
        return {
          ...item,
          product
        };
      })
    );
    
    return cartWithProducts;
  }
  
  static async updateCartItem(userId: string, productId: string, quantity: number): Promise<boolean> {
    const cartItems = await githubDB.find('user_carts', {
      user_id: userId,
      product_id: productId
    });
    
    if (cartItems.length === 0) {
      throw new Error('Item not in cart');
    }
    
    if (quantity <= 0) {
      await githubDB.delete('user_carts', cartItems[0].id);
    } else {
      await githubDB.update('user_carts', cartItems[0].id, { quantity });
    }
    
    return true;
  }
  
  static async removeFromCart(userId: string, productId: string): Promise<boolean> {
    const cartItems = await githubDB.find('user_carts', {
      user_id: userId,
      product_id: productId
    });
    
    if (cartItems.length > 0) {
      await githubDB.delete('user_carts', cartItems[0].id);
    }
    
    return true;
  }
  
  // Order Management
  static async createOrder(orderData: {
    user_id: string;
    entity_id: string;
    items: OrderItem[];
    shipping_address: Address;
    billing_address: Address;
    shipping_method: string;
    customer_notes?: string;
  }): Promise<Order> {
    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = subtotal * 0.08; // 8% tax (configurable)
    const shippingFee = this.calculateShippingFee(orderData.shipping_method, subtotal);
    const totalAmount = subtotal + taxAmount + shippingFee;
    
    // Check if any items require prescription
    const requiresPrescription = orderData.items.some(item => item.prescription_required);
    
    // Generate order number
    const orderNumber = `CC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create order
    const order = await githubDB.insert(collections.orders, {
      ...orderData,
      order_number: orderNumber,
      status: OrderStatus.PENDING,
      payment_status: 'pending',
      subtotal,
      tax_amount: taxAmount,
      shipping_fee: shippingFee,
      discount_amount: 0,
      total_amount: totalAmount,
      currency: 'USD',
      requires_prescription: requiresPrescription,
      prescription_status: requiresPrescription ? PrescriptionStatus.PENDING_UPLOAD : undefined,
      estimated_delivery: this.calculateEstimatedDelivery(orderData.shipping_method),
      placed_at: new Date().toISOString()
    });
    
    // Create order items
    for (const item of orderData.items) {
      await githubDB.insert(collections.order_items, {
        ...item,
        order_id: order.id
      });
    }
    
    // Clear cart items
    const cartItems = await githubDB.find('user_carts', {
      user_id: orderData.user_id
    });
    
    for (const cartItem of cartItems) {
      if (orderData.items.some(item => item.product_id === cartItem.product_id)) {
        await githubDB.delete('user_carts', cartItem.id);
      }
    }
    
    return order;
  }

  static async getOrder(orderId: string): Promise<Order | null> {
    return await githubDB.findById(collections.orders, orderId);
  }
  
  static async processPayment(orderId: string, paymentMethod: string): Promise<any> {
    const order = await githubDB.findById(collections.orders, orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Initialize payment
    const paymentResult = await PaymentService.initializePayment({
      amount: order.total_amount,
      currency: order.currency,
      payer_email: '', // Get from user profile
      payee_id: order.entity_id,
      type: PaymentType.ONE_TIME,
      description: `Order ${order.order_number}`,
      order_id: orderId
    });
    
    return paymentResult;
  }
  
  static async updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): Promise<Order> {
    const updateData: any = { status };
    
    // Add timestamp for specific statuses
    switch (status) {
      case OrderStatus.CONFIRMED:
        updateData.confirmed_at = new Date().toISOString();
        break;
      case OrderStatus.SHIPPED:
        updateData.shipped_at = new Date().toISOString();
        break;
      case OrderStatus.DELIVERED:
        updateData.delivered_at = new Date().toISOString();
        break;
    }
    
    const order = await githubDB.update(collections.orders, orderId, updateData);
    
    // Send notification to customer
    await this.sendOrderStatusNotification(order, status);
    
    return order;
  }
  
  // Prescription Management
  static async uploadPrescription(orderId: string, prescriptionFiles: string[]): Promise<boolean> {
    await githubDB.update(collections.orders, orderId, {
      prescription_documents: prescriptionFiles,
      prescription_status: PrescriptionStatus.UNDER_REVIEW
    });
    
    // Notify pharmacist for review
    await this.notifyPharmacistForReview(orderId);
    
    return true;
  }
  
  static async reviewPrescription(
    orderId: string, 
    pharmacistId: string, 
    approved: boolean, 
    notes: string
  ): Promise<boolean> {
    const reviewData = {
      prescription_status: approved ? PrescriptionStatus.APPROVED : PrescriptionStatus.REJECTED,
      pharmacist_review: {
        reviewed_by: pharmacistId,
        reviewed_at: new Date().toISOString(),
        notes,
        approved
      }
    };
    
    await githubDB.update(collections.orders, orderId, reviewData);
    
    // If approved, move order to processing
    if (approved) {
      await this.updateOrderStatus(orderId, OrderStatus.PROCESSING);
    }
    
    return true;
  }
  
  // Helper functions
  private static calculateShippingFee(method: string, subtotal: number): number {
    const shippingRates = {
      'standard': subtotal >= 50 ? 0 : 9.99,
      'express': 19.99,
      'overnight': 39.99,
      'pickup': 0
    };
    
    return shippingRates[method as keyof typeof shippingRates] || 9.99;
  }
  
  private static calculateEstimatedDelivery(method: string): string {
    const deliveryDays = {
      'standard': 5,
      'express': 2,
      'overnight': 1,
      'pickup': 0
    };
    
    const days = deliveryDays[method as keyof typeof deliveryDays] || 5;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + days);
    
    return estimatedDate.toISOString().split('T')[0];
  }
  
  private static async sendOrderStatusNotification(order: Order, status: OrderStatus) {
    const statusMessages = {
      [OrderStatus.CONFIRMED]: 'Your order has been confirmed and is being prepared.',
      [OrderStatus.PROCESSING]: 'Your order is being processed.',
      [OrderStatus.SHIPPED]: 'Your order has been shipped.',
      [OrderStatus.DELIVERED]: 'Your order has been delivered.',
      [OrderStatus.CANCELLED]: 'Your order has been cancelled.',
      [OrderStatus.RETURNED]: 'Your order return has been processed.'
    };
    
    await githubDB.insert(collections.notifications, {
      user_id: order.user_id,
      type: 'order_status',
      title: `Order ${order.order_number} Update`,
      message: statusMessages[status] || 'Your order status has been updated.',
      data: { order_id: order.id, status },
      is_read: false
    });
  }
  
  private static async notifyPharmacistForReview(orderId: string) {
    const order = await githubDB.findById(collections.orders, orderId);
    
    // Find pharmacists in the entity
    const pharmacists = await githubDB.find(collections.entity_staff, {
      entity_id: order.entity_id,
      role: 'pharmacist'
    });
    
    // Send notification to all pharmacists
    for (const pharmacist of pharmacists) {
      await githubDB.insert(collections.notifications, {
        user_id: pharmacist.user_id,
        type: 'prescription_review',
        title: 'Prescription Review Required',
        message: `Order ${order.order_number} requires prescription review.`,
        data: { order_id: orderId },
        is_read: false
      });
    }
  }
}
