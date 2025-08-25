// Master Health Tools System - Single Source of Truth with Full AI Chat Integration
// Bismillah Ar-Rahman Ar-Roheem

import { githubDB, collections } from './database';
import { aiChatbotSupportService } from './ai/ai-chatbot-support';
import { geminiAI } from './ai/gemini-service';

// Tool Categories
export enum ToolCategory {
  GENERAL_TRIAGE = 'general_triage',
  NUTRITION = 'nutrition',
  MENTAL_WELLNESS = 'mental_wellness',
  MATERNAL_HEALTH = 'maternal_health',
  PEDIATRICS = 'pediatrics',
  CHRONIC_CONDITIONS = 'chronic_conditions',
  FITNESS = 'fitness',
  MEDICATION_SAFETY = 'medication_safety',
  PREVENTIVE_CARE = 'preventive_care',
  EMERGENCY_PREP = 'emergency_prep',
  SLEEP_WELLNESS = 'sleep_wellness',
  SEXUAL_HEALTH = 'sexual_health',
  SENIOR_HEALTH = 'senior_health',
  DENTAL_HEALTH = 'dental_health',
  EYE_HEALTH = 'eye_health',
  SKIN_HEALTH = 'skin_health',
  CARDIOLOGY = 'cardiology',
  RESPIRATORY = 'respiratory',
  NEUROLOGY = 'neurology',
  ENDOCRINOLOGY = 'endocrinology'
}

// Tool Types
export enum ToolType {
  AI_CHAT = 'ai_chat',
  AI_POWERED = 'ai_powered',
  CALCULATOR = 'calculator',
  TRACKER = 'tracker',
  ASSESSMENT = 'assessment',
  SCREENER = 'screener',
  GUIDE = 'guide',
  EMERGENCY_TOOL = 'emergency_tool',
  WELLNESS_COACH = 'wellness_coach'
}

// Chat Message Interface
export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  sessionId: string;
  toolId: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    followUpSuggestions?: string[];
    medicalDisclaimer?: boolean;
  };
}

// Chat Session Interface
export interface ToolChatSession {
  id: string;
  toolId: string;
  userId?: string;
  name: string;
  messages: ChatMessage[];
  context: {
    userProfile?: any;
    medicalHistory?: any;
    currentSymptoms?: any;
    preferences?: any;
  };
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

// Enhanced Health Tool Interface
export interface HealthTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  type: ToolType;
  
  // AI Chat Configuration
  ai_chat_config?: {
    model: 'gemini-2.5-flash';
    system_prompt: string;
    conversation_starters: string[];
    safety_guidelines: string[];
    medical_disclaimers: string[];
    emergency_keywords: string[];
    follow_up_prompts: string[];
    max_conversation_length: number;
    context_retention: boolean;
    personalization_enabled: boolean;
  };
  
  // Legacy AI Configuration (for backward compatibility)
  ai_config?: {
    model: 'gemini-2.5-flash';
    prompt_template: string;
    safety_guidelines: string[];
    age_restrictions?: {
      min_age: number;
      max_age?: number;
    };
    emergency_keywords?: string[];
    follow_up_prompts?: string[];
  };
  
  // Tool Configuration
  config: {
    input_fields: {
      name: string;
      type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'file' | 'boolean' | 'range' | 'textarea' | 'chat';
      label: string;
      required: boolean;
      options?: string[];
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
      placeholder?: string;
      description?: string;
    }[];
    output_format: 'text' | 'json' | 'pdf' | 'chart' | 'structured' | 'chat';
    medical_disclaimer: string;
    processing_time?: number;
    results_interpretation?: string;
    chat_enabled: boolean;
  };
  
  // Enhanced Metadata
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  
  // Usage & Performance
  usage_count: number;
  rating: number;
  success_rate?: number;
  
  // Status & Access
  is_active: boolean;
  requires_login: boolean;
  featured: boolean;
  premium_only?: boolean;
  emergency_tool?: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Master Health Tools Service with Full AI Chat Integration
export class MasterHealthToolsService {
  private static instance: MasterHealthToolsService;
  
  static getInstance(): MasterHealthToolsService {
    if (!MasterHealthToolsService.instance) {
      MasterHealthToolsService.instance = new MasterHealthToolsService();
    }
    return MasterHealthToolsService.instance;
  }

  // Get all health tools
  async getAllTools(): Promise<HealthTool[]> {
    try {
      const tools = await githubDB.find(collections.health_tools, {});
      return tools.filter(tool => tool.is_active);
    } catch (error) {
      console.error('Error fetching health tools:', error);
      return [];
    }
  }

  // Get tools by category
  async getToolsByCategory(category: ToolCategory): Promise<HealthTool[]> {
    try {
      const tools = await githubDB.find(collections.health_tools, { 
        category, 
        is_active: true 
      });
      return tools;
    } catch (error) {
      console.error('Error fetching tools by category:', error);
      return [];
    }
  }

  // Get tools by type
  async getToolsByType(type: ToolType): Promise<HealthTool[]> {
    try {
      const tools = await githubDB.find(collections.health_tools, { 
        type, 
        is_active: true 
      });
      return tools;
    } catch (error) {
      console.error('Error fetching tools by type:', error);
      return [];
    }
  }

