// AI Lab & Imaging Explainer - Task 2 Implementation
import { geminiAI, GeminiAIService } from './gemini-service';
import { githubDB } from '../github-db-sdk';

export interface LabImagingExplanation {
  id: string;
  testName: string;
  modality: string;
  purpose: string;
  preparation: string[];
  whatToExpect: string;
  risks: string[];
  nextSteps: string;
  duration: string;
  disclaimer: string;
  createdAt: string;
  cached: boolean;
}

export interface ExplainerMetrics {
  explanationId: string;
  action: 'generated' | 'viewed' | 'printed' | 'emailed';
  timestamp: string;
  userId?: string;
}

export class OrderExplainerService {
  private cache = new Map<string, LabImagingExplanation>();

  async generateExplanation(testName: string, modality: string = 'lab', userId?: string): Promise<LabImagingExplanation> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(testName, modality);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        await this.trackMetric(cached.id, 'generated', userId);
        return cached;
      }

      // Check database cache
      const existing = await githubDB.query('ai_lab_explanations', {
        test_name: testName.toLowerCase(),
        modality: modality.toLowerCase()
      });

      if (existing.length > 0) {
        const explanation = this.parseStoredExplanation(existing[0]);
        this.cache.set(cacheKey, explanation);
        await this.trackMetric(explanation.id, 'generated', userId);
        return explanation;
      }

      // Generate new explanation with Gemini
      const prompt = this.buildExplainerPrompt(testName, modality);
      const response = await geminiAI.generateContent(prompt, 'lab_explainer_v1');
      
      const explanation = await this.parseExplainerResponse(response, testName, modality);
      
      // Store in database
      await this.storeExplanation(explanation);
      
      // Cache in memory
      this.cache.set(cacheKey, explanation);
      
      // Track generation metric
      await this.trackMetric(explanation.id, 'generated', userId);
      
      return explanation;

    } catch (error) {
      console.error('Error generating lab/imaging explanation:', error);
      return this.getFallbackExplanation(testName, modality);
    }
  }

  private buildExplainerPrompt(testName: string, modality: string): string {
    return `
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

Test/Procedure: ${testName}
Modality: ${modality}
`;
  }

  private async parseExplainerResponse(response: string, testName: string, modality: string): Promise<LabImagingExplanation> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        id: `lab_explanation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        testName,
        modality,
        purpose: parsed.purpose || 'To help your healthcare provider understand your health status',
        preparation: Array.isArray(parsed.preparation) ? parsed.preparation : [],
        whatToExpect: parsed.whatToExpect || 'A healthcare professional will perform the test safely and efficiently',
        risks: Array.isArray(parsed.risks) ? parsed.risks : ['Generally safe with minimal discomfort'],
        nextSteps: parsed.nextSteps || 'Results will be sent to your healthcare provider',
        duration: parsed.duration || 'Varies depending on the specific test',
        disclaimer: parsed.disclaimer || 'This is general educational information. Follow your provider\'s specific instructions.',
        createdAt: new Date().toISOString(),
        cached: false
      };
    } catch (error) {
      console.error('Error parsing explainer response:', error);
      return this.getFallbackExplanation(testName, modality);
    }
  }

  private getFallbackExplanation(testName: string, modality: string): LabImagingExplanation {
    return {
      id: `fallback_explanation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testName,
      modality,
      purpose: 'To help your healthcare provider understand your health status and make informed decisions about your care',
      preparation: [
        'Follow any fasting instructions provided',
        'Bring your insurance card and ID',
        'Arrive on time for your appointment',
        'Wear comfortable, appropriate clothing'
      ],
      whatToExpect: 'A trained healthcare professional will perform the test according to standard medical procedures. The process is designed to be as comfortable as possible.',
      risks: ['Generally safe with minimal discomfort', 'Your healthcare team will monitor you throughout'],
      nextSteps: 'Results will be sent to your healthcare provider who will discuss them with you and determine any necessary follow-up care.',
      duration: 'The duration varies depending on the specific test. Your healthcare team will provide more specific timing.',
      disclaimer: 'This is general educational information only. Always follow your healthcare provider\'s specific instructions and ask them any questions you may have.',
      createdAt: new Date().toISOString(),
      cached: false
    };
  }

  private async storeExplanation(explanation: LabImagingExplanation): Promise<void> {
    try {
      await githubDB.create('ai_lab_explanations', {
        id: explanation.id,
        test_name: explanation.testName.toLowerCase(),
        modality: explanation.modality.toLowerCase(),
        purpose: explanation.purpose,
        preparation: JSON.stringify(explanation.preparation),
        what_to_expect: explanation.whatToExpect,
        risks: JSON.stringify(explanation.risks),
        next_steps: explanation.nextSteps,
        duration: explanation.duration,
        disclaimer: explanation.disclaimer,
        created_at: explanation.createdAt,
        cached: explanation.cached
      });
    } catch (error) {
      console.error('Error storing lab explanation:', error);
    }
  }

  private parseStoredExplanation(stored: any): LabImagingExplanation {
    return {
      id: stored.id,
      testName: stored.test_name,
      modality: stored.modality,
      purpose: stored.purpose,
      preparation: JSON.parse(stored.preparation || '[]'),
      whatToExpect: stored.what_to_expect,
      risks: JSON.parse(stored.risks || '[]'),
      nextSteps: stored.next_steps,
      duration: stored.duration,
      disclaimer: stored.disclaimer,
      createdAt: stored.created_at,
      cached: true
    };
  }

  async trackMetric(explanationId: string, action: ExplainerMetrics['action'], userId?: string): Promise<void> {
    try {
      await githubDB.create('analytics_events', {
        id: `explainer_metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'lab_explainer_action',
        explanation_id: explanationId,
        action: action,
        timestamp: new Date().toISOString(),
        user_id: userId
      });
    } catch (error) {
      console.error('Error tracking explainer metric:', error);
    }
  }

  private getCacheKey(testName: string, modality: string): string {
    return `${modality}_${testName.toLowerCase().replace(/\s+/g, '_')}`;
  }
}

// Export singleton instance
export const orderExplainerService = new OrderExplainerService();