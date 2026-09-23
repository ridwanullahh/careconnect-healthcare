// Bismillah Ar-Rahman Ar-Raheem.
// Backend payment service — Paystack & Flutterwave integration.
// SECRET keys stay server-side; only PUBLIC keys are returned to the client.
import crypto from 'node:crypto';
import type { StorageAdapter } from '@careconnect/db';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY || '';
const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLUTTERWAVE_PUBLIC = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
const FLUTTERWAVE_ENCRYPTION = process.env.FLUTTERWAVE_ENCRYPTION_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';
const FLW_BASE = 'https://api.flutterwave.com/v3';

// BismiLLAH (2026-09-23): BirrPay — INLINE checkout gateway (added alongside
// Paystack/Flutterwave, not replacing them). The merchant API is driven with
// the app secret key; the browser receives only the one-time client_token +
// publishable key and opens BirrPay's INLINE iframe widget (embed/birrpay.js).
// CareConnect NEVER redirects users to BirrPay's hosted checkout page.
const BIRRPAY_BASE = (process.env.BIRRPAY_BASE_URL || 'https://birrpay-10133349281.development.catalystappsail.com').replace(/\/$/, '');
const BIRRPAY_SECRET = process.env.BIRRPAY_SECRET_KEY || '';
const BIRRPAY_PUBLIC = process.env.BIRRPAY_PUBLIC_KEY || '';
const BIRRPAY_WEBHOOK_SECRET = process.env.BIRRPAY_WEBHOOK_SECRET || '';

export interface PaymentIntentRecord {
  id: string;
  amount: number;
  currency: string;
  description: string;
  customerId?: string;
  customerEmail?: string;
  metadata: Record<string, any>;
  status: 'pending' | 'pending_review' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  gateway: 'paystack' | 'flutterwave' | 'birrpay';
  gatewayReference?: string;
  gatewayResponse?: any;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
}

/** Create a payment intent record in the DB. */
export async function createPaymentIntent(
  db: StorageAdapter,
  opts: {
    amount: number;
    currency: string;
    description: string;
    customerId?: string;
    customerEmail: string;
    metadata?: Record<string, any>;
    gateway?: 'paystack' | 'flutterwave' | 'birrpay';
  },
): Promise<PaymentIntentRecord> {
  const intent: PaymentIntentRecord = {
    id: genId('pi'),
    amount: opts.amount,
    currency: (opts.currency || 'NGN').toUpperCase(),
    description: opts.description,
    customerId: opts.customerId,
    customerEmail: opts.customerEmail,
    metadata: opts.metadata || {},
    status: 'pending',
    gateway: opts.gateway || 'paystack',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.insert('payments', intent);
  return intent;
}

/**
 * Initialize a Paystack transaction server-side.
 * Returns the authorization URL the client should redirect to, plus the
 * public key (safe for browser) if the client prefers the inline popup.
 */
export async function initiatePaystack(
  db: StorageAdapter,
  intent: PaymentIntentRecord,
): Promise<{ authorization_url: string; reference: string; access_code: string; public_key: string }> {
  if (!PAYSTACK_SECRET) {
    throw new Error('Paystack is not configured (PAYSTACK_SECRET_KEY missing).');
  }
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: intent.customerEmail,
      amount: Math.round(intent.amount * 100), // kobo
      currency: intent.currency,
      reference: intent.id,
      metadata: { ...intent.metadata, payment_intent_id: intent.id },
      callback_url: `${process.env.PAYMENT_CALLBACK_URL || ''}/payment/callback`,
    }),
  });
  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || 'Paystack initialization failed');
  }
  await db.update('payments', intent.id, {
    gatewayReference: intent.id,
    updatedAt: new Date().toISOString(),
  });
  return {
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
    access_code: data.data.access_code,
    public_key: PAYSTACK_PUBLIC,
  };
}

/**
 * Verify a Paystack transaction by reference using the SECRET key (server-side).
 * This is the ONLY source of truth for payment success — never trust the client.
 */
