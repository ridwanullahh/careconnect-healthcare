// AILab Task 6 - Cultural & Religious Care Advisor
// Frontend service that calls POST /api/ai/cultural-guidance on the Astro backend.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Input sent to the backend AI endpoint. */
export interface CulturalGuidanceInput {
  cultureOrReligion: string;
  medicalContext: string;
  question?: string;
  language?: string;
}

/** Shape of the AI-generated cultural care guidance. All fields are optional
 *  because the model may omit some (notably end_of_life_considerations). */
export interface CulturalGuidance {
  overview?: string;
  dietary_considerations?: string[];
  communication_preferences?: string[];
  religious_practices?: string[];
  end_of_life_considerations?: string[];
  practical_tips?: string[];
  important_caveats?: string[];
  sources_to_verify?: string[];
  /** Allow-through for any extra fields the model returns. */
  [key: string]: unknown;
}

/** Error thrown when the backend reports that the AI service is not
 *  configured (HTTP 503). */
export class AIServiceNotConfiguredError extends Error {
  constructor(message = 'AI service is not configured. Set GEMINI_API_KEY on the backend.') {
    super(message);
    this.name = 'AIServiceNotConfiguredError';
  }
}

/** Shared fetch helper. */
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
  } catch {
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

  return (payload && payload.data ? payload.data : payload) as T;
}

export class CulturalAdvisorService {
  /** Get culturally-sensitive care guidance from the backend AI endpoint. */
  static async getGuidance(input: CulturalGuidanceInput): Promise<CulturalGuidance> {
    if (!input || !input.cultureOrReligion || !input.cultureOrReligion.trim()) {
      throw new Error('A culture or religion is required.');
    }
    if (!input.medicalContext || !input.medicalContext.trim()) {
      throw new Error('Medical context is required.');
    }

    const requestBody: CulturalGuidanceInput = {
      cultureOrReligion: input.cultureOrReligion.trim(),
      medicalContext: input.medicalContext.trim(),
      question: input.question?.trim() || undefined,
      language: input.language?.trim() || 'English',
    };

    return postAIEndpoint<CulturalGuidance>('/ai/cultural-guidance', requestBody);
  }
}

export default CulturalAdvisorService;
