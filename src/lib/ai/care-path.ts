// AI Care Path Cards - Task 1 Implementation
import { geminiAI, GeminiAIService } from './gemini-service';
import { githubDB } from '../github-db-sdk';

export interface CarePathCard {
  id: string;
  concern: string;
  suggestedSpecialty: string;
  redFlags: string[];
  prepChecklist: string[];
  questionsToAsk: string[];
  telehealthSuitability: string;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  disclaimer: string;
  createdAt: string;
  userId?: string;
  cached: boolean;
}

export interface CarePathMetrics {
  cardId: string;
  action: 'generated' | 'saved' | 'printed' | 'emailed' | 'find_providers_clicked';
  timestamp: string;
  userId?: string;
}

export class CarePathService {
  private cache = new Map<string, CarePathCard>();

  async generateCarePathCard(concern: string, userId?: string): Promise<CarePathCard> {
    try {
      // Check for emergency keywords first
      if (GeminiAIService.detectEmergencyKeywords(concern)) {
        return this.generateEmergencyCard(concern, userId);
      }

      // Check cache first
      const cacheKey = this.getCacheKey(concern);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        await this.trackMetric(cached.id, 'generated', userId);
        return cached;
      }

      // Check database cache
      const existingCards = await githubDB.query('ai_care_paths', {
        concern_hash: this.hashConcern(concern)
      });

      if (existingCards.length > 0) {
        const card = this.parseStoredCard(existingCards[0]);
        this.cache.set(cacheKey, card);
        await this.trackMetric(card.id, 'generated', userId);
        return card;
      }

      // Generate new card with Gemini
      const prompt = this.buildCarePathPrompt(concern);
      console.log('Generating AI care path for:', concern);
      const response = await geminiAI.generateContent(prompt, 'care_path_v1');
      console.log('AI Response received:', response);
      
      const card = await this.parseCarePathResponse(response, concern, userId);
      
      // Store in database
      await this.storeCarePathCard(card);
      
      // Cache in memory
      this.cache.set(cacheKey, card);
      
      // Track generation metric
      await this.trackMetric(card.id, 'generated', userId);
      
      return card;

    } catch (error) {
      console.error('Error generating care path card:', error);
      return this.getFallbackCard(concern, userId);
    }
  }

  private buildCarePathPrompt(concern: string): string {
    // Redact any potential PHI
    const cleanConcern = GeminiAIService.redactPHI(concern);
    
    return `
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

User concern: ${cleanConcern}
`;
  }

  private async parseCarePathResponse(response: string, concern: string, userId?: string): Promise<CarePathCard> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        id: `care_path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        concern: concern,
        suggestedSpecialty: parsed.suggestedSpecialty || 'Primary Care',
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        prepChecklist: Array.isArray(parsed.prepChecklist) ? parsed.prepChecklist : [],
        questionsToAsk: Array.isArray(parsed.questionsToAsk) ? parsed.questionsToAsk : [],
        telehealthSuitability: parsed.telehealthSuitability || 'medium - Consult with provider',
        urgencyLevel: parsed.urgencyLevel || 'routine',
        disclaimer: parsed.disclaimer || 'This is educational information only. Always consult healthcare providers for medical advice.',
        createdAt: new Date().toISOString(),
        userId,
        cached: false
      };
    } catch (error) {
      console.error('Error parsing care path response:', error);
      return this.getFallbackCard(concern, userId);
    }
  }

  private generateEmergencyCard(concern: string, userId?: string): CarePathCard {
    return {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      concern: concern,
      suggestedSpecialty: 'Emergency Medicine',
      redFlags: ['EMERGENCY SITUATION DETECTED'],
      prepChecklist: ['Call 911 immediately', 'If safe, go to nearest emergency room', 'Bring ID and insurance if possible'],
      questionsToAsk: ['What is the emergency?', 'What happened?', 'Any allergies or medications?'],
      telehealthSuitability: 'low - Emergency care needed immediately',
      urgencyLevel: 'emergency',
      disclaimer: '🚨 EMERGENCY DETECTED: This appears to be an emergency situation. Call 911 or go to the nearest emergency room immediately. Do not delay seeking emergency care.',
      createdAt: new Date().toISOString(),
      userId,
      cached: false
    };
  }

  private getFallbackCard(concern: string, userId?: string): CarePathCard {
    return {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      concern: concern,
      suggestedSpecialty: 'Primary Care',
      redFlags: ['Severe or worsening symptoms', 'High fever', 'Difficulty breathing', 'Severe pain'],
      prepChecklist: ['Insurance card and ID', 'List of current medications', 'Symptom diary or notes', 'Emergency contact information'],
      questionsToAsk: ['What could be causing my symptoms?', 'What tests might be needed?', 'What are my treatment options?', 'When should I follow up?'],
      telehealthSuitability: 'medium - Initial consultation may be possible, in-person visit may be needed',
      urgencyLevel: 'routine',
      disclaimer: 'This is general educational information only. Always consult with healthcare providers for personalized medical advice and treatment.',
      createdAt: new Date().toISOString(),
      userId,
      cached: false
    };
  }

  private async storeCarePathCard(card: CarePathCard): Promise<void> {
    try {
      await githubDB.create('ai_care_paths', {
        id: card.id,
        concern: card.concern,
        concern_hash: this.hashConcern(card.concern),
        suggested_specialty: card.suggestedSpecialty,
        red_flags: JSON.stringify(card.redFlags),
        prep_checklist: JSON.stringify(card.prepChecklist),
        questions_to_ask: JSON.stringify(card.questionsToAsk),
        telehealth_suitability: card.telehealthSuitability,
        urgency_level: card.urgencyLevel,
        disclaimer: card.disclaimer,
        created_at: card.createdAt,
        user_id: card.userId,
        cached: card.cached
      });
    } catch (error) {
      console.error('Error storing care path card:', error);
    }
  }

  private parseStoredCard(stored: any): CarePathCard {
    return {
      id: stored.id,
      concern: stored.concern,
      suggestedSpecialty: stored.suggested_specialty,
      redFlags: JSON.parse(stored.red_flags || '[]'),
      prepChecklist: JSON.parse(stored.prep_checklist || '[]'),
      questionsToAsk: JSON.parse(stored.questions_to_ask || '[]'),
      telehealthSuitability: stored.telehealth_suitability,
      urgencyLevel: stored.urgency_level,
      disclaimer: stored.disclaimer,
      createdAt: stored.created_at,
      userId: stored.user_id,
      cached: true
    };
  }

  async trackMetric(cardId: string, action: CarePathMetrics['action'], userId?: string): Promise<void> {
    try {
      await githubDB.create('analytics_events', {
        id: `care_path_metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'care_path_action',
        card_id: cardId,
        action: action,
        timestamp: new Date().toISOString(),
        user_id: userId
      });
    } catch (error) {
      console.error('Error tracking care path metric:', error);
    }
  }

  async saveCarePathCard(cardId: string, userId?: string): Promise<boolean> {
    try {
      await this.trackMetric(cardId, 'saved', userId);
      return true;
    } catch (error) {
      console.error('Error saving care path card:', error);
      return false;
    }
  }

  async printCarePathCard(cardId: string, userId?: string): Promise<boolean> {
    try {
      await this.trackMetric(cardId, 'printed', userId);
      return true;
    } catch (error) {
      console.error('Error printing care path card:', error);
      return false;
    }
  }

  async emailCarePathCard(cardId: string, email: string, userId?: string): Promise<boolean> {
    try {
      await this.trackMetric(cardId, 'emailed', userId);
      // Email functionality would be implemented here
      return true;
    } catch (error) {
      console.error('Error emailing care path card:', error);
      return false;
    }
  }

  async findProvidersClicked(cardId: string, userId?: string): Promise<boolean> {
    try {
      await this.trackMetric(cardId, 'find_providers_clicked', userId);
      return true;
    } catch (error) {
      console.error('Error tracking find providers click:', error);
      return false;
    }
  }

  private getCacheKey(concern: string): string {
    return `care_path_${this.hashConcern(concern)}`;
  }

  private hashConcern(concern: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < concern.length; i++) {
      const char = concern.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const carePathService = new CarePathService();