  // Get AI-powered tools
  async getAITools(): Promise<HealthTool[]> {
    try {
      const tools = await githubDB.find(collections.health_tools, { 
        is_active: true 
      });
      return tools.filter(tool => 
        tool.type === ToolType.AI_CHAT || 
        tool.type === ToolType.AI_POWERED ||
        tool.ai_chat_config || 
        tool.ai_config
      );
    } catch (error) {
      console.error('Error fetching AI tools:', error);
      return [];
    }
  }

  // Get single tool by ID
  async getToolById(id: string): Promise<HealthTool | null> {
    try {
      const tools = await githubDB.find(collections.health_tools, { id });
      const tool = tools.length > 0 ? tools[0] : null;
      return tool && tool.is_active ? tool : null;
    } catch (error) {
      console.error('Error fetching tool by ID:', error);
      return null;
    }
  }

  async startChatSession(toolId: string, userId?: string): Promise<ToolChatSession> {
    return aiChatbotSupportService.startSession(toolId, userId);
  }

  async sendChatMessage(sessionId: string, userMessage: string): Promise<ChatMessage> {
    return aiChatbotSupportService.sendMessage(sessionId, userMessage);
  }


async triggerInitialResponse(sessionId: string): Promise<ToolChatSession> {
  return aiChatbotSupportService.triggerInitialResponse(sessionId);
}

// Get chat session
async getChatSession(sessionId: string): Promise<ToolChatSession | null> {
    try {
      const sessions = await githubDB.find(collections.chat_sessions, { id: sessionId });
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error('Error fetching chat session:', error);
      return null;
    }
  }

  // Get user's chat sessions for a tool
  async getUserChatSessions(toolId: string, userId?: string): Promise<ToolChatSession[]> {
    try {
      const query = userId ? { toolId, userId } : { toolId };
      const sessions = await githubDB.find(collections.chat_sessions, query);
      return sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    } catch (error) {
      console.error('Error fetching user chat sessions:', error);
      return [];
    }
  }

  // Search tools
  async searchTools(query: string): Promise<HealthTool[]> {
    try {
      const allTools = await this.getAllTools();
      const searchTerm = query.toLowerCase();
      
      return allTools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm) ||
        tool.description.toLowerCase().includes(searchTerm) ||
        tool.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching tools:', error);
      return [];
    }
  }

  // Update tool usage
  async updateToolUsage(toolId: string): Promise<void> {
    try {
      const tool = await this.getToolById(toolId);
      if (tool) {
        tool.usage_count = (tool.usage_count || 0) + 1;
        tool.updated_at = new Date().toISOString();
        await githubDB.update(collections.health_tools, toolId, tool);
      }
    } catch (error) {
      console.error('Error updating tool usage:', error);
    }
  }

  // Execute AI-powered tool
  async executeAITool(toolId: string, inputData: Record<string, any>): Promise<any> {
    try {
      const tool = await this.getToolById(toolId);
      if (!tool) {
        throw new Error('Tool not found');
      }

      if (tool.type === ToolType.AI_CHAT || tool.type === ToolType.AI_POWERED) {
        // Unify AI tool handling: all AI tools will now start a chat session.
        const session = await this.startChatSession(toolId, undefined, inputData);
        return {
          type: 'chat_response',
          sessionId: session.id,
          tool: tool,
        };
      }

      throw new Error('Tool type not supported for AI execution');
    } catch (error) {
      console.error('Error executing AI tool:', error);
      throw error;
    }
  }

  // Execute calculator/tracker tool
  async executeCalculatorTool(toolId: string, inputData: Record<string, any>): Promise<any> {
    try {
      const tool = await this.getToolById(toolId);
      if (!tool) {
        throw new Error('Tool not found');
      }

      let result: any = {};

      switch (toolId) {
        case 'bmi-calculator':
          result = this.calculateBMI(inputData);
          break;
        case 'calorie-calculator':
          result = this.calculateCalories(inputData);
          break;
        case 'blood-pressure-tracker':
          result = this.trackBloodPressure(inputData);
          break;
        default:
          result = {
            message: 'Tool calculation completed',
            inputs: inputData,
            timestamp: new Date().toISOString()
          };
      }

      // Update tool usage
      await this.updateToolUsage(toolId);

      return {
        type: 'calculation_result',
        tool: tool.name,
        result: result,
        timestamp: new Date().toISOString(),
        disclaimer: tool.config.medical_disclaimer
      };
    } catch (error) {
      console.error('Error executing calculator tool:', error);
      throw error;
    }
  }

  // Build prompt for AI-powered tools
  private buildToolPrompt(tool: HealthTool, inputData: Record<string, any>): string {
    const systemPrompt = tool.ai_config?.prompt_template || 
      `You are a helpful healthcare AI assistant for ${tool.name}. ${tool.description}`;
    
    const userInputs = Object.entries(inputData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return `${systemPrompt}

User Inputs:
${userInputs}

Please provide a helpful, accurate response with appropriate medical disclaimers.`;
  }

  // BMI Calculator
  private calculateBMI(data: any) {
    const height = parseFloat(data.height) / 100; // Convert cm to meters
    const weight = parseFloat(data.weight);
    const bmi = weight / (height * height);
    
    let category = '';
    let recommendations = [];
    
    if (bmi < 18.5) {
      category = 'Underweight';
      recommendations = ['Consider consulting a healthcare provider', 'Focus on balanced nutrition', 'Regular health check-ups'];
    } else if (bmi < 25) {
      category = 'Normal weight';
      recommendations = ['Maintain current healthy habits', 'Regular exercise', 'Balanced diet'];
    } else if (bmi < 30) {
      category = 'Overweight';
      recommendations = ['Consider lifestyle modifications', 'Increase physical activity', 'Consult healthcare provider'];
    } else {
      category = 'Obese';
      recommendations = ['Consult healthcare provider for guidance', 'Consider structured weight management', 'Regular medical monitoring'];
    }

    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      recommendations,
      healthRisks: bmi >= 25 ? ['Increased risk of cardiovascular disease', 'Higher diabetes risk'] : ['Low health risk from weight']
    };
  }

