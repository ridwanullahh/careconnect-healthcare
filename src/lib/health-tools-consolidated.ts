// Consolidated Health Tools Service - Single Source of Truth
import { githubDB, collections } from './database';
import { KeyManagementService, KeyType } from './key-management';
import { logger } from './observability';

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
  SKIN_HEALTH = 'skin_health'
}

export enum ToolType {
  AI_POWERED = 'ai_powered',
  CALCULATOR = 'calculator',
  TRACKER = 'tracker',
  ASSESSMENT = 'assessment',
  SCREENER = 'screener',
  GUIDE = 'guide',
  EMERGENCY_TOOL = 'emergency_tool',
  WELLNESS_COACH = 'wellness_coach'
}

export interface HealthTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  type: ToolType;
  
  ai_config?: {
    model: 'gemini-2.5-flash';
    prompt_template: string;
    safety_guidelines: string[];
    emergency_keywords?: string[];
    follow_up_prompts?: string[];
  };
  
  config: {
    input_fields: {
      name: string;
      type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'file' | 'boolean' | 'textarea' | 'range';
      label: string;
      required: boolean;
      options?: string[];
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
      placeholder?: string;
    }[];
    output_format: 'text' | 'json' | 'structured';
    medical_disclaimer: string;
    processing_time?: number;
    results_interpretation?: string;
  };
  
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  featured: boolean;
  emergency_tool?: boolean;
  
  usage_count: number;
  rating: number;
  success_rate: number;
  is_active: boolean;
  requires_login: boolean;
  premium_only: boolean;
  
  created_at: string;
  updated_at: string;
}

