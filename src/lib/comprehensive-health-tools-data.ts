// Comprehensive Health Tools Data - 100+ Tools
import { ToolCategory, ToolType, HealthTool } from './health-tools-fixed';

export const COMPREHENSIVE_HEALTH_TOOLS: Partial<HealthTool>[] = [
  // ========== AI-POWERED TOOLS ==========
  
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
        { name: 'symptoms', type: 'textarea', label: 'Describe your symptoms', required: true },
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
    estimated_duration: 3
  },

  {
    name: 'Emergency Triage Assistant',
    description: 'AI-powered assessment for emergency situations',
    category: ToolCategory.EMERGENCY_PREP,
    type: ToolType.AI_POWERED,
    emergency_tool: true,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Emergency assessment: Patient symptoms: {{symptoms}}. Consciousness level: {{consciousness}}. Breathing: {{breathing}}. Age: {{age}}. Provide immediate care recommendations and urgency level.',
      safety_guidelines: [
        'FOR MEDICAL EMERGENCIES, CALL 911 IMMEDIATELY',
        'This tool should not delay emergency care',
        'If in doubt, seek immediate medical attention'
      ],
      emergency_keywords: ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 'stroke', 'heart attack']
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'textarea', label: 'Emergency symptoms', required: true },
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
      ],
      emergency_keywords: ['suicide', 'self-harm', 'kill myself', 'end it all']
    },
    config: {
      input_fields: [
        { name: 'mood', type: 'select', label: 'Current Mood', required: true, options: ['Very Happy', 'Happy', 'Neutral', 'Sad', 'Very Sad', 'Anxious', 'Angry'] },
        { name: 'stress', type: 'select', label: 'Stress Level (1-10)', required: true, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
        { name: 'concerns', type: 'textarea', label: 'What\'s on your mind?', required: false }
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

  // ========== CALCULATOR TOOLS ==========
  
  // Fitness Calculators
  {
    name: 'BMI Calculator',
    description: 'Calculate your Body Mass Index and get health recommendations',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight', required: true, min: 1, unit: 'kg/lbs' },
        { name: 'height', type: 'number', label: 'Height', required: true, min: 1, unit: 'cm/inches' },
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
    name: 'Body Fat Calculator',
    description: 'Calculate body fat percentage using various methods',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'method', type: 'select', label: 'Calculation Method', required: true, options: ['Navy Method', 'BMI Estimation'] },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['male', 'female'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1 },
        { name: 'waist', type: 'number', label: 'Waist (cm)', required: false, min: 1 },
        { name: 'neck', type: 'number', label: 'Neck (cm)', required: false, min: 1 },
        { name: 'hip', type: 'number', label: 'Hip (cm) - Female only', required: false, min: 1 }
      ],
      output_format: 'json',
      medical_disclaimer: 'Body fat calculations are estimates. Professional assessment may be more accurate.'
    },
    tags: ['body fat', 'fitness', 'composition'],
    difficulty_level: 'intermediate',
    estimated_duration: 2
  },

  {
    name: 'Target Heart Rate Calculator',
    description: 'Calculate optimal heart rate zones for exercise',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'resting_hr', type: 'number', label: 'Resting Heart Rate (optional)', required: false, min: 30, max: 120 },
        { name: 'fitness_level', type: 'select', label: 'Fitness Level', required: false, options: ['Beginner', 'Intermediate', 'Advanced', 'Athlete'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'Consult with healthcare providers before starting any exercise program.'
    },
    tags: ['heart rate', 'exercise', 'cardio'],
    difficulty_level: 'intermediate',
    estimated_duration: 2
  },

  {
    name: 'Calorie Needs Calculator',
    description: 'Calculate daily calorie needs based on goals and activity',
    category: ToolCategory.NUTRITION,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1 },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['male', 'female'] },
        { name: 'activity_level', type: 'select', label: 'Activity Level', required: true, options: ['sedentary', 'light', 'moderate', 'active', 'very_active'] },
        { name: 'goal', type: 'select', label: 'Goal', required: true, options: ['maintain', 'weight_loss', 'weight_gain', 'muscle_gain'] }
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
  }
];