// Payment Webhook Handlers for Multiple Gateways
import { githubDB, collections } from './database';
import { logger } from './observability';
import { emailService, EmailType } from './email';
import { PaymentStatus } from './payments-enhanced';

export interface WebhookEvent {
  id: string;
  type: string;
  gateway: string;
  data: any;
  signature?: string;
  timestamp: string;
  processed: boolean;
  processed_at?: string;
  error?: string;
}

export class PaymentWebhookService {
  
  // Process incoming webhook
  static async processWebhook(
    gateway: string,
    eventType: string,
    eventData: any,
    signature?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Log webhook received
      const webhookEvent: Partial<WebhookEvent> = {
        type: eventType,
        gateway,
        data: eventData,
        signature,
        timestamp: new Date().toISOString(),
        processed: false
      };

      const savedEvent = await githubDB.insert(collections.webhook_events, webhookEvent);

      await logger.info('webhook_received', 'Payment webhook received', {
        webhook_id: savedEvent.id,
        gateway,
        event_type: eventType
      });

      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(gateway, eventData, signature);
      if (!isValid) {
        await this.markWebhookError(savedEvent.id, 'Invalid webhook signature');
        return { success: false, message: 'Invalid signature' };
      }

      // Process based on gateway
      let result;
      switch (gateway.toLowerCase()) {
        case 'stripe':
          result = await this.processStripeWebhook(eventType, eventData);
          break;
        case 'paystack':
          result = await this.processPaystackWebhook(eventType, eventData);
          break;
        case 'flutterwave':
          result = await this.processFlutterwaveWebhook(eventType, eventData);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      // Mark webhook as processed
      await githubDB.update(collections.webhook_events, savedEvent.id, {
        processed: true,
        processed_at: new Date().toISOString()
      });

      await logger.info('webhook_processed', 'Payment webhook processed successfully', {
        webhook_id: savedEvent.id,
        gateway,
        event_type: eventType,
        result
      });

      return { success: true, message: 'Webhook processed successfully' };

    } catch (error) {
      await logger.error('webhook_processing_failed', 'Payment webhook processing failed', {
        gateway,
        event_type: eventType,
        error: error.message
      });
      return { success: false, message: error.message };
    }
  }

  // Process Stripe webhooks
  private static async processStripeWebhook(eventType: string, eventData: any): Promise<any> {
    switch (eventType) {
      case 'checkout.session.completed':
        return await this.handlePaymentCompleted(eventData.metadata?.reference, 'stripe', eventData.id);
      
      case 'payment_intent.succeeded':
        return await this.handlePaymentSucceeded(eventData.metadata?.reference, 'stripe', eventData.id);
      
      case 'payment_intent.payment_failed':
        return await this.handlePaymentFailed(eventData.metadata?.reference, 'stripe', eventData.id);
      
      case 'charge.dispute.created':
        return await this.handleChargeback(eventData.metadata?.reference, 'stripe', eventData.id);
      
      default:
        await logger.info('unhandled_stripe_webhook', 'Unhandled Stripe webhook event', {
          event_type: eventType
        });
        return { message: 'Event type not handled' };
    }
  }

  // Process Paystack webhooks
  private static async processPaystackWebhook(eventType: string, eventData: any): Promise<any> {
    switch (eventType) {
      case 'charge.success':
        return await this.handlePaymentCompleted(eventData.data?.reference, 'paystack', eventData.data?.id);
      
      case 'charge.failed':
        return await this.handlePaymentFailed(eventData.data?.reference, 'paystack', eventData.data?.id);
      
      default:
        await logger.info('unhandled_paystack_webhook', 'Unhandled Paystack webhook event', {
          event_type: eventType
        });
        return { message: 'Event type not handled' };
    }
  }

  // Process Flutterwave webhooks
  private static async processFlutterwaveWebhook(eventType: string, eventData: any): Promise<any> {
    switch (eventType) {
      case 'charge.completed':
        return await this.handlePaymentCompleted(eventData.data?.tx_ref, 'flutterwave', eventData.data?.id);
      
      case 'charge.failed':
        return await this.handlePaymentFailed(eventData.data?.tx_ref, 'flutterwave', eventData.data?.id);
      
      default:
        await logger.info('unhandled_flutterwave_webhook', 'Unhandled Flutterwave webhook event', {
          event_type: eventType
        });
        return { message: 'Event type not handled' };
    }
  }