export async function verifyPaystack(
  db: StorageAdapter,
  reference: string,
): Promise<PaymentIntentRecord> {
  if (!PAYSTACK_SECRET) throw new Error('Paystack is not configured.');
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || 'Paystack verification failed');
  }
  const tx = data.data;
  const intentId = (tx.metadata && tx.metadata.payment_intent_id) || reference;
  const intent = (await db.findById('payments', intentId)) as PaymentIntentRecord | null;
  if (!intent) throw new Error('Payment intent not found');

  const status: PaymentIntentRecord['status'] =
    tx.status === 'success' ? 'completed' : tx.status === 'failed' ? 'failed' : 'pending_review';

  const updated: Partial<PaymentIntentRecord> = {
    status,
    gatewayReference: tx.reference,
    gatewayResponse: { amount: tx.amount, currency: tx.currency, channel: tx.channel, fees: tx.fees, customer: tx.customer },
    updatedAt: new Date().toISOString(),
  };
  if (status === 'completed') updated.completedAt = new Date().toISOString();
  if (status === 'failed') updated.failedAt = new Date().toISOString();

  await db.update('payments', intentId, updated);
  return { ...intent, ...updated } as PaymentIntentRecord;
}

/** Verify Paystack webhook signature (HMAC-SHA512). */
export function verifyPaystackWebhook(signature: string, payload: string): boolean {
  if (!PAYSTACK_SECRET) return false;
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Initialize a Flutterwave transaction server-side.
 */
export async function initiateFlutterwave(
  db: StorageAdapter,
  intent: PaymentIntentRecord,
  customerName?: string,
): Promise<{ link: string; tx_ref: string; public_key: string }> {
  if (!FLUTTERWAVE_SECRET) {
    throw new Error('Flutterwave is not configured (FLUTTERWAVE_SECRET_KEY missing).');
  }
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      customer: { email: intent.customerEmail, name: customerName || '' },
      payment_options: 'card,mobilemoney,ussd',
      customizations: { title: 'CareConnect Payment', description: intent.description },
      redirect_url: `${process.env.PAYMENT_CALLBACK_URL || ''}/payment/callback`,
    }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Flutterwave initialization failed');
  }
  await db.update('payments', intent.id, {
    gatewayReference: intent.id,
    updatedAt: new Date().toISOString(),
  });
  return { link: data.data.link, tx_ref: intent.id, public_key: FLUTTERWAVE_PUBLIC };
}