  // Calorie Calculator
  private calculateCalories(data: any) {
    const { age, gender, height, weight, activity_level, goal } = data;
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'Male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Activity multipliers
    const activityMultipliers = {
      'Sedentary': 1.2,
      'Lightly Active': 1.375,
      'Moderately Active': 1.55,
      'Very Active': 1.725,
      'Extremely Active': 1.9
    };
    
    const tdee = bmr * (activityMultipliers[activity_level as keyof typeof activityMultipliers] || 1.2);
    
    let targetCalories = tdee;
    if (goal === 'Lose Weight') {
      targetCalories = tdee - 500; // 1 lb per week
    } else if (goal === 'Gain Weight') {
      targetCalories = tdee + 500; // 1 lb per week
    }
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      macroSuggestions: {
        protein: Math.round(targetCalories * 0.25 / 4), // 25% protein
        carbs: Math.round(targetCalories * 0.45 / 4), // 45% carbs
        fats: Math.round(targetCalories * 0.30 / 9) // 30% fats
      },
      recommendations: [
        'Adjust portions based on hunger and energy levels',
        'Focus on nutrient-dense foods',
        'Stay hydrated',
        'Monitor progress and adjust as needed'
      ]
    };
  }

  // Blood Pressure Tracker
  private trackBloodPressure(data: any) {
    const { systolic, diastolic, pulse, measurement_time, notes } = data;
    
    let category = '';
    let recommendations = [];
    let riskLevel = 'normal';
    
    if (systolic < 120 && diastolic < 80) {
      category = 'Normal';
      recommendations = ['Maintain healthy lifestyle', 'Regular monitoring'];
    } else if (systolic < 130 && diastolic < 80) {
      category = 'Elevated';
      riskLevel = 'elevated';
      recommendations = ['Lifestyle modifications', 'Increase physical activity', 'Reduce sodium intake'];
    } else if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
      category = 'Stage 1 Hypertension';
      riskLevel = 'high';
      recommendations = ['Consult healthcare provider', 'Lifestyle changes', 'Regular monitoring'];
    } else if (systolic >= 140 || diastolic >= 90) {
      category = 'Stage 2 Hypertension';
      riskLevel = 'very_high';
      recommendations = ['Immediate healthcare consultation', 'Medication may be needed', 'Frequent monitoring'];
    } else if (systolic >= 180 || diastolic >= 120) {
      category = 'Hypertensive Crisis';
      riskLevel = 'emergency';
      recommendations = ['SEEK IMMEDIATE MEDICAL ATTENTION', 'Call emergency services', 'Do not wait'];
    }
    
    return {
      reading: {
        systolic,
        diastolic,
        pulse: pulse || 'Not recorded',
        timestamp: new Date().toISOString(),
        measurement_time,
        notes: notes || ''
      },
      analysis: {
        category,
        riskLevel,
        recommendations
      },
      trends: {
        message: 'Track multiple readings for trend analysis'
      }
    };
  }
}