  // Handle successful payment
  private static async handlePaymentCompleted(
    reference: string,
    gateway: string,
    transactionId: string
  ): Promise<any> {
    try {
      // Find payment intent by reference
      const paymentIntents = await githubDB.find(collections.payment_intents, {
        external_reference: reference
      });

      if (paymentIntents.length === 0) {
        throw new Error(`Payment intent not found for reference: ${reference}`);
      }

      const intent = paymentIntents[0];

      // Update payment intent
      await githubDB.update(collections.payment_intents, intent.id, {
        status: PaymentStatus.COMPLETED,
        gateway_payment_id: transactionId,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Update related record based on item type
      await this.updateRelatedRecord(intent, PaymentStatus.COMPLETED);

      // Send receipt email
      await this.sendPaymentReceipt(intent);

      await logger.info('payment_completed', 'Payment completed successfully', {
        intent_id: intent.id,
        reference,
        gateway,
        transaction_id: transactionId,
        amount: intent.amount
      });

      return { intent_id: intent.id, status: 'completed' };

    } catch (error) {
      await logger.error('payment_completion_failed', 'Payment completion handling failed', {
        reference,
        gateway,
        transaction_id: transactionId,
        error: error.message
      });
      throw error;
    }
  }

  // Handle failed payment
  private static async handlePaymentFailed(
    reference: string,
    gateway: string,
    transactionId: string
  ): Promise<any> {
    try {
      const paymentIntents = await githubDB.find(collections.payment_intents, {
        external_reference: reference
      });

      if (paymentIntents.length === 0) {
        throw new Error(`Payment intent not found for reference: ${reference}`);
      }

      const intent = paymentIntents[0];

      // Update payment intent
      await githubDB.update(collections.payment_intents, intent.id, {
        status: PaymentStatus.FAILED,
        gateway_payment_id: transactionId,
        updated_at: new Date().toISOString()
      });

      // Update related record
      await this.updateRelatedRecord(intent, PaymentStatus.FAILED);

      // Send failure notification
      await this.sendPaymentFailureNotification(intent);

      await logger.info('payment_failed', 'Payment failed', {
        intent_id: intent.id,
        reference,
        gateway,
        transaction_id: transactionId
      });

      return { intent_id: intent.id, status: 'failed' };

    } catch (error) {
      await logger.error('payment_failure_handling_failed', 'Payment failure handling failed', {
        reference,
        gateway,
        transaction_id: transactionId,
        error: error.message
      });
      throw error;
    }
  }

  // Handle chargeback
  private static async handleChargeback(
    reference: string,
    gateway: string,
    disputeId: string
  ): Promise<any> {
    try {
      // Create chargeback record
      await githubDB.insert(collections.chargebacks, {
        reference,
        gateway,
        dispute_id: disputeId,
        status: 'open',
        created_at: new Date().toISOString()
      });

      // Notify admin team
      await this.notifyChargebackTeam(reference, gateway, disputeId);

      await logger.info('chargeback_received', 'Chargeback received', {
        reference,
        gateway,
        dispute_id: disputeId
      });

      return { reference, status: 'chargeback_logged' };

    } catch (error) {
      await logger.error('chargeback_handling_failed', 'Chargeback handling failed', {
        reference,
        gateway,
        dispute_id: disputeId,
        error: error.message
      });
      throw error;
    }
  }

  // Update related records based on payment intent type
  private static async updateRelatedRecord(intent: any, status: PaymentStatus): Promise<void> {
    try {
      switch (intent.item_type) {
        case 'booking':
          await this.updateBookingPayment(intent.item_id, status);
          break;
        case 'product':
          await this.updateOrderPayment(intent.item_id, status);
          break;
        case 'course':
          await this.updateCourseEnrollment(intent.item_id, status);
          break;
        case 'donation':
          await this.updateDonationStatus(intent.item_id, status);
          break;
        default:
          await logger.warn('unknown_item_type', 'Unknown item type for payment update', {
            intent_id: intent.id,
            item_type: intent.item_type
          });
      }
    } catch (error) {
      await logger.error('related_record_update_failed', 'Failed to update related record', {
        intent_id: intent.id,
        item_type: intent.item_type,
        item_id: intent.item_id,
        error: error.message
      });
    }
  }

  // Update booking payment status
  private static async updateBookingPayment(bookingId: string, status: PaymentStatus): Promise<void> {
    const paymentStatus = status === PaymentStatus.COMPLETED ? 'paid' : 'failed';
    const bookingStatus = status === PaymentStatus.COMPLETED ? 'confirmed' : 'pending';

    await githubDB.update(collections.bookings, bookingId, {
      payment_status: paymentStatus,
      status: bookingStatus,
      updated_at: new Date().toISOString()
    });

    if (status === PaymentStatus.COMPLETED) {
      // Import booking service to confirm booking
      const { CompleteBookingService } = await import('./booking-complete');
      await CompleteBookingService.confirmBooking(bookingId);
    }
  }

  // Update order payment status
  private static async updateOrderPayment(orderId: string, status: PaymentStatus): Promise<void> {
    const paymentStatus = status === PaymentStatus.COMPLETED ? 'paid' : 'failed';
    const orderStatus = status === PaymentStatus.COMPLETED ? 'confirmed' : 'pending';

    const updatedOrder = await githubDB.update(collections.orders, orderId, {
      payment_status: paymentStatus,
      status: orderStatus,
      updated_at: new Date().toISOString()
    });

    if (status === PaymentStatus.COMPLETED) {
      // Import shop service to send confirmation
      const { EnhancedShopService } = await import('./shop-enhanced');
      await EnhancedShopService.sendOrderConfirmation(updatedOrder);
    }
  }

  // Update course enrollment
  private static async updateCourseEnrollment(enrollmentId: string, status: PaymentStatus): Promise<void> {
    const enrollmentStatus = status === PaymentStatus.COMPLETED ? 'active' : 'pending';

    await githubDB.update(collections.course_enrollments, enrollmentId, {
      status: enrollmentStatus,
      enrolled_at: status === PaymentStatus.COMPLETED ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    });
  }

  // Update donation status
  private static async updateDonationStatus(donationId: string, status: PaymentStatus): Promise<void> {
    const donationStatus = status === PaymentStatus.COMPLETED ? 'completed' : 'failed';

    await githubDB.update(collections.donations, donationId, {
      status: donationStatus,
      completed_at: status === PaymentStatus.COMPLETED ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    });
  }

  // Send payment receipt
  private static async sendPaymentReceipt(intent: any): Promise<void> {
    try {
      const user = await githubDB.findById(collections.users, intent.user_id);
      if (!user) return;

      await emailService.sendEmail(user.email, EmailType.PAYMENT_NOTICE, {
        user: {
          email: user.email,
          name: intent.metadata.customer_name
        },
        payment: {
          amount: intent.amount,
          currency: intent.currency,
          item_name: intent.item_name,
          transaction_id: intent.gateway_payment_id,
          receipt_link: `${window.location.origin}/receipts/${intent.id}`
        }
      });

    } catch (error) {
      await logger.error('receipt_email_failed', 'Receipt email failed', {
        intent_id: intent.id,
        error: error.message
      });
    }
  }

  // Send payment failure notification
  private static async sendPaymentFailureNotification(intent: any): Promise<void> {
    try {
      const user = await githubDB.findById(collections.users, intent.user_id);
      if (!user) return;

      await githubDB.insert(collections.notifications, {
        user_id: intent.user_id,
        type: 'payment',
        title: 'Payment Failed',
        message: `Your payment for ${intent.item_name} could not be processed. Please try again.`,
        data: {
          payment_intent_id: intent.id,
          item_name: intent.item_name,
          amount: intent.amount
        },
        priority: 'high',
        is_read: false,
        created_at: new Date().toISOString()
      });

    } catch (error) {
      await logger.error('payment_failure_notification_failed', 'Payment failure notification failed', {
        intent_id: intent.id,
        error: error.message
      });
    }
  }

  // Notify chargeback team
  private static async notifyChargebackTeam(
    reference: string,
    gateway: string,
    disputeId: string
  ): Promise<void> {
    try {
      // Find admin users
      const adminUsers = await githubDB.find(collections.users, {
        user_type: { $in: ['super_admin', 'billing_clerk'] }
      });

      for (const admin of adminUsers) {
        await githubDB.insert(collections.notifications, {
          user_id: admin.id,
          type: 'chargeback',
          title: 'Chargeback Alert',
          message: `Chargeback received for payment reference ${reference}`,
          data: {
            reference,
            gateway,
            dispute_id: disputeId
          },
          priority: 'high',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

    } catch (error) {
      await logger.error('chargeback_notification_failed', 'Chargeback notification failed', {
        reference,
        error: error.message
      });
    }
  }

  // Verify webhook signature (simplified - implement gateway-specific verification)
  private static async verifyWebhookSignature(
    gateway: string,
    eventData: any,
    signature?: string
  ): Promise<boolean> {
    // In production, implement proper signature verification for each gateway
    // For now, return true for demo purposes
    return true;
  }

  // Mark webhook with error
  private static async markWebhookError(webhookId: string, error: string): Promise<void> {
    await githubDB.update(collections.webhook_events, webhookId, {
      processed: true,
      processed_at: new Date().toISOString(),
      error
    });
  }

  // Get webhook processing statistics
  static async getWebhookStats(startDate?: string, endDate?: string): Promise<any> {
    try {
      const query: any = {};
      
      if (startDate && endDate) {
        query.timestamp = {
          $gte: startDate,
          $lte: endDate
        };
      }

      const webhooks = await githubDB.find(collections.webhook_events, query);
      
      const stats = {
        total: webhooks.length,
        processed: webhooks.filter(w => w.processed).length,
        failed: webhooks.filter(w => w.error).length,
        by_gateway: {} as any,
        by_event_type: {} as any
      };

      webhooks.forEach(webhook => {
        // Count by gateway
        if (!stats.by_gateway[webhook.gateway]) {
          stats.by_gateway[webhook.gateway] = 0;
        }
        stats.by_gateway[webhook.gateway]++;

        // Count by event type
        if (!stats.by_event_type[webhook.type]) {
          stats.by_event_type[webhook.type] = 0;
        }
        stats.by_event_type[webhook.type]++;
      });

      return stats;

    } catch (error) {
      await logger.error('webhook_stats_failed', 'Failed to get webhook stats', {
        error: error.message
      });
      return {
        total: 0,
        processed: 0,
        failed: 0,
        by_gateway: {},
        by_event_type: {}
      };
    }
  }
}