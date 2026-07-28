// Bismillah Ar-Rahman Ar-Raheem.
// CareConnect backend API — single catch-all route.
// Storage-agnostic: uses the factory (Lightbase primary / SQLite fallback).
import type { APIRoute } from 'astro';
import { getStorage, getProviderName } from '@careconnect/db';
import crypto from 'node:crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000;
const SEED_KEY = process.env.SEED_KEY || 'cc_seed_dev_key_change_in_production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Collections that may be read without authentication (public-facing content).
// All other collections require an authenticated session. PHI collections
// (patients, encounters, vitals, etc.) are never public.
const PUBLIC_READ_COLLECTIONS = new Set<string>([
  'entities',
  'entity_services',
  'entity_specialties',
  'entity_locations',
  'specialties',
  'insurance_providers',
  'languages',
  'services',
  'news_articles',
  'news_sources',
  'blog_posts',
  'podcasts',
  'podcast_series',
  'podcast_episodes',
  'weekly_tips',
  'timeless_facts',
  'courses',
  'course_modules',
  'course_lessons',
  'causes',
  'job_postings',
  'job_categories',
  'products',
  'forum_categories',
  'forum_questions',
  'forum_answers',
  'forum_posts',
  'forum_replies',
  'health_tools',
  'tool_versions',
  'reviews',
  'ratings',
  'feature_flags',
  'system_settings',
  'verification_queue',
]);

// Fields stripped from every response to avoid leaking secrets/PII.
const SANITIZE_FIELDS = new Set<string>([
  'password_hash',
  'encrypted_pin',
  'access_token',
  'encrypted_value',
  'data_base64',
]);

interface Session {
  userId: string;
  email: string;
  roles: string[];
  exp: number;
}

function createToken(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): Session | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (Date.now() > session.exp) return null;
    return session;
  } catch {
    return null;
  }
}

function getSession(request: Request): Session | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return verifyToken(auth.slice(7));
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/session=([^;]+)/);
    if (match) return verifyToken(match[1]);
  }
  return null;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    if (hash.length !== Buffer.from(hashHex, 'hex').length) return false;
    return crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), hash);
  } catch {
    return false;
  }
}

function sanitizeRecord(record: any): any {
  if (!record || typeof record !== 'object') return record;
  const out: any = { ...record };
  for (const f of SANITIZE_FIELDS) delete out[f];
  return out;
}

