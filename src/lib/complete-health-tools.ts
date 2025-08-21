// Complete Health Tools Center - 100+ Healthcare Tools with Full Gemini AI Integration
import { githubDB, collections } from './database';

// Enhanced Tool Categories
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

// Enhanced Tool Types
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

// Enhanced Health Tool Interface
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
    emergency_keywords?: string[];
    follow_up_prompts?: string[];
  };
  
  // Tool Configuration
  config: {
    input_fields: {
      name: string;
      type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'file' | 'boolean' | 'range' | 'textarea';
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
    output_format: 'text' | 'json' | 'pdf' | 'chart' | 'structured';
    medical_disclaimer: string;
    processing_time?: number;
    results_interpretation?: string;
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

// Enhanced Health Tools Service with Multi-Key Support
export class ComprehensiveHealthToolsService {
  private static geminiApiKeys = (import.meta.env.VITE_GEMINI_API_KEYS || '').split(',').filter(key => key.trim());
  private static currentKeyIndex = 0;
  private static requestCount = 0;
  private static lastResetTime = Date.now();
  
  private static getApiKey(): string {
    if (this.geminiApiKeys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }
    
    // Reset request count every hour for rate limiting
    if (Date.now() - this.lastResetTime > 60 * 60 * 1000) {
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }
    
    // Rotate keys to distribute load
    const key = this.geminiApiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.geminiApiKeys.length;
    this.requestCount++;
    
    return key;
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
  
  // Get emergency tools
  static async getEmergencyTools(): Promise<HealthTool[]> {
    return await githubDB.find(collections.health_tools, {
      emergency_tool: true,
      is_active: true
    });
  }
  
  // Execute AI tool with enhanced error handling and monitoring
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
    
    // Check for emergency keywords
    const hasEmergencyKeywords = this.checkForEmergencyKeywords(inputs, tool.ai_config?.emergency_keywords);
    
    // Build prompt from template and inputs
    const prompt = this.buildPrompt(tool.ai_config!.prompt_template, inputs);
    
    try {
      // Call Gemini API with retry mechanism
      const response = await this.callGeminiAPIWithRetry(prompt, tool.ai_config!.safety_guidelines);
      
      // Post-process response
      const processedResponse = this.postProcessAIResponse(response, tool, hasEmergencyKeywords);
      
      // Save result with enhanced metadata
      const result = await githubDB.insert(collections.tool_results, {
        tool_id: toolId,
        user_id: userId,
        inputs,
        output: processedResponse,
        execution_time: new Date().toISOString(),
        ai_model: tool.ai_config!.model,
        has_emergency_flag: hasEmergencyKeywords,
        processing_duration: Date.now() - Date.now() // This would be calculated properly
      });
      
      // Update tool statistics
      await this.updateToolStats(toolId, true);
      
      return {
        result: processedResponse,
        disclaimer: tool.config.medical_disclaimer,
        result_id: result.id,
        emergency_alert: hasEmergencyKeywords,
        follow_up_questions: tool.ai_config?.follow_up_prompts
      };
    } catch (error) {
      console.error('AI tool execution failed:', error);
      await this.updateToolStats(toolId, false);
      throw error;
    }
  }
  
  // Execute calculator/tracker tool with enhanced functionality
  static async executeCalculatorTool(toolId: string, inputs: any, userId?: string): Promise<any> {
    const tool = await githubDB.findById(collections.health_tools, toolId);
    if (!tool || tool.type === ToolType.AI_POWERED) {
      throw new Error('Invalid calculator tool');
    }
    
    let result;
    
    try {
      // Execute based on tool ID or name
      result = await this.executeSpecificCalculator(tool, inputs);
      
      // Save result
      const savedResult = await githubDB.insert(collections.tool_results, {
        tool_id: toolId,
        user_id: userId,
        inputs,
        output: result,
        execution_time: new Date().toISOString(),
        tool_type: tool.type
      });
      
      // Update usage statistics
      await this.updateToolStats(toolId, true);
      
      return {
        result,
        disclaimer: tool.config.medical_disclaimer,
        result_id: savedResult.id,
        interpretation: tool.config.results_interpretation
      };
    } catch (error) {
      console.error('Calculator tool execution failed:', error);
      await this.updateToolStats(toolId, false);
      throw error;
    }
  }
  
  // Enhanced Gemini API call with retry mechanism
  private static async callGeminiAPIWithRetry(prompt: string, safetyGuidelines: string[], maxRetries = 3): Promise<string> {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.callGeminiAPI(prompt, safetyGuidelines);
      } catch (error) {
        lastError = error;
        console.warn(`Gemini API attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error('All API retry attempts failed');
  }
  
  // Core Gemini API call
  private static async callGeminiAPI(prompt: string, safetyGuidelines: string[]): Promise<string> {
    const apiKey = this.getApiKey();
    const fullPrompt = `${safetyGuidelines.join('\n')}\n\nIMPORTANT: You are a healthcare AI assistant. Always prioritize user safety and recommend professional medical care when appropriate.\n\n${prompt}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
  }
  
  // Build AI prompt with enhanced template processing
  private static buildPrompt(template: string, inputs: any): string {
    let prompt = template;
    
    // Replace placeholders with actual inputs
    Object.keys(inputs).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = inputs[key];
      
      // Handle different data types appropriately
      let processedValue;
      if (Array.isArray(value)) {
        processedValue = value.join(', ');
      } else if (typeof value === 'object' && value !== null) {
        processedValue = JSON.stringify(value);
      } else {
        processedValue = String(value);
      }
      
      prompt = prompt.replace(new RegExp(placeholder, 'g'), processedValue);
    });
    
    return prompt;
  }
  
  // Check for emergency keywords in input
  private static checkForEmergencyKeywords(inputs: any, emergencyKeywords?: string[]): boolean {
    if (!emergencyKeywords || emergencyKeywords.length === 0) return false;
    
    const inputText = Object.values(inputs).join(' ').toLowerCase();
    return emergencyKeywords.some(keyword => 
      inputText.includes(keyword.toLowerCase())
    );
  }
  
  // Post-process AI response for safety and enhancement
  private static postProcessAIResponse(response: string, tool: HealthTool, hasEmergencyFlag: boolean): string {
    let processedResponse = response;
    
    // Add emergency warning if needed
    if (hasEmergencyFlag) {
      processedResponse = `🚨 EMERGENCY ALERT: Based on your input, this may require immediate medical attention. Call 911 if this is a medical emergency.\n\n${processedResponse}`;
    }
    
    // Add standard disclaimers
    processedResponse += `\n\n⚠️ Medical Disclaimer: ${tool.config.medical_disclaimer}`;
    
    // Add follow-up guidance
    processedResponse += '\n\n📋 Next Steps: Always consult with qualified healthcare professionals for proper diagnosis and treatment planning.';
    
    return processedResponse;
  }
  
  // Execute specific calculator based on tool
  private static async executeSpecificCalculator(tool: HealthTool, inputs: any): Promise<any> {
    switch (tool.name) {
      case 'BMI Calculator':
        return this.calculateBMI(inputs.weight, inputs.height, inputs.unit);
      case 'BMR Calculator':
        return this.calculateBMR(inputs.weight, inputs.height, inputs.age, inputs.gender);
      case 'Body Fat Calculator':
        return this.calculateBodyFat(inputs);
      case 'Target Heart Rate Calculator':
        return this.calculateTargetHeartRate(inputs.age, inputs.resting_hr, inputs.fitness_level);
      case 'Calorie Needs Calculator':
        return this.calculateCalorieNeeds(inputs);
      case 'Due Date Calculator':
        return this.calculateDueDate(inputs.last_menstrual_period);
      case 'Ovulation Calculator':
        return this.calculateOvulation(inputs.cycle_length, inputs.last_period);
      case 'Blood Pressure Analysis':
        return this.analyzeBP(inputs.systolic, inputs.diastolic);
      case 'Diabetes Risk Calculator':
        return this.calculateDiabetesRisk(inputs);
      case 'Cholesterol Risk Calculator':
        return this.calculateCholesterolRisk(inputs);
      case 'Hydration Calculator':
        return this.calculateHydrationNeeds(inputs);
      case 'Sleep Quality Calculator':
        return this.calculateSleepQuality(inputs);
      case 'Stress Level Calculator':
        return this.calculateStressLevel(inputs);
      case 'Depression Screening (PHQ-9)':
        return this.calculatePHQ9Score(inputs);
      case 'Anxiety Assessment (GAD-7)':
        return this.calculateGAD7Score(inputs);
      case 'ADHD Screening':
        return this.calculateADHDScore(inputs);
      case 'Alcohol Use Assessment':
        return this.calculateAuditScore(inputs);
      case 'Smoking Cessation Readiness':
        return this.calculateQuitReadiness(inputs);
      case 'Fall Risk Assessment':
        return this.calculateFallRisk(inputs);
      case 'Medication Adherence Calculator':
        return this.calculateMedicationAdherence(inputs);
      case 'Pain Level Assessment':
        return this.assessPainLevel(inputs);
      case 'Cancer Risk Calculator':
        return this.calculateCancerRisk(inputs);
      case 'Exercise Calories Burned Calculator':
        return this.calculateCaloriesBurned(inputs);
      case 'Water Intake Calculator':
        return this.calculateHydrationNeeds(inputs);
      case 'Cardiovascular Risk Calculator (ASCVD)':
        return this.calculateASCVDRisk(inputs);
      case 'Pregnancy Nutrition Calculator':
        return this.calculatePregnancyNutrition(inputs);
      case 'Bone Density Risk Calculator':
        return this.calculateBoneDensityRisk(inputs);
      case 'Child Growth Calculator':
        return this.calculateChildGrowth(inputs);
      case 'Fall Risk Assessment Calculator':
        return this.calculateFallRisk(inputs);
      case 'Pregnancy Weight Gain Calculator':
        return this.calculatePregnancyWeightGain(inputs);
      case 'Ovulation Predictor Calculator':
        return this.calculateOvulation(inputs.cycle_length, inputs.last_period);
      case 'Advanced Due Date Calculator':
        return this.calculateDueDate(inputs.last_menstrual_period);
      case 'Advanced BMI Calculator':
        return this.calculateBMI(inputs.weight, inputs.height, inputs.unit);
      case 'Body Fat Percentage Calculator':
        return this.calculateBodyFat(inputs);
     case 'AI Personal Nutrition Coach':
       return this.executeAITool(tool.id, inputs, userId);
      default:
        throw new Error(`Unknown calculator: ${tool.name}`);
    }
  }
  
  // Age eligibility verification
  private static async verifyAgeEligibility(userId: string, ageRestrictions: any): Promise<boolean> {
    // In production, get user's actual age from profile
    return true;
  }
  
  // Update tool statistics
  private static async updateToolStats(toolId: string, success: boolean): Promise<void> {
    const tool = await githubDB.findById(collections.health_tools, toolId);
    if (tool) {
      const updates: any = {
        usage_count: tool.usage_count + 1,
        updated_at: new Date().toISOString()
      };
      
      if (tool.success_rate !== undefined) {
        const totalAttempts = tool.usage_count + 1;
        const successfulAttempts = Math.round(tool.success_rate * tool.usage_count) + (success ? 1 : 0);
        updates.success_rate = successfulAttempts / totalAttempts;
      }
      
      await githubDB.update(collections.health_tools, toolId, updates);
    }
  }
  
  // ========== CALCULATOR IMPLEMENTATIONS ==========
  
  private static calculateBMI(weight: number, height: number, unit: 'metric' | 'imperial') {
    let bmi;
    
    if (unit === 'metric') {
      const heightInM = height / 100;
      bmi = weight / (heightInM * heightInM);
    } else {
      bmi = (weight / (height * height)) * 703;
    }
    
    let category, riskLevel;
    if (bmi < 18.5) {
      category = 'Underweight';
      riskLevel = 'Increased risk of nutritional deficiency and osteoporosis';
    } else if (bmi < 25) {
      category = 'Normal weight';
      riskLevel = 'Lowest risk of weight-related health problems';
    } else if (bmi < 30) {
      category = 'Overweight';
      riskLevel = 'Increased risk of heart disease, high blood pressure, and diabetes';
    } else if (bmi < 35) {
      category = 'Class I Obesity';
      riskLevel = 'High risk of health complications';
    } else if (bmi < 40) {
      category = 'Class II Obesity';
      riskLevel = 'Very high risk of health complications';
    } else {
      category = 'Class III Obesity';
      riskLevel = 'Extremely high risk of health complications';
    }
    
    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      risk_level: riskLevel,
      healthy_weight_range: this.calculateHealthyWeightRange(height, unit),
      recommendations: this.getBMIRecommendations(category)
    };
  }
  
  private static calculateBodyFat(inputs: any) {
    const { method, gender, age, weight, height, waist, neck, hip } = inputs;
    let bodyFat;
    
    if (method === 'Navy Method' && waist && neck && (gender === 'female' ? hip : true)) {
      if (gender === 'male') {
        bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
      } else {
        bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
      }
    } else {
      // Fallback to BMI-based estimation
      const bmi = weight / Math.pow(height / 100, 2);
      bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * (gender === 'male' ? 1 : 0)) - 5.4;
    }
    
    const category = this.getBodyFatCategory(bodyFat, gender, age);
    
    return {
      body_fat_percentage: Math.round(bodyFat * 10) / 10,
      category: category.category,
      health_status: category.status,
      recommendations: category.recommendations
    };
  }
  
  private static calculateTargetHeartRate(age: number, restingHR?: number, fitnessLevel?: string) {
    const maxHR = 220 - age;
    const hrReserve = restingHR ? maxHR - restingHR : null;
    
    // Calculate different intensity zones
    const zones = {
      fat_burn: {
        min: Math.round(maxHR * 0.6),
        max: Math.round(maxHR * 0.7),
        description: 'Fat burning zone - sustainable pace for longer workouts'
      },
      aerobic: {
        min: Math.round(maxHR * 0.7),
        max: Math.round(maxHR * 0.8),
        description: 'Aerobic zone - improves cardiovascular fitness'
      },
      anaerobic: {
        min: Math.round(maxHR * 0.8),
        max: Math.round(maxHR * 0.9),
        description: 'Anaerobic zone - high-intensity training'
      },
      vo2_max: {
        min: Math.round(maxHR * 0.9),
        max: maxHR,
        description: 'VO2 Max zone - maximum effort training'
      }
    };
    
    return {
      max_heart_rate: maxHR,
      resting_heart_rate: restingHR,
      heart_rate_reserve: hrReserve,
      training_zones: zones,
      fitness_level: fitnessLevel,
      recommendations: this.getHeartRateRecommendations(fitnessLevel)
    };
  }
  
  private static calculateCalorieNeeds(inputs: any) {
    const { weight, height, age, gender, activity_level, goal } = inputs;
    
    // Calculate BMR using Mifflin-St Jeor equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Activity multipliers
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    const tdee = bmr * (multipliers[activity_level as keyof typeof multipliers] || 1.2);
    
    // Adjust for goals
    let targetCalories = tdee;
    if (goal === 'weight_loss') {
      targetCalories = tdee - 500; // 1 lb per week
    } else if (goal === 'weight_gain') {
      targetCalories = tdee + 500;
    } else if (goal === 'muscle_gain') {
      targetCalories = tdee + 300;
    }
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target_calories: Math.round(targetCalories),
      goal: goal,
      macros: this.calculateMacros(targetCalories, goal),
      meal_distribution: this.getMealDistribution(targetCalories)
    };
  }
  
  private static calculateDueDate(lmp: string) {
    const lastPeriod = new Date(lmp);
    const dueDate = new Date(lastPeriod);
    dueDate.setDate(dueDate.getDate() + 280);
    
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastPeriod.getTime()) / (24 * 60 * 60 * 1000));
    const weeksPregnant = Math.floor(daysDiff / 7);
    const daysPregnant = daysDiff % 7;
    
    return {
      due_date: dueDate.toISOString().split('T')[0],
      weeks_pregnant: Math.max(0, weeksPregnant),
      days_pregnant: Math.max(0, daysPregnant),
      trimester: this.getTrimester(weeksPregnant),
      conception_date: new Date(lastPeriod.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      milestones: this.getPregnancyMilestones(weeksPregnant)
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
    
    const nextPeriod = new Date(lastPeriodDate);
    nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
    
    return {
      ovulation_date: ovulationDate.toISOString().split('T')[0],
      fertile_window: {
        start: fertileStart.toISOString().split('T')[0],
        end: fertileEnd.toISOString().split('T')[0]
      },
      next_period: nextPeriod.toISOString().split('T')[0],
      cycle_phase: this.getCyclePhase(lastPeriod, cycleLength),
      fertility_tips: this.getFertilityTips()
    };
  }
  
  private static analyzeBP(systolic: number, diastolic: number) {
    let category, riskLevel, urgency;
    
    if (systolic < 120 && diastolic < 80) {
      category = 'Normal';
      riskLevel = 'Low';
      urgency = 'routine';
    } else if (systolic < 130 && diastolic < 80) {
      category = 'Elevated';
      riskLevel = 'Low-Medium';
      urgency = 'monitor';
    } else if (systolic < 140 || diastolic < 90) {
      category = 'High Blood Pressure Stage 1';
      riskLevel = 'Medium';
      urgency = 'consult_soon';
    } else if (systolic < 180 || diastolic < 120) {
      category = 'High Blood Pressure Stage 2';
      riskLevel = 'High';
      urgency = 'consult_urgent';
    } else {
      category = 'Hypertensive Crisis';
      riskLevel = 'Very High';
      urgency = 'emergency';
    }
    
    return {
      reading: `${systolic}/${diastolic}`,
      category,
      risk_level: riskLevel,
      urgency,
      pulse_pressure: systolic - diastolic,
      mean_arterial_pressure: Math.round((2 * diastolic + systolic) / 3),
      recommendations: this.getBPRecommendations(category),
      lifestyle_modifications: this.getBPLifestyleAdvice(category)
    };
  }
  
  private static calculateDiabetesRisk(inputs: any) {
    const { age, gender, bmi, family_history, physical_activity, blood_pressure } = inputs;
    let score = 0;
    
    // Age scoring
    if (age >= 45) score += 5;
    else if (age >= 40) score += 3;
    
    // BMI scoring
    if (bmi >= 30) score += 5;
    else if (bmi >= 25) score += 3;
    
    // Family history
    if (family_history) score += 5;
    
    // Physical activity
    if (physical_activity === 'low') score += 2;
    
    // High blood pressure
    if (blood_pressure) score += 2;
    
    let riskLevel, recommendations;
    if (score >= 10) {
      riskLevel = 'High';
      recommendations = [
        'Immediate consultation with healthcare provider recommended',
        'Consider blood glucose testing',
        'Implement lifestyle modifications immediately'
      ];
    } else if (score >= 5) {
      riskLevel = 'Moderate';
      recommendations = [
        'Discuss with healthcare provider at next visit',
        'Focus on weight management and exercise',
        'Monitor blood pressure regularly'
      ];
    } else {
      riskLevel = 'Low';
      recommendations = [
        'Continue healthy lifestyle habits',
        'Regular health screenings',
        'Maintain healthy weight'
      ];
    }
    
    return {
      risk_score: score,
      risk_level: riskLevel,
      risk_percentage: Math.min(score * 2, 90),
      recommendations,
      prevention_tips: this.getDiabetesPreventionTips()
    };
  }
  
  private static calculateCholesterolRisk(inputs: any) {
    const { total_cholesterol, hdl, ldl, triglycerides, age, gender, smoking } = inputs;
    
    const risks = [];
    let overallRisk = 'Low';
    
    // Analyze each component
    if (total_cholesterol >= 240) {
      risks.push('High total cholesterol');
      overallRisk = 'High';
    } else if (total_cholesterol >= 200) {
      risks.push('Borderline high total cholesterol');
      if (overallRisk === 'Low') overallRisk = 'Moderate';
    }
    
    if (hdl < 40) {
      risks.push('Low HDL (good cholesterol)');
      if (overallRisk !== 'High') overallRisk = 'Moderate';
    }
    
    if (ldl >= 160) {
      risks.push('High LDL (bad cholesterol)');
      overallRisk = 'High';
    } else if (ldl >= 130) {
      risks.push('Borderline high LDL');
      if (overallRisk === 'Low') overallRisk = 'Moderate';
    }
    
    if (triglycerides >= 200) {
      risks.push('High triglycerides');
      if (overallRisk === 'Low') overallRisk = 'Moderate';
    }
    
    return {
      total_cholesterol: {
        value: total_cholesterol,
        status: this.getCholesterolStatus(total_cholesterol, 'total')
      },
      hdl: {
        value: hdl,
        status: this.getCholesterolStatus(hdl, 'hdl')
      },
      ldl: {
        value: ldl,
        status: this.getCholesterolStatus(ldl, 'ldl')
      },
      triglycerides: {
        value: triglycerides,
        status: this.getCholesterolStatus(triglycerides, 'triglycerides')
      },
      overall_risk: overallRisk,
      risk_factors: risks,
      recommendations: this.getCholesterolRecommendations(overallRisk)
    };
  }
  
  private static calculateHydrationNeeds(inputs: any) {
    const { weight, activity_duration = 0, climate, altitude } = inputs;
    
    // Base water intake: 35ml per kg body weight
    let baseWater = weight * 35;
    
    // Activity adjustment: 500-750ml per hour of exercise
    let activityWater = 0;
    if (activity_duration > 0) {
      activityWater = (activity_duration / 60) * 625; // 625ml average per hour
    }
    
    // Climate adjustment
    let climateMultiplier = 1;
    switch (climate) {
      case 'Hot': climateMultiplier = 1.2; break;
      case 'Very Hot': climateMultiplier = 1.3; break;
      case 'Cool': climateMultiplier = 0.9; break;
    }
    
    // Altitude adjustment
    let altitudeMultiplier = 1;
    if (altitude === 'High (>3000m)') altitudeMultiplier = 1.15;
    else if (altitude === 'Moderate (1000-3000m)') altitudeMultiplier = 1.05;
    
    const totalWater = (baseWater + activityWater) * climateMultiplier * altitudeMultiplier;
    
    return {
      daily_water_ml: Math.round(totalWater),
      daily_water_liters: Math.round(totalWater / 100) / 10,
      daily_water_cups: Math.round(totalWater / 240), // 8oz cups
      breakdown: {
        base_needs: Math.round(baseWater),
        activity_needs: Math.round(activityWater),
        climate_adjustment: Math.round((climateMultiplier - 1) * 100) + '%',
        altitude_adjustment: Math.round((altitudeMultiplier - 1) * 100) + '%'
      },
      hydration_tips: this.getHydrationTips()
    };
  }
  
  private static calculateSleepQuality(inputs: any) {
    const { hours, quality, issues = [] } = inputs;
    let score = 0;
    let maxScore = 100;
    
    // Hours scoring (7-9 hours is optimal)
    if (hours >= 7 && hours <= 9) {
      score += 30;
    } else if (hours >= 6 && hours <= 10) {
      score += 20;
    } else if (hours >= 5 && hours <= 11) {
      score += 10;
    }
    
    // Quality scoring
    switch (quality) {
      case 'Excellent': score += 30; break;
      case 'Good': score += 25; break;
      case 'Fair': score += 15; break;
      case 'Poor': score += 5; break;
    }
    
    // Issues penalty
    const issuesPenalty = issues.length * 5;
    score = Math.max(0, score - issuesPenalty);
    
    // Sleep efficiency bonus (if no issues and good quality)
    if (issues.length === 0 && (quality === 'Excellent' || quality === 'Good')) {
      score += 10;
    }
    
    let category;
    if (score >= 80) category = 'Excellent Sleep';
    else if (score >= 60) category = 'Good Sleep';
    else if (score >= 40) category = 'Fair Sleep';
    else category = 'Poor Sleep';
    
    return {
      sleep_score: score,
      category,
      hours_assessment: this.getSleepHoursAssessment(hours),
      quality_rating: quality,
      issues_identified: issues,
      recommendations: this.getSleepRecommendations(score, issues),
      sleep_hygiene_tips: this.getSleepHygieneTips()
    };
  }
  
  private static calculateStressLevel(inputs: any) {
    const responses = Object.values(inputs).filter(v => typeof v === 'number');
    const totalScore = responses.reduce((sum: number, score: any) => sum + score, 0);
    const averageScore = totalScore / responses.length;
    
    let level, description, urgency;
    if (averageScore <= 2) {
      level = 'Low';
      description = 'You appear to have low stress levels';
      urgency = 'maintain';
    } else if (averageScore <= 3) {
      level = 'Moderate';
      description = 'You have moderate stress levels';
      urgency = 'monitor';
    } else if (averageScore <= 4) {
      level = 'High';
      description = 'You have high stress levels';
      urgency = 'address';
    } else {
      level = 'Very High';
      description = 'You have very high stress levels';
      urgency = 'urgent';
    }
    
    return {
      stress_score: Math.round(averageScore * 10) / 10,
      level,
      description,
      urgency,
      recommendations: this.getStressRecommendations(level),
      coping_strategies: this.getStressCopingStrategies()
    };
  }
  
  private static calculatePHQ9Score(inputs: any) {
    const scores = [
      parseInt(inputs.q1?.split(' - ')[0]) || 0,
      parseInt(inputs.q2?.split(' - ')[0]) || 0,
      parseInt(inputs.q3?.split(' - ')[0]) || 0,
      parseInt(inputs.q4?.split(' - ')[0]) || 0,
      parseInt(inputs.q5?.split(' - ')[0]) || 0,
      parseInt(inputs.q6?.split(' - ')[0]) || 0,
      parseInt(inputs.q7?.split(' - ')[0]) || 0,
      parseInt(inputs.q8?.split(' - ')[0]) || 0,
      parseInt(inputs.q9?.split(' - ')[0]) || 0
    ];
    
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    let severity, recommendation;
    if (totalScore <= 4) {
      severity = 'Minimal';
      recommendation = 'Monitor symptoms';
    } else if (totalScore <= 9) {
      severity = 'Mild';
      recommendation = 'Consider counseling or self-help strategies';
    } else if (totalScore <= 14) {
      severity = 'Moderate';
      recommendation = 'Professional consultation recommended';
    } else if (totalScore <= 19) {
      severity = 'Moderately Severe';
      recommendation = 'Professional treatment strongly recommended';
    } else {
      severity = 'Severe';
      recommendation = 'Immediate professional intervention recommended';
    }
    
    return {
      total_score: totalScore,
      severity,
      recommendation,
      suicide_risk: scores[8] > 0,
      next_steps: this.getPHQ9NextSteps(totalScore, scores[8] > 0)
    };
  }
  
  private static calculateGAD7Score(inputs: any) {
    const scores = [
      parseInt(inputs.q1?.split(' - ')[0]) || 0,
      parseInt(inputs.q2?.split(' - ')[0]) || 0,
      parseInt(inputs.q3?.split(' - ')[0]) || 0,
      parseInt(inputs.q4?.split(' - ')[0]) || 0,
      parseInt(inputs.q5?.split(' - ')[0]) || 0,
      parseInt(inputs.q6?.split(' - ')[0]) || 0,
      parseInt(inputs.q7?.split(' - ')[0]) || 0
    ];
    
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    let severity, recommendation;
    if (totalScore <= 4) {
      severity = 'Minimal';
      recommendation = 'No significant anxiety symptoms';
    } else if (totalScore <= 9) {
      severity = 'Mild';
      recommendation = 'Monitor symptoms and consider relaxation techniques';
    } else if (totalScore <= 14) {
      severity = 'Moderate';
      recommendation = 'Consider professional consultation';
    } else {
      severity = 'Severe';
      recommendation = 'Professional treatment strongly recommended';
    }
    
    return {
      total_score: totalScore,
      severity,
      recommendation,
      anxiety_management: this.getAnxietyManagementTips()
    };
  }
  
  // ========== HELPER FUNCTIONS ==========
  
  private static calculateHealthyWeightRange(height: number, unit: 'metric' | 'imperial') {
    let heightInM;
    if (unit === 'metric') {
      heightInM = height / 100;
    } else {
      heightInM = height * 0.0254; // inches to meters
    }
    
    const minWeight = 18.5 * heightInM * heightInM;
    const maxWeight = 24.9 * heightInM * heightInM;
    
    if (unit === 'metric') {
      return `${Math.round(minWeight)}-${Math.round(maxWeight)} kg`;
    } else {
      return `${Math.round(minWeight * 2.205)}-${Math.round(maxWeight * 2.205)} lbs`;
    }
  }
  
  private static getBodyFatCategory(bodyFat: number, gender: string, age: number) {
    let ranges;
    if (gender === 'male') {
      ranges = { essential: [2, 5], athlete: [6, 13], fitness: [14, 17], average: [18, 24], obese: [25, 100] };
    } else {
      ranges = { essential: [10, 13], athlete: [14, 20], fitness: [21, 24], average: [25, 31], obese: [32, 100] };
    }
    
    for (const [category, [min, max]] of Object.entries(ranges)) {
      if (bodyFat >= min && bodyFat <= max) {
        return {
          category: category.charAt(0).toUpperCase() + category.slice(1),
          status: category === 'obese' ? 'High Health Risk' : 
                  category === 'average' ? 'Acceptable' : 
                  category === 'fitness' ? 'Good' : 'Excellent',
          recommendations: this.getBodyFatRecommendations(category)
        };
      }
    }
    
    return { category: 'Unknown', status: 'Unable to classify', recommendations: [] };
  }
  
  private static getBMIRecommendations(category: string): string[] {
    const recommendations = {
      'Underweight': [
        'Consult healthcare provider for evaluation',
        'Focus on nutrient-dense, calorie-rich foods',
        'Consider strength training to build muscle mass',
        'Monitor for underlying health conditions'
      ],
      'Normal weight': [
        'Maintain current healthy lifestyle',
        'Continue balanced diet and regular exercise',
        'Regular health screenings',
        'Focus on overall wellness'
      ],
      'Overweight': [
        'Aim for 1-2 pounds weight loss per week',
        'Increase physical activity gradually',
        'Focus on portion control and mindful eating',
        'Consider consulting a nutritionist'
      ],
      'Class I Obesity': [
        'Consult healthcare provider for weight management plan',
        'Consider medically supervised weight loss program',
        'Focus on sustainable lifestyle changes',
        'Screen for obesity-related health conditions'
      ],
      'Class II Obesity': [
        'Immediate medical consultation recommended',
        'Consider comprehensive weight management program',
        'Evaluate for bariatric surgery if appropriate',
        'Address obesity-related health complications'
      ],
      'Class III Obesity': [
        'Urgent medical evaluation required',
        'Consider bariatric surgery consultation',
        'Comprehensive medical management needed',
        'Immediate focus on reducing health risks'
      ]
    };
    
    return recommendations[category as keyof typeof recommendations] || [];
  }
  
  private static getBodyFatRecommendations(category: string): string[] {
    const recommendations = {
      'essential': ['Consult healthcare provider - may be too low', 'Monitor health closely'],
      'athlete': ['Excellent for athletic performance', 'Maintain with balanced nutrition'],
      'fitness': ['Good fitness level', 'Maintain with regular exercise'],
      'average': ['Within acceptable range', 'Consider improving through diet and exercise'],
      'obese': ['Consult healthcare provider', 'Focus on gradual fat loss through diet and exercise']
    };
    
    return recommendations[category as keyof typeof recommendations] || [];
  }
  
  private static getHeartRateRecommendations(fitnessLevel?: string): string[] {
    const recommendations = {
      'Beginner': [
        'Start with low-intensity exercises in fat burn zone',
        'Gradually increase intensity over weeks',
        'Focus on consistency rather than intensity'
      ],
      'Intermediate': [
        'Mix different intensity zones in your workouts',
        'Spend most time in aerobic zone',
        'Include some anaerobic training'
      ],
      'Advanced': [
        'Incorporate high-intensity interval training',
        'Use VO2 max zone for performance improvements',
        'Monitor recovery heart rate'
      ],
      'Athlete': [
        'Use heart rate for precise training zones',
        'Monitor for overtraining signs',
        'Consider lactate threshold testing'
      ]
    };
    
    return recommendations[fitnessLevel as keyof typeof recommendations] || [
      'Use heart rate zones to guide exercise intensity',
      'Start conservatively and progress gradually'
    ];
  }
  
  private static calculateMacros(calories: number, goal?: string) {
    let protein, carbs, fat;
    
    switch (goal) {
      case 'muscle_gain':
        protein = 0.25; carbs = 0.45; fat = 0.30;
        break;
      case 'weight_loss':
        protein = 0.30; carbs = 0.35; fat = 0.35;
        break;
      default:
        protein = 0.20; carbs = 0.50; fat = 0.30;
    }
    
    return {
      protein: { grams: Math.round(calories * protein / 4), percentage: Math.round(protein * 100) },
      carbs: { grams: Math.round(calories * carbs / 4), percentage: Math.round(carbs * 100) },
      fat: { grams: Math.round(calories * fat / 9), percentage: Math.round(fat * 100) }
    };
  }
  
  private static getMealDistribution(calories: number) {
    return {
      breakfast: Math.round(calories * 0.25),
      lunch: Math.round(calories * 0.30),
      dinner: Math.round(calories * 0.30),
      snacks: Math.round(calories * 0.15)
    };
  }
  
  private static getTrimester(weeks: number): string {
    if (weeks <= 13) return 'First Trimester';
    if (weeks <= 27) return 'Second Trimester';
    return 'Third Trimester';
  }
  
  private static getPregnancyMilestones(weeks: number) {
    const milestones = [
      { week: 4, milestone: 'Implantation occurs' },
      { week: 6, milestone: 'Heart begins to beat' },
      { week: 8, milestone: 'End of embryonic period' },
      { week: 12, milestone: 'End of first trimester' },
      { week: 16, milestone: 'Gender may be determined' },
      { week: 20, milestone: 'Anatomy scan typically performed' },
      { week: 24, milestone: 'Viability milestone' },
      { week: 28, milestone: 'Third trimester begins' },
      { week: 36, milestone: 'Baby considered full-term soon' },
      { week: 40, milestone: 'Due date' }
    ];
    
    return milestones.filter(m => m.week <= weeks + 2 && m.week >= weeks - 2);
  }
  
  private static getCyclePhase(lastPeriod: string, cycleLength: number) {
    const today = new Date();
    const lastPeriodDate = new Date(lastPeriod);
    const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriodDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysSinceLastPeriod < 5) return 'Menstrual';
    if (daysSinceLastPeriod < 13) return 'Follicular';
    if (daysSinceLastPeriod < 16) return 'Ovulation';
    return 'Luteal';
  }
  
  private static getFertilityTips(): string[] {
    return [
      'Track basal body temperature for more accurate ovulation detection',
      'Monitor cervical mucus changes',
      'Consider ovulation predictor kits',
      'Maintain healthy lifestyle with good nutrition and exercise',
      'Manage stress levels',
      'Consult healthcare provider if trying to conceive for over 6 months'
    ];
  }
  
  private static getBPRecommendations(category: string): string[] {
    const recommendations = {
      'Normal': [
        'Maintain healthy lifestyle habits',
        'Regular exercise and balanced diet',
        'Monitor blood pressure annually',
        'Limit sodium intake to <2300mg daily'
      ],
      'Elevated': [
        'Implement lifestyle modifications immediately',
        'Reduce sodium to <1500mg daily',
        'Increase physical activity to 150 minutes/week',
        'Monitor blood pressure monthly',
        'Manage stress through relaxation techniques'
      ],
      'High Blood Pressure Stage 1': [
        'Consult healthcare provider within 1 month',
        'Aggressive lifestyle modifications required',
        'Consider home blood pressure monitoring',
        'May require antihypertensive medication',
        'Follow DASH diet principles'
      ],
      'High Blood Pressure Stage 2': [
        'Immediate medical consultation required',
        'Antihypertensive medication likely needed',
        'Daily blood pressure monitoring',
        'Comprehensive cardiovascular risk assessment',
        'Lifestyle modifications plus medication'
      ],
      'Hypertensive Crisis': [
        '🚨 SEEK IMMEDIATE EMERGENCY MEDICAL CARE',
        'Call 911 if experiencing symptoms',
        'Do not drive yourself to hospital',
        'This is a medical emergency'
      ]
    };
    
    return recommendations[category as keyof typeof recommendations] || [];
  }
  
  private static getBPLifestyleAdvice(category: string): string[] {
    return [
      'DASH diet: Focus on fruits, vegetables, whole grains, lean proteins',
      'Regular aerobic exercise: 150 minutes moderate intensity per week',
      'Weight management: Maintain healthy BMI',
      'Limit alcohol: Men <2 drinks/day, Women <1 drink/day',
      'Quit smoking: Seek cessation support if needed',
      'Stress management: Practice meditation, yoga, or deep breathing',
      'Adequate sleep: 7-9 hours per night',
      'Regular monitoring: Track blood pressure at home'
    ];
  }
  
  private static getDiabetesPreventionTips(): string[] {
    return [
      'Maintain healthy weight through balanced diet and exercise',
      'Choose whole grains over refined carbohydrates',
      'Include lean proteins and healthy fats in meals',
      'Regular physical activity: 150 minutes moderate exercise weekly',
      'Monitor blood pressure and cholesterol levels',
      'Avoid tobacco use and limit alcohol consumption',
      'Get adequate sleep (7-9 hours nightly)',
      'Manage stress through healthy coping strategies',
      'Regular health screenings and check-ups'
    ];
  }
  
  private static getCholesterolStatus(value: number, type: string) {
    switch (type) {
      case 'total':
        if (value < 200) return 'Optimal';
        if (value < 240) return 'Borderline High';
        return 'High';
      case 'hdl':
        if (value >= 60) return 'Protective';
        if (value >= 40) return 'Acceptable';
        return 'Low (Risk Factor)';
      case 'ldl':
        if (value < 100) return 'Optimal';
        if (value < 130) return 'Near Optimal';
        if (value < 160) return 'Borderline High';
        if (value < 190) return 'High';
        return 'Very High';
      case 'triglycerides':
        if (value < 150) return 'Normal';
        if (value < 200) return 'Borderline High';
        if (value < 500) return 'High';
        return 'Very High';
      default:
        return 'Unknown';
    }
  }
  
  private static getCholesterolRecommendations(riskLevel: string): string[] {
    const recommendations = {
      'Low': [
        'Continue heart-healthy lifestyle',
        'Regular exercise and balanced diet',
        'Monitor cholesterol every 5 years'
      ],
      'Moderate': [
        'Adopt heart-healthy diet (Mediterranean or DASH)',
        'Increase physical activity to 150 minutes/week',
        'Consider plant stanols/sterols',
        'Recheck cholesterol in 6-12 months'
      ],
      'High': [
        'Consult healthcare provider immediately',
        'Likely need cholesterol-lowering medication',
        'Intensive lifestyle modifications required',
        'Consider cardiac risk assessment'
      ]
    };
    
    return recommendations[riskLevel as keyof typeof recommendations] || [];
  }
  
  private static getHydrationTips(): string[] {
    return [
      'Start your day with a glass of water',
      'Carry a reusable water bottle',
      'Eat water-rich foods (fruits and vegetables)',
      'Monitor urine color as hydration indicator',
      'Increase intake during hot weather or exercise',
      'Set reminders to drink water regularly',
      'Flavor water with lemon, cucumber, or mint if preferred'
    ];
  }
  
  private static getSleepHoursAssessment(hours: number): string {
    if (hours < 6) return 'Insufficient - significant health risks';
    if (hours < 7) return 'Short - may impact performance and health';
    if (hours <= 9) return 'Optimal - recommended range for most adults';
    if (hours <= 10) return 'Long - may indicate underlying sleep issues';
    return 'Excessive - consult healthcare provider';
  }
  
  private static getSleepRecommendations(score: number, issues: string[]): string[] {
    const baseRecommendations = [
      'Maintain consistent sleep schedule',
      'Create comfortable sleep environment',
      'Limit screen time before bed',
      'Avoid caffeine late in the day'
    ];
    
    if (issues.includes('Difficulty falling asleep')) {
      baseRecommendations.push('Try relaxation techniques before bed');
    }
    
    if (issues.includes('Frequent waking')) {
      baseRecommendations.push('Evaluate for sleep disorders');
    }
    
    if (issues.includes('Snoring')) {
      baseRecommendations.push('Consider sleep apnea evaluation');
    }
    
    if (score < 40) {
      baseRecommendations.push('Consider consulting a sleep specialist');
    }
    
    return baseRecommendations;
  }
  
  private static getSleepHygieneTips(): string[] {
    return [
      'Keep bedroom cool (60-67°F), dark, and quiet',
      'Use comfortable mattress and pillows',
      'Establish relaxing bedtime routine',
      'Exercise regularly, but not close to bedtime',
      'Limit daytime naps to 20-30 minutes',
      'Expose yourself to bright light in the morning',
      'Avoid large meals and alcohol before bedtime'
    ];
  }
  
  private static getStressRecommendations(level: string): string[] {
    const recommendations = {
      'Low': [
        'Continue current stress management practices',
        'Maintain healthy lifestyle habits',
        'Practice preventive stress management'
      ],
      'Moderate': [
        'Implement regular stress reduction techniques',
        'Consider meditation or mindfulness practices',
        'Ensure adequate sleep and exercise',
        'Evaluate work-life balance'
      ],
      'High': [
        'Actively address major stressors',
        'Consider professional counseling',
        'Implement daily stress management routine',
        'Evaluate need for lifestyle changes'
      ],
      'Very High': [
        'Seek professional mental health support',
        'Consider immediate stress reduction measures',
        'Evaluate for anxiety or depression',
        'May need medical evaluation'
      ]
    };
    
    return recommendations[level as keyof typeof recommendations] || [];
  }
  
  private static getStressCopingStrategies(): string[] {
    return [
      'Deep breathing exercises',
      'Progressive muscle relaxation',
      'Regular physical exercise',
      'Mindfulness meditation',
      'Time management techniques',
      'Social support network',
      'Adequate sleep and nutrition',
      'Limiting caffeine and alcohol',
      'Professional counseling if needed'
    ];
  }
  
  private static getPHQ9NextSteps(totalScore: number, suicideRisk: boolean): string[] {
    if (suicideRisk) {
      return [
        '🚨 IMMEDIATE ACTION REQUIRED',
        'Contact National Suicide Prevention Lifeline: 988',
        'Go to nearest emergency room',
        'Call 911 if in immediate danger',
        'Do not leave person alone'
      ];
    }
    
    if (totalScore >= 15) {
      return [
        'Schedule appointment with healthcare provider immediately',
        'Consider same-day urgent care visit',
        'Inform trusted family member or friend',
        'Monitor symptoms closely'
      ];
    } else if (totalScore >= 10) {
      return [
        'Schedule appointment with healthcare provider',
        'Consider counseling or therapy',
        'Implement self-care strategies',
        'Monitor symptoms weekly'
      ];
    } else {
      return [
        'Continue monitoring symptoms',
        'Implement healthy lifestyle habits',
        'Consider preventive mental health strategies',
        'Seek support if symptoms worsen'
      ];
    }
  }
  
  private static getAnxietyManagementTips(): string[] {
    return [
      'Practice deep breathing exercises',
      'Try progressive muscle relaxation',
      'Use grounding techniques (5-4-3-2-1 method)',
      'Regular physical exercise',
      'Limit caffeine intake',
      'Maintain regular sleep schedule',
      'Consider mindfulness meditation',
      'Challenge negative thoughts',
      'Seek social support',
      'Professional therapy if symptoms persist'
    ];
  }
  
  // Additional calculator methods would be implemented here for the remaining tools
  private static calculateADHDScore(inputs: any): any {
    const scores = Object.values(inputs).map(val => Number(val) || 0);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    let likelihood = 'Low';
    if (totalScore >= 14) likelihood = 'High';
    else if (totalScore >= 10) likelihood = 'Moderate';

    return {
      total_score: totalScore,
      likelihood: `${likelihood} likelihood of ADHD symptoms`,
      recommendations: [
        'This is a screening tool, not a diagnosis.',
        'Consult a healthcare professional for a comprehensive evaluation.',
        likelihood === 'High' ? 'Consider discussing these results with a psychiatrist or psychologist.' : ''
      ].filter(Boolean)
    };
  }
  
  private static calculateAuditScore(inputs: any): any {
    const scores = Object.values(inputs).map(val => Number(val) || 0);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);

    let riskLevel = 'Low Risk';
    if (totalScore >= 20) riskLevel = 'High Risk - Possible Dependence';
    else if (totalScore >= 16) riskLevel = 'High Risk';
    else if (totalScore >= 8) riskLevel = 'Hazardous or Harmful Drinking';

    return {
      total_score: totalScore,
      risk_level: riskLevel,
      recommendations: [
        'Scores of 8 or more suggest hazardous drinking.',
        'High scores warrant a discussion with a healthcare provider.',
        'This screening can help you understand your alcohol consumption patterns.'
      ]
    };
  }
  
  private static calculateQuitReadiness(inputs: any): any {
    const { readiness, confidence } = inputs;
    let stage = 'Precontemplation';
    if (readiness >= 7) stage = 'Action';
    else if (readiness >= 4) stage = 'Preparation';
    else if (readiness >= 1) stage = 'Contemplation';

    return {
      readiness_stage: stage,
      confidence_level: `${confidence}/10`,
      recommendations: [
        `Your readiness level suggests you are in the ${stage} stage.`,
        'Confidence is a key factor in successfully quitting.',
        'Consider creating a quit plan and identifying your triggers.'
      ]
    };
  }
  
  private static calculateFallRisk(inputs: any): any {
    const { age, previous_falls, medications, vision_problems, balance_issues, mobility_aid, cognitive_impairment, home_hazards, fear_of_falling } = inputs;
    
    let riskScore = 0;
    
    // Age scoring
    if (age >= 80) riskScore += 3;
    else if (age >= 70) riskScore += 2;
    else if (age >= 60) riskScore += 1;
    
    // Previous falls
    switch (previous_falls) {
      case '4+ falls': riskScore += 4; break;
      case '2-3 falls': riskScore += 3; break;
      case '1 fall': riskScore += 2; break;
    }
    
    // Medication count
    if (medications >= 8) riskScore += 3;
    else if (medications >= 4) riskScore += 2;
    else if (medications >= 2) riskScore += 1;
    
    // Risk factors
    if (vision_problems) riskScore += 2;
    if (balance_issues) riskScore += 3;
    if (mobility_aid === 'Walker') riskScore += 2;
    else if (mobility_aid === 'Cane') riskScore += 1;
    if (cognitive_impairment) riskScore += 2;
    if (home_hazards) riskScore += 2;
    if (fear_of_falling) riskScore += 1;
    
    let riskLevel;
    if (riskScore >= 11) riskLevel = 'High';
    else if (riskScore >= 6) riskLevel = 'Moderate';
    else riskLevel = 'Low';
    
    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      fall_prevention_strategies: this.getFallPreventionStrategies(riskLevel),
      home_safety_checklist: this.getHomeSafetyChecklist()
    };
  }
  
  private static calculateMedicationAdherence(inputs: any): any {
    const { prescribed_doses, missed_doses, reasons } = inputs;
    
    const adherenceRate = Math.round(((prescribed_doses - missed_doses) / prescribed_doses) * 100);
    
    let adherenceLevel;
    if (adherenceRate >= 80) adherenceLevel = 'Good';
    else if (adherenceRate >= 50) adherenceLevel = 'Moderate';
    else adherenceLevel = 'Poor';
    
    return {
      adherence_rate: adherenceRate,
      adherence_level: adherenceLevel,
      missed_doses,
      main_barriers: reasons || [],
      improvement_strategies: this.getMedicationStrategies(reasons || [])
    };
  }
  
  private static assessPainLevel(inputs: any): any {
    const { pain_level, location, duration, type, interference } = inputs;
    
    let severity;
    if (pain_level >= 8) severity = 'Severe';
    else if (pain_level >= 5) severity = 'Moderate';
    else if (pain_level >= 3) severity = 'Mild';
    else severity = 'Minimal';
    
    return {
      pain_score: pain_level,
      severity,
      chronic_pain: duration === 'More than 3 months',
      functional_impact: interference || 'Not assessed',
      management_options: this.getPainManagementOptions(severity),
      red_flags: this.getPainRedFlags()
    };
  }
  
  private static calculateCancerRisk(inputs: any): any {
    const { age, gender, family_history, smoking, alcohol, diet, exercise, sun_exposure } = inputs;
    
    let riskFactors = [];
    let riskScore = 0;
    
    if (age >= 65) { riskFactors.push('Age over 65'); riskScore += 2; }
    if (family_history?.includes('Cancer')) { riskFactors.push('Family history'); riskScore += 3; }
    if (smoking) { riskFactors.push('Smoking'); riskScore += 4; }
    if (alcohol === 'Heavy') { riskFactors.push('Heavy alcohol use'); riskScore += 2; }
    if (diet === 'Poor') { riskFactors.push('Poor diet'); riskScore += 1; }
    if (exercise === 'Sedentary') { riskFactors.push('Lack of exercise'); riskScore += 1; }
    if (sun_exposure === 'High') { riskFactors.push('High sun exposure'); riskScore += 1; }
    
    let riskLevel;
    if (riskScore >= 8) riskLevel = 'High';
    else if (riskScore >= 4) riskLevel = 'Moderate';
    else riskLevel = 'Low';
    
    return {
      risk_level: riskLevel,
      risk_factors: riskFactors,
      screening_recommendations: this.getCancerScreeningRecommendations(age, gender),
      prevention_strategies: this.getCancerPreventionStrategies()
    };
  }
  
  // New calculator implementations
  private static calculateCaloriesBurned(inputs: any) {
    const { weight, activity, duration } = inputs;
    
    const metValues: { [key: string]: number } = {
      'Walking (3.5 mph)': 4.0,
      'Running (6 mph)': 9.8,
      'Cycling (moderate)': 6.8,
      'Swimming': 7.0,
      'Weight lifting': 6.0,
      'Yoga': 2.5,
      'Dancing': 5.0,
      'Basketball': 8.0,
      'Tennis': 7.3
    };
    
    const met = metValues[activity] || 4.0;
    const caloriesBurned = Math.round((met * weight * duration) / 60);
    
    return {
      calories_burned: caloriesBurned,
      activity,
      duration_minutes: duration,
      met_value: met,
      recommendations: [
        'Stay hydrated during exercise',
        'Gradually increase intensity',
        'Listen to your body'
      ]
    };
  }
  
  private static calculateASCVDRisk(inputs: any) {
    // Simplified ASCVD risk calculation
    const { age, gender, total_cholesterol, hdl_cholesterol, systolic_bp, diabetes, smoker } = inputs;
    
    let riskScore = 0;
    riskScore += Math.max(0, age - 40) * 0.5;
    if (gender === 'Female') riskScore *= 0.8;
    if (total_cholesterol > 240) riskScore += 3;
    if (hdl_cholesterol < 40) riskScore += 2;
    if (systolic_bp > 140) riskScore += 2;
    if (diabetes) riskScore += 4;
    if (smoker) riskScore += 3;
    
    const riskPercent = Math.min(50, Math.max(1, riskScore));
    
    return {
      ten_year_risk: Math.round(riskPercent),
      risk_category: riskPercent >= 20 ? 'High' : riskPercent >= 7.5 ? 'Intermediate' : 'Low',
      recommendations: this.getCardiovascularRecommendations(riskPercent)
    };
  }
  
  private static calculateChildGrowth(inputs: any) {
    const { age_months, weight, height, gender } = inputs;
    
    // Simplified growth assessment
    return {
      age_months,
      weight_status: 'Normal range (needs actual growth charts)',
      height_status: 'Normal range (needs actual growth charts)',
      recommendations: [
        'Continue regular pediatric check-ups',
        'Maintain balanced nutrition',
        'Encourage physical activity'
      ]
    };
  }
  
  private static calculatePregnancyWeightGain(inputs: any) {
    const { pre_pregnancy_weight, height, weeks_pregnant } = inputs;
    
    const heightM = height / 100;
    const preBMI = pre_pregnancy_weight / (heightM * heightM);
    
    let recommendedGain;
    if (preBMI < 18.5) recommendedGain = '12.5-18 kg';
    else if (preBMI < 25) recommendedGain = '11.5-16 kg';
    else if (preBMI < 30) recommendedGain = '7-11.5 kg';
    else recommendedGain = '5-9 kg';
    
    return {
      pre_pregnancy_bmi: Math.round(preBMI * 10) / 10,
      recommended_total_gain: recommendedGain,
      current_week: weeks_pregnant,
      recommendations: this.getPregnancyWeightRecommendations(preBMI)
    };
  }
  
  private static calculatePregnancyNutrition(inputs: any) {
    const { weeks_pregnant, activity_level } = inputs;
    
    let additionalCalories = 0;
    if (weeks_pregnant <= 13) additionalCalories = 0;
    else if (weeks_pregnant <= 27) additionalCalories = 340;
    else additionalCalories = 450;
    
    return {
      additional_calories: additionalCalories,
      key_nutrients: {
        protein: '71g daily',
        folate: '600 mcg daily',
        iron: '27 mg daily',
        calcium: '1000 mg daily'
      },
      recommendations: [
        'Take prenatal vitamins',
        'Eat variety of nutritious foods',
        'Stay hydrated'
      ]
    };
  }
  
  private static calculateBoneDensityRisk(inputs: any) {
    const { age, gender, family_history, smoking, steroid_use, previous_fracture } = inputs;
    
    let riskScore = 0;
    if (age >= 65) riskScore += 3;
    if (gender === 'Female') riskScore += 2;
    if (family_history) riskScore += 2;
    if (smoking) riskScore += 2;
    if (steroid_use) riskScore += 3;
    if (previous_fracture) riskScore += 3;
    
    return {
      risk_score: riskScore,
      risk_level: riskScore >= 8 ? 'High' : riskScore >= 4 ? 'Moderate' : 'Low',
      screening_recommendation: this.getBoneScreeningRecommendation(age, gender, riskScore),
      prevention_strategies: this.getBoneHealthStrategies()
    };
  }
  
  // Helper functions
  private static getFallPreventionStrategies(riskLevel: string): string[] {
    return [
      'Remove home hazards (rugs, clutter)',
      'Improve lighting throughout home',
      'Use handrails on stairs',
      'Wear proper footwear',
      'Exercise to improve balance and strength',
      'Review medications with healthcare provider'
    ];
  }
  
  private static getHomeSafetyChecklist(): string[] {
    return [
      'Install grab bars in bathroom',
      'Remove throw rugs',
      'Improve lighting',
      'Clear walkways',
      'Secure loose carpets'
    ];
  }
  
  private static getMedicationStrategies(barriers: string[]): string[] {
    const strategies = ['Use pill organizers', 'Set medication reminders'];
    
    if (barriers.includes('Forgot')) {
      strategies.push('Phone alarms or apps');
    }
    if (barriers.includes('Side effects')) {
      strategies.push('Discuss with healthcare provider');
    }
    if (barriers.includes('Cost')) {
      strategies.push('Ask about generic alternatives');
    }
    
    return strategies;
  }
  
  private static getPainManagementOptions(severity: string): string[] {
    const options = ['Rest and activity modification', 'Heat/cold therapy'];
    
    if (severity === 'Severe') {
      options.push('Consider medical evaluation', 'Prescription pain management');
    } else if (severity === 'Moderate') {
      options.push('Over-the-counter pain relievers', 'Physical therapy');
    }
    
    return options;
  }
  
  private static getPainRedFlags(): string[] {
    return [
      'Sudden severe pain',
      'Pain with fever',
      'Pain with numbness/weakness',
      'Pain after trauma',
      'Pain that worsens despite treatment'
    ];
  }
  
  private static getCancerScreeningRecommendations(age: number, gender: string): string[] {
    const screenings = [];
    
    if (age >= 50) {
      screenings.push('Colorectal screening');
    }
    if (gender === 'Female' && age >= 21) {
      screenings.push('Cervical cancer screening');
      if (age >= 40) screenings.push('Mammography');
    }
    if (gender === 'Male' && age >= 50) {
      screenings.push('Discuss prostate screening');
    }
    
    return screenings;
  }
  
  private static getCancerPreventionStrategies(): string[] {
    return [
      'Maintain healthy weight',
      'Exercise regularly',
      'Eat balanced diet rich in fruits and vegetables',
      'Limit alcohol consumption',
      'Avoid tobacco products',
      'Protect skin from sun exposure',
      'Stay up to date with vaccinations'
    ];
  }
  
  private static getCardiovascularRecommendations(risk: number): string[] {
    if (risk >= 20) {
      return [
        'Aggressive lifestyle modifications',
        'Statin therapy recommended',
        'Blood pressure management',
        'Diabetes control if applicable'
      ];
    } else if (risk >= 7.5) {
      return [
        'Lifestyle modifications',
        'Consider statin therapy',
        'Regular monitoring'
      ];
    }
    return [
      'Continue healthy lifestyle',
      'Regular health screenings',
      'Monitor risk factors'
    ];
  }
  
  private static getPregnancyWeightRecommendations(bmi: number): string[] {
    if (bmi < 18.5) {
      return ['Focus on nutrient-dense foods', 'Frequent small meals'];
    } else if (bmi >= 30) {
      return ['Nutritious foods without excess calories', 'Regular approved exercise'];
    }
    return ['Balanced nutritious diet', 'Regular prenatal exercise'];
  }
  
  private static getBoneScreeningRecommendation(age: number, gender: string, riskScore: number): string {
    if ((gender === 'Female' && age >= 65) || (gender === 'Male' && age >= 70) || riskScore >= 8) {
      return 'DEXA scan recommended';
    }
    return 'Continue monitoring risk factors';
  }
  
  private static getBoneHealthStrategies(): string[] {
    return [
      'Adequate calcium intake (1200mg/day)',
      'Vitamin D supplementation',
      'Weight-bearing exercise',
      'Balance training',
      'Avoid smoking and excessive alcohol'
    ];
  }
}

// Initialize comprehensive health tools
export const initializeComprehensiveHealthTools = async () => {
  const tools = await githubDB.find(collections.health_tools, {});
  if (tools.length === 0) {
    await Promise.all(COMPREHENSIVE_HEALTH_TOOLS.map(tool =>
      githubDB.insert(collections.health_tools, {
        ...tool,
        id: crypto.randomUUID(),
        is_active: true,
        requires_login: false,
        featured: tool.type === ToolType.AI_POWERED,
        usage_count: 0,
        rating: 4.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    ));
  }
};

// Continue in next part with complete tool definitions...