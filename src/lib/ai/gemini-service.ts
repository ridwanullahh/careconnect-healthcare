// Core Gemini 2.5-Flash AI Service - Production Ready
import { githubDB } from '../github-db-sdk';

// Gemini API Configuration - Multiple Keys Support
const GEMINI_API_KEYS_STRING = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_KEYS = GEMINI_API_KEYS_STRING.split(',').map(key => key.trim()).filter(key => key.length > 0);
let currentKeyIndex = 0;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface AIServiceConfig {
  maxRetries: number;
  timeout: number;
  temperature: number;
  maxOutputTokens: number;
  enableSafetyFilters: boolean;
}

export class GeminiAIService {
  private config: AIServiceConfig;
  private promptVersions: Map<string, string> = new Map();
  private currentKeyIndex: number = 0;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
      maxOutputTokens: 2048,
      enableSafetyFilters: true,
      ...config
    };

    this.initializePromptVersions();
    this.validateApiKeys();
  }

  private validateApiKeys() {
    if (GEMINI_API_KEYS.length === 0) {
      console.warn('⚠️ No Gemini API keys found. Please set VITE_GEMINI_API_KEYS in your environment variables.');
    } else {
      console.log(`✅ Loaded ${GEMINI_API_KEYS.length} Gemini API key(s)`);
    }
  }

  private getCurrentApiKey(): string {
    if (GEMINI_API_KEYS.length === 0) {
      throw new Error('No Gemini API keys available. Please configure VITE_GEMINI_API_KEYS.');
    }
    
    const key = GEMINI_API_KEYS[this.currentKeyIndex];
    // Rotate to next key for load balancing
    this.currentKeyIndex = (this.currentKeyIndex + 1) % GEMINI_API_KEYS.length;
    return key;
  }

  private initializePromptVersions() {
    this.promptVersions.set('care_path_v1', `
You are a medical AI assistant helping patients understand their healthcare journey. 
Generate a structured care path card from the user's plain English health concern.

CRITICAL SAFETY RULES:
- NEVER provide medical diagnoses
- NEVER recommend specific treatments
- ALWAYS include emergency disclaimers
- Focus on navigation and preparation only

Generate a JSON response with this exact structure:
{
  "suggestedSpecialty": "string - medical specialty or service type",
  "redFlags": ["array of warning signs that need immediate attention"],
  "prepChecklist": ["array of items to prepare before visit"],
  "questionsToAsk": ["array of important questions for the provider"],
  "telehealthSuitability": "high|medium|low with brief explanation",
  "disclaimer": "Medical disclaimer text",
  "urgencyLevel": "routine|urgent|emergency"
}

User concern: {concern}
`);

    this.promptVersions.set('lab_explainer_v1', `
You are a patient education AI assistant. Generate a clear, friendly explanation of a medical test or imaging procedure.

SAFETY RULES:
- Use simple, non-technical language
- Focus on patient experience and preparation
- Include realistic expectations
- Never interpret results or provide diagnoses

Generate JSON response:
{
  "purpose": "Why this test is done",
  "preparation": ["Step-by-step prep instructions"],
  "whatToExpect": "What happens during the test",
  "risks": ["Minimal risks or 'Generally safe'"],
  "nextSteps": "What typically happens after",
  "duration": "How long it takes",
  "disclaimer": "Educational disclaimer"
}

Test/Procedure: {testName}
`);

    this.promptVersions.set('procedure_navigator_v1', `
You are a healthcare navigation AI. Create a comprehensive 3-phase guide for a medical procedure.

SAFETY REQUIREMENTS:
- Provide general guidance only
- Include emergency contact reminders
- Emphasize following provider-specific instructions
- Never replace medical advice

Generate JSON response:
{
  "prepPhase": {
    "title": "Before Your Procedure",
    "checklist": ["preparation items"],
    "timeline": "when to do each item",
    "restrictions": ["what to avoid"]
  },
  "dayOfPhase": {
    "title": "Day of Procedure",
    "checklist": ["what to bring and do"],
    "timeline": "schedule for the day",
    "expectations": "what will happen"
  },
  "afterCarePhase": {
    "title": "After Your Procedure",
    "checklist": ["recovery steps"],
    "warningSigns": ["when to call provider"],
    "followUp": "typical follow-up schedule"
  },
  "emergencyContacts": "reminder to have emergency contacts ready",
  "disclaimer": "Follow your provider's specific instructions"
}

Procedure: {procedureName}
`);
  }

  async generateContent(prompt: string, promptVersion: string = 'default'): Promise<string> {
    if (GEMINI_API_KEYS.length === 0) {
      console.warn('Gemini API keys not configured, using fallback');
      return this.getFallbackContent(promptVersion);
    }

    const versionedPrompt = this.promptVersions.get(promptVersion) || prompt;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: versionedPrompt
        }]
      }],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: 0.8,
        topK: 40
      },
      safetySettings: this.config.enableSafetyFilters ? [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ] : []
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const apiKey = this.getCurrentApiKey();
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data: GeminiResponse = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No response generated from Gemini');
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Log usage for monitoring
        await this.logUsage(promptVersion, data.usageMetadata);
        
        return generatedText;

      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.config.maxRetries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Fallback to static content if all retries fail
    console.error('All Gemini API attempts failed, using fallback');
    return this.getFallbackContent(promptVersion);
  }

  private async logUsage(promptVersion: string, usage: any) {
    try {
      await githubDB.insert('analytics_events', {
        id: `ai_usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'ai_generation',
        prompt_version: promptVersion,
        token_usage: usage,
        timestamp: new Date().toISOString(),
        service: 'gemini-2.5-flash'
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }

  private getFallbackContent(promptVersion: string): string {
    const fallbacks = {
      'care_path_v1': JSON.stringify({
        suggestedSpecialty: "Primary Care",
        redFlags: ["Severe pain", "Difficulty breathing", "High fever"],
        prepChecklist: ["Insurance card", "Medication list", "Symptom diary"],
        questionsToAsk: ["What could be causing this?", "What tests might be needed?", "What are my treatment options?"],
        telehealthSuitability: "medium - Initial consultation possible, may need in-person follow-up",
        disclaimer: "This is educational information only. Consult healthcare providers for medical advice.",
        urgencyLevel: "routine"
      }),
      'lab_explainer_v1': JSON.stringify({
        purpose: "To help your healthcare provider understand your health status",
        preparation: ["Follow fasting instructions if provided", "Bring insurance card", "Arrive on time"],
        whatToExpected: "A healthcare professional will collect the sample safely and quickly",
        risks: ["Generally safe with minimal discomfort"],
        nextSteps: "Results will be sent to your healthcare provider who will discuss them with you",
        duration: "Usually 5-15 minutes",
        disclaimer: "This is general information. Follow your provider's specific instructions."
      }),
      'procedure_navigator_v1': JSON.stringify({
        prepPhase: {
          title: "Before Your Procedure",
          checklist: ["Follow pre-procedure instructions", "Arrange transportation", "Prepare insurance documents"],
          timeline: "Complete preparation as instructed by your provider",
          restrictions: ["Follow fasting or medication instructions"]
        },
        dayOfPhase: {
          title: "Day of Procedure",
          checklist: ["Arrive on time", "Bring ID and insurance", "Wear comfortable clothing"],
          timeline: "Arrive as scheduled, allow extra time",
          expectations: "Check-in, preparation, procedure, recovery"
        },
        afterCarePhase: {
          title: "After Your Procedure",
          checklist: ["Follow discharge instructions", "Take prescribed medications", "Rest as advised"],
          warningSign: ["Unusual pain", "Signs of infection", "Unexpected symptoms"],
          followUp: "Schedule follow-up as recommended"
        },
        emergencyContacts: "Keep emergency contact information readily available",
        disclaimer: "Follow your healthcare provider's specific instructions. This is general guidance only."
      })
    };

    return fallbacks[promptVersion as keyof typeof fallbacks] || 
           '{"error": "Service temporarily unavailable", "message": "Please try again later or contact support."}';
  }

  // PHI Redaction utility
  static redactPHI(text: string): string {
    // Remove common PHI patterns
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]') // SSN
      .replace(/\b\d{10,}\b/g, '[PHONE-REDACTED]') // Phone numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL-REDACTED]') // Email
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DATE-REDACTED]') // Dates
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE-REDACTED]'); // ISO dates
  }

  // Emergency keyword detection
  static detectEmergencyKeywords(text: string): boolean {
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'stroke', 'seizure', 'unconscious',
      'severe bleeding', 'difficulty breathing', 'choking', 'overdose',
      'suicide', 'emergency', 'urgent', 'critical', 'life threatening'
    ];

    const lowerText = text.toLowerCase();
    return emergencyKeywords.some(keyword => lowerText.includes(keyword));
  }
}

// Export singleton instance
export const geminiAI = new GeminiAIService();