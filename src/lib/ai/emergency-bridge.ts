// AILab Task 4 - Emergency Communication Bridge
// Frontend service that calls POST /api/ai/emergency-plan on the Astro backend.
// The Gemini API key stays server-side; this module only does an HTTP fetch.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Emergency categories supported by the form. */
export type EmergencyType =
  | 'medical'
  | 'accident'
  | 'fire'
  | 'cardiac'
  | 'respiratory'
  | 'bleeding'
  | 'poisoning'
  | 'other';

export type EmergencySeverity = 'mild' | 'moderate' | 'severe' | 'critical';

/** Input sent to the backend AI endpoint. */
export interface EmergencyPlanInput {
  emergencyType: EmergencyType | string;
  description: string;
  location?: string;
  numPeople?: number;
  severity?: EmergencySeverity | string;
}

/** A single contact recommendation. */
export interface EmergencyContact {
  role: string;
  reason: string;
  /** Optional extras the model may return (phone, urgency, etc.). */
  [key: string]: unknown;
}

/** Shape of the AI-generated emergency plan. All fields are optional because
 *  the model may occasionally omit them — defensive code on the page handles
 *  missing fields gracefully. */
export interface EmergencyPlan {
  immediate_steps?: string[];
  who_to_contact?: EmergencyContact[];
  nearest_resources?: string[];
  do_not_do?: string[];
  follow_up?: string[];
  /** Allow-through for any extra fields the model returns. */
  [key: string]: unknown;
}

/** Error thrown when the backend reports that the AI service is not
 *  configured (HTTP 503). The page surfaces a friendly message. */
export class AIServiceNotConfiguredError extends Error {
  constructor(message = 'AI service is not configured. Set GEMINI_API_KEY on the backend.') {
    super(message);
    this.name = 'AIServiceNotConfiguredError';
  }
}

/** Shared fetch helper that adds the auth token and parses the backend JSON
 *  envelope ({ data, error }). Throws typed errors for 503 / 502 / 401. */
async function postAIEndpoint<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('careconnect_api_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error(
      'Could not reach the CareConnect backend. Please check your connection and try again.',
    );
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* response had no JSON body */
  }

  if (!res.ok) {
    if (res.status === 503) {
      throw new AIServiceNotConfiguredError();
    }
    const message =
      (payload && (payload.error || payload.message)) ||
      `AI request failed (HTTP ${res.status}).`;
    throw new Error(message);
  }

  // Backend wraps successful responses in { data: ... }
  return (payload && payload.data ? payload.data : payload) as T;
}

export class EmergencyBridgeService {
  /** Generate an emergency response plan via the backend AI endpoint. */
  static async generatePlan(input: EmergencyPlanInput): Promise<EmergencyPlan> {
    if (!input || !input.description || !input.description.trim()) {
      throw new Error('A description of the emergency is required.');
    }

    const requestBody: EmergencyPlanInput = {
      emergencyType: input.emergencyType || 'other',
      description: input.description.trim(),
      location: input.location?.trim() || undefined,
      numPeople:
        typeof input.numPeople === 'number' && input.numPeople > 0
          ? input.numPeople
          : undefined,
      severity: input.severity || 'moderate',
    };

    return postAIEndpoint<EmergencyPlan>('/ai/emergency-plan', requestBody);
  }
}

export default EmergencyBridgeService;
