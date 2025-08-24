// AI Procedure Navigator Bundle - Task 3 Implementation
import { geminiAI, GeminiAIService } from './gemini-service';
import { githubDB } from '../github-db-sdk';

export interface ProcedurePhase {
  title: string;
  checklist: string[];
  timeline: string;
  restrictions?: string[];
  expectations?: string;
  warningSigns?: string[];
  followUp?: string;
}

export interface ProcedureNavigator {
  id: string;
  procedureName: string;
  prepPhase: ProcedurePhase;
  dayOfPhase: ProcedurePhase;
  afterCarePhase: ProcedurePhase;
  emergencyContacts: string;
  disclaimer: string;
  createdAt: string;
  cached: boolean;
}

export interface NavigatorMetrics {
  navigatorId: string;
  action: 'generated' | 'viewed' | 'printed' | 'emailed' | 'calendar_added';
  phase?: 'prep' | 'day_of' | 'after_care';
  timestamp: string;
  userId?: string;
}

export class ProcedureNavigatorService {
  private cache = new Map<string, ProcedureNavigator>();

  async generateProcedureNavigator(procedureName: string, userId?: string): Promise<ProcedureNavigator> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(procedureName);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        await this.trackMetric(cached.id, 'generated', undefined, userId);
        return cached;
      }

      // Check database cache
      const existing = await githubDB.query('ai_procedure_navigators', {
        procedure_name: procedureName.toLowerCase()
      });

      if (existing.length > 0) {
        const navigator = this.parseStoredNavigator(existing[0]);
        this.cache.set(cacheKey, navigator);
        await this.trackMetric(navigator.id, 'generated', undefined, userId);
        return navigator;
      }

      // Generate new navigator with Gemini
      const prompt = this.buildNavigatorPrompt(procedureName);
      const response = await geminiAI.generateContent(prompt, 'procedure_navigator_v1');
      
      const navigator = await this.parseNavigatorResponse(response, procedureName);
      
      // Store in database
      await this.storeNavigator(navigator);
      
      // Cache in memory
      this.cache.set(cacheKey, navigator);
      
      // Track generation metric
      await this.trackMetric(navigator.id, 'generated', undefined, userId);
      
      return navigator;

    } catch (error) {
      console.error('Error generating procedure navigator:', error);
      return this.getFallbackNavigator(procedureName);
    }
  }

  private buildNavigatorPrompt(procedureName: string): string {
    return `
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

Procedure: ${procedureName}
`;
  }

  private async parseNavigatorResponse(response: string, procedureName: string): Promise<ProcedureNavigator> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        id: `procedure_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        procedureName,
        prepPhase: {
          title: parsed.prepPhase?.title || 'Before Your Procedure',
          checklist: Array.isArray(parsed.prepPhase?.checklist) ? parsed.prepPhase.checklist : [],
          timeline: parsed.prepPhase?.timeline || 'Follow your provider\'s timeline',
          restrictions: Array.isArray(parsed.prepPhase?.restrictions) ? parsed.prepPhase.restrictions : []
        },
        dayOfPhase: {
          title: parsed.dayOfPhase?.title || 'Day of Procedure',
          checklist: Array.isArray(parsed.dayOfPhase?.checklist) ? parsed.dayOfPhase.checklist : [],
          timeline: parsed.dayOfPhase?.timeline || 'Arrive as scheduled',
          expectations: parsed.dayOfPhase?.expectations || 'Your healthcare team will guide you through the process'
        },
        afterCarePhase: {
          title: parsed.afterCarePhase?.title || 'After Your Procedure',
          checklist: Array.isArray(parsed.afterCarePhase?.checklist) ? parsed.afterCarePhase.checklist : [],
          timeline: parsed.afterCarePhase?.timeline || 'Follow discharge instructions',
          warningSigns: Array.isArray(parsed.afterCarePhase?.warningSigns) ? parsed.afterCarePhase.warningSigns : [],
          followUp: parsed.afterCarePhase?.followUp || 'Schedule follow-up as recommended'
        },
        emergencyContacts: parsed.emergencyContacts || 'Keep emergency contact information readily available',
        disclaimer: parsed.disclaimer || 'This is general guidance only. Always follow your healthcare provider\'s specific instructions.',
        createdAt: new Date().toISOString(),
        cached: false
      };
    } catch (error) {
      console.error('Error parsing navigator response:', error);
      return this.getFallbackNavigator(procedureName);
    }
  }

  private getFallbackNavigator(procedureName: string): ProcedureNavigator {
    return {
      id: `fallback_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      procedureName,
      prepPhase: {
        title: 'Before Your Procedure',
        checklist: [
          'Follow all pre-procedure instructions from your healthcare provider',
          'Complete any required lab work or tests',
          'Arrange transportation to and from the facility',
          'Prepare insurance and identification documents',
          'Follow fasting instructions if provided'
        ],
        timeline: 'Complete preparation according to your provider\'s timeline, typically 24-48 hours before',
        restrictions: [
          'Follow medication restrictions as instructed',
          'Avoid alcohol if advised',
          'Follow dietary restrictions'
        ]
      },
      dayOfPhase: {
        title: 'Day of Procedure',
        checklist: [
          'Arrive on time as scheduled',
          'Bring insurance card and photo ID',
          'Wear comfortable, appropriate clothing',
          'Bring a list of current medications',
          'Have emergency contact information available'
        ],
        timeline: 'Arrive at the scheduled time, allow extra time for check-in and preparation',
        expectations: 'You will check in, complete any necessary paperwork, meet with your healthcare team, and be guided through the procedure process'
      },
      afterCarePhase: {
        title: 'After Your Procedure',
        checklist: [
          'Follow all discharge instructions carefully',
          'Take prescribed medications as directed',
          'Rest as recommended by your healthcare team',
          'Keep follow-up appointments',
          'Monitor for any concerning symptoms'
        ],
        timeline: 'Recovery time varies by procedure - follow your provider\'s specific timeline',
        warningSigns: [
          'Unusual or severe pain',
          'Signs of infection (fever, redness, swelling)',
          'Unexpected bleeding',
          'Difficulty breathing',
          'Any symptoms that concern you'
        ],
        followUp: 'Schedule and attend all recommended follow-up appointments'
      },
      emergencyContacts: 'Keep your healthcare provider\'s contact information and emergency numbers readily available',
      disclaimer: 'This is general guidance only. Always follow your healthcare provider\'s specific instructions, which may differ from this general information.',
      createdAt: new Date().toISOString(),
      cached: false
    };
  }

  private async storeNavigator(navigator: ProcedureNavigator): Promise<void> {
    try {
      await githubDB.create('ai_procedure_navigators', {
        id: navigator.id,
        procedure_name: navigator.procedureName.toLowerCase(),
        prep_phase: JSON.stringify(navigator.prepPhase),
        day_of_phase: JSON.stringify(navigator.dayOfPhase),
        after_care_phase: JSON.stringify(navigator.afterCarePhase),
        emergency_contacts: navigator.emergencyContacts,
        disclaimer: navigator.disclaimer,
        created_at: navigator.createdAt,
        cached: navigator.cached
      });
    } catch (error) {
      console.error('Error storing procedure navigator:', error);
    }
  }

  private parseStoredNavigator(stored: any): ProcedureNavigator {
    return {
      id: stored.id,
      procedureName: stored.procedure_name,
      prepPhase: JSON.parse(stored.prep_phase || '{}'),
      dayOfPhase: JSON.parse(stored.day_of_phase || '{}'),
      afterCarePhase: JSON.parse(stored.after_care_phase || '{}'),
      emergencyContacts: stored.emergency_contacts,
      disclaimer: stored.disclaimer,
      createdAt: stored.created_at,
      cached: true
    };
  }

  async trackMetric(navigatorId: string, action: NavigatorMetrics['action'], phase?: NavigatorMetrics['phase'], userId?: string): Promise<void> {
    try {
      await githubDB.create('analytics_events', {
        id: `navigator_metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'procedure_navigator_action',
        navigator_id: navigatorId,
        action: action,
        phase: phase,
        timestamp: new Date().toISOString(),
        user_id: userId
      });
    } catch (error) {
      console.error('Error tracking navigator metric:', error);
    }
  }

  private getCacheKey(procedureName: string): string {
    return `procedure_nav_${procedureName.toLowerCase().replace(/\s+/g, '_')}`;
  }
}

// Export singleton instance
export const procedureNavigatorService = new ProcedureNavigatorService();