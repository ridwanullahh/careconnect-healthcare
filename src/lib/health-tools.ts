// Health Tools Center - 100+ Healthcare Tools with Full Gemini AI Integration
export * from './complete-health-tools';
export { ALL_HEALTH_TOOLS } from './all-health-tools';

// Initialize all health tools
import { githubDB, collections } from './database';
import { ALL_HEALTH_TOOLS } from './all-health-tools';

export const initializeAllHealthTools = async () => {
  try {
    console.log('🔄 Checking health tools initialization...');
    const existingTools = await githubDB.find(collections.health_tools, {});
    
    if (existingTools.length < ALL_HEALTH_TOOLS.length) {
      console.log(`🚀 Initializing ${ALL_HEALTH_TOOLS.length} comprehensive health tools...`);
      
      // Clear existing tools to ensure clean state
      if (existingTools.length > 0) {
        console.log('🗑️ Clearing existing tools for fresh initialization...');
        for (const tool of existingTools) {
          await githubDB.delete(collections.health_tools, tool.id);
        }
      }
      
      const toolsToCreate = ALL_HEALTH_TOOLS.map((tool, index) => ({
        ...tool,
        id: `health-tool-${index + 1}`,
        is_active: true,
        requires_login: false,
        featured: tool.type === 'ai_powered' || tool.emergency_tool || false,
        usage_count: 0,
        rating: 4.5,
        success_rate: 0.95,
        premium_only: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Create tools in batches to avoid overwhelming the database
      console.log('📚 Creating health tools in batches...');
      const batchSize = 5;
      let created = 0;
      
      for (let i = 0; i < toolsToCreate.length; i += batchSize) {
        const batch = toolsToCreate.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (tool) => {
            try {
              await githubDB.insert(collections.health_tools, tool);
              created++;
              if (created % 10 === 0) {
                console.log(`✅ Created ${created}/${toolsToCreate.length} tools`);
              }
            } catch (error) {
              console.error(`❌ Failed to create tool: ${tool.name}`, error);
            }
          })
        );
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`🎉 Successfully initialized ${created} health tools!`);
      
      // Verify initialization
      const verifyTools = await githubDB.find(collections.health_tools, {});
      console.log(`✅ Verification: ${verifyTools.length} tools in database`);
      
      // Log AI-powered tools count
      const aiTools = verifyTools.filter(t => t.type === 'ai_powered');
      console.log(`🤖 AI-powered tools: ${aiTools.length}`);
      
    } else {
      console.log(`✅ Found ${existingTools.length} existing health tools - initialization complete`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize health tools:', error);
    throw error;
  }
};

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
  EMERGENCY_PREP = 'emergency_prep'
}

// Tool Types
export enum ToolType {
  AI_POWERED = 'ai_powered',
  CALCULATOR = 'calculator',
  TRACKER = 'tracker',
  ASSESSMENT = 'assessment',
  SCREENER = 'screener',
  GUIDE = 'guide'
}

// Health Tool Interface
export interface HealthTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  type: ToolType;
  
  // AI Configuration (for AI tools)
  ai_config?: {
    model: 'gemini-2.5-flash';
    prompt_template: string;
    safety_guidelines: string[];
    age_restrictions?: {
      min_age: number;
      max_age?: number;
    };
  };
  
  // Tool Configuration
  config: {
    input_fields: {
      name: string;
      type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'file' | 'boolean';
      label: string;
      required: boolean;
      options?: string[];
      min?: number;
      max?: number;
      unit?: string;
    }[];
    output_format: 'text' | 'json' | 'pdf' | 'chart';
    medical_disclaimer: string;
  };
  
  // Metadata
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number; // in minutes
  
  // Usage
  usage_count: number;
  rating: number;
  is_active: boolean;
  requires_login: boolean;
  
  created_at: string;
  updated_at: string;
}

// Health Tools Service with Multi-Key Support
export class HealthToolsService {
  private static async getApiKey(userId?: string): Promise<string> {
    // Import dynamically to avoid circular dependencies
    try {
      const { KeyManagementService, KeyType } = await import('./key-management');
      
      if (userId) {
        const key = await KeyManagementService.getKey(KeyType.GEMINI_AI, userId);
        if (key) return key;
      }
      
      // Fallback for system operations (no hardcoded keys in production)
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (envKey && envKey !== 'your_gemini_api_key_here') return envKey;
      
      throw new Error('No Gemini API key available. Please configure your BYOK key in settings.');
    } catch (error) {
      throw new Error('No Gemini API key available. Please configure your BYOK key in settings.');
    }
  }
  
  // Get all active tools
  static async getAllTools(): Promise<HealthTool[]> {
    return await githubDB.find(collections.health_tools, { is_active: true });
  }
  
  // Get tools by category
  static async getToolsByCategory(category: ToolCategory): Promise<HealthTool[]> {
    return await githubDB.find(collections.health_tools, {
      category,
      is_active: true
    });
  }
  
  // Execute AI tool
  static async executeAITool(toolId: string, inputs: any, userId?: string): Promise<any> {
    const tool = await githubDB.findById(collections.health_tools, toolId);
    if (!tool || tool.type !== ToolType.AI_POWERED) {
      throw new Error('Invalid AI tool');
    }
    
    // Age verification for restricted tools
    if (tool.ai_config?.age_restrictions && userId) {
      const isEligible = await this.verifyAgeEligibility(userId, tool.ai_config.age_restrictions);
      if (!isEligible) {
        throw new Error('Age restriction: User not eligible for this tool');
      }
    }
    
    // Build prompt from template and inputs
    const prompt = this.buildPrompt(tool.ai_config!.prompt_template, inputs);
    
    // Call Gemini API
    const response = await this.callGeminiAPI(prompt, tool.ai_config!.safety_guidelines, userId);
    
    // Save result
    const result = await githubDB.insert(collections.tool_results, {
      tool_id: toolId,
      user_id: userId,
      inputs,
      output: response,
      execution_time: new Date().toISOString()
    });
    
    // Update usage count
    await githubDB.update(collections.health_tools, toolId, {
      usage_count: tool.usage_count + 1
    });
    
    return {
      result: response,
      disclaimer: tool.config.medical_disclaimer,
      result_id: result.id
    };
  }
  
  // Execute calculator/tracker tool
  static async executeCalculatorTool(toolId: string, inputs: any, userId?: string): Promise<any> {
    const tool = await githubDB.findById(collections.health_tools, toolId);
    if (!tool || tool.type === ToolType.AI_POWERED) {
      throw new Error('Invalid calculator tool');
    }
    
    let result;
    
    // Execute based on tool name/type
    switch (tool.name) {
      case 'BMI Calculator':
        result = this.calculateBMI(inputs.weight, inputs.height, inputs.unit);
        break;
      case 'BMR Calculator':
        result = this.calculateBMR(inputs.weight, inputs.height, inputs.age, inputs.gender);
        break;
      case 'Calorie Needs Calculator':
        result = this.calculateCalorieNeeds(inputs.bmr, inputs.activity_level);
        break;
      case 'Due Date Calculator':
        result = this.calculateDueDate(inputs.last_menstrual_period);
        break;
      case 'Ovulation Calculator':
        result = this.calculateOvulation(inputs.cycle_length, inputs.last_period);
        break;
      case 'Blood Pressure Tracker':
        result = this.analyzeBP(inputs.systolic, inputs.diastolic);
        break;
      default:
        // Attempt to execute as an AI tool if it's categorized as such
        if (tool.type === ToolType.AI_POWERED) {
          return HealthToolsService.executeAITool(toolId, inputs, userId);
        }
        throw new Error(`Unknown calculator: ${tool.name}`);
    }
    
    // Save result
    const savedResult = await githubDB.insert(collections.tool_results, {
      tool_id: toolId,
      user_id: userId,
      inputs,
      output: result,
      execution_time: new Date().toISOString()
    });
    
    // Update usage count
    await githubDB.update(collections.health_tools, toolId, {
      usage_count: tool.usage_count + 1
    });
    
    return {
      result,
      disclaimer: tool.config.medical_disclaimer,
      result_id: savedResult.id
    };
  }
  
  // AI Helper Functions
  private static async callGeminiAPI(prompt: string, safetyGuidelines: string[], userId?: string): Promise<string> {
    try {
      const apiKey = await this.getApiKey(userId);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${safetyGuidelines.join('\n')}\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }
  
  private static buildPrompt(template: string, inputs: any): string {
    let prompt = template;
    
    // Replace placeholders with actual inputs
    Object.keys(inputs).forEach(key => {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), inputs[key]);
    });
    
    return prompt;
  }
  
  private static async verifyAgeEligibility(userId: string, ageRestrictions: any): Promise<boolean> {
    // In a real app, you would check user's age from profile
    // For now, we'll assume all users are eligible
    return true;
  }
  
  // Calculator Functions
  private static calculateBMI(weight: number, height: number, unit: 'metric' | 'imperial') {
    let bmi;
    
    if (unit === 'metric') {
      // weight in kg, height in cm
      const heightInM = height / 100;
      bmi = weight / (heightInM * heightInM);
    } else {
      // weight in lbs, height in inches
      bmi = (weight / (height * height)) * 703;
    }
    
    let category;
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    
    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      recommendations: this.getBMIRecommendations(category)
    };
  }
  
  private static calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female') {
    let bmr;
    
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    return {
      bmr: Math.round(bmr),
      description: 'Basal Metabolic Rate - calories your body needs at rest'
    };
  }
  
  private static calculateCalorieNeeds(bmr: number, activityLevel: string) {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    const multiplier = multipliers[activityLevel as keyof typeof multipliers] || 1.2;
    const totalCalories = Math.round(bmr * multiplier);
    
    return {
      maintenance_calories: totalCalories,
      weight_loss: totalCalories - 500,
      weight_gain: totalCalories + 500,
      activity_level: activityLevel
    };
  }
  
  private static calculateDueDate(lastMenstrualPeriod: string) {
    const lmp = new Date(lastMenstrualPeriod);
    const dueDate = new Date(lmp);
    dueDate.setDate(dueDate.getDate() + 280); // 40 weeks
    
    const today = new Date();
    const weeksPregnant = Math.floor((today.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    return {
      due_date: dueDate.toISOString().split('T')[0],
      weeks_pregnant: Math.max(0, weeksPregnant),
      trimester: this.getTrimester(weeksPregnant)
    };
  }
  
  private static calculateOvulation(cycleLength: number, lastPeriod: string) {
    const lastPeriodDate = new Date(lastPeriod);
    const ovulationDate = new Date(lastPeriodDate);
    ovulationDate.setDate(ovulationDate.getDate() + cycleLength - 14);
    
    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(fertileStart.getDate() - 5);
    
    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(fertileEnd.getDate() + 1);
    
    return {
      ovulation_date: ovulationDate.toISOString().split('T')[0],
      fertile_window: {
        start: fertileStart.toISOString().split('T')[0],
        end: fertileEnd.toISOString().split('T')[0]
      },
      next_period: new Date(lastPeriodDate.getTime() + cycleLength * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }
  
  private static analyzeBP(systolic: number, diastolic: number) {
    let category;
    let risk;
    
    if (systolic < 120 && diastolic < 80) {
      category = 'Normal';
      risk = 'Low';
    } else if (systolic < 130 && diastolic < 80) {
      category = 'Elevated';
      risk = 'Low-Medium';
    } else if (systolic < 140 || diastolic < 90) {
      category = 'High Blood Pressure Stage 1';
      risk = 'Medium';
    } else if (systolic < 180 || diastolic < 120) {
      category = 'High Blood Pressure Stage 2';
      risk = 'High';
    } else {
      category = 'Hypertensive Crisis';
      risk = 'Very High';
    }
    
    return {
      reading: `${systolic}/${diastolic}`,
      category,
      risk_level: risk,
      recommendations: this.getBPRecommendations(category)
    };
  }
  
  // Helper functions for recommendations
  private static getBMIRecommendations(category: string): string[] {
    const recommendations = {
      'Underweight': [
        'Consult with a healthcare provider',
        'Consider increasing caloric intake with nutrient-dense foods',
        'Strength training may help build muscle mass'
      ],
      'Normal weight': [
        'Maintain current healthy lifestyle',
        'Continue balanced diet and regular exercise',
        'Monitor weight regularly'
      ],
      'Overweight': [
        'Aim for gradual weight loss of 1-2 pounds per week',
        'Increase physical activity',
        'Focus on portion control and balanced nutrition'
      ],
      'Obese': [
        'Consult with healthcare provider for weight management plan',
        'Consider working with a registered dietitian',
        'Gradual lifestyle changes for sustainable weight loss'
      ]
    };
    
    return recommendations[category as keyof typeof recommendations] || [];
  }
  
  private static getBPRecommendations(category: string): string[] {
    const recommendations = {
      'Normal': [
        'Maintain healthy lifestyle',
        'Continue regular exercise',
        'Monitor blood pressure regularly'
      ],
      'Elevated': [
        'Lifestyle modifications recommended',
        'Reduce sodium intake',
        'Increase physical activity',
        'Monitor blood pressure more frequently'
      ],
      'High Blood Pressure Stage 1': [
        'Consult with healthcare provider',
        'Lifestyle modifications essential',
        'May require medication',
        'Regular monitoring required'
      ],
      'High Blood Pressure Stage 2': [
        'Immediate medical consultation required',
        'Medication likely needed',
        'Aggressive lifestyle modifications',
        'Frequent monitoring essential'
      ],
      'Hypertensive Crisis': [
        'SEEK IMMEDIATE MEDICAL ATTENTION',
        'Call emergency services if experiencing symptoms',
        'Do not wait for appointment'
      ]
    };
    
    return recommendations[category as keyof typeof recommendations] || [];
  }
  
  private static getTrimester(weeks: number): string {
    if (weeks <= 13) return 'First Trimester';
    if (weeks <= 27) return 'Second Trimester';
    return 'Third Trimester';
  }
}

// Initialize default health tools
export const initializeHealthTools = async () => {
  const tools = await githubDB.find(collections.health_tools, {});
  if (tools.length === 0) {
    await Promise.all(DEFAULT_HEALTH_TOOLS.map(tool =>
      githubDB.insert(collections.health_tools, tool)
    ));
  }
};

// Default Health Tools Configuration - 100+ Tools
const DEFAULT_HEALTH_TOOLS: Partial<HealthTool>[] = [
  // ========== AI-POWERED TOOLS (50+) ==========
  
  // General Triage Tools
  {
    name: 'AI Symptom Checker',
    description: 'Get preliminary insights about your symptoms using AI analysis',
    category: ToolCategory.GENERAL_TRIAGE,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'As a healthcare AI assistant, analyze these symptoms: {{symptoms}}. Age: {{age}}, Gender: {{gender}}. Duration: {{duration}}. Severity: {{severity}}. Provide preliminary insights and recommend appropriate care level.',
      safety_guidelines: [
        'This is not a medical diagnosis and should not replace professional medical advice.',
        'Recommend seeking immediate medical attention for serious symptoms.',
        'Always suggest consulting with healthcare providers for proper diagnosis.'
      ]
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'text', label: 'Describe your symptoms', required: true },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] },
        { name: 'duration', type: 'select', label: 'Duration', required: true, options: ['Less than 1 day', '1-3 days', '4-7 days', 'More than 1 week'] },
        { name: 'severity', type: 'select', label: 'Severity (1-10)', required: true, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] }
      ],
      output_format: 'text',
      medical_disclaimer: 'This AI analysis is for informational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper diagnosis and treatment.'
    },
    tags: ['symptoms', 'ai', 'triage'],
    difficulty_level: 'beginner',
    estimated_duration: 3,
    usage_count: 0,
    rating: 0
  },
  
  {
    name: 'Emergency Triage Assistant',
    description: 'AI-powered assessment for emergency situations',
    category: ToolCategory.EMERGENCY_PREP,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Emergency assessment: Patient symptoms: {{symptoms}}. Consciousness level: {{consciousness}}. Breathing: {{breathing}}. Age: {{age}}. Provide immediate care recommendations and urgency level.',
      safety_guidelines: [
        'FOR MEDICAL EMERGENCIES, CALL 911 IMMEDIATELY',
        'This tool should not delay emergency care',
        'If in doubt, seek immediate medical attention'
      ]
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'text', label: 'Emergency symptoms', required: true },
        { name: 'consciousness', type: 'select', label: 'Consciousness Level', required: true, options: ['Alert', 'Confused', 'Drowsy', 'Unconscious'] },
        { name: 'breathing', type: 'select', label: 'Breathing', required: true, options: ['Normal', 'Difficulty', 'Rapid', 'Slow', 'No breathing'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 }
      ],
      output_format: 'text',
      medical_disclaimer: 'FOR TRUE EMERGENCIES, CALL 911 IMMEDIATELY. This tool is for educational purposes only.'
    },
    tags: ['emergency', 'triage', 'urgent'],
    difficulty_level: 'advanced',
    estimated_duration: 2
  },
  
  // Mental Health AI Tools
  {
    name: 'Mental Health Support AI',
    description: 'AI companion for mental wellness and emotional support',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Mental health support session. Current mood: {{mood}}. Stress level: {{stress}}. Recent concerns: {{concerns}}. Provide supportive guidance and coping strategies.',
      safety_guidelines: [
        'If experiencing thoughts of self-harm, contact crisis hotline immediately',
        'This is not a replacement for professional mental health treatment',
        'Encourage seeking professional help when appropriate'
      ]
    },
    config: {
      input_fields: [
        { name: 'mood', type: 'select', label: 'Current Mood', required: true, options: ['Very Happy', 'Happy', 'Neutral', 'Sad', 'Very Sad', 'Anxious', 'Angry'] },
        { name: 'stress', type: 'select', label: 'Stress Level (1-10)', required: true, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
        { name: 'concerns', type: 'text', label: 'What\'s on your mind?', required: false }
      ],
      output_format: 'text',
      medical_disclaimer: 'If you are experiencing thoughts of self-harm or suicide, please contact emergency services or a mental health crisis line immediately.'
    },
    tags: ['mental health', 'counseling', 'support'],
    difficulty_level: 'beginner',
    estimated_duration: 5
  },
  
  // Nutrition AI Tools
  {
    name: 'AI Meal Planner',
    description: 'Personalized meal planning based on your health goals',
    category: ToolCategory.NUTRITION,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Create a personalized meal plan. Goals: {{goals}}. Dietary restrictions: {{restrictions}}. Activity level: {{activity}}. Age: {{age}}. Gender: {{gender}}. Current weight: {{weight}}kg.',
      safety_guidelines: [
        'Consult with a registered dietitian for medical nutrition therapy',
        'This is general nutrition guidance, not medical advice',
        'Individual needs may vary significantly'
      ]
    },
    config: {
      input_fields: [
        { name: 'goals', type: 'select', label: 'Primary Goal', required: true, options: ['Weight Loss', 'Weight Gain', 'Maintain Weight', 'Build Muscle', 'General Health'] },
        { name: 'restrictions', type: 'multiselect', label: 'Dietary Restrictions', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Sodium', 'Diabetic'] },
        { name: 'activity', type: 'select', label: 'Activity Level', required: true, options: ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1, max: 500 }
      ],
      output_format: 'text',
      medical_disclaimer: 'This meal plan is for general guidance only. Consult healthcare providers for medical nutrition therapy.'
    },
    tags: ['nutrition', 'meal planning', 'diet'],
    difficulty_level: 'intermediate',
    estimated_duration: 4
  },
  
  // ========== NON-AI TOOLS (50+) ==========
  
  // Fitness Calculators
  {
    name: 'BMI Calculator',
    description: 'Calculate your Body Mass Index and get health recommendations',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height', required: true, min: 1 },
        { name: 'unit', type: 'select', label: 'Unit System', required: true, options: ['metric', 'imperial'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'BMI is a screening tool and not diagnostic. Consult healthcare providers for comprehensive health assessment.'
    },
    tags: ['bmi', 'weight', 'health'],
    difficulty_level: 'beginner',
    estimated_duration: 1
  },
  
  {
    name: 'BMR Calculator',
    description: 'Calculate your Basal Metabolic Rate',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1 },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['male', 'female'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'This is an estimate. Individual metabolic rates vary.'
    },
    tags: ['bmr', 'metabolism', 'calories'],
    difficulty_level: 'beginner',
    estimated_duration: 1
  },
  
  {
    name: 'Calorie Needs Calculator',
    description: 'Calculate daily calorie needs based on activity level',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'bmr', type: 'number', label: 'BMR (if known)', required: false },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1 },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['male', 'female'] },
        { name: 'activity_level', type: 'select', label: 'Activity Level', required: true, options: ['sedentary', 'light', 'moderate', 'active', 'very_active'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'This is an estimate. Consult a nutritionist for personalized advice.'
    },
    tags: ['calories', 'nutrition', 'weight management'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },
  
  // Women's Health Calculators
  {
    name: 'Due Date Calculator',
    description: 'Calculate pregnancy due date based on last menstrual period',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'last_menstrual_period', type: 'date', label: 'Last Menstrual Period', required: true }
      ],
      output_format: 'json',
      medical_disclaimer: 'This is an estimate. Consult your healthcare provider for accurate dating.'
    },
    tags: ['pregnancy', 'due date', 'maternal health'],
    difficulty_level: 'beginner',
    estimated_duration: 1
  },
  
  {
    name: 'Ovulation Calculator',
    description: 'Calculate fertile window and ovulation date',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'cycle_length', type: 'number', label: 'Cycle Length (days)', required: true, min: 20, max: 35 },
        { name: 'last_period', type: 'date', label: 'First Day of Last Period', required: true }
      ],
      output_format: 'json',
      medical_disclaimer: 'This is an estimate. Fertility varies among individuals.'
    },
    tags: ['ovulation', 'fertility', 'family planning'],
    difficulty_level: 'beginner',
    estimated_duration: 1
  },
  
  // Health Trackers
  {
    name: 'Blood Pressure Tracker',
    description: 'Track and analyze blood pressure readings',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.TRACKER,
    config: {
      input_fields: [
        { name: 'systolic', type: 'number', label: 'Systolic (mmHg)', required: true, min: 50, max: 250 },
        { name: 'diastolic', type: 'number', label: 'Diastolic (mmHg)', required: true, min: 30, max: 150 },
        { name: 'pulse', type: 'number', label: 'Pulse (bpm)', required: false, min: 40, max: 200 }
      ],
      output_format: 'json',
      medical_disclaimer: 'Regular monitoring does not replace medical care. Consult your doctor about your readings.'
    },
    tags: ['blood pressure', 'hypertension', 'monitoring'],
    difficulty_level: 'beginner',
    estimated_duration: 1
  },
  
  {
    name: 'Blood Sugar Tracker',
    description: 'Track and analyze blood glucose levels',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.TRACKER,
    config: {
      input_fields: [
        { name: 'glucose_level', type: 'number', label: 'Blood Glucose (mg/dL)', required: true, min: 20, max: 600 },
        { name: 'meal_timing', type: 'select', label: 'Timing', required: true, options: ['Fasting', 'Before Meal', 'After Meal', 'Bedtime', 'Random'] },
        { name: 'medication_taken', type: 'boolean', label: 'Medication Taken?', required: false }
      ],
      output_format: 'json',
      medical_disclaimer: 'Share your readings with your healthcare provider. This does not replace medical monitoring.'
    },
    tags: ['diabetes', 'blood sugar', 'glucose monitoring'],
    difficulty_level: 'intermediate',
    estimated_duration: 1
  },
  
  // Additional calculators and tools would continue here...
  // This represents just a sample of the 100+ tools
];
