// Multi-Payment Gateway Integration for CareConnect
import { githubDB, collections } from './database';

// Payment Gateway Types
export enum PaymentGateway {
  PAYSTACK = 'paystack',
  STRIPE = 'stripe',
  FLUTTERWAVE = 'flutterwave',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal'
}

// Payment Types
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  DONATION = 'donation',
  DEPOSIT = 'deposit',
  MARKETPLACE_FEE = 'marketplace_fee'
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

// Payment Interface
export interface Payment {
  id: string;
  gateway: PaymentGateway;
  gateway_transaction_id: string;
  
  // Parties
  payer_id?: string;
  payer_email: string;
  payee_id: string; // Entity receiving payment
  
  // Amount Details
  amount: number;
  currency: string;
  gateway_fee: number;
  platform_fee: number;
  net_amount: number;
  
  // Payment Details
  type: PaymentType;
  status: PaymentStatus;
  description: string;
  
  // Related Records
  order_id?: string;
  booking_id?: string;
  donation_id?: string;
  subscription_id?: string;
  
  // Gateway Response
  gateway_response: any;
  
  // Timestamps
  initiated_at: string;
  completed_at?: string;
  refunded_at?: string;
  
  created_at: string;
  updated_at: string;
}

// Payment Configuration
export interface PaymentConfig {
  entity_id: string;
  gateways: {
    [key in PaymentGateway]?: {
      enabled: boolean;
      public_key: string;
      secret_key: string;
      webhook_url?: string;
      supported_currencies: string[];
    };
  };
  default_gateway: PaymentGateway;
  platform_fee_percentage: number;
  auto_payout: boolean;
  payout_schedule: 'daily' | 'weekly' | 'monthly';
  minimum_payout: number;
}

// Payment Service
export class PaymentService {
  // Initialize payment
  static async initializePayment(paymentData: {
    amount: number;
    currency: string;
    payer_email: string;
    payee_id: string;
    type: PaymentType;
    description: string;
    gateway?: PaymentGateway;
    order_id?: string;
    booking_id?: string;
    donation_id?: string;
  }) {
    // Get payment configuration for payee
    const config = await this.getPaymentConfig(paymentData.payee_id);
    const gateway = paymentData.gateway || config.default_gateway;
    
    if (!config.gateways[gateway]?.enabled) {
      throw new Error(`${gateway} is not enabled for this entity`);
    }
    
    // Calculate fees
    const platformFee = (paymentData.amount * config.platform_fee_percentage) / 100;
    const gatewayFee = this.calculateGatewayFee(gateway, paymentData.amount);
    const netAmount = paymentData.amount - platformFee - gatewayFee;
    
    // Create payment record
    const payment = await githubDB.insert(collections.payments, {
      ...paymentData,
      gateway,
      gateway_fee: gatewayFee,
      platform_fee: platformFee,
      net_amount: netAmount,
      status: PaymentStatus.PENDING,
      initiated_at: new Date().toISOString()
    });
    
    // Initialize with specific gateway
    let gatewayResponse;
    switch (gateway) {
      case PaymentGateway.STRIPE:
        gatewayResponse = await this.initializeStripe(payment, config.gateways[gateway]!);
        break;
      case PaymentGateway.PAYSTACK:
        gatewayResponse = await this.initializePaystack(payment, config.gateways[gateway]!);
        break;
      case PaymentGateway.FLUTTERWAVE:
        gatewayResponse = await this.initializeFlutterwave(payment, config.gateways[gateway]!);
        break;
      case PaymentGateway.RAZORPAY:
        gatewayResponse = await this.initializeRazorpay(payment, config.gateways[gateway]!);
        break;
      case PaymentGateway.PAYPAL:
        gatewayResponse = await this.initializePayPal(payment, config.gateways[gateway]!);
        break;
      default:
        throw new Error('Unsupported payment gateway');
    }
    
    // Update payment with gateway response
    await githubDB.update(collections.payments, payment.id, {
      gateway_transaction_id: gatewayResponse.transaction_id,
      gateway_response: gatewayResponse,
      status: PaymentStatus.PROCESSING
    });
    
    return {
      payment_id: payment.id,
      gateway_response: gatewayResponse
    };
  }
  
