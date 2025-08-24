// Client-Only Payment System with Gateway Integration
import { githubDB, collections } from './database';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  description: string;
  customerId?: string;
  metadata: Record<string, any>;
  status: 'pending' | 'pending_review' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  gateway: 'paystack' | 'flutterwave' | 'stripe_checkout';
  gatewayReference?: string;
  gatewayResponse?: any;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
}

export interface PaymentReconciliation {
  id: string;
  paymentIntentId: string;
  gatewayReference: string;
  adminUserId: string;
  action: 'mark_completed' | 'mark_failed' | 'mark_refunded';
  evidence: {
    receiptUrl?: string;
    transactionId?: string;
    notes: string;
  };
  performedAt: string;
}

export class PaymentService {
  // Create payment intent
  static async createPaymentIntent(
    amount: number,
    currency: string,
    description: string,
    metadata: Record<string, any>,
    customerId?: string
  ): Promise<PaymentIntent> {
    const paymentIntent: PaymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency: currency.toUpperCase(),
      description,
      customerId,
      metadata,
      status: 'pending',
      gateway: 'paystack', // Default gateway
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.payments, paymentIntent);
    return paymentIntent;
  }

  // Initialize Paystack checkout
  static initializePaystackCheckout(
    paymentIntent: PaymentIntent,
    customerEmail: string,
    onSuccess: (reference: string) => void,
    onCancel: () => void
  ): void {
    // @ts-ignore - Paystack script loaded externally
    const handler = PaystackPop.setup({
      key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY,
      email: customerEmail,
      amount: paymentIntent.amount * 100, // Convert to kobo
      currency: paymentIntent.currency,
      ref: paymentIntent.id,
      metadata: {
        custom_fields: [
          {
            display_name: "Payment Intent ID",
            variable_name: "payment_intent_id",
            value: paymentIntent.id
          }
        ]
      },
      callback: function(response: any) {
        onSuccess(response.reference);
      },
      onClose: function() {
        onCancel();
      }
    });

    handler.openIframe();
  }

  // Initialize Flutterwave checkout
  static initializeFlutterwaveCheckout(
    paymentIntent: PaymentIntent,
    customerEmail: string,
    customerName: string,
    onSuccess: (reference: string) => void,
    onCancel: () => void
  ): void {
    // @ts-ignore - Flutterwave script loaded externally
    FlutterwaveCheckout({
      public_key: process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: customerEmail,
        name: customerName,
      },
      customizations: {
        title: "CareConnect Payment",
        description: paymentIntent.description,
        logo: "/logo.png",
      },
      callback: function (data: any) {
        if (data.status === "successful") {
          onSuccess(data.tx_ref);
        } else {
          onCancel();
        }
      },
      onclose: function() {
        onCancel();
      }
    });
  }

  // Handle payment callback (success)
  static async handlePaymentCallback(
    paymentIntentId: string,
    gatewayReference: string,
    gatewayResponse?: any
  ): Promise<PaymentIntent> {
    const paymentIntent = await githubDB.findById(collections.payments, paymentIntentId);
    if (!paymentIntent) throw new Error('Payment intent not found');

    const updatedIntent = {
      ...paymentIntent,
      status: 'pending_review' as const,
      gatewayReference,
      gatewayResponse,
      updatedAt: new Date().toISOString()
    };

    await githubDB.update(collections.payments, paymentIntentId, updatedIntent);

    // Create notification for admin review
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'admin',
      type: 'payment_review_required',
      title: 'Payment Requires Review',
      message: `Payment ${paymentIntentId} requires manual verification`,
      data: { paymentIntentId, gatewayReference },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'high'
    });

    return updatedIntent;
  }

  // Handle payment cancellation
  static async handlePaymentCancellation(paymentIntentId: string): Promise<PaymentIntent> {
    const paymentIntent = await githubDB.findById(collections.payments, paymentIntentId);
    if (!paymentIntent) throw new Error('Payment intent not found');

    const updatedIntent = {
      ...paymentIntent,
      status: 'cancelled' as const,
      updatedAt: new Date().toISOString()
    };

    await githubDB.update(collections.payments, paymentIntentId, updatedIntent);
    return updatedIntent;
  }

  // Admin: Reconcile payment
  static async reconcilePayment(
    paymentIntentId: string,
    action: PaymentReconciliation['action'],
    evidence: PaymentReconciliation['evidence'],
    adminUserId: string
  ): Promise<void> {
    const paymentIntent = await githubDB.findById(collections.payments, paymentIntentId);
    if (!paymentIntent) throw new Error('Payment intent not found');

    // Update payment status
    let newStatus: PaymentIntent['status'];
    let completedAt: string | undefined;

    switch (action) {
      case 'mark_completed':
        newStatus = 'completed';
        completedAt = new Date().toISOString();
        break;
      case 'mark_failed':
        newStatus = 'failed';
        break;
      case 'mark_refunded':
        newStatus = 'refunded';
        break;
      default:
        throw new Error('Invalid reconciliation action');
    }

    await githubDB.update(collections.payments, paymentIntentId, {
      status: newStatus,
      completedAt,
      updatedAt: new Date().toISOString()
    });

    // Create reconciliation record
    const reconciliation: PaymentReconciliation = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId,
      gatewayReference: paymentIntent.gatewayReference || '',
      adminUserId,
      action,
      evidence,
      performedAt: new Date().toISOString()
    };

    await githubDB.create(collections.audit_logs, {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'payment_reconciliation',
      entityType: 'payment',
      entityId: paymentIntentId,
      performedBy: adminUserId,
      performedAt: new Date().toISOString(),
      details: reconciliation,
      ipAddress: 'client-side'
    });

    // Notify customer
    if (paymentIntent.customerId) {
      await githubDB.create(collections.notifications, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: paymentIntent.customerId,
        type: 'payment_status_update',
        title: 'Payment Status Updated',
        message: `Your payment has been ${newStatus}`,
        data: { paymentIntentId, status: newStatus },
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'normal'
      });
    }
  }

  // Generate receipt (client-side)
  static generateReceipt(paymentIntent: PaymentIntent, customerDetails: any): string {
    const receiptDate = new Date(paymentIntent.completedAt || paymentIntent.createdAt);
    
    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Receipt - ${paymentIntent.id}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
        .receipt-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .amount { font-size: 24px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
        .details { margin-bottom: 20px; }
        .details th, .details td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">CareConnect</div>
        <h2>Payment Receipt</h2>
    </div>
    
    <div class="receipt-info">
        <strong>Receipt #:</strong> ${paymentIntent.id}<br>
        <strong>Date:</strong> ${receiptDate.toLocaleDateString()}<br>
        <strong>Status:</strong> ${paymentIntent.status.toUpperCase()}
    </div>
    
    <div class="amount">
        ${paymentIntent.currency} ${paymentIntent.amount.toFixed(2)}
    </div>
    
    <table class="details" width="100%">
        <tr><th>Description</th><td>${paymentIntent.description}</td></tr>
        <tr><th>Customer</th><td>${customerDetails.name || customerDetails.email}</td></tr>
        <tr><th>Payment Method</th><td>${paymentIntent.gateway}</td></tr>
        ${paymentIntent.gatewayReference ? `<tr><th>Reference</th><td>${paymentIntent.gatewayReference}</td></tr>` : ''}
    </table>
    
    <div class="footer">
        <p>Thank you for your payment!</p>
        <p>CareConnect Platform • support@careconnect.com</p>
    </div>
</body>
</html>`;

    return receiptHTML;
  }

  // Download receipt
  static downloadReceipt(paymentIntent: PaymentIntent, customerDetails: any): void {
    const receiptHTML = this.generateReceipt(paymentIntent, customerDetails);
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receipt-${paymentIntent.id}.html`;
    link.click();
  }

  // Get payments for reconciliation queue
  static async getPaymentsForReview(): Promise<PaymentIntent[]> {
    return await githubDB.findMany(collections.payments, {
      status: 'pending_review'
    });
  }

  // Get payment history for customer
  static async getCustomerPayments(customerId: string): Promise<PaymentIntent[]> {
    return await githubDB.findMany(collections.payments, {
      customerId
    });
  }
}

export default PaymentService;