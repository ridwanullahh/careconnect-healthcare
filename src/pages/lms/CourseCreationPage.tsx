import React, { useState, useEffect } from 'react';
import { CourseBuilder, CourseLevel, CourseType, ModuleType, COURSE_CATEGORIES } from '../../lib/lms';
import { LMSService } from '../../lib/lms';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

interface ModuleData {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonData[];
}

interface LessonData {
  id: string;
  title: string;
  description: string;
  type: ModuleType;
  order: number;
  content: any;
  estimated_duration: number;
}

const CourseCreationPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Course basic info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    description: '',
    short_description: '',
    category: '',
    subcategory: '',
    level: CourseLevel.BEGINNER,
    type: CourseType.SELF_PACED,
    language: 'English',
    tags: [] as string[]
  });

  // Course pricing
  const [pricing, setPricing] = useState({
    price: 0,
    discounted_price: 0,
    currency: 'USD',
    is_free: true
  });

  // Course settings
  const [settings, setSettings] = useState({
    estimated_duration: 10,
    enrollment_limit: 100,
    enrollment_deadline: '',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    provides_certificate: false
  });

  // Course modules and lessons
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [currentModule, setCurrentModule] = useState<ModuleData>({
    id: '',
    title: '',
    description: '',
    order: 1,
    lessons: []
  });

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Course title, description, and category' },
    { id: 2, title: 'Pricing & Settings', description: 'Course pricing and access settings' },
    { id: 3, title: 'Course Content', description: 'Add modules and lessons' },
    { id: 4, title: 'Review & Publish', description: 'Review and publish your course' }
  ];

  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!basicInfo.title || !basicInfo.description || !basicInfo.category) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handlePricingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(3);
  };

  const addModule = () => {
    if (!currentModule.title || !currentModule.description) {
      setError('Please fill in module title and description');
      return;
    }
    
    const newModule: ModuleData = {
      ...currentModule,
      id: `module-${Date.now()}`,
      order: modules.length + 1,
      lessons: []
    };
    
    setModules([...modules, newModule]);
    setCurrentModule({
      id: '',
      title: '',
      description: '',
      order: modules.length + 2,
      lessons: []
    });
    setError(null);
  };

  const addLesson = (moduleId: string) => {
    const lesson: LessonData = {
      id: `lesson-${Date.now()}`,
      title: 'New Lesson',
      description: '',
      type: ModuleType.VIDEO,
      order: 1,
      content: {},
      estimated_duration: 10
    };
    
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { ...module, lessons: [...module.lessons, lesson] }
        : module
    ));
  };

  const removeModule = (moduleId: string) => {
    setModules(modules.filter(module => module.id !== moduleId));
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { ...module, lessons: module.lessons.filter(lesson => lesson.id !== lessonId) }
        : module
    ));
  };

  const handleCreateCourse = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const builder = new CourseBuilder();
      
      const courseData = builder
        .setBasicInfo(basicInfo)
        .setPricing(pricing)
        .build();

      // Add additional properties
      Object.assign(courseData, {
        ...settings,
        entity_id: 'entity-current-user', // Should be from auth context
        instructor_id: 'instructor-current-user', // Should be from auth context
        modules_count: modules.length,
        lessons_count: modules.reduce((total, module) => total + module.lessons.length, 0),
        quizzes_count: 0, // Count quizzes from lessons
        prerequisites: [],
        requirements: [],
        target_audience: [],
        learning_objectives: [],
        skills_gained: []
      });

      const createdCourse = await LMSService.createCourse(courseData);
      
      // Create modules and lessons
      for (const moduleData of modules) {
        const createdModule = await LMSService.addModule(createdCourse.id, {
          title: moduleData.title,
          description: moduleData.description,
          order: moduleData.order,
          is_locked: false
        });
        
        for (const lessonData of moduleData.lessons) {
          await LMSService.addLesson(createdModule.id, {
            title: lessonData.title,
            description: lessonData.description,
            type: lessonData.type,
            order: lessonData.order,
            content: lessonData.content,
            is_preview: lessonData.order === 1,
            estimated_duration: lessonData.estimated_duration
          });
        }
      }

      navigate(`/courses/${createdCourse.id}`);
    } catch (err) {
      setError('Failed to create course. Please try again.');
      console.error('Error creating course:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={basicInfo.title}
                onChange={(e) => setBasicInfo({...basicInfo, title: e.target.value})}
                placeholder="Enter course title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <textarea
                required
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={basicInfo.short_description}
                onChange={(e) => setBasicInfo({...basicInfo, short_description: e.target.value})}
                placeholder="Brief description for course listings"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Description *
              </label>
              <textarea
                required
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({...basicInfo, description: e.target.value})}
                placeholder="Detailed course description, learning outcomes, and objectives"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={basicInfo.category}
                  onChange={(e) => setBasicInfo({...basicInfo, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {COURSE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={basicInfo.level}
                  onChange={(e) => setBasicInfo({...basicInfo, level: e.target.value as CourseLevel})}
                >
                  <option value={CourseLevel.BEGINNER}>Beginner</option>
                  <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
                  <option value={CourseLevel.ADVANCED}>Advanced</option>
                  <option value={CourseLevel.EXPERT}>Expert</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Type
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={basicInfo.type}
                  onChange={(e) => setBasicInfo({...basicInfo, type: e.target.value as CourseType})}
                >
                  <option value={CourseType.SELF_PACED}>Self-Paced</option>
                  <option value={CourseType.INSTRUCTOR_LED}>Instructor-Led</option>
                  <option value={CourseType.HYBRID}>Hybrid</option>
                  <option value={CourseType.CERTIFICATION}>Certification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={basicInfo.language}
                  onChange={(e) => setBasicInfo({...basicInfo, language: e.target.value})}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Mandarin">Mandarin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Next Step
              </button>
            </div>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handlePricingSubmit} className="space-y-6">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="is_free"
                checked={pricing.is_free}
                onChange={(e) => setPricing({...pricing, is_free: e.target.checked, price: e.target.checked ? 0 : pricing.price})}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="is_free" className="text-sm font-medium text-gray-700">
                This is a free course
              </label>
            </div>

            {!pricing.is_free && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={pricing.price}
                    onChange={(e) => setPricing({...pricing, price: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discounted Price (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={pricing.discounted_price}
                    onChange={(e) => setPricing({...pricing, discounted_price: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={settings.estimated_duration}
                  onChange={(e) => setSettings({...settings, estimated_duration: parseInt(e.target.value) || 10})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enrollment Limit
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={settings.enrollment_limit}
                  onChange={(e) => setSettings({...settings, enrollment_limit: parseInt(e.target.value) || 100})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  id="allow_preview"
                  checked={settings.allow_preview}
                  onChange={(e) => setSettings({...settings, allow_preview: e.target.checked})}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="allow_preview" className="text-sm font-medium text-gray-700">
                  Allow course preview
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  id="discussion_enabled"
                  checked={settings.discussion_enabled}
                  onChange={(e) => setSettings({...settings, discussion_enabled: e.target.checked})}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="discussion_enabled" className="text-sm font-medium text-gray-700">
                  Enable course discussions
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  id="provides_certificate"
                  checked={settings.provides_certificate}
                  onChange={(e) => setSettings({...settings, provides_certificate: e.target.checked})}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="provides_certificate" className="text-sm font-medium text-gray-700">
                  Provide completion certificate
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Previous
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Next Step
              </button>
            </div>
          </form>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Add Module Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Module</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Module title"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={currentModule.title}
                  onChange={(e) => setCurrentModule({...currentModule, title: e.target.value})}
                />
                <textarea
                  placeholder="Module description"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={currentModule.description}
                  onChange={(e) => setCurrentModule({...currentModule, description: e.target.value})}
                />
                <button
                  type="button"
                  onClick={addModule}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add Module
                </button>
              </div>
            </div>

            {/* Existing Modules */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Course Modules ({modules.length})</h3>
              {modules.map((module, index) => (
                <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        Module {index + 1}: {module.title}
                      </h4>
                      <p className="text-gray-600 text-sm">{module.description}</p>
                    </div>
                    <button
                      onClick={() => removeModule(module.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  
                  {/* Lessons */}
                  <div className="ml-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Lessons ({module.lessons.length})
                      </span>
                      <button
                        onClick={() => addLesson(module.id)}
                        className="text-primary hover:text-primary/80 text-sm"
                      >
                        + Add Lesson
                      </button>
                    </div>
                    
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="bg-gray-50 rounded p-3 mb-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium text-sm">
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({lesson.type}, {lesson.estimated_duration} min)
                          </span>
                        </div>
                        <button
                          onClick={() => removeLesson(module.id, lesson.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {modules.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No modules added yet. Add your first module above.
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                disabled={modules.length === 0}
              >
                Review Course
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Course Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {basicInfo.title}</p>
                    <p><span className="font-medium">Category:</span> {basicInfo.category}</p>
                    <p><span className="font-medium">Level:</span> {basicInfo.level}</p>
                    <p><span className="font-medium">Type:</span> {basicInfo.type}</p>
                    <p><span className="font-medium">Language:</span> {basicInfo.language}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Pricing & Settings</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Price:</span> {pricing.is_free ? 'Free' : `$${pricing.price}`}</p>
                    <p><span className="font-medium">Duration:</span> {settings.estimated_duration} hours</p>
                    <p><span className="font-medium">Enrollment Limit:</span> {settings.enrollment_limit}</p>
                    <p><span className="font-medium">Certificate:</span> {settings.provides_certificate ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 mb-2">Course Content</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Modules:</span> {modules.length}</p>
                  <p><span className="font-medium">Total Lessons:</span> {modules.reduce((total, module) => total + module.lessons.length, 0)}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-gray-600 text-sm">{basicInfo.description}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleCreateCourse}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Course...' : 'Create Course'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark mb-2">Create New Course</h1>
        <p className="text-gray-600">
          Create and publish your healthcare education course
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${currentStep >= step.id 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white border-gray-300 text-gray-500'
                }
              `}>
                {currentStep > step.id ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="ml-3 text-left">
                <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-primary' : 'text-gray-500'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={`h-0.5 ${currentStep > step.id ? 'bg-primary' : 'bg-gray-300'}`}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          renderStepContent()
        )}
      </div>
    </div>
  );
};

export default CourseCreationPage;