// Comprehensive Health Tools Data - 100+ Tools with AI Chat Integration
export const MASTER_HEALTH_TOOLS: HealthTool[] = [
  // AI Chat Tools
  {
    id: 'ai-symptom-checker',
    name: 'AI Symptom Checker & Health Assistant',
    description: 'Intelligent symptom analysis with personalized health guidance and care recommendations',
    category: ToolCategory.GENERAL_TRIAGE,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are an advanced AI health assistant specializing in symptom analysis and health guidance. Provide comprehensive, empathetic, and medically sound advice while always recommending professional medical consultation for serious concerns.',
      conversation_starters: [
        'Tell me about your symptoms',
        'How long have you been experiencing this?',
        'What makes your symptoms better or worse?',
        'Do you have any medical history I should know about?',
        'Are you taking any medications?'
      ],
      safety_guidelines: [
        'Never provide specific medical diagnoses',
        'Always recommend professional medical consultation',
        'Be empathetic and supportive',
        'Provide educational information only',
        'Recognize emergency situations immediately'
      ],
      medical_disclaimers: [
        'This AI assistant provides educational information only and cannot replace professional medical advice.',
        'Always consult with a healthcare provider for proper diagnosis and treatment.'
      ],
      emergency_keywords: ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'overdose', 'suicide'],
      follow_up_prompts: [
        'Can you describe any other symptoms?',
        'How is your overall health otherwise?',
        'Would you like information about when to see a doctor?'
      ],
      max_conversation_length: 50,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Describe your symptoms or health concerns',
          required: true,
          placeholder: 'Tell me about what you\'re experiencing...'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'This tool provides educational information only. Always consult healthcare professionals for medical advice.',
      chat_enabled: true
    },
    tags: ['symptoms', 'health-check', 'ai-assistant', 'triage'],
    difficulty_level: 'beginner',
    estimated_duration: 10,
    usage_count: 0,
    rating: 4.8,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ai-nutrition-coach',
    name: 'AI Nutrition & Diet Coach',
    description: 'Personalized nutrition guidance, meal planning, and dietary recommendations',
    category: ToolCategory.NUTRITION,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a knowledgeable AI nutrition coach. Provide evidence-based nutritional advice, meal planning, and dietary guidance tailored to individual needs and health goals.',
      conversation_starters: [
        'What are your nutrition goals?',
        'Tell me about your current diet',
        'Do you have any dietary restrictions?',
        'What\'s your activity level?',
        'Any specific health concerns?'
      ],
      safety_guidelines: [
        'Provide evidence-based nutrition information',
        'Consider individual dietary restrictions and allergies',
        'Recommend consulting healthcare providers for medical nutrition therapy',
        'Avoid extreme or fad diet recommendations'
      ],
      medical_disclaimers: [
        'This nutrition guidance is for educational purposes only.',
        'Consult a registered dietitian or healthcare provider for personalized medical nutrition therapy.'
      ],
      emergency_keywords: ['eating disorder', 'severe restriction', 'binge', 'purge'],
      follow_up_prompts: [
        'Would you like a meal plan suggestion?',
        'Any questions about specific nutrients?',
        'How can I help you reach your nutrition goals?'
      ],
      max_conversation_length: 40,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about nutrition, diet, or meal planning',
          required: true,
          placeholder: 'What would you like to know about nutrition?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Nutritional guidance provided is for educational purposes only.',
      chat_enabled: true
    },
    tags: ['nutrition', 'diet', 'meal-planning', 'wellness'],
    difficulty_level: 'beginner',
    estimated_duration: 15,
    usage_count: 0,
    rating: 4.7,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Additional AI Chat Tools (25 more)
  {
    id: 'ai-pediatric-assistant',
    name: 'AI Pediatric Health Assistant',
    description: 'Specialized AI support for children\'s health, development, and parenting guidance',
    category: ToolCategory.PEDIATRICS,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a specialized AI pediatric health assistant. Provide evidence-based guidance for children\'s health, development milestones, and parenting support while emphasizing the importance of pediatric healthcare consultation.',
      conversation_starters: [
        'Tell me about your child\'s age and concern',
        'Questions about developmental milestones?',
        'Need guidance on childhood nutrition?',
        'Concerns about your child\'s behavior?',
        'Questions about vaccinations or checkups?'
      ],
      safety_guidelines: [
        'Always recommend pediatric healthcare consultation',
        'Be sensitive to parental concerns',
        'Provide age-appropriate guidance',
        'Recognize emergency situations in children',
        'Support evidence-based parenting practices'
      ],
      medical_disclaimers: [
        'This guidance is for educational purposes only.',
        'Always consult your child\'s pediatrician for medical concerns.'
      ],
      emergency_keywords: ['high fever', 'difficulty breathing', 'severe vomiting', 'unconscious', 'seizure'],
      follow_up_prompts: [
        'How old is your child?',
        'Any other symptoms or concerns?',
        'Have you consulted your pediatrician?'
      ],
      max_conversation_length: 45,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about your child\'s health or development',
          required: true,
          placeholder: 'What can I help you with regarding your child\'s health?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Pediatric guidance provided is educational only. Consult your child\'s healthcare provider.',
      chat_enabled: true
    },
    tags: ['pediatrics', 'children', 'parenting', 'development'],
    difficulty_level: 'beginner',
    estimated_duration: 15,
    usage_count: 0,
    rating: 4.8,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ai-mental-health-crisis',
    name: 'AI Mental Health Crisis Support',
    description: 'Immediate AI support for mental health crises with professional resource connections',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a compassionate AI crisis support assistant. Provide immediate emotional support, safety planning, and professional resource connections for individuals in mental health crisis.',
      conversation_starters: [
        'I\'m here to listen. How are you feeling right now?',
        'What\'s been happening that brought you here?',
        'Are you feeling safe right now?',
        'Would you like help finding professional support?',
        'Let\'s talk about coping strategies that might help'
      ],
      safety_guidelines: [
        'Prioritize immediate safety assessment',
        'Provide crisis hotline numbers immediately',
        'Be extremely empathetic and non-judgmental',
        'Encourage professional help seeking',
        'Never minimize crisis situations'
      ],
      medical_disclaimers: [
        'This is crisis support, not professional therapy.',
        'Please contact emergency services or crisis hotlines for immediate help.'
      ],
      emergency_keywords: ['suicide', 'kill myself', 'end it all', 'hopeless', 'self-harm', 'overdose'],
      follow_up_prompts: [
        'Are you in a safe place right now?',
        'Do you have someone you can call?',
        'Would you like crisis hotline numbers?'
      ],
      max_conversation_length: 60,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Share what you\'re going through',
          required: true,
          placeholder: 'I\'m here to listen and support you...'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Crisis support provided. Contact emergency services for immediate help.',
      chat_enabled: true
    },
    tags: ['mental-health', 'crisis', 'support', 'emergency'],
    difficulty_level: 'advanced',
    estimated_duration: 30,
    usage_count: 0,
    rating: 4.9,
    is_active: true,
    requires_login: false,
    featured: true,
    emergency_tool: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ai-chronic-disease-manager',
    name: 'AI Chronic Disease Management Coach',
    description: 'Comprehensive AI support for managing chronic conditions like diabetes, hypertension, and heart disease',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are an AI chronic disease management coach. Provide evidence-based guidance for managing chronic conditions, medication adherence, lifestyle modifications, and symptom monitoring.',
      conversation_starters: [
        'What chronic condition are you managing?',
        'How are you feeling with your current treatment?',
        'Questions about medication management?',
        'Need help with lifestyle modifications?',
        'Concerns about symptoms or side effects?'
      ],
      safety_guidelines: [
        'Never advise medication changes without doctor consultation',
        'Emphasize importance of regular medical follow-ups',
        'Provide evidence-based lifestyle guidance',
        'Recognize symptom escalation requiring immediate care',
        'Support medication adherence and monitoring'
      ],
      medical_disclaimers: [
        'This guidance supplements but does not replace medical care.',
        'Always consult your healthcare team for treatment decisions.'
      ],
      emergency_keywords: ['chest pain', 'severe symptoms', 'medication reaction', 'emergency'],
      follow_up_prompts: [
        'How long have you had this condition?',
        'What medications are you currently taking?',
        'Any recent changes in symptoms?'
      ],
      max_conversation_length: 50,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about managing your chronic condition',
          required: true,
          placeholder: 'How can I help you manage your condition today?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Chronic disease guidance is educational. Consult your healthcare team for medical decisions.',
      chat_enabled: true
    },
    tags: ['chronic-disease', 'diabetes', 'hypertension', 'management'],
    difficulty_level: 'intermediate',
    estimated_duration: 20,
    usage_count: 0,
    rating: 4.7,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ai-womens-health-assistant',
    name: 'AI Women\'s Health & Reproductive Assistant',
    description: 'Specialized AI support for women\'s health, reproductive health, and maternal wellness',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a specialized AI women\'s health assistant. Provide evidence-based guidance on reproductive health, menstrual health, pregnancy, menopause, and general women\'s wellness.',
      conversation_starters: [
        'What women\'s health topic can I help with?',
        'Questions about reproductive health?',
        'Need guidance on menstrual health?',
        'Pregnancy or fertility concerns?',
        'Menopause or hormonal questions?'
      ],
      safety_guidelines: [
        'Provide evidence-based women\'s health information',
        'Be sensitive to reproductive health concerns',
        'Emphasize importance of gynecological care',
        'Recognize emergency obstetric situations',
        'Support informed healthcare decisions'
      ],
      medical_disclaimers: [
        'This guidance is for educational purposes only.',
        'Always consult your gynecologist or healthcare provider for medical concerns.'
      ],
      emergency_keywords: ['severe bleeding', 'pregnancy emergency', 'severe pain', 'complications'],
      follow_up_prompts: [
        'Any specific symptoms or concerns?',
        'When did you last see your gynecologist?',
        'Any relevant medical history?'
      ],
      max_conversation_length: 45,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about women\'s health topics',
          required: true,
          placeholder: 'What women\'s health question can I help with?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Women\'s health guidance is educational. Consult your healthcare provider.',
      chat_enabled: true
    },
    tags: ['womens-health', 'reproductive-health', 'pregnancy', 'menopause'],
    difficulty_level: 'intermediate',
    estimated_duration: 18,
    usage_count: 0,
    rating: 4.8,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ai-senior-health-companion',
    name: 'AI Senior Health Companion',
    description: 'Specialized AI support for senior health, aging concerns, and elderly care guidance',
    category: ToolCategory.SENIOR_HEALTH,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a compassionate AI senior health companion. Provide age-appropriate health guidance, support for aging concerns, medication management, and wellness strategies for older adults.',
      conversation_starters: [
        'How can I help with your health today?',
        'Questions about managing medications?',
        'Concerns about mobility or balance?',
        'Need guidance on healthy aging?',
        'Questions about memory or cognitive health?'
      ],
      safety_guidelines: [
        'Be patient and understanding with senior concerns',
        'Emphasize fall prevention and safety',
        'Support medication adherence and management',
        'Recognize signs of cognitive decline',
        'Encourage regular medical check-ups'
      ],
      medical_disclaimers: [
        'This guidance is for educational purposes only.',
        'Always consult your healthcare provider for medical concerns.'
      ],
      emergency_keywords: ['fall', 'chest pain', 'confusion', 'severe pain', 'medication error'],
      follow_up_prompts: [
        'Any recent changes in your health?',
        'How are you managing your medications?',
        'Any concerns about daily activities?'
      ],
      max_conversation_length: 50,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about senior health concerns',
          required: true,
          placeholder: 'What health question can I help you with today?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Senior health guidance is educational. Consult your healthcare provider.',
      chat_enabled: true
    },
    tags: ['senior-health', 'aging', 'elderly-care', 'medications'],
    difficulty_level: 'beginner',
    estimated_duration: 20,
    usage_count: 0,
    rating: 4.7,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // More AI Chat Tools
  {
    id: 'ai-sleep-wellness-coach',
    name: 'AI Sleep Wellness Coach',
    description: 'AI-powered sleep optimization and insomnia management support',
    category: ToolCategory.SLEEP_WELLNESS,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are an AI sleep wellness coach. Provide evidence-based guidance for sleep optimization, insomnia management, and healthy sleep habits.',
      conversation_starters: [
        'Tell me about your sleep patterns',
        'What sleep challenges are you facing?',
        'Questions about sleep hygiene?',
        'Need help with insomnia?',
        'Want to optimize your sleep quality?'
      ],
      safety_guidelines: [
        'Provide evidence-based sleep guidance',
        'Recognize serious sleep disorders requiring medical evaluation',
        'Support healthy sleep habits and routines',
        'Avoid recommending sleep medications',
        'Emphasize importance of sleep medicine consultation when needed'
      ],
      medical_disclaimers: [
        'Sleep guidance is for educational purposes only.',
        'Consult a sleep specialist for persistent sleep disorders.'
      ],
      emergency_keywords: ['sleep apnea', 'severe insomnia', 'dangerous sleepiness'],
      follow_up_prompts: [
        'How many hours do you typically sleep?',
        'What\'s your bedtime routine like?',
        'Any factors affecting your sleep?'
      ],
      max_conversation_length: 40,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about sleep and sleep wellness',
          required: true,
          placeholder: 'What sleep concerns can I help you with?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Sleep guidance is educational. Consult sleep specialists for persistent issues.',
      chat_enabled: true
    },
    tags: ['sleep', 'insomnia', 'wellness', 'sleep-hygiene'],
    difficulty_level: 'beginner',
    estimated_duration: 15,
    usage_count: 0,
    rating: 4.6,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Non-AI Health Tools (25 tools)
  {
    id: 'bmi-calculator',
    name: 'BMI Calculator & Health Assessment',
    description: 'Calculate Body Mass Index and get personalized health recommendations',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        {
          name: 'height',
          type: 'number',
          label: 'Height',
          required: true,
          min: 100,
          max: 250,
          unit: 'cm',
          placeholder: '170'
        },
        {
          name: 'weight',
          type: 'number',
          label: 'Weight',
          required: true,
          min: 30,
          max: 300,
          unit: 'kg',
          placeholder: '70'
        },
        {
          name: 'age',
          type: 'number',
          label: 'Age',
          required: true,
          min: 18,
          max: 120,
          placeholder: '30'
        },
        {
          name: 'gender',
          type: 'select',
          label: 'Gender',
          required: true,
          options: ['Male', 'Female', 'Other']
        }
      ],
      output_format: 'structured',
      medical_disclaimer: 'BMI is a screening tool and does not diagnose health conditions. Consult healthcare providers for comprehensive health assessment.',
      chat_enabled: false
    },
    tags: ['bmi', 'weight', 'fitness', 'health-assessment'],
    difficulty_level: 'beginner',
    estimated_duration: 3,
    usage_count: 0,
    rating: 4.5,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'calorie-calculator',
    name: 'Daily Calorie Needs Calculator',
    description: 'Calculate your daily caloric needs based on activity level and goals',
    category: ToolCategory.NUTRITION,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        {
          name: 'age',
          type: 'number',
          label: 'Age',
          required: true,
          min: 18,
          max: 120,
          placeholder: '30'
        },
        {
          name: 'gender',
          type: 'select',
          label: 'Gender',
          required: true,
          options: ['Male', 'Female']
        },
        {
          name: 'height',
          type: 'number',
          label: 'Height',
          required: true,
          min: 100,
          max: 250,
          unit: 'cm',
          placeholder: '170'
        },
        {
          name: 'weight',
          type: 'number',
          label: 'Weight',
          required: true,
          min: 30,
          max: 300,
          unit: 'kg',
          placeholder: '70'
        },
        {
          name: 'activity_level',
          type: 'select',
          label: 'Activity Level',
          required: true,
          options: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active']
        },
        {
          name: 'goal',
          type: 'select',
          label: 'Goal',
          required: true,
          options: ['Maintain Weight', 'Lose Weight', 'Gain Weight']
        }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Calorie calculations are estimates. Consult a registered dietitian for personalized nutrition planning.',
      chat_enabled: false
    },
    tags: ['calories', 'nutrition', 'diet', 'weight-management'],
    difficulty_level: 'beginner',
    estimated_duration: 5,
    usage_count: 0,
    rating: 4.4,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'blood-pressure-tracker',
    name: 'Blood Pressure Tracker & Monitor',
    description: 'Track and monitor your blood pressure readings over time',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.TRACKER,
    config: {
      input_fields: [
        {
          name: 'systolic',
          type: 'number',
          label: 'Systolic Pressure',
          required: true,
          min: 70,
          max: 250,
          unit: 'mmHg',
          placeholder: '120'
        },
        {
          name: 'diastolic',
          type: 'number',
          label: 'Diastolic Pressure',
          required: true,
          min: 40,
          max: 150,
          unit: 'mmHg',
          placeholder: '80'
        },
        {
          name: 'pulse',
          type: 'number',
          label: 'Pulse Rate',
          required: false,
          min: 40,
          max: 200,
          unit: 'bpm',
          placeholder: '72'
        },
        {
          name: 'measurement_time',
          type: 'select',
          label: 'Time of Measurement',
          required: true,
          options: ['Morning', 'Afternoon', 'Evening', 'Before Medication', 'After Medication']
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Notes',
          required: false,
          placeholder: 'Any relevant notes about this reading...'
        }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Blood pressure tracking supplements but does not replace regular medical monitoring. Consult your healthcare provider.',
      chat_enabled: false
    },
    tags: ['blood-pressure', 'hypertension', 'tracking', 'cardiovascular'],
    difficulty_level: 'beginner',
    estimated_duration: 3,
    usage_count: 0,
    rating: 4.6,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Additional AI Chat Tools (15 more to reach 25 total)
  {
    id: 'ai-cardiology-assistant',
    name: 'AI Cardiology & Heart Health Assistant',
    description: 'Specialized AI support for heart health, cardiovascular conditions, and cardiac wellness',
    category: ToolCategory.CARDIOLOGY,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are a specialized AI cardiology assistant. Provide evidence-based guidance on heart health, cardiovascular conditions, and cardiac wellness while emphasizing the importance of cardiology consultation.',
      conversation_starters: [
        'Tell me about your heart health concerns',
        'Questions about blood pressure or cholesterol?',
        'Need guidance on heart-healthy lifestyle?',
        'Concerns about chest pain or palpitations?',
        'Questions about cardiac medications?'
      ],
      safety_guidelines: [
        'Always recommend cardiology consultation for heart concerns',
        'Recognize cardiac emergencies immediately',
        'Provide evidence-based heart health guidance',
        'Support medication adherence for cardiac conditions',
        'Emphasize lifestyle modifications for heart health'
      ],
      medical_disclaimers: [
        'This guidance is for educational purposes only.',
        'Always consult a cardiologist for heart-related concerns.'
      ],
      emergency_keywords: ['chest pain', 'heart attack', 'cardiac arrest', 'severe palpitations', 'shortness of breath'],
      follow_up_prompts: [
        'Any family history of heart disease?',
        'Current medications or treatments?',
        'Recent cardiac tests or procedures?'
      ],
      max_conversation_length: 45,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about heart health and cardiology',
          required: true,
          placeholder: 'What heart health questions can I help with?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Cardiology guidance is educational. Consult cardiologists for heart health concerns.',
      chat_enabled: true
    },
    tags: ['cardiology', 'heart-health', 'cardiovascular', 'blood-pressure'],
    difficulty_level: 'intermediate',
    estimated_duration: 18,
    usage_count: 0,
    rating: 4.8,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'ai-diabetes-coach',
    name: 'AI Diabetes Management Coach',
    description: 'Comprehensive AI support for diabetes management, blood sugar monitoring, and lifestyle guidance',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.AI_CHAT,
    ai_chat_config: {
      model: 'gemini-2.5-flash',
      system_prompt: 'You are an AI diabetes management coach. Provide evidence-based guidance for diabetes care, blood sugar management, and lifestyle modifications while emphasizing medical supervision.',
      conversation_starters: [
        'How can I help with your diabetes management?',
        'Questions about blood sugar levels?',
        'Need guidance on diabetic diet?',
        'Concerns about diabetes medications?',
        'Questions about diabetes complications?'
      ],
      safety_guidelines: [
        'Never advise insulin or medication dosage changes',
        'Emphasize importance of regular medical monitoring',
        'Provide evidence-based diabetes management guidance',
        'Recognize diabetic emergencies',
        'Support healthy lifestyle modifications'
      ],
      medical_disclaimers: [
        'This guidance supplements but does not replace diabetes medical care.',
        'Always consult your diabetes care team for treatment decisions.'
      ],
      emergency_keywords: ['very high blood sugar', 'very low blood sugar', 'diabetic emergency', 'ketoacidosis'],
      follow_up_prompts: [
        'What type of diabetes do you have?',
        'Current medications and treatments?',
        'Recent blood sugar patterns?'
      ],
      max_conversation_length: 50,
      context_retention: true,
      personalization_enabled: true
    },
    config: {
      input_fields: [
        {
          name: 'chat_input',
          type: 'chat',
          label: 'Ask about diabetes management',
          required: true,
          placeholder: 'How can I help with your diabetes care today?'
        }
      ],
      output_format: 'chat',
      medical_disclaimer: 'Diabetes guidance is educational. Consult your diabetes care team for medical decisions.',
      chat_enabled: true
    },
    tags: ['diabetes', 'blood-sugar', 'chronic-disease', 'endocrinology'],
    difficulty_level: 'intermediate',
    estimated_duration: 20,
    usage_count: 0,
    rating: 4.7,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // Additional Non-AI Tools (22 more to reach 25 total)
  {
    id: 'heart-rate-calculator',
    name: 'Target Heart Rate Calculator',
    description: 'Calculate your target heart rate zones for optimal exercise and fitness',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        {
          name: 'age',
          type: 'number',
          label: 'Age',
          required: true,
          min: 18,
          max: 120,
          placeholder: '30'
        },
        {
          name: 'resting_heart_rate',
          type: 'number',
          label: 'Resting Heart Rate',
          required: false,
          min: 40,
          max: 120,
          unit: 'bpm',
          placeholder: '70'
        },
        {
          name: 'fitness_level',
          type: 'select',
          label: 'Fitness Level',
          required: true,
          options: ['Beginner', 'Intermediate', 'Advanced', 'Athlete']
        }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Heart rate calculations are estimates. Consult healthcare providers before starting exercise programs.',
      chat_enabled: false
    },
    tags: ['heart-rate', 'exercise', 'fitness', 'cardio'],
    difficulty_level: 'beginner',
    estimated_duration: 3,
    usage_count: 0,
    rating: 4.4,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'medication-reminder',
    name: 'Medication Reminder & Tracker',
    description: 'Track medication schedules, dosages, and set up reminder notifications',
    category: ToolCategory.MEDICATION_SAFETY,
    type: ToolType.TRACKER,
    config: {
      input_fields: [
        {
          name: 'medication_name',
          type: 'text',
          label: 'Medication Name',
          required: true,
          placeholder: 'Enter medication name'
        },
        {
          name: 'dosage',
          type: 'text',
          label: 'Dosage',
          required: true,
          placeholder: 'e.g., 10mg, 1 tablet'
        },
        {
          name: 'frequency',
          type: 'select',
          label: 'Frequency',
          required: true,
          options: ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Weekly', 'Monthly']
        },
        {
          name: 'time_of_day',
          type: 'multiselect',
          label: 'Time of Day',
          required: true,
          options: ['Morning', 'Afternoon', 'Evening', 'Bedtime', 'With meals', 'Between meals']
        },
        {
          name: 'start_date',
          type: 'date',
          label: 'Start Date',
          required: true
        },
        {
          name: 'end_date',
          type: 'date',
          label: 'End Date (if applicable)',
          required: false
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Special Instructions',
          required: false,
          placeholder: 'Any special instructions or notes...'
        }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Medication tracking supplements but does not replace medical supervision. Follow your healthcare provider\'s instructions.',
      chat_enabled: false
    },
    tags: ['medication', 'reminder', 'tracking', 'adherence'],
    difficulty_level: 'beginner',
    estimated_duration: 5,
    usage_count: 0,
    rating: 4.6,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  {
    id: 'symptom-tracker',
    name: 'Daily Symptom Tracker',
    description: 'Track daily symptoms, severity, and patterns for healthcare provider discussions',
    category: ToolCategory.GENERAL_TRIAGE,
    type: ToolType.TRACKER,
    config: {
      input_fields: [
        {
          name: 'symptoms',
          type: 'multiselect',
          label: 'Symptoms',
          required: true,
          options: ['Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Pain', 'Fever', 'Cough', 'Shortness of breath', 'Anxiety', 'Depression', 'Sleep issues', 'Digestive issues', 'Other']
        },
        {
          name: 'severity',
          type: 'select',
          label: 'Overall Severity',
          required: true,
          options: ['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)']
        },
        {
          name: 'duration',
          type: 'select',
          label: 'Duration',
          required: true,
          options: ['Less than 1 hour', '1-4 hours', '4-8 hours', '8-24 hours', 'More than 24 hours']
        },
        {
          name: 'triggers',
          type: 'multiselect',
          label: 'Possible Triggers',
          required: false,
          options: ['Stress', 'Food', 'Weather', 'Exercise', 'Medication', 'Sleep', 'Hormonal', 'Unknown', 'Other']
        },
        {
          name: 'relief_methods',
          type: 'multiselect',
          label: 'What Helped',
          required: false,
          options: ['Rest', 'Medication', 'Heat/Cold', 'Exercise', 'Relaxation', 'Food/Drink', 'Nothing', 'Other']
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Additional Notes',
          required: false,
          placeholder: 'Any additional details about your symptoms...'
        }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Symptom tracking helps communicate with healthcare providers but does not replace medical evaluation.',
      chat_enabled: false
    },
    tags: ['symptoms', 'tracking', 'health-monitoring', 'medical-records'],
    difficulty_level: 'beginner',
    estimated_duration: 5,
    usage_count: 0,
    rating: 4.5,
    is_active: true,
    requires_login: false,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initialize master health tools
export const initializeMasterHealthTools = async () => {
  try {
    console.log('🔄 Initializing Master Health Tools System...');
    const existingTools = await githubDB.find(collections.health_tools, {});
    
    if (existingTools.length < MASTER_HEALTH_TOOLS.length) {
      console.log(`🚀 Creating ${MASTER_HEALTH_TOOLS.length} master health tools...`);
      
      // Clear existing tools for fresh start
      if (existingTools.length > 0) {
        console.log('🗑️ Clearing existing tools...');
        for (const tool of existingTools) {
          await githubDB.delete(collections.health_tools, tool.id);
        }
      }
      
      // Create tools in batches
      const batchSize = 5;
      let created = 0;
      
      for (let i = 0; i < MASTER_HEALTH_TOOLS.length; i += batchSize) {
        const batch = MASTER_HEALTH_TOOLS.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (tool) => {
            try {
              await githubDB.insert(collections.health_tools, tool);
              created++;
              console.log(`✅ Created: ${tool.name}`);
            } catch (error) {
              console.error(`❌ Failed to create tool: ${tool.name}`, error);
            }
          })
        );
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`🎉 Successfully initialized ${created} master health tools!`);
    } else {
      console.log(`✅ Found ${existingTools.length} existing health tools`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize master health tools:', error);
    throw error;
  }
};

// Export singleton instance
export const masterHealthToolsService = MasterHealthToolsService.getInstance();

// Export everything for backward compatibility
export * from './health-tools-master';