/** Verify a Flutterwave transaction. */
export async function verifyFlutterwave(
  db: StorageAdapter,
  txRef: string,
): Promise<PaymentIntentRecord> {
  if (!FLUTTERWAVE_SECRET) throw new Error('Flutterwave is not configured.');
  const res = await fetch(`${FLW_BASE}/transactions/${encodeURIComponent(txRef)}/verify`, {
    headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` },
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Flutterwave verification failed');
  }
  const tx = data.data;
  const intentId = tx.tx_ref || txRef;
  const intent = (await db.findById('payments', intentId)) as PaymentIntentRecord | null;
  if (!intent) throw new Error('Payment intent not found');

  const status: PaymentIntentRecord['status'] =
    tx.status === 'successful' ? 'completed' : tx.status === 'failed' ? 'failed' : 'pending_review';

  const updated: Partial<PaymentIntentRecord> = {
    status,
    gatewayReference: tx.flw_ref || txRef,
    gatewayResponse: { amount: tx.amount, currency: tx.currency, app_fee: tx.app_fee, customer: tx.customer },
    updatedAt: new Date().toISOString(),
  };
  if (status === 'completed') updated.completedAt = new Date().toISOString();
  if (status === 'failed') updated.failedAt = new Date().toISOString();

  await db.update('payments', intentId, updated);
  return { ...intent, ...updated } as PaymentIntentRecord;
}

/** Verify Flutterwave webhook signature (SHA256 of secret + payload). */
export function verifyFlutterwaveWebhook(signature: string, payload: string): boolean {
  if (!FLUTTERWAVE_SECRET) return false;
  const expected = crypto.createHash('sha256').update(FLUTTERWAVE_SECRET + payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Refund a payment (Paystack). */
export async function refundPaystack(
  db: StorageAdapter,
  intentId: string,
  amount?: number,
): Promise<PaymentIntentRecord> {
  if (!PAYSTACK_SECRET) throw new Error('Paystack is not configured.');
  const intent = (await db.findById('payments', intentId)) as PaymentIntentRecord | null;
  if (!intent) throw new Error('Payment intent not found');
  if (!intent.gatewayReference) throw new Error('No gateway reference to refund');
  const res = await fetch(`${PAYSTACK_BASE}/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: intent.gatewayReference, amount: amount ? Math.round(amount * 100) : undefined }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Refund failed');
  await db.update('payments', intentId, {
    status: 'refunded',
    updatedAt: new Date().toISOString(),
  });
  return { ...intent, status: 'refunded' };
}

/** Whether any payment gateway is configured. */
// ---------------------------------------------------------------------------
// BirrPay (inline checkout)
// ---------------------------------------------------------------------------

async function birrpayFetch(path: string, init?: { method?: string; body?: unknown }): Promise<any> {
  if (!BIRRPAY_SECRET) throw new Error('BirrPay is not configured (BIRRPAY_SECRET_KEY missing).');
  const res = await fetch(`${BIRRPAY_BASE}${path}`, {
    method: init?.method || 'GET',
    headers: {
      Authorization: `Bearer ${BIRRPAY_SECRET}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(`BirrPay error ${res.status}: ${json?.error?.message || 'request failed'}`);
  }
  return json?.data !== undefined ? json.data : json;
}

/**
 * Create a BirrPay checkout session for the intent and return the INLINE
 * widget parameters (client_token + public_key + sdk_url). No hosted redirect.
 */
export async function initiateBirrPay(
  db: StorageAdapter,
  intent: PaymentIntentRecord,
  customerName?: string,
): Promise<{ clientToken: string; publicKey: string; sdkUrl: string; reference: string }> {
  const amountMinor = Math.round(Number(intent.amount) * 100);
  const session = await birrpayFetch('/api/v1/checkout/sessions', {
    method: 'POST',
    body: {
      amount: amountMinor,
      currency: intent.currency,
      customer: { email: intent.customerEmail, name: customerName || undefined },
      reference: intent.id,
      metadata: { ...(intent.metadata || {}), payment_intent_id: intent.id, description: intent.description },
      callback_url: `${process.env.PAYMENT_CALLBACK_URL || ''}/payment/callback`,
    },
  });
  await db.update('payments', intent.id, {
    gatewayReference: session.reference,
    updatedAt: new Date().toISOString(),
  });
  return {
    clientToken: session.client_token,
    publicKey: BIRRPAY_PUBLIC,
    sdkUrl: `${BIRRPAY_BASE}/embed/birrpay.js`,
    reference: session.reference,
  };
}

/** Authoritative BirrPay verification by BirrPay reference (bp_…) or merchant reference. */
export async function verifyBirrPay(db: StorageAdapter, reference: string): Promise<PaymentIntentRecord> {
  const tx = await birrpayFetch(`/api/v1/transactions/${encodeURIComponent(reference)}`);
  const t = tx?.transaction || tx;
  // The intent id travels as the merchant reference (BirrPay echoes it).
  const intentId = t.merchant_reference || reference;
  const intent = await db.findById('payments', intentId) as PaymentIntentRecord | null;
  if (!intent) throw new Error(`Payment intent ${intentId} not found`);
  const updates: Partial<PaymentIntentRecord> = {
    gatewayResponse: t,
    updatedAt: new Date().toISOString(),
  };
  if (String(t.status).toLowerCase() === 'succeeded') {
    updates.status = 'completed';
    updates.completedAt = t.paid_at || new Date().toISOString();
  } else if (['failed', 'cancelled', 'expired'].includes(String(t.status).toLowerCase())) {
    updates.status = 'failed';
    updates.failedAt = new Date().toISOString();
  }
  const updated = await db.update('payments', intentId, updates) as PaymentIntentRecord;
  return updated;
}

/** Verify BirrPay webhook HMAC signature: t=…,v1=… over "<t>.<rawBody>". */
export function verifyBirrPayWebhook(signature: string | null, payload: string): boolean {
  if (!signature || !BIRRPAY_WEBHOOK_SECRET) return false;
  const parts = signature.split(',').map((p) => p.trim().split('='));
  const t = parts.find((p) => p[0] === 't')?.[1];
  const v1 = parts.find((p) => p[0] === 'v1')?.[1];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false; // replay guard
  const expected = crypto.createHmac('sha256', BIRRPAY_WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isPaymentConfigured(): { paystack: boolean; flutterwave: boolean; birrpay: boolean } {
  return {
    paystack: !!PAYSTACK_SECRET,
    flutterwave: !!FLUTTERWAVE_SECRET,
  };
}

export { FLUTTERWAVE_ENCRYPTION };
