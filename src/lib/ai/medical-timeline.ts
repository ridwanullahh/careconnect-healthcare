// AILab Task 5 - Medical Record Timeline Builder
// Frontend service that calls POST /api/ai/medical-timeline on the Astro backend
// and, for authenticated patients, prefills the input with their real records
// fetched via dbHelpers (the SQLiteClientSDK / api client).

import { dbHelpers, collections } from '../database';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Input sent to the backend AI endpoint. */
export interface MedicalTimelineInput {
  encounters: any[];
  conditions: any[];
  medications: any[];
  labResults: any[];
  imagingResults: any[];
}

/** A single chronological event in the synthesized timeline. */
export interface TimelineEvent {
  date?: string;
  category?: string;
  title?: string;
  description?: string;
  severity?: string;
  [key: string]: unknown;
}

/** Shape of the AI-generated medical timeline. */
export interface MedicalTimeline {
  events?: TimelineEvent[];
  summary?: string;
  patterns?: string[];
  recommendations?: string[];
  /** Allow-through for any extra fields the model returns. */
  [key: string]: unknown;
}

/** Bundle of patient records fetched from the DB. */
export interface PatientRecords {
  encounters: any[];
  conditions: any[];
  medications: any[];
  labResults: any[];
  imagingResults: any[];
  patient: any | null;
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

export class MedicalTimelineService {
  /**
   * Fetch the current patient's records from the DB so the timeline input
   * can be prefilled. Returns empty arrays if the user is not a patient or
   * has no records yet — never throws (logged to console).
   *
   * @param userId the authenticated user's id
   */
  static async fetchPatientRecords(userId: string): Promise<PatientRecords> {
    const empty: PatientRecords = {
      encounters: [],
      conditions: [],
      medications: [],
      labResults: [],
      imagingResults: [],
      patient: null,
    };

    if (!userId) return empty;

    try {
      // Find the patient record(s) linked to this user account.
      const patients = await dbHelpers
        .find(collections.patients, { user_id: userId })
        .catch(() => [] as any[]);
      if (!patients || patients.length === 0) return empty;

      // Use the first linked patient record.
      const patient = patients[0];
      const patientId = patient.id || patient.uid;

      const [encounters, conditions, medRequests, medDispenses, labResults, imagingOrders] =
        await Promise.all([
          dbHelpers
            .find(collections.encounters, { patient_id: patientId })
            .catch(() => [] as any[]),
          dbHelpers
            .find(collections.conditions, { patient_id: patientId })
            .catch(() => [] as any[]),
          dbHelpers
            .find(collections.medication_requests, { patient_id: patientId })
            .catch(() => [] as any[]),
          dbHelpers
            .find(collections.medication_dispenses, { patient_id: patientId })
            .catch(() => [] as any[]),
          dbHelpers
            .find(collections.lab_results, { patient_id: patientId })
            .catch(() => [] as any[]),
          dbHelpers
            .find(collections.imaging_orders, { patient_id: patientId })
            .catch(() => [] as any[]),
        ]);

      // Merge medication_requests + medication_dispenses into one list so the
      // model has a complete medication picture.
      const medications = [
        ...(medRequests || []),
        ...(medDispenses || []),
      ];

      return {
        patient,
        encounters: encounters || [],
        conditions: conditions || [],
        medications,
        labResults: labResults || [],
        imagingResults: imagingOrders || [],
      };
    } catch (err) {
      console.error('MedicalTimelineService.fetchPatientRecords error:', err);
      return empty;
    }
  }

  /** Build a chronological timeline by calling the backend AI endpoint. */
  static async buildTimeline(input: MedicalTimelineInput): Promise<MedicalTimeline> {
    if (!input) {
      throw new Error('Medical records input is required.');
    }

    const requestBody: MedicalTimelineInput = {
      encounters: Array.isArray(input.encounters) ? input.encounters : [],
      conditions: Array.isArray(input.conditions) ? input.conditions : [],
      medications: Array.isArray(input.medications) ? input.medications : [],
      labResults: Array.isArray(input.labResults) ? input.labResults : [],
      imagingResults: Array.isArray(input.imagingResults) ? input.imagingResults : [],
    };

    const totalRecords =
      requestBody.encounters.length +
      requestBody.conditions.length +
      requestBody.medications.length +
      requestBody.labResults.length +
      requestBody.imagingResults.length;

    if (totalRecords === 0) {
      throw new Error(
        'No medical records were found to build a timeline. Add encounters, conditions, medications, labs, or imaging first.',
      );
    }

    return postAIEndpoint<MedicalTimeline>('/ai/medical-timeline', requestBody);
  }
}

export default MedicalTimelineService;
