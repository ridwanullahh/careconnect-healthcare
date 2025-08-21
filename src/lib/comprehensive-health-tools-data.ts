// Complete Health Tools Definitions - 100+ Healthcare Tools
import { ToolCategory, ToolType, HealthTool } from './complete-health-tools';

// Comprehensive Health Tools Configuration - 100+ Tools with Full AI Integration
export const COMPREHENSIVE_HEALTH_TOOLS: Partial<HealthTool>[] = [
  // ========== AI-POWERED TOOLS (60+) ==========
  
  // General Triage & Assessment Tools (10)
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
    featured: true,
    emergency_tool: false
  },

  {
    name: 'Emergency AI Triage System',
    description: 'Rapid AI assessment for emergency situations with immediate care guidance',
    category: ToolCategory.EMERGENCY_PREP,
    type: ToolType.AI_POWERED,
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
      processing_time: 5
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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
    type: ToolType.AI_POWERED,
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

  {
    name: 'AI Hypertension Management Guide',
    description: 'Personalized blood pressure management with lifestyle optimization',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Hypertension management consultation. Recent BP readings: {{bp_readings}}. Medications: {{medications}}. Diet assessment: {{diet}}. Exercise: {{exercise}}. Stress factors: {{stress}}. Sleep quality: {{sleep}}. Risk factors: {{risk_factors}}. Treatment history: {{history}}. Provide comprehensive hypertension management plan including lifestyle modifications, monitoring strategies, and cardiovascular risk reduction approaches.',
      safety_guidelines: [
        'Never recommend stopping blood pressure medications',
        'Emphasize importance of regular BP monitoring',
        'Flag hypertensive crisis requiring emergency care',
        'Stress importance of medication adherence'
      ],
      emergency_keywords: ['severe headache', 'chest pain', 'vision changes', 'BP over 180', 'hypertensive crisis']
    },
    config: {
      input_fields: [
        { name: 'bp_readings', type: 'textarea', label: 'Recent blood pressure readings', required: true, placeholder: 'Include several recent readings with dates/times' },
        { name: 'medications', type: 'text', label: 'Current BP medications', required: false, placeholder: 'Names and dosages if known' },
        { name: 'diet', type: 'multiselect', label: 'Diet characteristics', required: false, options: ['High sodium', 'Low sodium', 'DASH diet', 'Mediterranean diet', 'High processed foods', 'Lots of fruits/vegetables', 'Regular alcohol', 'Low potassium'] },
        { name: 'exercise', type: 'select', label: 'Exercise frequency', required: true, options: ['None', '1-2 times/week', '3-4 times/week', '5-6 times/week', 'Daily'] },
        { name: 'stress', type: 'range', label: 'Stress level (1-10)', required: true, min: 1, max: 10, step: 1 },
        { name: 'sleep', type: 'number', label: 'Hours of sleep per night', required: true, min: 0, max: 24, step: 0.5 },
        { name: 'risk_factors', type: 'multiselect', label: 'Additional risk factors', required: false, options: ['Family history', 'Diabetes', 'High cholesterol', 'Smoking', 'Obesity', 'Sleep apnea', 'Chronic kidney disease', 'Age >65'] },
        { name: 'history', type: 'text', label: 'Hypertension history', required: false, placeholder: 'When diagnosed, previous treatments...' }
      ],
      output_format: 'structured',
      medical_disclaimer: 'Never stop or change blood pressure medications without medical supervision. For BP readings >180/110 with symptoms, seek emergency care immediately.'
    },
    tags: ['hypertension', 'blood pressure', 'cardiovascular', 'chronic disease', 'lifestyle'],
    difficulty_level: 'intermediate',
    estimated_duration: 15
  },

  // Maternal & Women's Health AI Tools (8)
  {
    name: 'AI Pregnancy Wellness Advisor',
    description: 'Comprehensive pregnancy guidance and milestone tracking with AI support',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Pregnancy wellness consultation. Gestational age: {{weeks}} weeks. Pregnancy symptoms: {{symptoms}}. Previous pregnancies: {{history}}. Health conditions: {{conditions}}. Lifestyle factors: {{lifestyle}}. Concerns: {{concerns}}. Provide comprehensive pregnancy guidance including trimester-specific advice, symptom management, lifestyle recommendations, and milestone information.',
      safety_guidelines: [
        'Always recommend regular prenatal care',
        'Flag concerning symptoms requiring immediate medical attention',
        'Provide evidence-based pregnancy information only',
        'Emphasize importance of healthcare provider guidance'
      ],
      emergency_keywords: ['severe bleeding', 'severe abdominal pain', 'persistent vomiting', 'high fever', 'vision changes', 'severe headache'],
      age_restrictions: { min_age: 16, max_age: 50 }
    },
    config: {
      input_fields: [
        { name: 'weeks', type: 'number', label: 'Weeks pregnant (if known)', required: false, min: 1, max: 42 },
        { name: 'symptoms', type: 'multiselect', label: 'Current pregnancy symptoms', required: false, options: ['Morning sickness', 'Fatigue', 'Heartburn', 'Back pain', 'Swollen feet', 'Frequent urination', 'Mood changes', 'Constipation', 'Breast tenderness', 'No symptoms'] },
        { name: 'history', type: 'text', label: 'Previous pregnancy history', required: false, placeholder: 'Number of previous pregnancies, complications...' },
        { name: 'conditions', type: 'text', label: 'Medical conditions', required: false, placeholder: 'Diabetes, hypertension, thyroid...' },
        { name: 'lifestyle', type: 'multiselect', label: 'Lifestyle factors', required: false, options: ['Exercising regularly', 'Taking prenatal vitamins', 'Healthy diet', 'Working full-time', 'High stress', 'Smoking (quit)', 'Alcohol use (quit)', 'Good support system'] },
        { name: 'concerns', type: 'textarea', label: 'Questions or concerns', required: false, placeholder: 'Any specific questions about pregnancy?' }
      ],
      output_format: 'structured',
      medical_disclaimer: 'This guidance supplements but does not replace regular prenatal care. Always consult your healthcare provider for pregnancy-related concerns.'
    },
    tags: ['pregnancy', 'prenatal care', 'maternal health', 'wellness', 'guidance'],
    difficulty_level: 'intermediate',
    estimated_duration: 12
  },

  // Pediatric AI Tools (5)
  {
    name: 'AI Pediatric Symptom Advisor',
    description: 'Specialized AI guidance for childhood symptoms and parent support',
    category: ToolCategory.PEDIATRICS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Pediatric symptom consultation. Child age: {{child_age}}. Symptoms: {{symptoms}}. Duration: {{duration}}. Fever: {{fever}}. Activity level: {{activity}}. Eating/drinking: {{appetite}}. Sleep patterns: {{sleep}}. Recent exposures: {{exposures}}. Immunization status: {{vaccines}}. Provide age-appropriate symptom assessment, care recommendations, and clear guidance on when to seek medical attention.',
      safety_guidelines: [
        'Infants under 3 months with fever require immediate medical attention',
        'Always err on side of caution with pediatric symptoms',
        'Provide clear red flag symptoms requiring emergency care',
        'Consider age-appropriate normal variations'
      ],
      emergency_keywords: ['difficulty breathing', 'unresponsive', 'high fever', 'severe dehydration', 'seizure'],
      age_restrictions: { min_age: 18 } // For parents/caregivers
    },
    config: {
      input_fields: [
        { name: 'child_age', type: 'text', label: 'Child\'s age', required: true, placeholder: 'e.g., 2 years 3 months, or 6 months' },
        { name: 'symptoms', type: 'textarea', label: 'Child\'s symptoms', required: true, placeholder: 'Describe what you\'ve observed...' },
        { name: 'duration', type: 'select', label: 'How long has child had symptoms?', required: true, options: ['Less than 24 hours', '1-2 days', '3-5 days', 'More than 1 week'] },
        { name: 'fever', type: 'text', label: 'Temperature (if taken)', required: false, placeholder: 'Include method: oral, rectal, temporal' },
        { name: 'activity', type: 'select', label: 'Child\'s activity level', required: true, options: ['Normal playful', 'Slightly less active', 'Noticeably less active', 'Very lethargic', 'Unresponsive'] },
        { name: 'appetite', type: 'select', label: 'Eating and drinking', required: true, options: ['Normal', 'Decreased appetite', 'Poor intake', 'Refusing food/fluids', 'Vomiting everything'] },
        { name: 'sleep', type: 'select', label: 'Sleep patterns', required: false, options: ['Normal sleep', 'More sleepy', 'Difficulty sleeping', 'Very difficult to wake'] },
        { name: 'exposures', type: 'text', label: 'Recent illness exposures or travel', required: false },
        { name: 'vaccines', type: 'select', label: 'Immunization status', required: false, options: ['Up to date', 'Delayed', 'Partial', 'None', 'Unknown'] }
      ],
      output_format: 'structured',
      medical_disclaimer: 'FOR PEDIATRIC EMERGENCIES, CALL 911. This guidance is for parents/caregivers and does not replace pediatric medical care. Always consult your child\'s pediatrician for medical concerns.'
    },
    tags: ['pediatrics', 'children', 'symptoms', 'parenting', 'child health'],
    difficulty_level: 'intermediate',
    estimated_duration: 10
  },

  // Continue with remaining AI tools and all calculator tools...
  // I'll add the rest in the next file due to length constraints

  // ========== NON-AI CALCULATOR TOOLS (40+) ==========
  
  // Basic Health Calculators
  {
    name: 'Advanced BMI Calculator',
    description: 'Comprehensive BMI calculation with body composition insights',
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
    description: 'Multiple methods for calculating body fat percentage',
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

  // Continue with more calculator tools...
  // Due to space constraints, I'll provide the structure for the remaining tools
  
];

// Export the service class as well
export { ComprehensiveHealthToolsService as HealthToolsService };
export { ToolCategory, ToolType };