  // Verify payment
  static async verifyPayment(paymentId: string, gatewayReference: string) {
    const payment = await githubDB.findById(collections.payments, paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    const config = await this.getPaymentConfig(payment.payee_id);
    let verified = false;
    
    // Verify with specific gateway
    switch (payment.gateway) {
      case PaymentGateway.STRIPE:
        verified = await this.verifyStripe(gatewayReference, config.gateways[payment.gateway]!);
        break;
      case PaymentGateway.PAYSTACK:
        verified = await this.verifyPaystack(gatewayReference, config.gateways[payment.gateway]!);
        break;
      // Add other gateways...
    }
    
    if (verified) {
      await githubDB.update(collections.payments, paymentId, {
        status: PaymentStatus.COMPLETED,
        completed_at: new Date().toISOString()
      });
      
      // Process post-payment actions
      await this.processPostPayment(payment);
    }
    
    return verified;
  }
  
  // Process refund
  static async processRefund(paymentId: string, amount?: number, reason?: string) {
    const payment = await githubDB.findById(collections.payments, paymentId);
    if (!payment || payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Payment cannot be refunded');
    }
    
    const refundAmount = amount || payment.amount;
    const config = await this.getPaymentConfig(payment.payee_id);
    
    let refunded = false;
    
    // Process refund with specific gateway
    switch (payment.gateway) {
      case PaymentGateway.STRIPE:
        refunded = await this.refundStripe(payment.gateway_transaction_id, refundAmount, config.gateways[payment.gateway]!);
        break;
      case PaymentGateway.PAYSTACK:
        refunded = await this.refundPaystack(payment.gateway_transaction_id, refundAmount, config.gateways[payment.gateway]!);
        break;
      // Add other gateways...
    }
    
    if (refunded) {
      const newStatus = refundAmount === payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      
      await githubDB.update(collections.payments, paymentId, {
        status: newStatus,
        refunded_at: new Date().toISOString()
      });
    }
    
    return refunded;
  }
  
  // Gateway-specific implementations
  private static async initializeStripe(payment: Payment, config: any) {
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount: (payment.amount * 100).toString(),
        currency: payment.currency.toLowerCase(),
        automatic_payment_methods: 'true',
        metadata: JSON.stringify({
          payment_id: payment.id,
          type: payment.type
        })
      })
    });
    
    const data = await response.json();
    
    return {
      transaction_id: data.id,
      client_secret: data.client_secret,
      status: data.status
    };
  }
  
  private static async initializePaystack(payment: Payment, config: any) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: payment.amount * 100,
        email: payment.payer_email,
        currency: payment.currency,
        reference: `cc_${payment.id}_${Date.now()}`,
        metadata: {
          payment_id: payment.id,
          type: payment.type
        }
      })
    });
    
    const data = await response.json();
    
    return {
      transaction_id: data.data.reference,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code
    };
  }
  
  private static async initializeFlutterwave(payment: Payment, config: any) {
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: `cc_${payment.id}_${Date.now()}`,
        amount: payment.amount,
        currency: payment.currency,
        customer: {
          email: payment.payer_email
        },
        customizations: {
          title: 'CareConnect Payment'
        },
        meta: {
          payment_id: payment.id,
          type: payment.type
        }
      })
    });
    
    const data = await response.json();
    
    return {
      transaction_id: data.data.tx_ref,
      payment_link: data.data.link
    };
  }
  
  private static async initializeRazorpay(payment: Payment, config: any) {
    const auth = btoa(`${config.public_key}:${config.secret_key}`);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: payment.amount * 100,
        currency: payment.currency,
        receipt: `cc_${payment.id}`,
        notes: {
          payment_id: payment.id,
          type: payment.type
        }
      })
    });
    
    const data = await response.json();
    
    return {
      transaction_id: data.id,
      order_id: data.id,
      amount: data.amount,
      currency: data.currency
    };
  }
  
  private static async initializePayPal(payment: Payment, config: any) {
    const auth = btoa(`${config.public_key}:${config.secret_key}`);
    
    const response = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: payment.currency,
            value: payment.amount.toString()
          },
          custom_id: payment.id
        }]
      })
    });
    
    const data = await response.json();
    
    return {
      transaction_id: data.id,
      approval_url: data.links.find((link: any) => link.rel === 'approve')?.href
    };
  }
  
  // Verification methods
  private static async verifyStripe(paymentIntentId: string, config: any): Promise<boolean> {
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      headers: {
        'Authorization': `Bearer ${config.secret_key}`
      }
    });
    
    const data = await response.json();
    return data.status === 'succeeded';
  }
  
  private static async verifyPaystack(reference: string, config: any): Promise<boolean> {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${config.secret_key}`
      }
    });
    
    const data = await response.json();
    return data.data.status === 'success';
  }
  
  // Refund methods
  private static async refundStripe(paymentIntentId: string, amount: number, config: any): Promise<boolean> {
    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        payment_intent: paymentIntentId,
        amount: (amount * 100).toString()
      })
    });
    
    const data = await response.json();
    return data.status === 'succeeded';
  }
  
  private static async refundPaystack(transactionId: string, amount: number, config: any): Promise<boolean> {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction: transactionId,
        amount: amount * 100
      })
    });
    
    const data = await response.json();
    return data.status === true;
  }
  
  // Helper methods
  private static calculateGatewayFee(gateway: PaymentGateway, amount: number): number {
    const fees = {
      [PaymentGateway.STRIPE]: amount * 0.029 + 0.30,
      [PaymentGateway.PAYSTACK]: amount * 0.015,
      [PaymentGateway.FLUTTERWAVE]: amount * 0.014,
      [PaymentGateway.RAZORPAY]: amount * 0.02,
      [PaymentGateway.PAYPAL]: amount * 0.034 + 0.30
    };
    
    return fees[gateway] || 0;
  }
  
  private static async getPaymentConfig(entityId: string): Promise<PaymentConfig> {
    const configs = await githubDB.find(collections.payment_methods, { entity_id: entityId });
    
    if (configs.length === 0) {
      // Return default configuration
      return {
        entity_id: entityId,
        gateways: {
          [PaymentGateway.STRIPE]: {
            enabled: false,
            public_key: '',
            secret_key: '',
            supported_currencies: ['USD', 'EUR', 'GBP']
          }
        },
        default_gateway: PaymentGateway.STRIPE,
        platform_fee_percentage: 2.5,
        auto_payout: false,
        payout_schedule: 'weekly',
        minimum_payout: 10
      };
    }
    
    return configs[0];
  }
  
  private static async processPostPayment(payment: Payment) {
    // Update related records based on payment type
    switch (payment.type) {
      case PaymentType.ONE_TIME:
        if (payment.order_id) {
          await githubDB.update(collections.orders, payment.order_id, {
            payment_status: 'completed',
            status: 'confirmed'
          });
        }
        break;
        
      case PaymentType.DONATION:
        if (payment.donation_id) {
          await githubDB.update(collections.donations, payment.donation_id, {
            payment_status: 'completed',
            status: 'confirmed'
          });
        }
        break;
        
      case PaymentType.SUBSCRIPTION:
        if (payment.subscription_id) {
          await githubDB.update(collections.subscriptions, payment.subscription_id, {
            status: 'active',
            last_payment_at: new Date().toISOString()
          });
        }
        break;
    }
    
    // Send confirmation notifications
    await this.sendPaymentConfirmation(payment);
  }
  
  private static async sendPaymentConfirmation(payment: Payment) {
    // Send email/SMS notifications
    await githubDB.insert(collections.notifications, {
      user_id: payment.payer_id,
      type: 'payment_confirmation',
      title: 'Payment Successful',
      message: `Your payment of ${payment.amount} ${payment.currency} has been processed successfully.`,
      data: { payment_id: payment.id },
      is_read: false
    });
  }
}
