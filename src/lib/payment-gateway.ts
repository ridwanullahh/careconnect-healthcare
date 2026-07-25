import { githubDB as db, collections } from './database';

export interface PaymentConfig {
  provider: 'paystack' | 'flutterwave';
  publicKey: string;
  currency?: string;
}

export interface PaymentIntent {
  id?: string;
  uid?: string;
  user_id: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  type: 'booking' | 'order' | 'donation' | 'course_enrollment' | 'subscription';
  linked_id: string;
  status: 'pending' | 'pending_review' | 'completed' | 'failed' | 'refunded';
  gateway_reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export class PaymentGatewayService {
  private static config: PaymentConfig | null = null;

  static configure(config: PaymentConfig): void {
    this.config = config;
  }

  static getConfig(): PaymentConfig {
    if (!this.config) {
      const key = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY) || '';
      this.config = {
        provider: 'paystack',
        publicKey: key,
        currency: 'NGN',
      };
    }
    return this.config;
  }

  static generateReference(type: string): string {
    return `CC-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  }

  static async createPaymentIntent(params: {
    userId: string;
    email: string;
    amount: number;
    type: PaymentIntent['type'];
    linkedId: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    const config = this.getConfig();
    const reference = this.generateReference(params.type);

    return db.insert(collections.payments, {
      user_id: params.userId,
      email: params.email,
      amount: params.amount,
      currency: config.currency || 'NGN',
      reference,
      type: params.type,
      linked_id: params.linkedId,
      status: 'pending',
      provider: config.provider,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    }) as Promise<PaymentIntent>;
  }

  static openPaystackCheckout(params: {
    email: string;
    amount: number;
    reference: string;
    onSuccess: (reference: string) => void;
    onClose: () => void;
  }): void {
    const config = this.getConfig();
    if (!config.publicKey) {
      console.error('Paystack public key not configured');
      params.onClose();
      return;
    }

    const handler = (window as any).PaystackPop;
    if (!handler) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        this.doPaystackCheckout(config.publicKey, params);
      };
      script.onerror = () => {
        console.error('Failed to load Paystack script');
        params.onClose();
      };
      document.head.appendChild(script);
      return;
    }

    this.doPaystackCheckout(config.publicKey, params);
  }

  private static doPaystackCheckout(publicKey: string, params: {
    email: string;
    amount: number;
    reference: string;
    onSuccess: (reference: string) => void;
    onClose: () => void;
  }): void {
    const handler = (window as any).PaystackPop;
    if (!handler) return;

    handler.setup({
      key: publicKey,
      email: params.email,
      amount: Math.round(params.amount * 100),
      ref: params.reference,
      onSuccess: (response: any) => params.onSuccess(response.reference),
      onClose: () => params.onClose(),
    });
  }

  static async handleCallback(reference: string): Promise<PaymentIntent> {
    const payments = await db.find(collections.payments, { reference }) as PaymentIntent[];
    const payment = payments[0];
    if (!payment) throw new Error('Payment not found');

    await db.update(collections.payments, payment.id!, {
      status: 'pending_review',
      gateway_reference: reference,
      callback_at: new Date().toISOString(),
    });

    await this.processPostPayment(payment, reference);

    return { ...payment, status: 'pending_review', gateway_reference: reference };
  }

  private static async processPostPayment(payment: PaymentIntent, gatewayRef: string): Promise<void> {
    switch (payment.type) {
      case 'order':
        try {
          await db.update(collections.orders, payment.linked_id, {
            status: 'pending_review',
            payment_reference: gatewayRef,
          });
        } catch {}
        break;

      case 'booking':
        try {
          await db.update(collections.bookings, payment.linked_id, {
            payment_status: 'pending_review',
            payment_reference: gatewayRef,
          });
        } catch {}
        break;

      case 'donation':
        try {
          await db.insert(collections.donations, {
            cause_id: payment.linked_id,
            user_id: payment.user_id,
            amount: payment.amount,
            currency: payment.currency,
            payment_reference: gatewayRef,
            status: 'pending_review',
            created_at: new Date().toISOString(),
          });
        } catch {}
        break;

      case 'course_enrollment':
        try {
          await db.insert(collections.course_enrollments, {
            course_id: payment.linked_id,
            user_id: payment.user_id,
            status: 'pending_review',
            payment_reference: gatewayRef,
            enrolled_at: new Date().toISOString(),
          });
        } catch {}
        break;
    }
  }

  static async adminReconcile(paymentId: string, action: 'complete' | 'fail' | 'refund', adminId: string, notes?: string): Promise<void> {
    const payment = await db.findById(collections.payments, paymentId) as any;
    if (!payment) throw new Error('Payment not found');

    const newStatus = action === 'complete' ? 'completed' : action === 'fail' ? 'failed' : 'refunded';

    await db.update(collections.payments, paymentId, {
      status: newStatus,
      reconciled_by: adminId,
      reconciled_at: new Date().toISOString(),
      reconciliation_notes: notes || '',
    });

    if (action === 'complete') {
      switch (payment.type) {
        case 'order':
          await db.update(collections.orders, payment.linked_id, { status: 'confirmed' }).catch(() => {});
          break;
        case 'booking':
          await db.update(collections.bookings, payment.linked_id, { payment_status: 'paid', status: 'confirmed' }).catch(() => {});
          break;
        case 'donation':
          const donations = await db.find(collections.donations, { payment_reference: payment.gateway_reference }) as any[];
          for (const d of donations) {
            await db.update(collections.donations, d.id, { status: 'completed' }).catch(() => {});
          }
          break;
        case 'course_enrollment':
          const enrollments = await db.find(collections.course_enrollments, {
            course_id: payment.linked_id,
            user_id: payment.user_id,
          }) as any[];
          for (const e of enrollments) {
            await db.update(collections.course_enrollments, e.id, { status: 'active' }).catch(() => {});
          }
          break;
      }
    }

    await db.insert(collections.audit_logs, {
      action: `payment_${action}`,
      entity_type: 'payment',
      entity_id: paymentId,
      user_id: adminId,
      details: `Payment ${action}: ref=${payment.reference}, amount=${payment.amount}`,
      created_at: new Date().toISOString(),
    });
  }

  static generateReceipt(payment: PaymentIntent, items?: any[]): string {
    const itemsHTML = items ? items.map(i =>
      `<tr><td>${i.name || i.product_name}</td><td>${i.quantity || 1}</td><td>${(i.price || i.unit_price || 0).toLocaleString()}</td></tr>`
    ).join('') : '';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt - ${payment.reference}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
  h1 { color: #0d9488; } table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; }
  .total { font-weight: bold; font-size: 18px; } .ref { color: #666; font-size: 12px; }
</style></head><body>
<h1>CareConnect Receipt</h1>
<p class="ref">Reference: ${payment.reference}</p>
<p>Date: ${new Date(payment.created_at).toLocaleDateString()}</p>
<p>Email: ${payment.email}</p>
${itemsHTML ? `<table><tr><th>Item</th><th>Qty</th><th>Amount</th></tr>${itemsHTML}</table>` : ''}
<p class="total">Total: ${payment.currency} ${payment.amount.toLocaleString()}</p>
<p>Status: ${payment.status}</p>
<hr><p style="font-size:11px;color:#999">This is a computer-generated receipt from CareConnect Healthcare Platform.</p>
</body></html>`;
  }

  static downloadReceipt(payment: PaymentIntent, items?: any[]): void {
    const html = this.generateReceipt(payment, items);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.reference}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default PaymentGatewayService;