function sanitizeRecords(records: any[]): any[] {
  return records.map(sanitizeRecord);
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function parsePath(url: URL): string[] {
  return url.pathname.replace('/api/', '').split('/').filter(Boolean);
}

function getDefaultPermissions(userType: string): string[] {
  const perms: Record<string, string[]> = {
    super_admin: ['*'],
    health_center: ['create_entity', 'update_entity', 'create_content', 'update_content', 'view_payments'],
    pharmacy: ['create_entity', 'update_entity', 'create_content', 'update_content', 'view_payments'],
    practitioner: ['create_entity', 'update_entity', 'create_content', 'update_content', 'view_payments'],
    hospital_admin: ['manage_patients', 'view_patient_data', 'create_encounters', 'manage_encounters', 'manage_care_plans', 'manage_referrals', 'manage_beds', 'process_billing', 'manage_insurance_claims', 'obtain_consents', 'manage_access_grants', 'view_analytics'],
    physician: ['manage_patients', 'view_patient_data', 'create_encounters', 'manage_encounters', 'record_vitals', 'manage_conditions', 'prescribe_medications', 'order_labs', 'view_lab_results', 'order_imaging', 'view_imaging_results', 'manage_care_plans', 'create_referrals', 'obtain_consents'],
    nurse: ['view_patient_data', 'manage_encounters', 'record_vitals', 'manage_conditions', 'manage_care_plans', 'obtain_consents'],
    pharmacist: ['view_patient_data', 'dispense_medications', 'manage_pharmacy_inventory'],
    lab_tech: ['view_patient_data', 'view_lab_results', 'order_labs'],
    imaging_tech: ['view_patient_data', 'view_imaging_results', 'order_imaging'],
    billing_clerk: ['view_patient_data', 'process_billing', 'manage_insurance_claims', 'view_payments'],
    patient: ['view_patient_data', 'manage_access_grants'],
    public_user: [],
  };
  return perms[userType] || [];
}

export const prerender = false;

export const OPTIONS: APIRoute = () =>
  json({ ok: true });

export const ALL: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const segments = parsePath(url);
  const method = request.method;
  const session = getSession(request);
  const db = await getStorage();

  try {
    // --- HEALTH CHECK ---
    if (segments[0] === 'health' || segments.length === 0) {
      const provider = getProviderName();
      let storageOk = true;
      if (provider === 'lightbase') {
        try {
          const store = await getStorage();
          // LightbaseStorageAdapter exposes ping()
          if (typeof (store as any).ping === 'function') {
            const r = await (store as any).ping();
            storageOk = r.ok;
          }
        } catch {
          storageOk = false;
        }
      }
      return json({
        status: storageOk ? 'ok' : 'degraded',
        database: provider,
        timestamp: new Date().toISOString(),
      });
    }

    // --- AUTH ROUTES ---
    if (segments[0] === 'auth') {
      if (segments[1] === 'register' && method === 'POST') {
        const body = await request.json();
        if (!body.email || !body.password || !body.user_type) {
          return error('email, password and user_type are required', 422);
        }
        const existing = await db.find('users', { email: body.email });
        if (existing.length > 0) return error('User already exists', 409);

        const password_hash = await hashPassword(body.password);
        let entityId: string | null = null;

        if (['health_center', 'pharmacy', 'practitioner'].includes(body.user_type)) {
          const entity = await db.insert('entities', {
            name: body.entity_name || body.first_name || body.email,
            entity_type: body.user_type,
            description: body.entity_description || '',
            address: body.entity_address || '',
            phone: body.entity_phone || '',
            email: body.email,
            verification_status: 'pending',
            is_active: true,
            services: [],
            specialties: body.specialties || [],
            rating: 0,
            review_count: 0,
            badges: [],
            is_featured: false,
            created_at: new Date().toISOString(),
          });
          entityId = entity.id;
        }

        const user = await db.insert('users', {
          email: body.email,
          phone: body.phone || '',
          user_type: body.user_type,
          password_hash,
          is_verified: false,
          is_active: true,
          entity_id: entityId,
          permissions: getDefaultPermissions(body.user_type),
          created_at: new Date().toISOString(),
        });

        const profile = await db.insert('profiles', {
          user_id: user.id,
          first_name: body.first_name || '',
          last_name: body.last_name || '',
          bio: body.bio || '',
          specialties: body.specialties || [],
          languages: body.languages || ['English'],
          license_number: body.license_number || '',
          preferences: { notifications: true, marketing_emails: false, data_sharing: false },
          created_at: new Date().toISOString(),
        });

        await db.insert('audit_logs', {
          action: 'user_registered',
          entity_type: 'user',
          entity_id: user.id,
          user_email: body.email,
          details: `New user registered: ${body.email}`,
          created_at: new Date().toISOString(),
        });

        const token = createToken({
          userId: user.id,
          email: user.email,
          roles: [user.user_type],
          exp: Date.now() + SESSION_EXPIRY,
        });

        return json(
          {
            user: sanitizeRecord(user),
            profile,
            token,
          },
          201,
        );
      }

      if (segments[1] === 'login' && method === 'POST') {
        const body = await request.json();
        if (!body.email || !body.password) return error('email and password are required', 422);
        const users = await db.find('users', { email: body.email });
        const user = users[0];
        if (!user) return error('Invalid credentials', 401);
        if (!user.is_active) return error('Account is deactivated', 403);

        const valid = await verifyPassword(body.password, user.password_hash);
        if (!valid) return error('Invalid credentials', 401);

        await db.update('users', user.id, { last_login: new Date().toISOString() });

        const profiles = await db.find('profiles', { user_id: user.id });
        const profile = profiles[0];

        const token = createToken({
          userId: user.id,
          email: user.email,
          roles: [user.user_type],
          exp: Date.now() + SESSION_EXPIRY,
        });

        await db.insert('audit_logs', {
          action: 'user_login',
          entity_type: 'user',
          entity_id: user.id,
          user_email: user.email,
          details: `User logged in: ${user.email}`,
          created_at: new Date().toISOString(),
        });

        return json({
          user: sanitizeRecord(user),
          profile,
          token,
        });
      }

      if (segments[1] === 'me' && method === 'GET') {
        if (!session) return error('Unauthorized', 401);
        const user = await db.findById('users', session.userId);
        if (!user) return error('User not found', 404);
        const profiles = await db.find('profiles', { user_id: session.userId });
        return json({ user: sanitizeRecord(user), profile: profiles[0] || null });
      }

      if (segments[1] === 'logout' && method === 'POST') {
        return json({ success: true });
      }
    }

    // --- MFA / TOTP ---
    if (segments[0] === 'mfa') {
      const mfa = await import('../../services/mfa.ts');
      if (segments[1] === 'status' && method === 'GET') {
        if (!session) return error('Unauthorized', 401);
        const enabled = await mfa.isMFAEnabled(db, session.userId);
        return json({ data: { enabled } });
      }
      if (segments[1] === 'setup' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const user = (await db.findById('users', session.userId)) as any;
        if (!user) return error('User not found', 404);
        const { secret, uri } = await mfa.enableMFA(db, session.userId, user.email || session.userId);
        return json({ data: { secret, uri } });
      }
      if (segments[1] === 'confirm' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        if (!body.token) return error('token required', 422);
        const ok = await mfa.confirmMFA(db, session.userId, body.token);
        if (!ok) return error('Invalid TOTP code. Please try again.', 400);
        return json({ data: { enabled: true } });
      }
      if (segments[1] === 'disable' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        if (!body.token) return error('token required', 422);
        const ok = await mfa.disableMFA(db, session.userId, body.token);
        if (!ok) return error('Invalid TOTP code.', 400);
        return json({ data: { enabled: false } });
      }
      if (segments[1] === 'verify' && method === 'POST') {
        // Verify a TOTP during login step 2. Body: { userId, token }
        const body = await request.json();
        if (!body.userId || !body.token) return error('userId and token required', 422);
        const ok = await mfa.verifyUserTOTP(db, body.userId, body.token);
        if (!ok) return error('Invalid TOTP code.', 401);
        const user = (await db.findById('users', body.userId)) as any;
        const profiles = await db.find('profiles', { user_id: body.userId });
        const token = createToken({
          userId: user.id,
          email: user.email,
          roles: [user.user_type],
          exp: Date.now() + SESSION_EXPIRY,
        });
        return json({ user: sanitizeRecord(user), profile: profiles[0] || null, token });
      }
    }

    // --- PROTECTED / PUBLIC DATA ROUTES ---
    if (segments[0] === 'data') {
      const collection = segments[1];
      if (!collection) return error('Collection name required');

      const isPublicRead = PUBLIC_READ_COLLECTIONS.has(collection);

      if (method === 'GET') {
        // Public collections: no auth. Private collections: auth required.
        if (!isPublicRead && !session) return error('Unauthorized', 401);

        if (segments[2]) {
          const item = await db.findById(collection, segments[2]);
          if (!item) return error('Not found', 404);
          return json({ data: sanitizeRecord(item) });
        }

        const filterParam = url.searchParams.get('filter');
        let filter: Record<string, any> | undefined;
        if (filterParam) {
          try {
            filter = JSON.parse(filterParam);
          } catch {
            return error('Invalid filter JSON', 422);
          }
        }
        const data = await db.find(collection, filter);
        return json({ data: sanitizeRecords(data) });
      }

      // All writes require authentication.
      if (!session) return error('Unauthorized', 401);

      if (method === 'POST') {
        const body = await request.json();
        const item = await db.insert(collection, body);
        return json({ data: sanitizeRecord(item) }, 201);
      }

      if (segments[2] && method === 'PUT') {
        const body = await request.json();
        const item = await db.update(collection, segments[2], body);
        return json({ data: sanitizeRecord(item) });
      }

      if (segments[2] && method === 'PATCH') {
        const body = await request.json();
        const item = await db.update(collection, segments[2], body);
        return json({ data: sanitizeRecord(item) });
      }

      if (segments[2] && method === 'DELETE') {
        await db.delete(collection, segments[2]);
        return json({ success: true });
      }
    }

    // --- ADMIN ROUTES ---
    if (segments[0] === 'admin') {
      if (!session) return error('Unauthorized', 401);
      const user = await db.findById('users', session.userId);
      if (!user || user.user_type !== 'super_admin') return error('Forbidden', 403);

      if (segments[1] === 'verify-entity' && method === 'POST') {
        const body = await request.json();
        const entity = await db.update('entities', body.entity_id, {
          verification_status: body.status,
          verified_at: body.status === 'verified' ? new Date().toISOString() : undefined,
          verified_by: session.userId,
          verification_notes: body.notes || '',
        });
        await db.insert('verification_queue', {
          entity_id: body.entity_id,
          reviewer_id: session.userId,
          action: body.status,
          notes: body.notes || '',
          reviewed_at: new Date().toISOString(),
        });
        return json({ data: sanitizeRecord(entity) });
      }

      if (segments[1] === 'audit-logs' && method === 'GET') {
        const logs = await db.get('audit_logs');
        return json({
          data: logs.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        });
      }

      if (segments[1] === 'stats' && method === 'GET') {
        const collections = [
          'users', 'entities', 'patients', 'bookings', 'orders', 'causes', 'courses',
        ];
        const stats: Record<string, number> = {};
        for (const col of collections) {
          try {
            const items = await db.get(col);
            stats[col] = items.length;
          } catch {
            stats[col] = 0;
          }
        }
        return json({ data: stats });
      }
    }

    // --- PAYMENTS ---
    if (segments[0] === 'payments') {
      const payments = await import('../../services/payments.ts');
      if (segments[1] === 'initiate' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        if (!body.amount || !body.customerEmail) return error('amount and customerEmail required', 422);
        const intent = await payments.createPaymentIntent(db, {
          amount: body.amount,
          currency: body.currency || 'NGN',
          description: body.description || 'CareConnect payment',
          customerId: session.userId,
          customerEmail: body.customerEmail,
          metadata: body.metadata || {},
          gateway: body.gateway || 'paystack',
        });
        if (intent.gateway === 'flutterwave') {
          const result = await payments.initiateFlutterwave(db, intent, body.customerName);
          return json({ data: { intent, ...result } });
        }
        const result = await payments.initiatePaystack(db, intent);
        return json({ data: { intent, ...result } });
      }
      if (segments[1] === 'verify' && method === 'POST') {
        const body = await request.json();
        if (!body.reference) return error('reference required', 422);
        const gateway = body.gateway || 'paystack';
        const result =
          gateway === 'flutterwave'
            ? await payments.verifyFlutterwave(db, body.reference)
            : await payments.verifyPaystack(db, body.reference);
        return json({ data: result });
      }
      if (segments[1] === 'webhook' && method === 'POST') {
        // Public endpoint (called by gateway). Verify signature.
        const raw = await request.text();
        const sig = request.headers.get('x-paystack-signature') || '';
        const flwSig = request.headers.get('verif-hash') || '';
        if (sig) {
          if (!payments.verifyPaystackWebhook(sig, raw)) return error('Invalid signature', 401);
          const evt = JSON.parse(raw);
          if (evt.event === 'charge.success') {
            await payments.verifyPaystack(db, evt.data.reference);
          }
          return json({ status: 'ok' });
        }
        if (flwSig) {
          if (!payments.verifyFlutterwaveWebhook(flwSig, raw)) return error('Invalid signature', 401);
          const evt = JSON.parse(raw);
          if (evt.event === 'successful' && evt.data) {
            await payments.verifyFlutterwave(db, evt.data.tx_ref);
          }
          return json({ status: 'ok' });
        }
        return error('Missing signature', 401);
      }
      if (segments[1] === 'refund' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const user = await db.findById('users', session.userId);
        if (!user || user.user_type !== 'super_admin') return error('Forbidden', 403);
        const body = await request.json();
        if (!body.paymentIntentId) return error('paymentIntentId required', 422);
        const result = await payments.refundPaystack(db, body.paymentIntentId, body.amount);
        return json({ data: result });
      }
      if (segments[1] === 'config' && method === 'GET') {
        // Return which gateways are available (no secrets).
        return json({ data: payments.isPaymentConfigured() });
      }
    }

    // --- EMAIL ---
    if (segments[0] === 'email') {
      const emailSvc = await import('../../services/email.ts');
      if (segments[1] === 'send' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        if (!body.to || !body.subject || !body.html) return error('to, subject, html required', 422);
        const ok = await emailSvc.sendEmail({ to: body.to, subject: body.subject, html: body.html, text: body.text });
        return json({ data: { sent: ok } });
      }
      if (segments[1] === 'schedule' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        if (!body.to || !body.subject || !body.html || !body.scheduled_for) return error('to, subject, html, scheduled_for required', 422);
        const record = await emailSvc.scheduleEmail(db, body);
        return json({ data: record }, 201);
      }
      if (segments[1] === 'status' && method === 'GET') {
        return json({ data: { enabled: emailSvc.isEmailEnabled() } });
      }
    }

    // --- AI ---
    if (segments[0] === 'ai') {
      const ai = await import('../../services/ai.ts');
      if (!ai.isAIConfigured()) return error('AI service is not configured', 503);
      if (segments[1] === 'chat' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        if (!body.prompt) return error('prompt required', 422);
        try {
          const text = await ai.generateText(body.prompt, body.systemInstruction, body.history);
          return json({ data: { text } });
        } catch (err: any) {
          return error(err.message, 502);
        }
      }
      if (segments[1] === 'emergency-plan' && method === 'POST') {
        const body = await request.json();
        try {
          const plan = await ai.generateEmergencyPlan(body);
          await db.insert('ai_emergency_plans', { ...plan, input: body, created_at: new Date().toISOString() });
          return json({ data: plan });
        } catch (err: any) {
          return error(err.message, 502);
        }
      }
      if (segments[1] === 'medical-timeline' && method === 'POST') {
        if (!session) return error('Unauthorized', 401);
        const body = await request.json();
        try {
          const timeline = await ai.generateMedicalTimeline(body);
          await db.insert('ai_medical_timelines', { ...timeline, input: body, created_at: new Date().toISOString() });
          return json({ data: timeline });
        } catch (err: any) {
          return error(err.message, 502);
        }
      }
      if (segments[1] === 'cultural-guidance' && method === 'POST') {
        const body = await request.json();
        try {
          const guidance = await ai.generateCulturalGuidance(body);
          await db.insert('ai_cultural_guidance', { ...guidance, input: body, created_at: new Date().toISOString() });
          return json({ data: guidance });
        } catch (err: any) {
          return error(err.message, 502);
        }
      }
    }

    // --- NEWS AGGREGATION ---
    if (segments[0] === 'news' && segments[1] === 'aggregate' && method === 'POST') {
      // Protected by SEED_KEY (admin/cron only).
      const provided = request.headers.get('x-seed-key') || url.searchParams.get('key');
      if (provided !== SEED_KEY) return error('Unauthorized', 401);
      const news = await import('../../services/news.ts');
      const result = await news.aggregateNews(db);
      return json({ data: result });
    }

    // --- CRON (scheduled jobs, protected by SEED_KEY) ---
    // Consolidated entry point for all scheduled work:
    //   1. Booking reminders (24h before appointment)
    //   2. Re-verification reminders (30/7/1 day marks)
    //   3. Newsletter processing (count of due newsletter emails)
    //   4. Send all due scheduled_emails (the original cron behavior)
    // Returns a summary: { emails: {sent,failed}, reminders: {booking,verification,newsletter} }
    if (segments[0] === 'cron' && method === 'POST') {
      const provided = request.headers.get('x-seed-key') || url.searchParams.get('key');
      if (provided !== SEED_KEY) return error('Unauthorized', 401);

      const emailSvc = await import('../../services/email.ts');
      const cronJobs = await import('../../services/cron-jobs.ts');

      const errors: string[] = [];

      // 1. Booking reminders — creates scheduled_emails + marks reminder_24h_sent.
      let bookingScheduled = 0;
      try {
        const r = await cronJobs.processBookingReminders(db);
        bookingScheduled = r.scheduled;
        errors.push(...r.errors);
      } catch (err: any) {
        errors.push(`booking_reminders: ${err.message}`);
      }

      // 2. Re-verification reminders — creates scheduled_emails at 30/7/1 day marks.
      let verificationScheduled = 0;
      try {
        const r = await cronJobs.processVerificationReminders(db);
        verificationScheduled = r.scheduled;
        errors.push(...r.errors);
      } catch (err: any) {
        errors.push(`verification_reminders: ${err.message}`);
      }

      // 3. Newsletter processing — count due newsletter emails (no-op beyond counting).
      let newsletterDue = 0;
      try {
        const r = await cronJobs.processNewsletterReminders(db);
        newsletterDue = r.scheduled;
        errors.push(...r.errors);
      } catch (err: any) {
        errors.push(`newsletter: ${err.message}`);
      }

      // 4. Send all due scheduled_emails (including those created above).
      let emailResult = { sent: 0, failed: 0 };
      try {
        emailResult = await emailSvc.processDueEmails(db);
      } catch (err: any) {
        errors.push(`process_due_emails: ${err.message}`);
      }

      return json({
        data: {
          emails: emailResult,
          reminders: {
            booking: bookingScheduled,
            verification: verificationScheduled,
            newsletter: newsletterDue,
          },
          errors,
          ran_at: new Date().toISOString(),
        },
      });
    }

    // --- SEED ENDPOINT (protected by SEED_KEY) ---
    if (segments[0] === 'seed' && method === 'POST') {
      const provided = request.headers.get('x-seed-key') || url.searchParams.get('key');
      if (provided !== SEED_KEY) return error('Unauthorized', 401);
      const { runSeed } = await import('../../seed/index.ts');
      const result = await runSeed(db);
      return json({ data: result });
    }

    return error('Not found', 404);
  } catch (err: any) {
    console.error('API Error:', err);
    return error(err.message || 'Internal server error', 500);
  }
};

export const GET = ALL;
export const POST = ALL;
export const PUT = ALL;
export const PATCH = ALL;
export const DELETE = ALL;