export class ConsolidatedHealthToolsService {
  // Initialize tools (idempotent - won't duplicate)
  static async initializeTools(): Promise<void> {
    try {
      await logger.info('tools_init_started', 'Initializing health tools');
      
      const existingTools = await githubDB.find(collections.health_tools, {});
      const toolsToCreate = COMPREHENSIVE_TOOLS_LIST.filter(tool => 
        !existingTools.some(existing => existing.name === tool.name)
      );

      if (toolsToCreate.length === 0) {
        await logger.info('tools_already_initialized', `Found ${existingTools.length} existing tools`);
        return;
      }

      let created = 0;
      for (const tool of toolsToCreate) {
        try {
          await githubDB.insert(collections.health_tools, {
            ...tool,
            id: crypto.randomUUID(),
            usage_count: 0,
            rating: 4.5,
            success_rate: 0.95,
            is_active: true,
            requires_login: false,
            premium_only: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          created++;
        } catch (error) {
          await logger.error('tool_creation_failed', `Failed to create tool: ${tool.name}`, {
            error: error.message
          });
        }
      }

      await logger.info('tools_init_completed', `Initialized ${created} new health tools`);
    } catch (error) {
      await logger.error('tools_init_failed', 'Health tools initialization failed', {
        error: error.message
      });
      throw error;
    }
  }

  // Execute AI tool with BYOK
  static async executeAITool(toolId: string, inputs: any, userId?: string): Promise<any> {
    try {
      const tool = await githubDB.findById(collections.health_tools, toolId);
      if (!tool || tool.type !== ToolType.AI_POWERED) {
        throw new Error('Invalid AI tool');
      }

      await logger.info('ai_tool_execution_started', 'AI tool execution started', {
        tool_id: toolId,
        tool_name: tool.name
      }, userId);

      // Get API key using BYOK
      const apiKey = await KeyManagementService.getKey(KeyType.GEMINI_AI, userId);
      if (!apiKey) {
        throw new Error('No Gemini API key configured. Please add your BYOK key in settings.');
      }

      // Build prompt from template
      let prompt = tool.ai_config?.prompt_template || '';
      Object.keys(inputs).forEach(key => {
        const placeholder = `{{${key}}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), inputs[key]);
      });

      // Safety guidelines prefix
      const safetyPrefix = (tool.ai_config?.safety_guidelines || []).join('\n') + '\n\n';
      const fullPrompt = safetyPrefix + prompt;

      // Call Gemini API
      const response = await this.callGeminiAPI(fullPrompt, apiKey);

      // Check for emergency keywords
      const hasEmergencyKeywords = (tool.ai_config?.emergency_keywords || []).some(keyword =>
        prompt.toLowerCase().includes(keyword.toLowerCase()) ||
        response.toLowerCase().includes(keyword.toLowerCase())
      );

      // Post-process response
      let processedResponse = response;
      if (hasEmergencyKeywords) {
        processedResponse = `🚨 URGENT: ${response}\n\nIMPORTANT: If this is a medical emergency, please call 911 or your local emergency services immediately.`;
      }

      // Add disclaimer
      processedResponse += `\n\n⚕️ ${tool.config.medical_disclaimer}`;

      // Save result
      const result = await githubDB.insert(collections.tool_results, {
        tool_id: toolId,
        user_id: userId,
        inputs,
        output: processedResponse,
        execution_time: new Date().toISOString(),
        has_emergency_flag: hasEmergencyKeywords
      });

      // Update usage statistics
      await githubDB.update(collections.health_tools, toolId, {
        usage_count: (tool.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      });

      await logger.info('ai_tool_execution_completed', 'AI tool execution completed', {
        tool_id: toolId,
        result_id: result.id,
        has_emergency_flag: hasEmergencyKeywords
      }, userId);

      return {
        result: processedResponse,
        result_id: result.id,
        disclaimer: tool.config.medical_disclaimer,
        emergency_flag: hasEmergencyKeywords,
        follow_up_prompts: tool.ai_config?.follow_up_prompts || []
      };
    } catch (error) {
      await logger.error('ai_tool_execution_failed', 'AI tool execution failed', {
        tool_id: toolId,
        error: error.message
      }, userId);
      throw error;
    }
  }

  private static async callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  }

  // Execute calculator tool
  static async executeCalculatorTool(toolId: string, inputs: any, userId?: string): Promise<any> {
    try {
      const tool = await githubDB.findById(collections.health_tools, toolId);
      if (!tool || tool.type === ToolType.AI_POWERED) {
        throw new Error('Invalid calculator tool');
      }

      await logger.info('calculator_execution_started', 'Calculator execution started', {
        tool_id: toolId,
        tool_name: tool.name
      }, userId);

      let result;
      switch (tool.name) {
        case 'BMI Calculator':
          result = this.calculateBMI(inputs);
          break;
        case 'BMR Calculator':
          result = this.calculateBMR(inputs);
          break;
        case 'Due Date Calculator':
          result = this.calculateDueDate(inputs);
          break;
        case 'Blood Pressure Analyzer':
          result = this.analyzeBP(inputs);
          break;
        case 'Body Fat Percentage Calculator':
          result = this.calculateBodyFat(inputs);
          break;
        case 'Calorie Needs Calculator':
          result = this.calculateCalorieNeeds(inputs);
          break;
        case 'Heart Rate Zone Calculator':
          result = this.calculateHeartRateZones(inputs);
          break;
        case 'Water Intake Calculator':
          result = this.calculateWaterIntake(inputs);
          break;
        case 'Protein Needs Calculator':
          result = this.calculateProteinNeeds(inputs);
          break;
        default:
          throw new Error(`Calculator not implemented: ${tool.name}`);
      }

      // Save result
      const savedResult = await githubDB.insert(collections.tool_results, {
        tool_id: toolId,
        user_id: userId,
        inputs,
        output: result,
        execution_time: new Date().toISOString()
      });

      // Update usage
      await githubDB.update(collections.health_tools, toolId, {
        usage_count: (tool.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      });

      await logger.info('calculator_execution_completed', 'Calculator execution completed', {
        tool_id: toolId,
        result_id: savedResult.id
      }, userId);

      return {
        result,
        result_id: savedResult.id,
        disclaimer: tool.config.medical_disclaimer
      };
    } catch (error) {
      await logger.error('calculator_execution_failed', 'Calculator execution failed', {
        tool_id: toolId,
        error: error.message
      }, userId);
      throw error;
    }
  }

  // Calculator implementations
  private static calculateBMI(inputs: any) {
    const { weight, height, unit } = inputs;
    let bmi;
    
    if (unit === 'metric') {
      bmi = weight / Math.pow(height / 100, 2);
    } else {
      bmi = (weight / Math.pow(height, 2)) * 703;
    }
    
    let category;
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    
    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      health_risk: this.getBMIHealthRisk(category),
      recommendations: this.getBMIRecommendations(category)
    };
  }

  private static calculateBMR(inputs: any) {
    const { weight, height, age, gender } = inputs;
    let bmr;
    
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    return {
      bmr: Math.round(bmr),
      daily_calories: {
        sedentary: Math.round(bmr * 1.2),
        light: Math.round(bmr * 1.375),
        moderate: Math.round(bmr * 1.55),
        active: Math.round(bmr * 1.725),
        very_active: Math.round(bmr * 1.9)
      },
      description: 'Basal Metabolic Rate - calories needed at rest'
    };
  }

  private static calculateDueDate(inputs: any) {
    const lmp = new Date(inputs.last_menstrual_period);
    const dueDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const weeksPregnant = Math.floor((today.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    return {
      due_date: dueDate.toISOString().split('T')[0],
      weeks_pregnant: Math.max(0, weeksPregnant),
      trimester: weeksPregnant <= 13 ? 'First' : weeksPregnant <= 27 ? 'Second' : 'Third',
      days_remaining: Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)))
    };
  }

  private static analyzeBP(inputs: any) {
    const { systolic, diastolic } = inputs;
    let category, risk;
    
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

  private static getBMIHealthRisk(category: string): string {
    const risks = {
      'Underweight': 'Increased risk of malnutrition, osteoporosis, and decreased immune function',
      'Normal weight': 'Lowest risk of weight-related health problems',
      'Overweight': 'Increased risk of cardiovascular disease, diabetes, and sleep apnea',
      'Obese': 'High risk of cardiovascular disease, diabetes, stroke, and certain cancers'
    };
    return risks[category as keyof typeof risks] || '';
  }

  private static getBMIRecommendations(category: string): string[] {
    const recommendations = {
      'Underweight': ['Consult healthcare provider', 'Increase caloric intake with nutrient-dense foods', 'Consider strength training'],
      'Normal weight': ['Maintain current healthy lifestyle', 'Continue balanced diet and exercise', 'Regular health screenings'],
      'Overweight': ['Aim for gradual weight loss', 'Increase physical activity', 'Focus on portion control'],
      'Obese': ['Consult healthcare provider for weight management plan', 'Consider medically supervised program', 'Focus on sustainable lifestyle changes']
    };
    return recommendations[category as keyof typeof recommendations] || [];
  }

  private static getBPRecommendations(category: string): string[] {
    const recommendations = {
      'Normal': ['Maintain healthy lifestyle', 'Continue regular exercise', 'Monitor regularly'],
      'Elevated': ['Lifestyle modifications', 'Reduce sodium', 'Increase physical activity'],
      'High Blood Pressure Stage 1': ['Consult healthcare provider', 'Medication may be needed', 'Lifestyle changes essential'],
      'High Blood Pressure Stage 2': ['Immediate medical consultation', 'Medication likely needed', 'Frequent monitoring'],
      'Hypertensive Crisis': ['SEEK IMMEDIATE MEDICAL ATTENTION', 'Call emergency services']
    };
    return recommendations[category as keyof typeof recommendations] || [];
  }

  // Additional calculator implementations
  private static calculateBodyFat(inputs: any) {
    const { gender, age, waist, neck, hip, height, unit } = inputs;
    let bodyFat;
    
    // US Navy method
    if (gender === 'male') {
      bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }
    
    let category;
    if (gender === 'male') {
      if (bodyFat < 6) category = 'Essential Fat';
      else if (bodyFat < 14) category = 'Athletic';
      else if (bodyFat < 18) category = 'Fitness';
      else if (bodyFat < 25) category = 'Average';
      else category = 'Obese';
    } else {
      if (bodyFat < 14) category = 'Essential Fat';
      else if (bodyFat < 21) category = 'Athletic';
      else if (bodyFat < 25) category = 'Fitness';
      else if (bodyFat < 32) category = 'Average';
      else category = 'Obese';
    }
    
    return {
      body_fat_percentage: Math.round(bodyFat * 10) / 10,
      category,
      health_status: this.getBodyFatHealthStatus(category),
      recommendations: this.getBodyFatRecommendations(category)
    };
  }

  private static calculateCalorieNeeds(inputs: any) {
    const { weight, height, age, gender, activity_level, goal } = inputs;
    
    // Calculate BMR first
    let bmr;
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    const tdee = bmr * activityMultipliers[activity_level as keyof typeof activityMultipliers];
    
    // Goal adjustments
    let targetCalories = tdee;
    if (goal === 'lose_weight') targetCalories = tdee - 500; // 1 lb per week
    else if (goal === 'gain_weight') targetCalories = tdee + 500; // 1 lb per week
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target_calories: Math.round(targetCalories),
      goal_description: this.getGoalDescription(goal),
      macros: this.calculateMacros(targetCalories)
    };
  }

  private static calculateHeartRateZones(inputs: any) {
    const { age, resting_hr } = inputs;
    const maxHR = 220 - age;
    const hrReserve = maxHR - resting_hr;
    
    return {
      max_heart_rate: maxHR,
      resting_heart_rate: resting_hr,
      zones: {
        zone_1: {
          name: 'Recovery',
          percentage: '50-60%',
          range: `${Math.round(resting_hr + 0.5 * hrReserve)}-${Math.round(resting_hr + 0.6 * hrReserve)}`,
          benefits: 'Active recovery, warm-up'
        },
        zone_2: {
          name: 'Aerobic Base',
          percentage: '60-70%',
          range: `${Math.round(resting_hr + 0.6 * hrReserve)}-${Math.round(resting_hr + 0.7 * hrReserve)}`,
          benefits: 'Fat burning, endurance building'
        },
        zone_3: {
          name: 'Aerobic',
          percentage: '70-80%',
          range: `${Math.round(resting_hr + 0.7 * hrReserve)}-${Math.round(resting_hr + 0.8 * hrReserve)}`,
          benefits: 'Cardiovascular fitness'
        },
        zone_4: {
          name: 'Anaerobic',
          percentage: '80-90%',
          range: `${Math.round(resting_hr + 0.8 * hrReserve)}-${Math.round(resting_hr + 0.9 * hrReserve)}`,
          benefits: 'Performance improvement'
        },
        zone_5: {
          name: 'Neuromuscular',
          percentage: '90-100%',
          range: `${Math.round(resting_hr + 0.9 * hrReserve)}-${maxHR}`,
          benefits: 'Maximum effort, short bursts'
        }
      }
    };
  }

  private static calculateWaterIntake(inputs: any) {
    const { weight, activity_level, climate, pregnancy_nursing } = inputs;
    
    // Base calculation: 35ml per kg of body weight
    let baseIntake = weight * 35;
    
    // Activity adjustments
    if (activity_level === 'moderate') baseIntake *= 1.2;
    else if (activity_level === 'active') baseIntake *= 1.4;
    else if (activity_level === 'very_active') baseIntake *= 1.6;
    
    // Climate adjustments
    if (climate === 'hot') baseIntake *= 1.2;
    else if (climate === 'very_hot') baseIntake *= 1.4;
    
    // Pregnancy/nursing adjustments
    if (pregnancy_nursing === 'pregnant') baseIntake += 300;
    else if (pregnancy_nursing === 'nursing') baseIntake += 700;
    
    const glasses = Math.ceil(baseIntake / 250); // 250ml per glass
    
    return {
      daily_intake_ml: Math.round(baseIntake),
      daily_intake_liters: Math.round(baseIntake / 1000 * 10) / 10,
      glasses_per_day: glasses,
      recommendations: this.getWaterIntakeRecommendations(glasses)
    };
  }

  private static calculateProteinNeeds(inputs: any) {
    const { weight, activity_level, age, goal, health_condition } = inputs;
    
    // Base protein needs (g/kg body weight)
    let proteinPerKg = 0.8; // Sedentary adult
    
    // Activity level adjustments
    if (activity_level === 'light') proteinPerKg = 1.0;
    else if (activity_level === 'moderate') proteinPerKg = 1.2;
    else if (activity_level === 'active') proteinPerKg = 1.4;
    else if (activity_level === 'very_active') proteinPerKg = 1.6;
    
    // Age adjustments
    if (age > 65) proteinPerKg += 0.2;
    
    // Goal adjustments
    if (goal === 'muscle_gain') proteinPerKg += 0.4;
    else if (goal === 'weight_loss') proteinPerKg += 0.2;
    
    // Health condition adjustments
    if (health_condition === 'recovering') proteinPerKg += 0.3;
    
    const dailyProtein = weight * proteinPerKg;
    
    return {
      daily_protein_grams: Math.round(dailyProtein),
      protein_per_kg: Math.round(proteinPerKg * 10) / 10,
      protein_per_meal: Math.round(dailyProtein / 3),
      protein_sources: this.getProteinSources(),
      recommendations: this.getProteinRecommendations(dailyProtein)
    };
  }

  // Helper methods for new calculators
  private static getBodyFatHealthStatus(category: string): string {
    const statuses = {
      'Essential Fat': 'Below normal - may indicate health risks',
      'Athletic': 'Excellent - typical of athletes',
      'Fitness': 'Good - healthy and fit',
      'Average': 'Acceptable - within normal range',
      'Obese': 'Above normal - may increase health risks'
    };
    return statuses[category as keyof typeof statuses] || '';
  }

  private static getBodyFatRecommendations(category: string): string[] {
    const recommendations = {
      'Essential Fat': ['Consult healthcare provider', 'May need to gain healthy weight'],
      'Athletic': ['Maintain current lifestyle', 'Continue training regimen'],
      'Fitness': ['Maintain healthy habits', 'Regular exercise and balanced diet'],
      'Average': ['Consider increasing physical activity', 'Focus on strength training'],
      'Obese': ['Consult healthcare provider', 'Create weight loss plan', 'Increase physical activity']
    };
    return recommendations[category as keyof typeof recommendations] || [];
  }

  private static getGoalDescription(goal: string): string {
    const descriptions = {
      maintain: 'Maintain current weight',
      lose_weight: 'Lose 1 pound per week',
      gain_weight: 'Gain 1 pound per week'
    };
    return descriptions[goal as keyof typeof descriptions] || '';
  }

  private static calculateMacros(calories: number) {
    return {
      protein: Math.round(calories * 0.3 / 4), // 30% of calories, 4 cal per gram
      carbs: Math.round(calories * 0.4 / 4), // 40% of calories, 4 cal per gram
      fat: Math.round(calories * 0.3 / 9) // 30% of calories, 9 cal per gram
    };
  }

  private static getWaterIntakeRecommendations(glasses: number): string[] {
    const base = [
      'Drink throughout the day, not all at once',
      'Monitor urine color - should be light yellow',
      'Increase intake during exercise and hot weather'
    ];
    
    if (glasses > 12) {
      base.push('This is a high intake - monitor for overhydration');
    }
    
    return base;
  }

  private static getProteinSources(): string[] {
    return [
      'Lean meats (chicken, turkey, lean beef)',
      'Fish and seafood',
      'Eggs and dairy products',
      'Legumes and beans',
      'Nuts and seeds',
      'Quinoa and whole grains',
      'Protein supplements (if needed)'
    ];
  }

  private static getProteinRecommendations(dailyProtein: number): string[] {
    const base = [
      'Distribute protein throughout the day',
      'Include protein in every meal',
      'Choose high-quality protein sources'
    ];
    
    if (dailyProtein > 150) {
      base.push('High protein intake - ensure adequate hydration');
      base.push('Consider consulting a nutritionist');
    }
    
    return base;
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

  // Get featured tools
  static async getFeaturedTools(): Promise<HealthTool[]> {
    return await githubDB.find(collections.health_tools, {
      featured: true,
      is_active: true
    });
  }
}

// Comprehensive tools list - sample of 20 core tools
const COMPREHENSIVE_TOOLS_LIST: Partial<HealthTool>[] = [
  // AI Tools
  {
    name: 'AI Comprehensive Symptom Checker',
    description: 'Advanced AI analysis of multiple symptoms with risk stratification',
    category: ToolCategory.GENERAL_TRIAGE,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Comprehensive symptom analysis: Symptoms: {{symptoms}}. Age: {{age}}, Gender: {{gender}}, Duration: {{duration}}, Severity: {{severity}}. Provide detailed analysis including possible conditions, urgency level, and specific care recommendations.',
      safety_guidelines: [
        'This is not a medical diagnosis and should not replace professional medical advice',
        'Recommend seeking immediate medical attention for serious symptoms',
        'Always suggest consulting with healthcare providers for proper diagnosis'
      ],
      emergency_keywords: ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding'],
      follow_up_prompts: [
        'Would you like information about potential specialists?',
        'Do you need guidance on when to seek emergency care?'
      ]
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'textarea', label: 'Describe your symptoms in detail', required: true, placeholder: 'Include location, intensity, timing...' },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] },
        { name: 'duration', type: 'select', label: 'Duration', required: true, options: ['Less than 1 hour', '1-6 hours', '6-24 hours', '1-3 days', '4-7 days', '1-4 weeks', 'More than 1 month'] },
        { name: 'severity', type: 'range', label: 'Severity (1-10)', required: true, min: 1, max: 10, step: 1 }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This AI analysis is for informational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper diagnosis and treatment.'
    },
    tags: ['symptoms', 'ai', 'comprehensive', 'triage'],
    difficulty_level: 'intermediate',
    estimated_duration: 8,
    featured: true
  },
  {
    name: 'AI Mental Health Companion',
    description: 'Comprehensive AI support for mental wellness with personalized coping strategies',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Mental health support session. Current mood: {{mood}}. Stress level: {{stress}}. Recent concerns: {{concerns}}. Provide personalized mental health guidance and evidence-based coping strategies.',
      safety_guidelines: [
        'This is not a replacement for professional mental health treatment',
        'If experiencing thoughts of self-harm, contact crisis hotline immediately',
        'Encourage seeking professional help when appropriate'
      ],
      emergency_keywords: ['suicide', 'self-harm', 'kill myself', 'end it all'],
      follow_up_prompts: [
        'Would you like specific relaxation techniques?',
        'Are you interested in mindfulness exercises?'
      ]
    },
    config: {
      input_fields: [
        { name: 'mood', type: 'select', label: 'Current Mood', required: true, options: ['Very Happy', 'Happy', 'Neutral', 'Sad', 'Very Sad', 'Anxious', 'Angry'] },
        { name: 'stress', type: 'range', label: 'Stress Level (1-10)', required: true, min: 1, max: 10, step: 1 },
        { name: 'concerns', type: 'textarea', label: 'What\'s on your mind?', required: false, placeholder: 'Share any concerns or thoughts...' }
      ],
      output_format: 'structured',
      medical_disclaimer: 'If you are experiencing thoughts of self-harm or suicide, please contact emergency services or a mental health crisis line immediately.'
    },
    tags: ['mental health', 'counseling', 'emotional support', 'coping strategies'],
    difficulty_level: 'beginner',
    estimated_duration: 10,
    featured: true
  },
  // Calculator Tools
  {
    name: 'BMI Calculator',
    description: 'Comprehensive BMI calculation with health risk assessment',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight', required: true, min: 1, max: 500 },
        { name: 'height', type: 'number', label: 'Height', required: true, min: 1, max: 300 },
        { name: 'unit', type: 'select', label: 'Unit System', required: true, options: ['metric', 'imperial'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'BMI is a screening tool and may not reflect body composition. Consult healthcare providers for comprehensive health assessment.',
      results_interpretation: 'BMI categories are based on WHO guidelines for adults.'
    },
    tags: ['bmi', 'weight', 'health screening', 'fitness'],
    difficulty_level: 'beginner',
    estimated_duration: 2,
    featured: true
  },
  {
    name: 'BMR Calculator',
    description: 'Calculate Basal Metabolic Rate and daily calorie needs',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1, max: 500 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1, max: 300 },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['male', 'female'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is an estimate based on standard formulas. Individual metabolic rates may vary.',
      results_interpretation: 'BMR represents calories needed for basic body functions at rest.'
    },
    tags: ['bmr', 'metabolism', 'calories', 'fitness'],
    difficulty_level: 'beginner',
    estimated_duration: 3,
    featured: false
  },
  {
    name: 'Due Date Calculator',
    description: 'Calculate pregnancy due date and track pregnancy progress',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'last_menstrual_period', type: 'date', label: 'First Day of Last Menstrual Period', required: true }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is an estimate based on a 280-day pregnancy. Your healthcare provider will provide accurate dating.',
      results_interpretation: 'Due dates are estimates; only 5% of babies are born on their exact due date.'
    },
    tags: ['pregnancy', 'due date', 'maternal health', 'prenatal'],
    difficulty_level: 'beginner',
    estimated_duration: 1,
    featured: true
  },
  {
    name: 'Blood Pressure Analyzer',
    description: 'Analyze blood pressure readings and assess cardiovascular risk',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'systolic', type: 'number', label: 'Systolic Pressure (mmHg)', required: true, min: 50, max: 250 },
        { name: 'diastolic', type: 'number', label: 'Diastolic Pressure (mmHg)', required: true, min: 30, max: 150 }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This analysis is for educational purposes. Share your readings with your healthcare provider.',
      results_interpretation: 'Categories based on American Heart Association guidelines.'
    },
    tags: ['blood pressure', 'hypertension', 'cardiovascular', 'monitoring'],
    difficulty_level: 'beginner',
    estimated_duration: 2,
    featured: false
  }
];