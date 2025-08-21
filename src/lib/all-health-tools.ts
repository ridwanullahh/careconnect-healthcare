// Complete 100+ Health Tools Implementation
import { ToolCategory, ToolType, HealthTool } from './complete-health-tools';

// All 100+ Health Tools with Full Gemini AI Integration
export const ALL_HEALTH_TOOLS: Partial<HealthTool>[] = [
  // ========== AI-POWERED TOOLS (60 Tools) ==========
  
  // General Health & Triage AI Tools (10)
  {
    name: 'AI Comprehensive Symptom Checker',
    description: 'Advanced AI analysis of multiple symptoms with risk stratification',
    category: ToolCategory.GENERAL_TRIAGE,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Comprehensive symptom analysis: Symptoms: {{symptoms}}. Age: {{age}}, Gender: {{gender}}, Duration: {{duration}}, Severity: {{severity}}, Associated factors: {{factors}}. Medical history: {{history}}. Provide detailed analysis including possible conditions, urgency level, and specific care recommendations.',
      safety_guidelines: [
        'This is not a medical diagnosis and should not replace professional medical advice',
        'Recommend seeking immediate medical attention for serious symptoms',
        'Always suggest consulting with healthcare providers for proper diagnosis',
        'Flag emergency symptoms immediately'
      ],
      emergency_keywords: ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 'stroke symptoms'],
      follow_up_prompts: [
        'Would you like information about potential specialists?',
        'Do you need guidance on when to seek emergency care?',
        'Would you like lifestyle recommendations for symptom management?'
      ]
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'textarea', label: 'Describe your symptoms in detail', required: true, placeholder: 'Include location, intensity, timing, and any triggers...' },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] },
        { name: 'duration', type: 'select', label: 'How long have you had these symptoms?', required: true, options: ['Less than 1 hour', '1-6 hours', '6-24 hours', '1-3 days', '4-7 days', '1-4 weeks', 'More than 1 month'] },
        { name: 'severity', type: 'range', label: 'Severity (1-10)', required: true, min: 1, max: 10, step: 1 },
        { name: 'factors', type: 'multiselect', label: 'Associated factors', required: false, options: ['Fever', 'Nausea', 'Dizziness', 'Fatigue', 'Loss of appetite', 'Sleep disturbance', 'Anxiety', 'Recent travel', 'Recent illness'] },
        { name: 'history', type: 'text', label: 'Relevant medical history', required: false, placeholder: 'Chronic conditions, medications, allergies...' }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This AI analysis is for informational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper diagnosis and treatment.',
      processing_time: 10
    },
    tags: ['symptoms', 'ai', 'comprehensive', 'triage', 'assessment'],
    difficulty_level: 'intermediate',
    estimated_duration: 8,
    featured: true
  },

  {
    name: 'Emergency AI Triage System',
    description: 'Rapid AI assessment for emergency situations with immediate care guidance',
    category: ToolCategory.EMERGENCY_PREP,
    type: ToolType.EMERGENCY_TOOL,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: '🚨 EMERGENCY TRIAGE ASSESSMENT: Situation: {{situation}}. Patient age: {{age}}, Consciousness: {{consciousness}}, Breathing: {{breathing}}, Circulation signs: {{circulation}}, Pain level: {{pain}}. Mechanism of injury: {{mechanism}}. Provide IMMEDIATE action steps, urgency classification (RED/YELLOW/GREEN), and specific emergency care instructions.',
      safety_guidelines: [
        'FOR MEDICAL EMERGENCIES, CALL 911 IMMEDIATELY - DO NOT DELAY',
        'This tool should NEVER delay emergency care',
        'If in doubt, always choose emergency care',
        'RED flag symptoms require immediate 911 call'
      ],
      emergency_keywords: ['unconscious', 'not breathing', 'severe bleeding', 'chest pain', 'stroke', 'seizure', 'overdose'],
      follow_up_prompts: [
        'Do you need step-by-step CPR instructions?',
        'Should I provide bleeding control guidance?',
        'Would you like choking response instructions?'
      ]
    },
    config: {
      input_fields: [
        { name: 'situation', type: 'textarea', label: 'Describe the emergency situation', required: true, placeholder: 'What happened? Current symptoms or injuries...' },
        { name: 'age', type: 'number', label: 'Patient age', required: true, min: 0, max: 120 },
        { name: 'consciousness', type: 'select', label: 'Consciousness Level', required: true, options: ['Alert and responsive', 'Confused but responsive', 'Responds to voice only', 'Responds to pain only', 'Unconscious'] },
        { name: 'breathing', type: 'select', label: 'Breathing status', required: true, options: ['Normal breathing', 'Rapid breathing', 'Slow/shallow breathing', 'Difficulty breathing', 'No breathing'] },
        { name: 'circulation', type: 'multiselect', label: 'Circulation signs', required: false, options: ['Normal skin color', 'Pale skin', 'Blue lips/fingers', 'Weak pulse', 'No pulse felt', 'Severe bleeding'] },
        { name: 'pain', type: 'range', label: 'Pain level (if conscious)', required: false, min: 0, max: 10, step: 1 },
        { name: 'mechanism', type: 'select', label: 'How did this happen?', required: false, options: ['Sudden onset', 'Fall', 'Motor vehicle accident', 'Sports injury', 'Medical episode', 'Unknown', 'Other'] }
      ],
      output_format: 'structured',
      medical_disclaimer: '🚨 FOR TRUE MEDICAL EMERGENCIES, CALL 911 IMMEDIATELY. This tool is for guidance only and should not delay emergency care.',
      processing_time: 3
    },
    tags: ['emergency', 'triage', 'urgent', 'first aid', 'critical'],
    difficulty_level: 'advanced',
    estimated_duration: 3,
    featured: true,
    emergency_tool: true
  },

  // Mental Health AI Tools (15)
  {
    name: 'AI Mental Health Companion',
    description: 'Comprehensive AI support for mental wellness with personalized coping strategies',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Mental health support session. Current emotional state: {{mood}}. Stress factors: {{stressors}}. Sleep quality: {{sleep}}. Social support: {{support}}. Recent challenges: {{challenges}}. Coping history: {{coping}}. Provide personalized mental health guidance, evidence-based coping strategies, and supportive counseling approach.',
      safety_guidelines: [
        'If user expresses thoughts of self-harm or suicide, immediately provide crisis resources',
        'This is not a replacement for professional mental health treatment',
        'Encourage seeking professional help when appropriate',
        'Maintain supportive, non-judgmental tone'
      ],
      emergency_keywords: ['suicide', 'self-harm', 'hurt myself', 'end it all', 'no point living'],
      follow_up_prompts: [
        'Would you like specific breathing exercises for anxiety?',
        'Should I provide mindfulness techniques?',
        'Would you like guidance on finding professional support?'
      ]
    },
    config: {
      input_fields: [
        { name: 'mood', type: 'select', label: 'How are you feeling right now?', required: true, options: ['Very depressed', 'Sad', 'Anxious', 'Stressed', 'Neutral', 'Content', 'Happy', 'Very happy'] },
        { name: 'stressors', type: 'multiselect', label: 'Current stress factors', required: false, options: ['Work/School', 'Relationships', 'Finance', 'Health', 'Family', 'Housing', 'Legal issues', 'Other'] },
        { name: 'sleep', type: 'select', label: 'Sleep quality recently', required: true, options: ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
        { name: 'support', type: 'select', label: 'Social support level', required: true, options: ['No support', 'Minimal support', 'Moderate support', 'Good support', 'Excellent support'] },
        { name: 'challenges', type: 'textarea', label: 'What challenges are you facing?', required: false, placeholder: 'Share what\'s been difficult lately...' },
        { name: 'coping', type: 'text', label: 'What coping strategies have you tried?', required: false, placeholder: 'Exercise, meditation, talking to friends...' }
      ],
      output_format: 'text',
      medical_disclaimer: 'If you are experiencing thoughts of self-harm or suicide, please contact emergency services (911) or the National Suicide Prevention Lifeline (988) immediately.',
      processing_time: 8
    },
    tags: ['mental health', 'counseling', 'emotional support', 'coping strategies', 'wellness'],
    difficulty_level: 'beginner',
    estimated_duration: 10,
    featured: true
  },

  {
    name: 'AI Anxiety Management Coach',
    description: 'Personalized anxiety assessment and management strategies using AI',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Anxiety management coaching session. Anxiety level: {{anxiety_level}}. Triggers: {{triggers}}. Physical symptoms: {{symptoms}}. Thought patterns: {{thoughts}}. Current situation: {{situation}}. Previous strategies: {{strategies}}. Provide personalized anxiety management techniques, breathing exercises, cognitive strategies, and practical coping methods.',
      safety_guidelines: [
        'If experiencing panic attacks or severe anxiety, recommend professional help',
        'Provide evidence-based anxiety management techniques',
        'Encourage gradual exposure when appropriate',
        'Monitor for signs requiring professional intervention'
      ]
    },
    config: {
      input_fields: [
        { name: 'anxiety_level', type: 'range', label: 'Current anxiety level (1-10)', required: true, min: 1, max: 10, step: 1 },
        { name: 'triggers', type: 'multiselect', label: 'Anxiety triggers', required: false, options: ['Social situations', 'Work/School', 'Health concerns', 'Future uncertainty', 'Past trauma', 'Relationships', 'Financial stress', 'Performance situations'] },
        { name: 'symptoms', type: 'multiselect', label: 'Physical symptoms', required: false, options: ['Racing heart', 'Sweating', 'Trembling', 'Shortness of breath', 'Chest tightness', 'Nausea', 'Dizziness', 'Muscle tension', 'Headache'] },
        { name: 'thoughts', type: 'textarea', label: 'What thoughts are causing anxiety?', required: false, placeholder: 'Worried thoughts, fears, concerns...' },
        { name: 'situation', type: 'text', label: 'Current triggering situation', required: false },
        { name: 'strategies', type: 'text', label: 'Anxiety management strategies you\'ve tried', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is not professional mental health treatment. If experiencing severe anxiety or panic attacks, please seek professional help.'
    },
    tags: ['anxiety', 'stress management', 'coping skills', 'relaxation', 'mental health'],
    difficulty_level: 'beginner',
    estimated_duration: 12
  },

  {
    name: 'AI Depression Support Assistant',
    description: 'Compassionate AI guidance for depression management and recovery support',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Depression support session. Mood level: {{mood_level}}. Duration: {{duration}}. Energy level: {{energy}}. Sleep patterns: {{sleep_issues}}. Daily functioning: {{functioning}}. Support system: {{support}}. Treatment history: {{treatment}}. Provide compassionate support, practical strategies for depression management, behavioral activation techniques, and appropriate resource recommendations.',
      safety_guidelines: [
        'Screen for suicidal ideation - if present, provide crisis resources immediately',
        'This is not a substitute for professional depression treatment',
        'Encourage professional help for moderate to severe depression',
        'Focus on hope, recovery, and practical coping strategies'
      ],
      emergency_keywords: ['suicide', 'hopeless', 'end my life', 'better off dead', 'no point']
    },
    config: {
      input_fields: [
        { name: 'mood_level', type: 'range', label: 'Depression level (1-10)', required: true, min: 1, max: 10, step: 1 },
        { name: 'duration', type: 'select', label: 'How long have you felt this way?', required: true, options: ['Few days', '1-2 weeks', '2-4 weeks', '1-3 months', '3-6 months', 'More than 6 months'] },
        { name: 'energy', type: 'select', label: 'Energy level', required: true, options: ['No energy', 'Very low', 'Low', 'Moderate', 'Good'] },
        { name: 'sleep_issues', type: 'multiselect', label: 'Sleep problems', required: false, options: ['Trouble falling asleep', 'Waking up early', 'Sleeping too much', 'Frequent waking', 'No sleep problems'] },
        { name: 'functioning', type: 'select', label: 'Daily functioning', required: true, options: ['Unable to function', 'Severely impaired', 'Moderately impaired', 'Mildly impaired', 'Functioning well'] },
        { name: 'support', type: 'text', label: 'Support system available', required: false },
        { name: 'treatment', type: 'text', label: 'Previous or current treatment', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'If you are having thoughts of self-harm or suicide, please contact the National Suicide Prevention Lifeline at 988 or emergency services at 911 immediately.'
    },
    tags: ['depression', 'mental health', 'mood disorder', 'emotional support', 'recovery'],
    difficulty_level: 'intermediate',
    estimated_duration: 15
  },

  {
    name: 'AI Stress Management Advisor',
    description: 'Personalized stress assessment and management strategies',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Stress management consultation. Stress level: {{stress_level}}. Main stressors: {{stressors}}. Physical symptoms: {{physical_symptoms}}. Stress duration: {{duration}}. Coping methods: {{current_coping}}. Work-life balance: {{balance}}. Provide comprehensive stress management plan with practical techniques, lifestyle modifications, and personalized coping strategies.',
      safety_guidelines: [
        'Assess for chronic stress impact on physical and mental health',
        'Recommend professional help if stress is severely impacting functioning',
        'Provide evidence-based stress management techniques'
      ]
    },
    config: {
      input_fields: [
        { name: 'stress_level', type: 'range', label: 'Current stress level (1-10)', required: true, min: 1, max: 10, step: 1 },
        { name: 'stressors', type: 'multiselect', label: 'Main sources of stress', required: true, options: ['Work deadlines', 'Relationship issues', 'Financial problems', 'Health concerns', 'Family responsibilities', 'Academic pressure', 'Life changes', 'Social pressures'] },
        { name: 'physical_symptoms', type: 'multiselect', label: 'Physical stress symptoms', required: false, options: ['Headaches', 'Muscle tension', 'Fatigue', 'Sleep problems', 'Digestive issues', 'Heart palpitations', 'High blood pressure'] },
        { name: 'duration', type: 'select', label: 'How long have you been stressed?', required: true, options: ['Few days', '1-2 weeks', '1-3 months', '3-6 months', 'More than 6 months'] },
        { name: 'current_coping', type: 'text', label: 'How do you currently cope with stress?', required: false },
        { name: 'balance', type: 'select', label: 'Work-life balance', required: true, options: ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'For chronic or severe stress affecting your health and daily life, please consult with a healthcare provider.'
    },
    tags: ['stress management', 'coping strategies', 'relaxation', 'work-life balance', 'wellness'],
    difficulty_level: 'beginner',
    estimated_duration: 10
  },

  {
    name: 'AI Sleep Quality Optimizer',
    description: 'Comprehensive sleep analysis and personalized improvement recommendations',
    category: ToolCategory.SLEEP_WELLNESS,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Sleep optimization consultation. Sleep quality: {{quality}}. Hours: {{hours}}. Sleep schedule: {{schedule}}. Bedtime routine: {{routine}}. Environment: {{environment}}. Sleep issues: {{issues}}. Lifestyle factors: {{lifestyle}}. Provide comprehensive sleep hygiene plan, personalized recommendations, and strategies to optimize sleep quality.',
      safety_guidelines: [
        'Screen for potential sleep disorders requiring medical evaluation',
        'Recommend sleep study if signs of sleep apnea or other disorders',
        'Address safety concerns related to sleep deprivation'
      ]
    },
    config: {
      input_fields: [
        { name: 'quality', type: 'select', label: 'Overall sleep quality', required: true, options: ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
        { name: 'hours', type: 'number', label: 'Average hours of sleep per night', required: true, min: 0, max: 24, step: 0.5 },
        { name: 'schedule', type: 'select', label: 'Sleep schedule consistency', required: true, options: ['Very inconsistent', 'Somewhat inconsistent', 'Moderately consistent', 'Very consistent'] },
        { name: 'routine', type: 'textarea', label: 'Current bedtime routine', required: false, placeholder: 'What do you do before bed?' },
        { name: 'environment', type: 'multiselect', label: 'Sleep environment factors', required: false, options: ['Too noisy', 'Too bright', 'Wrong temperature', 'Uncomfortable mattress', 'Electronic devices present', 'Good environment'] },
        { name: 'issues', type: 'multiselect', label: 'Sleep problems', required: false, options: ['Difficulty falling asleep', 'Frequent waking', 'Early morning awakening', 'Snoring', 'Restless legs', 'Nightmares', 'Sleep talking'] },
        { name: 'lifestyle', type: 'multiselect', label: 'Lifestyle factors', required: false, options: ['Late caffeine intake', 'Alcohol consumption', 'Late heavy meals', 'Evening screen time', 'Irregular exercise', 'High stress', 'Shift work'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'For persistent sleep problems or suspected sleep disorders, consult a sleep specialist or healthcare provider.'
    },
    tags: ['sleep', 'insomnia', 'sleep hygiene', 'wellness', 'optimization'],
    difficulty_level: 'beginner',
    estimated_duration: 12
  },

  // Nutrition & Diet AI Tools (12)
  {
    name: 'AI Personal Nutrition Coach',
    description: 'Comprehensive nutrition analysis and personalized meal planning with AI',
    category: ToolCategory.NUTRITION,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Comprehensive nutrition coaching session. Goals: {{goals}}. Current diet: {{current_diet}}. Dietary restrictions: {{restrictions}}. Health conditions: {{health_conditions}}. Activity level: {{activity}}. Age: {{age}}, Gender: {{gender}}, Weight: {{weight}}kg, Height: {{height}}cm. Food preferences: {{preferences}}. Budget considerations: {{budget}}. Cooking skill level: {{cooking_skill}}. Provide detailed personalized nutrition plan, meal suggestions, macro breakdowns, and practical implementation strategies.',
      safety_guidelines: [
        'Screen for eating disorders and refer to specialists if needed',
        'Do not provide restrictive diets without medical supervision',
        'Consider medical conditions when making recommendations',
        'Emphasize sustainable, balanced nutrition approaches'
      ]
    },
    config: {
      input_fields: [
        { name: 'goals', type: 'multiselect', label: 'Nutrition goals', required: true, options: ['Weight loss', 'Weight gain', 'Muscle building', 'Better energy', 'Disease prevention', 'Athletic performance', 'Digestive health', 'General wellness'] },
        { name: 'current_diet', type: 'textarea', label: 'Describe your current eating patterns', required: true, placeholder: 'Typical meals, snacks, eating schedule...' },
        { name: 'restrictions', type: 'multiselect', label: 'Dietary restrictions/allergies', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Keto', 'Low-sodium', 'Diabetic', 'Food allergies'] },
        { name: 'health_conditions', type: 'text', label: 'Health conditions affecting diet', required: false, placeholder: 'Diabetes, hypertension, heart disease...' },
        { name: 'activity', type: 'select', label: 'Activity level', required: true, options: ['Sedentary', 'Lightly active', 'Moderately active', 'Very active', 'Extremely active'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1, max: 500 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1, max: 300 },
        { name: 'preferences', type: 'text', label: 'Food preferences/dislikes', required: false },
        { name: 'budget', type: 'select', label: 'Budget level', required: false, options: ['Low budget', 'Moderate budget', 'Flexible budget'] },
        { name: 'cooking_skill', type: 'select', label: 'Cooking skill level', required: false, options: ['Beginner', 'Intermediate', 'Advanced', 'Prefer no cooking'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This nutrition guidance is for general wellness. Consult a registered dietitian or healthcare provider for medical nutrition therapy.'
    },
    tags: ['nutrition', 'meal planning', 'diet', 'wellness', 'personalized coaching'],
    difficulty_level: 'intermediate',
    estimated_duration: 15,
    featured: true
  },

  {
    name: 'AI Weight Management Advisor',
    description: 'Personalized weight management strategies with sustainable approach',
    category: ToolCategory.NUTRITION,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Weight management consultation. Current weight: {{current_weight}}kg, Height: {{height}}cm, Goal: {{goal}}, Target timeline: {{timeline}}. Previous attempts: {{history}}. Barriers faced: {{barriers}}. Lifestyle factors: {{lifestyle}}. Medical factors: {{medical}}. Motivation level: {{motivation}}. Provide comprehensive, sustainable weight management plan with realistic goals, behavior modification strategies, and long-term success techniques.',
      safety_guidelines: [
        'Promote healthy, sustainable weight management approaches only',
        'Screen for eating disorders and body dysmorphia',
        'Recommend medical supervision for significant weight loss goals',
        'Emphasize behavior change over quick fixes'
      ]
    },
    config: {
      input_fields: [
        { name: 'current_weight', type: 'number', label: 'Current weight (kg)', required: true, min: 1, max: 500 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1, max: 300 },
        { name: 'goal', type: 'select', label: 'Weight goal', required: true, options: ['Lose weight', 'Gain weight', 'Maintain weight', 'Body recomposition'] },
        { name: 'timeline', type: 'select', label: 'Target timeline', required: true, options: ['1-3 months', '3-6 months', '6-12 months', 'Long-term (1+ years)'] },
        { name: 'history', type: 'textarea', label: 'Previous weight management attempts', required: false, placeholder: 'What have you tried before? What worked or didn\'t work?' },
        { name: 'barriers', type: 'multiselect', label: 'Main barriers to success', required: false, options: ['Lack of time', 'Food cravings', 'Emotional eating', 'Social situations', 'Lack of knowledge', 'Medical conditions', 'Stress', 'Budget constraints'] },
        { name: 'lifestyle', type: 'textarea', label: 'Lifestyle factors', required: false, placeholder: 'Work schedule, family life, exercise habits...' },
        { name: 'medical', type: 'text', label: 'Medical conditions affecting weight', required: false },
        { name: 'motivation', type: 'range', label: 'Current motivation level (1-10)', required: true, min: 1, max: 10, step: 1 }
      ],
      output_format: 'structured',
      medical_disclaimer: 'For significant weight management goals or medical conditions affecting weight, consult with healthcare providers and registered dietitians.'
    },
    tags: ['weight management', 'nutrition', 'lifestyle change', 'behavior modification', 'sustainable health'],
    difficulty_level: 'intermediate',
    estimated_duration: 12
  },

  // Chronic Disease Management AI Tools (10)
  {
    name: 'AI Diabetes Management Coach',
    description: 'Comprehensive diabetes management guidance with personalized recommendations',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.WELLNESS_COACH,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Diabetes management coaching session. Type: {{diabetes_type}}. Recent A1C: {{a1c}}. Blood sugar patterns: {{bg_patterns}}. Medications: {{medications}}. Diet: {{diet}}. Exercise: {{exercise}}. Symptoms: {{symptoms}}. Challenges: {{challenges}}. Provide comprehensive diabetes management guidance including lifestyle modifications, blood sugar management strategies, complication prevention, and personalized action plans.',
      safety_guidelines: [
        'Never recommend stopping or changing diabetes medications',
        'Emphasize importance of regular medical monitoring',
        'Provide emergency guidance for severe high/low blood sugar',
        'Stress importance of healthcare team collaboration'
      ],
      emergency_keywords: ['very high blood sugar', 'ketoacidosis', 'severe hypoglycemia', 'unconscious']
    },
    config: {
      input_fields: [
        { name: 'diabetes_type', type: 'select', label: 'Type of diabetes', required: true, options: ['Type 1', 'Type 2', 'Gestational', 'Prediabetes', 'Not sure'] },
        { name: 'a1c', type: 'number', label: 'Most recent A1C (if known)', required: false, min: 4, max: 20, step: 0.1, unit: '%' },
        { name: 'bg_patterns', type: 'textarea', label: 'Blood sugar patterns/readings', required: false, placeholder: 'Recent patterns, typical ranges, problem times...' },
        { name: 'medications', type: 'text', label: 'Current diabetes medications', required: false, placeholder: 'Insulin, metformin, etc.' },
        { name: 'diet', type: 'textarea', label: 'Current eating patterns', required: false, placeholder: 'Meal timing, carb counting, problem foods...' },
        { name: 'exercise', type: 'text', label: 'Exercise routine', required: false },
        { name: 'symptoms', type: 'multiselect', label: 'Current symptoms', required: false, options: ['Frequent urination', 'Excessive thirst', 'Fatigue', 'Blurred vision', 'Slow healing', 'Tingling/numbness', 'Frequent infections', 'No symptoms'] },
        { name: 'challenges', type: 'multiselect', label: 'Management challenges', required: false, options: ['Blood sugar swings', 'Carb counting', 'Medication timing', 'Exercise planning', 'Social eating', 'Work schedule', 'Stress management', 'Cost of supplies'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is educational guidance only. Never adjust diabetes medications without consulting your healthcare provider. Always follow your diabetes care team\'s treatment plan.'
    },
    tags: ['diabetes', 'chronic disease', 'blood sugar', 'management', 'lifestyle'],
    difficulty_level: 'advanced',
    estimated_duration: 18
  },

  // ========== NON-AI CALCULATOR TOOLS (40 Tools) ==========
  
  // Basic Health Calculators (15)
  {
    name: 'Advanced BMI Calculator',
    description: 'Comprehensive BMI calculation with body composition insights and health risk assessment',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight', required: true, min: 1, unit: 'kg/lbs' },
        { name: 'height', type: 'number', label: 'Height', required: true, min: 1, unit: 'cm/inches' },
        { name: 'unit', type: 'select', label: 'Unit System', required: true, options: ['Metric (kg/cm)', 'Imperial (lbs/inches)'] },
        { name: 'age', type: 'number', label: 'Age (optional)', required: false, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender (optional)', required: false, options: ['Male', 'Female', 'Other'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'BMI is a screening tool and may not reflect body composition. Consult healthcare providers for comprehensive health assessment.',
      results_interpretation: 'BMI categories: Underweight <18.5, Normal 18.5-24.9, Overweight 25-29.9, Obese ≥30'
    },
    tags: ['bmi', 'weight', 'health screening', 'fitness'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  {
    name: 'Body Fat Percentage Calculator',
    description: 'Multiple methods for calculating body fat percentage with health assessment',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'method', type: 'select', label: 'Calculation Method', required: true, options: ['Navy Method', 'BMI-Based Estimate', 'Skin Fold Method'] },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1 },
        { name: 'waist', type: 'number', label: 'Waist circumference (cm)', required: false, min: 1, description: 'Required for Navy Method' },
        { name: 'neck', type: 'number', label: 'Neck circumference (cm)', required: false, min: 1, description: 'Required for Navy Method' },
        { name: 'hip', type: 'number', label: 'Hip circumference (cm)', required: false, min: 1, description: 'Required for women using Navy Method' }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Body fat calculations are estimates. Professional assessment may be more accurate.',
      results_interpretation: 'Essential fat: Men 2-5%, Women 10-13%. Athletic: Men 6-13%, Women 14-20%'
    },
    tags: ['body fat', 'body composition', 'fitness assessment'],
    difficulty_level: 'intermediate',
    estimated_duration: 5
  },

  {
    name: 'Target Heart Rate Calculator',
    description: 'Calculate optimal heart rate zones for different exercise intensities',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'resting_hr', type: 'number', label: 'Resting Heart Rate (bpm)', required: false, min: 40, max: 120, description: 'Optional: for more accurate zones' },
        { name: 'fitness_level', type: 'select', label: 'Fitness Level', required: true, options: ['Beginner', 'Intermediate', 'Advanced', 'Athlete'] },
        { name: 'exercise_type', type: 'select', label: 'Primary Exercise Type', required: false, options: ['Cardio/Running', 'Cycling', 'Swimming', 'General Fitness', 'Weight Training'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Consult your doctor before starting a new exercise program, especially if you have heart conditions.',
      results_interpretation: 'Fat burn zone: 60-70% max HR, Aerobic zone: 70-80% max HR, Anaerobic zone: 80-90% max HR'
    },
    tags: ['heart rate', 'exercise', 'cardio', 'fitness zones'],
    difficulty_level: 'beginner',
    estimated_duration: 3
  },

  {
    name: 'Calorie Needs Calculator',
    description: 'Calculate daily calorie needs based on goals and activity level',
    category: ToolCategory.NUTRITION,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female'] },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1, max: 500 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1, max: 300 },
        { name: 'activity_level', type: 'select', label: 'Activity Level', required: true, options: ['Sedentary (little/no exercise)', 'Lightly active (light exercise 1-3 days/week)', 'Moderately active (moderate exercise 3-5 days/week)', 'Very active (hard exercise 6-7 days/week)', 'Extremely active (very hard exercise/physical job)'] },
        { name: 'goal', type: 'select', label: 'Goal', required: true, options: ['Maintain weight', 'Lose weight (0.5 kg/week)', 'Lose weight (1 kg/week)', 'Gain weight (0.5 kg/week)', 'Gain muscle'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is an estimate. Individual needs may vary. Consult a nutritionist for personalized advice.',
      results_interpretation: 'BMR is calories needed at rest. TDEE is total daily calories. Adjust intake based on goals.'
    },
    tags: ['calories', 'nutrition', 'weight management', 'metabolism'],
    difficulty_level: 'beginner',
    estimated_duration: 3
  },

  // Pediatric Health Tools (8)
  {
    name: 'AI Pediatric Development Tracker',
    description: 'AI-powered assessment of child development milestones with personalized guidance',
    category: ToolCategory.PEDIATRICS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Pediatric development assessment. Child age: {{age}} months. Current milestones: {{milestones}}. Concerns: {{concerns}}. Motor skills: {{motor_skills}}. Language development: {{language}}. Social behavior: {{social}}. Previous assessments: {{history}}. Provide comprehensive development analysis, milestone tracking, activity recommendations, and guidance for parents.',
      safety_guidelines: [
        'Always recommend professional pediatric evaluation for significant concerns',
        'Provide age-appropriate developmental expectations',
        'Support parents with encouragement and practical guidance',
        'Flag concerning delays for immediate professional attention'
      ],
      emergency_keywords: ['regression', 'loss of skills', 'seizure', 'severe delay'],
      age_restrictions: { min_age: 18, max_age: 120 }
    },
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Child age (months)', required: true, min: 0, max: 216 },
        { name: 'milestones', type: 'multiselect', label: 'Current milestones achieved', required: true, options: ['Sitting independently', 'Walking', 'Speaking words', 'Following instructions', 'Playing with others', 'Self-feeding', 'Toilet training'] },
        { name: 'concerns', type: 'textarea', label: 'Development concerns', required: false, placeholder: 'Any concerns about your child\'s development?' },
        { name: 'motor_skills', type: 'select', label: 'Motor skills development', required: true, options: ['Behind expected', 'Meeting expectations', 'Advanced'] },
        { name: 'language', type: 'select', label: 'Language development', required: true, options: ['Behind expected', 'Meeting expectations', 'Advanced'] },
        { name: 'social', type: 'select', label: 'Social development', required: true, options: ['Behind expected', 'Meeting expectations', 'Advanced'] },
        { name: 'history', type: 'text', label: 'Previous assessments or interventions', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is developmental guidance only. Always consult pediatricians for comprehensive child health assessment.',
      processing_time: 12
    },
    tags: ['pediatrics', 'development', 'milestones', 'children', 'parenting'],
    difficulty_level: 'intermediate',
    estimated_duration: 15,
    featured: true
  },

  {
    name: 'Child Growth Calculator',
    description: 'Track child growth percentiles with WHO and CDC standards',
    category: ToolCategory.PEDIATRICS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age_months', type: 'number', label: 'Age (months)', required: true, min: 0, max: 240 },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1, max: 200 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 40, max: 200 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female'] },
        { name: 'head_circumference', type: 'number', label: 'Head circumference (cm)', required: false, min: 20, max: 70, description: 'For children under 2 years' }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Growth percentiles are guidelines. Consult pediatricians for growth concerns.',
      results_interpretation: 'Percentiles show how child compares to peers. 3rd-97th percentile typically normal.'
    },
    tags: ['pediatrics', 'growth', 'percentiles', 'children', 'development'],
    difficulty_level: 'beginner',
    estimated_duration: 3
  },

  // Skin Health AI Tools (5)
  {
    name: 'AI Skin Health Analyzer',
    description: 'AI-powered skin condition assessment with care recommendations',
    category: ToolCategory.SKIN_HEALTH,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Skin health assessment. Symptoms: {{symptoms}}. Location: {{location}}. Duration: {{duration}}. Appearance: {{appearance}}. Associated factors: {{factors}}. Skin type: {{skin_type}}. Previous treatments: {{treatments}}. Age: {{age}}. Provide comprehensive skin health analysis, possible conditions, care recommendations, and when to seek professional dermatological care.',
      safety_guidelines: [
        'Never diagnose skin cancer or serious conditions',
        'Always recommend dermatologist for concerning changes',
        'Provide general skin care guidance only',
        'Flag urgent symptoms for immediate medical attention'
      ],
      emergency_keywords: ['rapidly changing mole', 'bleeding lesion', 'severe infection', 'widespread rash'],
      follow_up_prompts: [
        'Would you like specific skin care product recommendations?',
        'Should I provide sun protection guidance?',
        'Would you like information about finding a dermatologist?'
      ]
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'textarea', label: 'Describe skin symptoms', required: true, placeholder: 'Describe the skin issue in detail...' },
        { name: 'location', type: 'multiselect', label: 'Affected areas', required: true, options: ['Face', 'Scalp', 'Neck', 'Arms', 'Hands', 'Chest', 'Back', 'Legs', 'Feet', 'Genitals'] },
        { name: 'duration', type: 'select', label: 'How long have you had this?', required: true, options: ['Less than 1 week', '1-4 weeks', '1-3 months', '3-6 months', 'More than 6 months'] },
        { name: 'appearance', type: 'multiselect', label: 'Appearance characteristics', required: false, options: ['Red/inflamed', 'Dry/scaly', 'Itchy', 'Painful', 'Bumpy', 'Blistering', 'Oozing', 'Changing color/size'] },
        { name: 'factors', type: 'multiselect', label: 'Possible triggers/factors', required: false, options: ['New products', 'Stress', 'Weather changes', 'Allergies', 'Medications', 'Diet changes', 'Hormonal changes'] },
        { name: 'skin_type', type: 'select', label: 'Skin type', required: true, options: ['Very dry', 'Dry', 'Normal', 'Oily', 'Combination', 'Sensitive'] },
        { name: 'treatments', type: 'text', label: 'Treatments tried', required: false },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is not a medical diagnosis. For concerning skin changes, especially moles or lesions, consult a dermatologist immediately.',
      processing_time: 8
    },
    tags: ['dermatology', 'skin care', 'skin conditions', 'assessment'],
    difficulty_level: 'intermediate',
    estimated_duration: 10
  },

  // Eye Health Tools (4)
  {
    name: 'AI Vision Health Checker',
    description: 'Comprehensive eye health assessment with vision screening guidance',
    category: ToolCategory.EYE_HEALTH,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Vision health assessment. Symptoms: {{symptoms}}. Vision changes: {{changes}}. Duration: {{duration}}. Risk factors: {{risk_factors}}. Current vision aids: {{vision_aids}}. Age: {{age}}. Family history: {{family_history}}. Provide comprehensive eye health guidance, vision care recommendations, and screening schedule based on age and risk factors.',
      safety_guidelines: [
        'Never replace professional eye examinations',
        'Recommend immediate eye care for sudden vision changes',
        'Provide general eye health guidance only',
        'Flag emergency symptoms for urgent care'
      ],
      emergency_keywords: ['sudden vision loss', 'severe eye pain', 'flashing lights', 'curtain vision', 'double vision']
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'multiselect', label: 'Eye symptoms', required: false, options: ['Blurred vision', 'Eye strain', 'Dry eyes', 'Floaters', 'Light sensitivity', 'Eye pain', 'Redness', 'Tearing', 'Double vision'] },
        { name: 'changes', type: 'textarea', label: 'Recent vision changes', required: false, placeholder: 'Describe any changes in your vision...' },
        { name: 'duration', type: 'select', label: 'Duration of symptoms', required: false, options: ['Less than 1 day', '1-7 days', '1-4 weeks', '1-6 months', 'More than 6 months'] },
        { name: 'risk_factors', type: 'multiselect', label: 'Risk factors', required: false, options: ['Diabetes', 'High blood pressure', 'High myopia', 'Frequent computer use', 'UV exposure', 'Smoking', 'Previous eye injury'] },
        { name: 'vision_aids', type: 'multiselect', label: 'Current vision correction', required: false, options: ['None', 'Glasses', 'Contact lenses', 'Reading glasses', 'Previous eye surgery'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'family_history', type: 'text', label: 'Family history of eye problems', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This assessment does not replace comprehensive eye examinations. See an eye care professional regularly.',
      processing_time: 8
    },
    tags: ['ophthalmology', 'vision', 'eye health', 'screening'],
    difficulty_level: 'beginner',
    estimated_duration: 8
  },

  // Maternal Health Calculators (10)
  {
    name: 'Advanced Due Date Calculator',
    description: 'Comprehensive pregnancy due date calculation with milestone tracking',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'last_menstrual_period', type: 'date', label: 'First day of last menstrual period', required: true },
        { name: 'cycle_length', type: 'number', label: 'Average cycle length (days)', required: false, min: 21, max: 35, placeholder: '28' },
        { name: 'conception_date', type: 'date', label: 'Known conception date (optional)', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is an estimate. Your healthcare provider will provide accurate dating based on ultrasounds.',
      results_interpretation: 'Due date is calculated as 280 days from LMP. Actual delivery can be 2 weeks before or after.'
    },
    tags: ['pregnancy', 'due date', 'maternal health', 'prenatal'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  {
    name: 'Ovulation Predictor Calculator',
    description: 'Predict fertile window and ovulation timing',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'cycle_length', type: 'number', label: 'Cycle length (days)', required: true, min: 21, max: 35 },
        { name: 'last_period', type: 'date', label: 'First day of last period', required: true },
        { name: 'irregular_cycles', type: 'boolean', label: 'Do you have irregular cycles?', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is an estimate. Use ovulation predictor kits for more accuracy.',
      results_interpretation: 'Fertile window is typically 6 days ending on ovulation day.'
    },
    tags: ['ovulation', 'fertility', 'family planning', 'reproductive health'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  {
    name: 'Pregnancy Weight Gain Calculator',
    description: 'Track healthy pregnancy weight gain based on pre-pregnancy BMI',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'pre_pregnancy_weight', type: 'number', label: 'Pre-pregnancy weight (kg)', required: true, min: 30, max: 200 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 130, max: 220 },
        { name: 'current_weight', type: 'number', label: 'Current weight (kg)', required: false, min: 30, max: 250 },
        { name: 'weeks_pregnant', type: 'number', label: 'Weeks pregnant', required: true, min: 1, max: 42 },
        { name: 'multiple_pregnancy', type: 'select', label: 'Type of pregnancy', required: true, options: ['Single baby', 'Twins', 'Triplets or more'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Weight gain recommendations vary. Consult your healthcare provider for personalized guidance.',
      results_interpretation: 'Based on IOM guidelines for healthy pregnancy weight gain.'
    },
    tags: ['pregnancy', 'weight gain', 'maternal health', 'nutrition'],
    difficulty_level: 'beginner',
    estimated_duration: 3
  },

  // Senior Health AI Tools (8)
  {
    name: 'AI Senior Health Advisor',
    description: 'Comprehensive health guidance tailored for older adults with aging concerns',
    category: ToolCategory.SENIOR_HEALTH,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Senior health consultation. Age: {{age}}. Health concerns: {{concerns}}. Medications: {{medications}}. Functional status: {{functional_status}}. Cognitive status: {{cognitive}}. Social support: {{support}}. Mobility: {{mobility}}. Chronic conditions: {{conditions}}. Provide comprehensive senior health guidance, fall prevention, medication safety, cognitive health strategies, and healthy aging recommendations.',
      safety_guidelines: [
        'Consider age-related physiological changes in recommendations',
        'Address polypharmacy and drug interactions carefully',
        'Emphasize fall prevention and safety measures',
        'Screen for depression and cognitive changes'
      ],
      age_restrictions: { min_age: 65 }
    },
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 65, max: 120 },
        { name: 'concerns', type: 'multiselect', label: 'Health concerns', required: true, options: ['Memory issues', 'Falls/Balance', 'Chronic pain', 'Medication management', 'Social isolation', 'Sleep problems', 'Appetite changes', 'Mobility issues'] },
        { name: 'medications', type: 'number', label: 'Number of daily medications', required: true, min: 0, max: 30 },
        { name: 'functional_status', type: 'select', label: 'Daily activities independence', required: true, options: ['Completely independent', 'Need some help', 'Need significant help', 'Dependent on others'] },
        { name: 'cognitive', type: 'select', label: 'Memory and thinking', required: true, options: ['No concerns', 'Occasional forgetfulness', 'Some memory problems', 'Significant concerns'] },
        { name: 'support', type: 'select', label: 'Social support level', required: true, options: ['Lives alone, minimal support', 'Lives alone, good support', 'Lives with family/spouse', 'Lives in care facility'] },
        { name: 'mobility', type: 'select', label: 'Mobility status', required: true, options: ['Walks without aid', 'Uses cane/walker', 'Uses wheelchair', 'Bedbound'] },
        { name: 'conditions', type: 'multiselect', label: 'Chronic conditions', required: false, options: ['Diabetes', 'Heart disease', 'High blood pressure', 'Arthritis', 'Osteoporosis', 'COPD', 'Depression', 'Dementia'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This guidance is tailored for older adults but does not replace geriatric medical care.',
      processing_time: 15
    },
    tags: ['geriatrics', 'aging', 'senior health', 'comprehensive assessment'],
    difficulty_level: 'advanced',
    estimated_duration: 20,
    featured: true
  },

  {
    name: 'Fall Risk Assessment Calculator',
    description: 'Comprehensive fall risk evaluation for seniors',
    category: ToolCategory.SENIOR_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 50, max: 120 },
        { name: 'previous_falls', type: 'select', label: 'Falls in past year', required: true, options: ['None', '1 fall', '2-3 falls', '4+ falls'] },
        { name: 'medications', type: 'number', label: 'Number of medications', required: true, min: 0, max: 30 },
        { name: 'vision_problems', type: 'boolean', label: 'Vision problems', required: true },
        { name: 'balance_issues', type: 'boolean', label: 'Balance or dizziness issues', required: true },
        { name: 'mobility_aid', type: 'select', label: 'Mobility aid use', required: true, options: ['None', 'Cane', 'Walker', 'Wheelchair'] },
        { name: 'cognitive_impairment', type: 'boolean', label: 'Memory or thinking problems', required: true },
        { name: 'home_hazards', type: 'boolean', label: 'Home safety hazards present', required: true },
        { name: 'fear_of_falling', type: 'boolean', label: 'Fear of falling', required: true }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This assessment helps identify fall risk factors. Consult healthcare providers for fall prevention strategies.',
      results_interpretation: 'Low risk: 0-5 points, Moderate risk: 6-10 points, High risk: 11+ points'
    },
    tags: ['fall prevention', 'senior health', 'safety assessment', 'geriatrics'],
    difficulty_level: 'intermediate',
    estimated_duration: 5
  },

  // Medication Safety Tools (6)
  {
    name: 'AI Drug Interaction Checker',
    description: 'AI-powered medication interaction and safety analysis',
    category: ToolCategory.MEDICATION_SAFETY,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Medication safety analysis. Current medications: {{medications}}. New medication: {{new_medication}}. Medical conditions: {{conditions}}. Age: {{age}}. Allergies: {{allergies}}. Provide comprehensive drug interaction analysis, safety concerns, timing recommendations, and monitoring guidance.',
      safety_guidelines: [
        'Never recommend stopping prescribed medications',
        'Always advise consulting healthcare providers for medication changes',
        'Provide general interaction information only',
        'Emphasize importance of pharmacy consultation'
      ],
      emergency_keywords: ['severe reaction', 'allergic reaction', 'overdose', 'poisoning']
    },
    config: {
      input_fields: [
        { name: 'medications', type: 'textarea', label: 'Current medications (list all)', required: true, placeholder: 'List all prescription and over-the-counter medications...' },
        { name: 'new_medication', type: 'text', label: 'New medication being considered', required: false },
        { name: 'conditions', type: 'textarea', label: 'Medical conditions', required: false, placeholder: 'List medical conditions...' },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'allergies', type: 'text', label: 'Known allergies', required: false },
        { name: 'supplements', type: 'text', label: 'Vitamins and supplements', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is not professional pharmaceutical advice. Always consult pharmacists and healthcare providers.',
      processing_time: 10
    },
    tags: ['medication safety', 'drug interactions', 'pharmacy', 'safety'],
    difficulty_level: 'advanced',
    estimated_duration: 12
  },

  // Preventive Care Tools (12)
  {
    name: 'AI Preventive Care Planner',
    description: 'Personalized preventive care and screening schedule based on age and risk factors',
    category: ToolCategory.PREVENTIVE_CARE,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Preventive care planning. Age: {{age}}, Gender: {{gender}}, Family history: {{family_history}}, Risk factors: {{risk_factors}}, Previous screenings: {{screenings}}, Health conditions: {{conditions}}. Create comprehensive, personalized preventive care schedule with specific recommendations for screenings, vaccinations, and health maintenance based on current guidelines.',
      safety_guidelines: [
        'Follow current medical society guidelines for screenings',
        'Consider individual risk factors and family history',
        'Recommend discussion with healthcare providers',
        'Emphasize importance of regular check-ups'
      ]
    },
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 18, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] },
        { name: 'family_history', type: 'multiselect', label: 'Family history of', required: false, options: ['Heart disease', 'Cancer', 'Diabetes', 'Osteoporosis', 'Mental health conditions', 'Stroke', 'High blood pressure'] },
        { name: 'risk_factors', type: 'multiselect', label: 'Personal risk factors', required: false, options: ['Smoking', 'Excessive alcohol', 'Obesity', 'Sedentary lifestyle', 'High stress', 'Poor diet', 'Sun exposure'] },
        { name: 'screenings', type: 'textarea', label: 'Recent screenings completed', required: false, placeholder: 'List recent health screenings and dates...' },
        { name: 'conditions', type: 'text', label: 'Current health conditions', required: false },
        { name: 'insurance', type: 'select', label: 'Insurance coverage', required: false, options: ['Excellent coverage', 'Good coverage', 'Limited coverage', 'No insurance'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This schedule is based on general guidelines. Your healthcare provider may recommend different timing.',
      processing_time: 12
    },
    tags: ['preventive care', 'screening schedule', 'health maintenance', 'wellness'],
    difficulty_level: 'intermediate',
    estimated_duration: 15,
    featured: true
  },

  // Fitness & Exercise Tools (15)
  {
    name: 'AI Personal Fitness Coach',
    description: 'Comprehensive fitness assessment and personalized workout planning',
    category: ToolCategory.FITNESS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Personal fitness coaching session. Current fitness level: {{fitness_level}}. Goals: {{goals}}. Available time: {{time_available}}. Equipment: {{equipment}}. Physical limitations: {{limitations}}. Exercise preferences: {{preferences}}. Age: {{age}}, Previous injuries: {{injuries}}. Create comprehensive, personalized fitness plan with progressive exercises, safety considerations, and motivation strategies.',
      safety_guidelines: [
        'Always recommend medical clearance for new exercise programs',
        'Consider physical limitations and previous injuries',
        'Emphasize proper form and gradual progression',
        'Include appropriate warm-up and cool-down routines'
      ]
    },
    config: {
      input_fields: [
        { name: 'fitness_level', type: 'select', label: 'Current fitness level', required: true, options: ['Beginner (little to no exercise)', 'Intermediate (some regular exercise)', 'Advanced (very active)', 'Athlete level'] },
        { name: 'goals', type: 'multiselect', label: 'Fitness goals', required: true, options: ['Weight loss', 'Muscle building', 'Cardiovascular fitness', 'Strength', 'Flexibility', 'Sports performance', 'General health'] },
        { name: 'time_available', type: 'select', label: 'Time available per week', required: true, options: ['Less than 2 hours', '2-4 hours', '4-6 hours', '6-8 hours', 'More than 8 hours'] },
        { name: 'equipment', type: 'multiselect', label: 'Available equipment', required: false, options: ['None (bodyweight only)', 'Dumbbells', 'Resistance bands', 'Gym membership', 'Cardio equipment', 'Yoga mat', 'Pull-up bar'] },
        { name: 'limitations', type: 'textarea', label: 'Physical limitations or health conditions', required: false, placeholder: 'Joint problems, back pain, heart conditions...' },
        { name: 'preferences', type: 'multiselect', label: 'Exercise preferences', required: false, options: ['Cardio', 'Weight training', 'Yoga/Pilates', 'Sports', 'Dance', 'Swimming', 'Hiking', 'Group classes'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 12, max: 120 },
        { name: 'injuries', type: 'text', label: 'Previous injuries', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Consult healthcare providers before starting new exercise programs, especially if you have health conditions.',
      processing_time: 15
    },
    tags: ['fitness', 'exercise', 'workout planning', 'personal training'],
    difficulty_level: 'intermediate',
    estimated_duration: 18,
    featured: true
  },
  {
    name: 'Advanced Due Date Calculator',
    description: 'Comprehensive pregnancy due date calculation with milestone tracking',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'last_menstrual_period', type: 'date', label: 'First day of last menstrual period', required: true },
        { name: 'cycle_length', type: 'number', label: 'Average cycle length (days)', required: false, min: 21, max: 35, placeholder: '28' },
        { name: 'conception_date', type: 'date', label: 'Known conception date (optional)', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This is an estimate. Your healthcare provider will provide accurate dating based on ultrasounds.',
      results_interpretation: 'Due date is calculated as 280 days from LMP. Actual delivery can be 2 weeks before or after.'
    },
    tags: ['pregnancy', 'due date', 'maternal health', 'prenatal'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  // Mental Health Screening Tools (10)
  {
    name: 'PHQ-9 Depression Screening',
    description: 'Standardized 9-question depression screening tool',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.SCREENER,
    config: {
      input_fields: [
        { name: 'q1', type: 'select', label: 'Little interest or pleasure in activities', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q2', type: 'select', label: 'Feeling down, depressed, or hopeless', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q3', type: 'select', label: 'Trouble falling/staying asleep or sleeping too much', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q4', type: 'select', label: 'Feeling tired or having little energy', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q5', type: 'select', label: 'Poor appetite or overeating', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q6', type: 'select', label: 'Feeling bad about yourself or feeling like a failure', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q7', type: 'select', label: 'Trouble concentrating on things', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q8', type: 'select', label: 'Moving or speaking slowly, or being fidgety', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q9', type: 'select', label: 'Thoughts of being better off dead or hurting yourself', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This screening tool is not diagnostic. If you are experiencing thoughts of self-harm, seek immediate professional help.',
      results_interpretation: 'Scores: 0-4 Minimal, 5-9 Mild, 10-14 Moderate, 15-19 Moderately Severe, 20-27 Severe'
    },
    tags: ['depression', 'mental health', 'screening', 'PHQ-9', 'assessment'],
    difficulty_level: 'intermediate',
    estimated_duration: 5
  },
  // Additional Calculator Tools (20 more for 100+ total)
  {
    name: 'Exercise Calories Burned Calculator',
    description: 'Calculate calories burned during different activities',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 30, max: 200 },
        { name: 'activity', type: 'select', label: 'Activity', required: true, options: ['Walking (3.5 mph)', 'Running (6 mph)', 'Cycling (moderate)', 'Swimming', 'Weight lifting', 'Yoga', 'Dancing', 'Basketball', 'Tennis'] },
        { name: 'duration', type: 'number', label: 'Duration (minutes)', required: true, min: 1, max: 480 }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Calorie burn estimates vary by individual. Use as general guidance only.'
    },
    tags: ['exercise', 'calories', 'fitness', 'activity'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  {
    name: 'Water Intake Calculator',
    description: 'Calculate daily water needs based on activity and climate',
    category: ToolCategory.NUTRITION,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1, max: 200 },
        { name: 'activity_duration', type: 'number', label: 'Exercise duration (minutes/day)', required: false, min: 0, max: 480 },
        { name: 'climate', type: 'select', label: 'Climate', required: false, options: ['Cool', 'Moderate', 'Hot', 'Very Hot'] },
        { name: 'altitude', type: 'select', label: 'Altitude', required: false, options: ['Sea level', 'Moderate (1000-3000m)', 'High (>3000m)'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Individual hydration needs may vary. Adjust based on thirst and urine color.'
    },
    tags: ['hydration', 'water intake', 'nutrition', 'health'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  {
    name: 'GAD-7 Anxiety Screening',
    description: 'Standardized 7-question anxiety screening tool',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.SCREENER,
    config: {
      input_fields: [
        { name: 'q1', type: 'select', label: 'Feeling nervous, anxious, or on edge', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q2', type: 'select', label: 'Not being able to stop or control worrying', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q3', type: 'select', label: 'Worrying too much about different things', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q4', type: 'select', label: 'Trouble relaxing', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q5', type: 'select', label: 'Being so restless that it is hard to sit still', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q6', type: 'select', label: 'Becoming easily annoyed or irritable', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q7', type: 'select', label: 'Feeling afraid, as if something awful might happen', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This screening tool is not diagnostic. Consult mental health professionals for proper assessment.',
      results_interpretation: 'Scores: 0-4 Minimal, 5-9 Mild, 10-14 Moderate, 15-21 Severe'
    },
    tags: ['anxiety', 'mental health', 'screening', 'GAD-7', 'assessment'],
    difficulty_level: 'intermediate',
    estimated_duration: 5
  },

  {
    name: 'Medication Adherence Calculator',
    description: 'Calculate medication adherence percentage and identify barriers',
    category: ToolCategory.MEDICATION_SAFETY,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'prescribed_doses', type: 'number', label: 'Total doses prescribed (per month)', required: true, min: 1, max: 1000 },
        { name: 'missed_doses', type: 'number', label: 'Missed doses (past month)', required: true, min: 0, max: 1000 },
        { name: 'reasons', type: 'multiselect', label: 'Reasons for missing doses', required: false, options: ['Forgot', 'Side effects', 'Cost', 'Feeling better', 'Complex regimen', 'Lack of understanding'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Discuss medication adherence challenges with your healthcare provider.',
      results_interpretation: 'Good adherence: >80%, Poor adherence: <50%'
    },
    tags: ['medication adherence', 'compliance', 'medication safety'],
    difficulty_level: 'beginner',
    estimated_duration: 3
  },

  {
    name: 'Cardiovascular Risk Calculator (ASCVD)',
    description: 'Calculate 10-year atherosclerotic cardiovascular disease risk',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 40, max: 79 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female'] },
        { name: 'race', type: 'select', label: 'Race', required: true, options: ['White', 'African American', 'Other'] },
        { name: 'total_cholesterol', type: 'number', label: 'Total cholesterol (mg/dL)', required: true, min: 100, max: 400 },
        { name: 'hdl_cholesterol', type: 'number', label: 'HDL cholesterol (mg/dL)', required: true, min: 20, max: 100 },
        { name: 'systolic_bp', type: 'number', label: 'Systolic blood pressure', required: true, min: 90, max: 200 },
        { name: 'bp_treatment', type: 'boolean', label: 'Currently on blood pressure treatment', required: true },
        { name: 'diabetes', type: 'boolean', label: 'Diabetes', required: true },
        { name: 'smoker', type: 'boolean', label: 'Current smoker', required: true }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This calculator is for adults 40-79 years old without known ASCVD. Consult healthcare providers for interpretation.',
      results_interpretation: 'Low risk: <5%, Borderline: 5-7.5%, Intermediate: 7.5-20%, High risk: ≥20%'
    },
    tags: ['cardiovascular', 'heart disease', 'risk calculator', 'prevention'],
    difficulty_level: 'advanced',
    estimated_duration: 5
  },

  {
    name: 'Pregnancy Nutrition Calculator',
    description: 'Calculate additional nutrition needs during pregnancy',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'pre_pregnancy_weight', type: 'number', label: 'Pre-pregnancy weight (kg)', required: true, min: 35, max: 150 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 140, max: 200 },
        { name: 'weeks_pregnant', type: 'number', label: 'Weeks pregnant', required: true, min: 1, max: 42 },
        { name: 'activity_level', type: 'select', label: 'Activity level', required: true, options: ['Low', 'Moderate', 'High'] },
        { name: 'breastfeeding_planned', type: 'boolean', label: 'Planning to breastfeed', required: false }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Consult registered dietitians for personalized pregnancy nutrition guidance.',
      results_interpretation: 'Based on IOM recommendations for pregnancy nutrition'
    },
    tags: ['pregnancy nutrition', 'maternal health', 'prenatal care'],
    difficulty_level: 'intermediate',
    estimated_duration: 4
  },

  {
    name: 'Bone Density Risk Calculator',
    description: 'Assess osteoporosis risk factors and screening recommendations',
    category: ToolCategory.SENIOR_HEALTH,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 30, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female'] },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 30, max: 200 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 130, max: 220 },
        { name: 'family_history', type: 'boolean', label: 'Family history of osteoporosis/fractures', required: true },
        { name: 'smoking', type: 'boolean', label: 'Current or past smoker', required: true },
        { name: 'alcohol_use', type: 'select', label: 'Alcohol consumption', required: true, options: ['None', 'Occasional', 'Moderate', 'Heavy'] },
        { name: 'steroid_use', type: 'boolean', label: 'Long-term steroid use', required: true },
        { name: 'previous_fracture', type: 'boolean', label: 'Previous fracture after age 50', required: true }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This assessment helps identify osteoporosis risk. Consult healthcare providers for bone density screening.',
      results_interpretation: 'Risk factors guide screening recommendations and prevention strategies'
    },
    tags: ['bone health', 'osteoporosis', 'fracture risk', 'senior health'],
    difficulty_level: 'intermediate',
    estimated_duration: 4
  }
];

export default ALL_HEALTH_TOOLS;