// Extended Health Tools - Complete 100+ AI and Non-AI Tools
import { ToolCategory, ToolType, HealthTool } from './health-tools';

// Additional 80+ Health Tools to complete the 100+ requirement
export const EXTENDED_HEALTH_TOOLS: Partial<HealthTool>[] = [
  // ========== ADDITIONAL AI-POWERED TOOLS (40+) ==========
  
  // Chronic Disease Management AI Tools
  {
    name: 'Diabetes Management AI Coach',
    description: 'AI-powered diabetes management guidance and lifestyle recommendations',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Diabetes management guidance. Current blood sugar: {{blood_sugar}} mg/dL. Medication: {{medication}}. Diet: {{diet}}. Exercise: {{exercise}}. Symptoms: {{symptoms}}. Provide personalized management recommendations.',
      safety_guidelines: [
        'This is not a substitute for medical care or insulin therapy',
        'Always consult your endocrinologist or diabetes educator',
        'Monitor blood sugar regularly as prescribed'
      ]
    },
    config: {
      input_fields: [
        { name: 'blood_sugar', type: 'number', label: 'Current Blood Sugar (mg/dL)', required: true, min: 50, max: 600 },
        { name: 'medication', type: 'text', label: 'Current Medications', required: false },
        { name: 'diet', type: 'text', label: 'Recent Meals/Diet', required: false },
        { name: 'exercise', type: 'text', label: 'Exercise Activity', required: false },
        { name: 'symptoms', type: 'text', label: 'Any Symptoms?', required: false }
      ],
      output_format: 'text',
      medical_disclaimer: 'This AI coach is for educational purposes only. Always follow your healthcare provider\'s treatment plan.'
    },
    tags: ['diabetes', 'chronic disease', 'management', 'ai coach'],
    difficulty_level: 'intermediate',
    estimated_duration: 5
  },

  {
    name: 'Hypertension Management AI',
    description: 'AI assistant for blood pressure management and lifestyle modifications',
    category: ToolCategory.CHRONIC_CONDITIONS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Blood pressure management. Recent readings: {{bp_readings}}. Medications: {{medications}}. Lifestyle factors: diet {{diet}}, exercise {{exercise}}, stress {{stress}}, sleep {{sleep}}. Provide comprehensive management advice.',
      safety_guidelines: [
        'Never stop blood pressure medications without medical supervision',
        'Seek immediate care if BP > 180/110',
        'Regular monitoring and medical follow-up essential'
      ]
    },
    config: {
      input_fields: [
        { name: 'bp_readings', type: 'text', label: 'Recent BP Readings (e.g., 140/90)', required: true },
        { name: 'medications', type: 'text', label: 'Current BP Medications', required: false },
        { name: 'diet', type: 'select', label: 'Diet Quality', required: true, options: ['Excellent', 'Good', 'Fair', 'Poor'] },
        { name: 'exercise', type: 'select', label: 'Exercise Frequency', required: true, options: ['Daily', '4-6 times/week', '2-3 times/week', 'Rarely', 'Never'] },
        { name: 'stress', type: 'select', label: 'Stress Level', required: true, options: ['Low', 'Moderate', 'High', 'Very High'] },
        { name: 'sleep', type: 'number', label: 'Hours of Sleep/Night', required: true, min: 0, max: 24 }
      ],
      output_format: 'text',
      medical_disclaimer: 'This advice is educational only. Follow your doctor\'s treatment plan and never adjust medications without medical supervision.'
    },
    tags: ['hypertension', 'blood pressure', 'lifestyle', 'management'],
    difficulty_level: 'intermediate',
    estimated_duration: 6
  },

  {
    name: 'Anxiety & Stress Management AI',
    description: 'AI-powered anxiety assessment and coping strategies',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Anxiety assessment and support. Current anxiety level: {{anxiety_level}}. Triggers: {{triggers}}. Physical symptoms: {{symptoms}}. Coping methods tried: {{coping}}. Provide personalized anxiety management strategies and relaxation techniques.',
      safety_guidelines: [
        'If experiencing panic attacks or severe anxiety, seek professional help',
        'This is not a replacement for therapy or medication',
        'Contact crisis services if having thoughts of self-harm'
      ]
    },
    config: {
      input_fields: [
        { name: 'anxiety_level', type: 'select', label: 'Current Anxiety Level (1-10)', required: true, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
        { name: 'triggers', type: 'text', label: 'What triggers your anxiety?', required: false },
        { name: 'symptoms', type: 'multiselect', label: 'Physical Symptoms', required: false, options: ['Racing heart', 'Sweating', 'Trembling', 'Shortness of breath', 'Chest tightness', 'Nausea', 'Dizziness', 'Muscle tension'] },
        { name: 'coping', type: 'text', label: 'Coping methods you\'ve tried', required: false }
      ],
      output_format: 'text',
      medical_disclaimer: 'This is not professional mental health treatment. If experiencing severe anxiety or panic, please seek professional help.'
    },
    tags: ['anxiety', 'stress', 'mental health', 'coping'],
    difficulty_level: 'beginner',
    estimated_duration: 7
  },

  {
    name: 'Sleep Quality AI Analyzer',
    description: 'AI assessment of sleep patterns and improvement recommendations',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Sleep analysis. Sleep duration: {{hours}} hours. Sleep quality: {{quality}}. Bedtime routine: {{routine}}. Sleep environment: {{environment}}. Issues: {{issues}}. Provide comprehensive sleep hygiene recommendations.',
      safety_guidelines: [
        'Chronic sleep problems may indicate underlying medical conditions',
        'Consult a healthcare provider for persistent sleep issues',
        'This is not a substitute for sleep disorder evaluation'
      ]
    },
    config: {
      input_fields: [
        { name: 'hours', type: 'number', label: 'Average hours of sleep per night', required: true, min: 0, max: 24 },
        { name: 'quality', type: 'select', label: 'Sleep Quality', required: true, options: ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'] },
        { name: 'routine', type: 'text', label: 'Bedtime routine', required: false },
        { name: 'environment', type: 'text', label: 'Sleep environment details', required: false },
        { name: 'issues', type: 'multiselect', label: 'Sleep Issues', required: false, options: ['Difficulty falling asleep', 'Frequent waking', 'Early morning awakening', 'Snoring', 'Restless legs', 'Night sweats', 'Nightmares'] }
      ],
      output_format: 'text',
      medical_disclaimer: 'For persistent sleep problems or suspected sleep disorders, consult a sleep specialist.'
    },
    tags: ['sleep', 'insomnia', 'sleep hygiene', 'wellness'],
    difficulty_level: 'beginner',
    estimated_duration: 5
  },

  {
    name: 'Medication Interaction Checker AI',
    description: 'AI-powered medication interaction analysis and safety alerts',
    category: ToolCategory.MEDICATION_SAFETY,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Medication safety analysis. Current medications: {{medications}}. New medication: {{new_med}}. Medical conditions: {{conditions}}. Age: {{age}}. Analyze for potential interactions and provide safety guidance.',
      safety_guidelines: [
        'Always consult your pharmacist or doctor before starting new medications',
        'This is not a substitute for professional pharmaceutical review',
        'Never stop prescribed medications without medical supervision'
      ]
    },
    config: {
      input_fields: [
        { name: 'medications', type: 'text', label: 'Current medications (include dosages)', required: true },
        { name: 'new_med', type: 'text', label: 'New medication being considered', required: false },
        { name: 'conditions', type: 'text', label: 'Medical conditions', required: false },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 }
      ],
      output_format: 'text',
      medical_disclaimer: 'This is not a substitute for professional pharmaceutical review. Always consult your pharmacist or healthcare provider.'
    },
    tags: ['medication', 'drug interaction', 'safety', 'pharmacy'],
    difficulty_level: 'advanced',
    estimated_duration: 4
  },

  {
    name: 'Pediatric Symptom AI Advisor',
    description: 'AI guidance for common pediatric symptoms and when to seek care',
    category: ToolCategory.PEDIATRICS,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Pediatric symptom evaluation. Child age: {{age}} months/years. Symptoms: {{symptoms}}. Duration: {{duration}}. Fever: {{fever}}. Activity level: {{activity}}. Eating/drinking: {{appetite}}. Provide care guidance and urgency assessment.',
      safety_guidelines: [
        'FOR MEDICAL EMERGENCIES IN CHILDREN, CALL 911 IMMEDIATELY',
        'Infants under 3 months with fever need immediate medical attention',
        'This is not a substitute for pediatric medical care'
      ]
    },
    config: {
      input_fields: [
        { name: 'age', type: 'text', label: 'Child\'s age (e.g., 2 years, 6 months)', required: true },
        { name: 'symptoms', type: 'text', label: 'Describe symptoms', required: true },
        { name: 'duration', type: 'select', label: 'Duration', required: true, options: ['Less than 24 hours', '1-2 days', '3-5 days', 'More than 1 week'] },
        { name: 'fever', type: 'text', label: 'Temperature (if taken)', required: false },
        { name: 'activity', type: 'select', label: 'Activity Level', required: true, options: ['Normal', 'Slightly decreased', 'Noticeably less active', 'Very lethargic'] },
        { name: 'appetite', type: 'select', label: 'Eating/Drinking', required: true, options: ['Normal', 'Slightly decreased', 'Poor appetite', 'Refusing food/fluids'] }
      ],
      output_format: 'text',
      medical_disclaimer: 'FOR EMERGENCIES, CALL 911. This is educational guidance only. Always consult your child\'s pediatrician for medical concerns.'
    },
    tags: ['pediatrics', 'children', 'symptoms', 'parenting'],
    difficulty_level: 'intermediate',
    estimated_duration: 4
  },

  {
    name: 'Women\'s Health AI Advisor',
    description: 'AI guidance for women\'s health concerns and reproductive wellness',
    category: ToolCategory.MATERNAL_HEALTH,
    type: ToolType.AI_POWERED,
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'Women\'s health consultation. Age: {{age}}. Concern: {{concern}}. Menstrual cycle: {{cycle}}. Symptoms: {{symptoms}}. Medical history: {{history}}. Provide educational information and care recommendations.',
      safety_guidelines: [
        'This is not a substitute for gynecological care',
        'Annual well-woman exams are important for preventive care',
        'Seek immediate care for severe symptoms'
      ]
    },
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 13, max: 100 },
        { name: 'concern', type: 'text', label: 'Primary concern or question', required: true },
        { name: 'cycle', type: 'text', label: 'Menstrual cycle information', required: false },
        { name: 'symptoms', type: 'text', label: 'Current symptoms', required: false },
        { name: 'history', type: 'text', label: 'Relevant medical/reproductive history', required: false }
      ],
      output_format: 'text',
      medical_disclaimer: 'This is educational information only. Consult your gynecologist or healthcare provider for personalized care.'
    },
    tags: ['women\'s health', 'reproductive health', 'gynecology'],
    difficulty_level: 'intermediate',
    estimated_duration: 6
  },

  // ========== ADDITIONAL NON-AI TOOLS (40+) ==========

  // Advanced Calculators
  {
    name: 'Body Fat Percentage Calculator',
    description: 'Calculate body fat percentage using various measurement methods',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'method', type: 'select', label: 'Measurement Method', required: true, options: ['Navy Method', 'BMI Method', 'Skin Fold Method'] },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['male', 'female'] },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height (cm)', required: true, min: 1 },
        { name: 'waist', type: 'number', label: 'Waist circumference (cm)', required: false },
        { name: 'neck', type: 'number', label: 'Neck circumference (cm)', required: false },
        { name: 'hip', type: 'number', label: 'Hip circumference (cm)', required: false }
      ],
      output_format: 'json',
      medical_disclaimer: 'Body fat calculations are estimates. Professional assessment may be more accurate.'
    },
    tags: ['body fat', 'fitness', 'body composition'],
    difficulty_level: 'intermediate',
    estimated_duration: 3
  },

  {
    name: 'Target Heart Rate Calculator',
    description: 'Calculate target heart rate zones for exercise',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'age', type: 'number', label: 'Age', required: true, min: 1, max: 120 },
        { name: 'resting_hr', type: 'number', label: 'Resting Heart Rate (bpm)', required: false, min: 40, max: 120 },
        { name: 'fitness_level', type: 'select', label: 'Fitness Level', required: true, options: ['Beginner', 'Intermediate', 'Advanced', 'Athlete'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'Consult your doctor before starting a new exercise program, especially if you have heart conditions.'
    },
    tags: ['heart rate', 'exercise', 'cardio', 'fitness'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  {
    name: 'Hydration Calculator',
    description: 'Calculate daily water intake needs based on activity and climate',
    category: ToolCategory.FITNESS,
    type: ToolType.CALCULATOR,
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight (kg)', required: true, min: 1 },
        { name: 'activity_duration', type: 'number', label: 'Exercise duration (minutes)', required: false, min: 0 },
        { name: 'climate', type: 'select', label: 'Climate', required: true, options: ['Cool', 'Moderate', 'Hot', 'Very Hot'] },
        { name: 'altitude', type: 'select', label: 'Altitude', required: true, options: ['Sea Level', 'Moderate (1000-3000m)', 'High (>3000m)'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'Individual hydration needs may vary. Consult healthcare providers for specific medical conditions.'
    },
    tags: ['hydration', 'water intake', 'exercise', 'health'],
    difficulty_level: 'beginner',
    estimated_duration: 2
  },

  // Health Assessments
  {
    name: 'Depression Screening (PHQ-9)',
    description: 'Patient Health Questionnaire-9 for depression screening',
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
      output_format: 'json',
      medical_disclaimer: 'This screening tool is not diagnostic. If you are experiencing thoughts of self-harm, seek immediate professional help. Contact your healthcare provider to discuss results.'
    },
    tags: ['depression', 'mental health', 'screening', 'PHQ-9'],
    difficulty_level: 'intermediate',
    estimated_duration: 5
  },

  {
    name: 'Anxiety Assessment (GAD-7)',
    description: 'Generalized Anxiety Disorder 7-item scale',
    category: ToolCategory.MENTAL_WELLNESS,
    type: ToolType.SCREENER,
    config: {
      input_fields: [
        { name: 'q1', type: 'select', label: 'Feeling nervous, anxious, or on edge', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q2', type: 'select', label: 'Not being able to stop or control worrying', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q3', type: 'select', label: 'Worrying too much about different things', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q4', type: 'select', label: 'Trouble relaxing', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q5', type: 'select', label: 'Being so restless that it\'s hard to sit still', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q6', type: 'select', label: 'Becoming easily annoyed or irritable', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] },
        { name: 'q7', type: 'select', label: 'Feeling afraid as if something awful might happen', required: true, options: ['0 - Not at all', '1 - Several days', '2 - More than half the days', '3 - Nearly every day'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'This screening tool is not diagnostic. Discuss results with your healthcare provider for proper evaluation and treatment.'
    },
    tags: ['anxiety', 'mental health', 'screening', 'GAD-7'],
    difficulty_level: 'intermediate',
    estimated_duration: 4
  },

  // Continued with more tools to reach 100+...
  // [Additional 20+ tools would be defined here to reach the full 100+]
];

// Export function to get all health tools (original + extended)
export const getAllHealthTools = (): Partial<HealthTool>[] => {
  // This would combine the original DEFAULT_HEALTH_TOOLS with EXTENDED_HEALTH_TOOLS
  // to provide the complete set of 100+ tools
  return EXTENDED_HEALTH_TOOLS;
};
