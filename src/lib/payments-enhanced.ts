// Enhanced Payment System with Record-and-Reconcile Model
import { githubDB, collections } from './database';
import { KeyManagementService, KeyType } from './key-management';
import { logger } from './observability';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  PENDING_REVIEW = 'pending_review'
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal'
}

export interface PaymentIntent {
  id: string;
  user_id: string;
  entity_id?: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  
  // Item details
  item_type: 'booking' | 'product' | 'course' | 'donation' | 'subscription';
  item_id: string;
  item_name: string;
  item_description?: string;
  
  // Payment details
  gateway_payment_id?: string;
  gateway_reference?: string;
  external_reference?: string;
  
  // Metadata
  metadata: {
    customer_email: string;
    customer_name: string;
    booking_reference?: string;
    order_number?: string;
    notes?: string;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
  expires_at: string;
}

export interface PaymentMethod {
  gateway: PaymentGateway;
  name: string;
  description: string;
  currencies: string[];
  countries: string[];
  setup_required: boolean;
  test_mode_available: boolean;
}

export class EnhancedPaymentService {
  private static readonly PAYMENT_EXPIRY_HOURS = 24;
  
  // Available payment methods
  static getAvailablePaymentMethods(): PaymentMethod[] {
    return [
      {
        gateway: PaymentGateway.STRIPE,
        name: 'Stripe',
        description: 'Credit/Debit Cards, Digital Wallets',
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        countries: ['US', 'CA', 'GB', 'EU', 'AU'],
        setup_required: true,
        test_mode_available: true
      },
      {
        gateway: PaymentGateway.PAYSTACK,
        name: 'Paystack',
        description: 'Cards, Bank Transfer, Mobile Money',
        currencies: ['NGN', 'USD', 'GHS', 'ZAR'],
        countries: ['NG', 'GH', 'ZA', 'KE'],
        setup_required: true,
        test_mode_available: true
      },
      {
        gateway: PaymentGateway.FLUTTERWAVE,
        name: 'Flutterwave',
        description: 'Cards, Bank Transfer, Mobile Money',
        currencies: ['NGN', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'],
        countries: ['NG', 'KE', 'UG', 'TZ', 'RW', 'ZM', 'MW'],
        setup_required: true,
        test_mode_available: true
      },
      {
        gateway: PaymentGateway.RAZORPAY,
        name: 'Razorpay',
        description: 'UPI, Cards, Net Banking, Wallets',
        currencies: ['INR'],
        countries: ['IN'],
        setup_required: true,
        test_mode_available: true
      },
      {
        gateway: PaymentGateway.PAYPAL,
        name: 'PayPal',
        description: 'PayPal Balance, Cards, Bank Account',
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        countries: ['US', 'CA', 'GB', 'EU', 'AU', 'JP'],
        setup_required: true,
        test_mode_available: true
      }
    ];
  }

  // Create payment intent
  static async createPaymentIntent(intentData: {
    user_id: string;
    entity_id?: string;
    amount: number;
    currency: string;
    gateway: PaymentGateway;
    item_type: PaymentIntent['item_type'];
    item_id: string;
    item_name: string;
    item_description?: string;
    customer_email: string;
    customer_name: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.PAYMENT_EXPIRY_HOURS);

      const intent: Partial<PaymentIntent> = {
        user_id: intentData.user_id,
        entity_id: intentData.entity_id,
        amount: intentData.amount,
        currency: intentData.currency,
        gateway: intentData.gateway,
        status: PaymentStatus.PENDING,
        item_type: intentData.item_type,
        item_id: intentData.item_id,
        item_name: intentData.item_name,
        item_description: intentData.item_description,
        metadata: {
          customer_email: intentData.customer_email,
          customer_name: intentData.customer_name,
          ...intentData.metadata
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };

      const savedIntent = await githubDB.insert(collections.payment_intents, intent);

      await logger.info('payment_intent_created', 'Payment intent created', {
        intent_id: savedIntent.id,
        amount: intentData.amount,
        currency: intentData.currency,
        gateway: intentData.gateway
      }, intentData.user_id);

      return savedIntent;
    } catch (error) {
      await logger.error('payment_intent_creation_failed', 'Payment intent creation failed', {
        error: error.message,
        intent_data: intentData
      }, intentData.user_id);
      throw error;
    }
  }

  // Initialize gateway payment (client-side redirect approach)
  static async initializeGatewayPayment(intentId: string): Promise<{ redirect_url: string; reference: string }> {
    try {
      const intent = await githubDB.findById(collections.payment_intents, intentId);
      if (!intent) {
        throw new Error('Payment intent not found');
      }

      if (intent.status !== PaymentStatus.PENDING) {
        throw new Error('Payment intent not in pending status');
      }

      // Check expiry
      if (new Date() > new Date(intent.expires_at)) {
        await this.updatePaymentStatus(intentId, PaymentStatus.CANCELLED, 'Payment expired');
        throw new Error('Payment intent has expired');
      }

      // Generate external reference
      const reference = `CC_${intent.id}_${Date.now()}`;
      
      // Update intent with processing status
      await githubDB.update(collections.payment_intents, intentId, {
        status: PaymentStatus.PROCESSING,
        external_reference: reference,
        updated_at: new Date().toISOString()
      });

      // Generate gateway-specific redirect URL
      const redirectUrl = await this.generateGatewayRedirectUrl(intent, reference);

      await logger.info('gateway_payment_initialized', 'Gateway payment initialized', {
        intent_id: intentId,
        gateway: intent.gateway,
        reference
      }, intent.user_id);

      return { redirect_url: redirectUrl, reference };
    } catch (error) {
      await logger.error('gateway_payment_init_failed', 'Gateway payment initialization failed', {
        intent_id: intentId,
        error: error.message
      });
      throw error;
    }
  }

  private static async generateGatewayRedirectUrl(intent: PaymentIntent, reference: string): Promise<string> {
    const baseUrl = window.location.origin;
    const returnUrl = `${baseUrl}/payment/callback`;
    const cancelUrl = `${baseUrl}/payment/cancelled`;

    switch (intent.gateway) {
      case PaymentGateway.STRIPE:
        // For Stripe, we'd need to create a Checkout Session
        // This is a simplified approach - in production, you'd need backend integration
        return `https://checkout.stripe.com/pay/test_session_placeholder?success_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

      case PaymentGateway.PAYSTACK:
        const paystackUrl = new URL('https://checkout.paystack.com/pay');
        paystackUrl.searchParams.set('amount', (intent.amount * 100).toString()); // Paystack uses kobo
        paystackUrl.searchParams.set('currency', intent.currency);
        paystackUrl.searchParams.set('email', intent.metadata.customer_email);
        paystackUrl.searchParams.set('reference', reference);
        paystackUrl.searchParams.set('callback_url', returnUrl);
        return paystackUrl.toString();

      case PaymentGateway.FLUTTERWAVE:
        const flutterwaveUrl = new URL('https://checkout.flutterwave.com/v3/hosted/pay');
        flutterwaveUrl.searchParams.set('amount', intent.amount.toString());
        flutterwaveUrl.searchParams.set('currency', intent.currency);
        flutterwaveUrl.searchParams.set('customer_email', intent.metadata.customer_email);
        flutterwaveUrl.searchParams.set('tx_ref', reference);
        flutterwaveUrl.searchParams.set('redirect_url', returnUrl);
        return flutterwaveUrl.toString();

      case PaymentGateway.RAZORPAY:
        // Razorpay typically requires backend integration for secure key handling
        return `https://razorpay.com/payment-gateway/?amount=${intent.amount * 100}&currency=${intent.currency}&order_id=${reference}`;

      case PaymentGateway.PAYPAL:
        const paypalUrl = new URL('https://www.paypal.com/checkoutnow');
        paypalUrl.searchParams.set('token', reference); // Simplified - needs actual PayPal integration
        return paypalUrl.toString();

      default:
        throw new Error(`Unsupported payment gateway: ${intent.gateway}`);
    }
  }

  // Handle payment callback (when user returns from gateway)
  static async handlePaymentCallback(params: {
    reference: string;
    status?: string;
    transaction_id?: string;
    gateway_data?: Record<string, any>;
  }): Promise<PaymentIntent> {
    try {
      // Find intent by reference
      const intents = await githubDB.find(collections.payment_intents, {
        external_reference: params.reference
      });

      if (intents.length === 0) {
        throw new Error('Payment intent not found for reference');
      }

      const intent = intents[0];

      // Update with gateway response
      const updates: Partial<PaymentIntent> = {
        gateway_reference: params.transaction_id,
        updated_at: new Date().toISOString()
      };

      // Determine status based on gateway response
      if (params.status === 'success' || params.status === 'completed') {
        updates.status = PaymentStatus.PENDING_REVIEW; // Manual verification required
        updates.completed_at = new Date().toISOString();
      } else if (params.status === 'cancelled' || params.status === 'failed') {
        updates.status = PaymentStatus.FAILED;
      } else {
        updates.status = PaymentStatus.PENDING_REVIEW; // Default for manual review
      }

      const updatedIntent = await githubDB.update(collections.payment_intents, intent.id, updates);

      // Create notification for user
      await githubDB.insert(collections.notifications, {
        user_id: intent.user_id,
        type: 'payment',
        title: 'Payment Update',
        message: `Your payment of ${intent.currency} ${intent.amount} for ${intent.item_name} is being processed.`,
        data: {
          payment_intent_id: intent.id,
          reference: params.reference,
          status: updates.status
        },
        priority: 'medium',
        is_read: false,
        created_at: new Date().toISOString()
      });

      await logger.info('payment_callback_processed', 'Payment callback processed', {
        intent_id: intent.id,
        reference: params.reference,
        status: updates.status,
        gateway_transaction_id: params.transaction_id
      }, intent.user_id);

      return updatedIntent;
    } catch (error) {
      await logger.error('payment_callback_failed', 'Payment callback processing failed', {
        reference: params.reference,
        error: error.message
      });
      throw error;
    }
  }

  // Update payment status (admin function)
  static async updatePaymentStatus(
    intentId: string, 
    status: PaymentStatus, 
    notes?: string,
    adminUserId?: string
  ): Promise<PaymentIntent> {
    try {
      const updates: Partial<PaymentIntent> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === PaymentStatus.COMPLETED) {
        updates.completed_at = new Date().toISOString();
      }

      const updatedIntent = await githubDB.update(collections.payment_intents, intentId, updates);

      // Log admin action
      await githubDB.insert(collections.audit_logs, {
        user_id: adminUserId || 'system',
        action: 'payment_status_updated',
        target: intentId,
        data: { new_status: status, notes },
        timestamp: new Date().toISOString()
      });

      // Notify user of status change
      if (status === PaymentStatus.COMPLETED || status === PaymentStatus.FAILED) {
        await githubDB.insert(collections.notifications, {
          user_id: updatedIntent.user_id,
          type: 'payment',
          title: status === PaymentStatus.COMPLETED ? 'Payment Confirmed' : 'Payment Failed',
          message: status === PaymentStatus.COMPLETED 
            ? `Your payment for ${updatedIntent.item_name} has been confirmed.`
            : `Your payment for ${updatedIntent.item_name} could not be processed. ${notes || ''}`,
          data: { payment_intent_id: intentId, status },
          priority: 'high',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      await logger.info('payment_status_updated', 'Payment status updated', {
        intent_id: intentId,
        old_status: updatedIntent.status,
        new_status: status,
        admin_user_id: adminUserId
      }, updatedIntent.user_id);

      return updatedIntent;
    } catch (error) {
      await logger.error('payment_status_update_failed', 'Payment status update failed', {
        intent_id: intentId,
        status,
        error: error.message
      });
      throw error;
    }
  }

  // Get payment intents for admin review
  static async getPaymentIntentsForReview(): Promise<PaymentIntent[]> {
    try {
      return await githubDB.find(collections.payment_intents, {
        status: PaymentStatus.PENDING_REVIEW
      });
    } catch (error) {
      await logger.error('get_payment_review_failed', 'Failed to get payment intents for review', {
        error: error.message
      });
      return [];
    }
  }

  // Get user payment history
  static async getUserPaymentHistory(userId: string): Promise<PaymentIntent[]> {
    try {
      const intents = await githubDB.find(collections.payment_intents, { user_id: userId });
      return intents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      await logger.error('get_payment_history_failed', 'Failed to get user payment history', {
        user_id: userId,
        error: error.message
      });
      return [];
    }
  }

  // Clean up expired payment intents
  static async cleanupExpiredIntents(): Promise<void> {
    try {
      const now = new Date();
      const expiredIntents = await githubDB.find(collections.payment_intents, {
        status: PaymentStatus.PENDING,
        expires_at: { $lt: now.toISOString() }
      });

      for (const intent of expiredIntents) {
        await this.updatePaymentStatus(intent.id, PaymentStatus.CANCELLED, 'Automatically cancelled due to expiry');
      }

      await logger.info('expired_intents_cleanup', 'Expired payment intents cleaned up', {
        cleaned_count: expiredIntents.length
      });
    } catch (error) {
      await logger.error('intent_cleanup_failed', 'Failed to cleanup expired intents', {
        error: error.message
      });
    }
  }
}