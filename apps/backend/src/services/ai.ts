// Bismillah Ar-Rahman Ar-Raheem.
// Backend AI service — Gemini API wrapper. API key stays server-side.
// Supports: chat completions, structured JSON generation, the AILab tools.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function isAIConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/** Generate a text response from Gemini. */
export async function generateText(
  prompt: string,
  systemInstruction?: string,
  history?: ChatMessage[],
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('AI service is not configured (GEMINI_API_KEY missing).');
  }
  const contents = [...(history || []), { role: 'user' as const, content: prompt }];
  const body: any = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Gemini request failed');
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

/** Generate a JSON object from Gemini (parses the response). */
export async function generateJSON<T = any>(
  prompt: string,
  systemInstruction?: string,
  history?: ChatMessage[],
): Promise<T> {
  const text = await generateText(
    prompt + '\n\nRespond with ONLY valid JSON, no markdown fences, no extra text.',
    systemInstruction,
    history,
  );
  // Strip markdown fences if present.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

/**
 * AILab Emergency Communication Bridge — generates an emergency action plan
 * for a described emergency situation, including immediate steps, who to
 * contact, and nearest emergency resources.
 */
export async function generateEmergencyPlan(input: {
  emergencyType: string;
  description: string;
  location?: string;
  numPeople?: number;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
}): Promise<any> {
  const systemInstruction = `You are an emergency medical communication assistant for CareConnect. Generate clear, actionable emergency response plans. Always prioritize calling local emergency services (112 in Nigeria) for life-threatening situations. Include: immediate_steps (array), who_to_contact (array of {role, reason}), nearest_resources (array), do_not_do (array of things to avoid), follow_up (array). Be concise but thorough.`;
  const prompt = `Emergency Type: ${input.emergencyType}\nDescription: ${input.description}\nLocation: ${input.location || 'Not specified'}\nNumber of people affected: ${input.numPeople || 1}\nSeverity: ${input.severity || 'moderate'}\n\nGenerate an emergency response plan as JSON.`;
  return generateJSON(prompt, systemInstruction);
}

/**
 * AILab Medical Record Timeline Builder — synthesizes a chronological
 * timeline from a patient's encounters, conditions, meds, labs, imaging.
 */
export async function generateMedicalTimeline(input: {
  encounters: any[];
  conditions: any[];
  medications: any[];
  labResults: any[];
  imagingResults: any[];
}): Promise<any> {
  const systemInstruction = `You are a clinical timeline builder for CareConnect. Given patient medical records, produce a chronological timeline that helps patients and providers understand the care journey. Output JSON with: events (array of {date, category, title, description, severity}), summary (string), patterns (array of identified patterns), recommendations (array of next steps). Dates should be ISO format if available. Group related events. Use plain language for patients.`;
  const prompt = `Patient records:\nEncounters: ${JSON.stringify(input.encounters)}\nConditions: ${JSON.stringify(input.conditions)}\nMedications: ${JSON.stringify(input.medications)}\nLab Results: ${JSON.stringify(input.labResults)}\nImaging: ${JSON.stringify(input.imagingResults)}\n\nBuild a medical timeline as JSON.`;
  return generateJSON(prompt, systemInstruction);
}

/**
 * AILab Cultural & Religious Care Advisor — provides culturally and
 * religiously sensitive care guidance for diverse populations.
 */
export async function generateCulturalGuidance(input: {
  cultureOrReligion: string;
  medicalContext: string;
  question?: string;
  language?: string;
}): Promise<any> {
  const systemInstruction = `You are a cultural and religious care advisor for CareConnect. Help healthcare providers deliver culturally competent care. Always be respectful, accurate, and note that practices vary within communities — verify with the patient. Output JSON with: overview (string), dietary_considerations (array), communication_preferences (array), religious_practices (array), end_of_life_considerations (array if relevant), practical_tips (array), important_caveats (array), sources_to_verify (array). If unsure, say so explicitly.`;
  const prompt = `Culture/Religion: ${input.cultureOrReligion}\nMedical Context: ${input.medicalContext}\nSpecific Question: ${input.question || 'General guidance'}\nLanguage: ${input.language || 'English'}\n\nProvide culturally sensitive care guidance as JSON.`;
  return generateJSON(prompt, systemInstruction);
}
