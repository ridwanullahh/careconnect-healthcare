import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { useNavigate, useParams } from 'react-router-dom';
import { Course, LMSService, CourseLevel, CourseType, COURSE_CATEGORIES } from '../../lib/lms';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CourseCreationPage = () => {
  const toast = useToastService();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  
  const [isEditing, setIsEditing] = useState(!!courseId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Course form data
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    short_description: '',
    category: '',
    subcategory: '',
    level: CourseLevel.BEGINNER,
    type: CourseType.SELF_PACED,
    language: 'English',
    price: 0,
    discounted_price: 0,
    currency: 'USD',
    is_free: true,
    estimated_duration: 1,
    prerequisites: [''],
    requirements: [''],
    target_audience: [''],
    learning_objectives: [''],
    skills_gained: [''],
    provides_certificate: false,
    ceu_credits: 0,
    accreditation_body: '',
    enrollment_limit: 0,
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    tags: ['']
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    
    if (isEditing && courseId) {
      loadCourseData();
    }
  }, [isAuthenticated, currentUser, courseId]);

  const loadCourseData = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      const course = await LMSService.getCourse(courseId);
      if (course) {
        setCourseData({
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          category: course.category,
          subcategory: course.subcategory || '',
          level: course.level,
          type: course.type,
          language: course.language,
          price: course.price,
          discounted_price: course.discounted_price || 0,
          currency: course.currency,
          is_free: course.is_free,
          estimated_duration: course.estimated_duration,
          prerequisites: course.prerequisites.length > 0 ? course.prerequisites : [''],
          requirements: course.requirements.length > 0 ? course.requirements : [''],
          target_audience: course.target_audience.length > 0 ? course.target_audience : [''],
          learning_objectives: course.learning_objectives.length > 0 ? course.learning_objectives : [''],
          skills_gained: course.skills_gained.length > 0 ? course.skills_gained : [''],
          provides_certificate: course.provides_certificate,
          ceu_credits: course.ceu_credits || 0,
          accreditation_body: course.accreditation_body || '',
          enrollment_limit: course.enrollment_limit || 0,
          access_duration: course.access_duration,
          allow_preview: course.allow_preview,
          discussion_enabled: course.discussion_enabled,
          tags: course.tags.length > 0 ? course.tags : ['']
        });
      }
    } catch (error) {
      console.error('Error loading course:', error);
      toast.showSuccess('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setCourseData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].map((item: string, i: number) => 
        i === index ? value : item
      )
    }));
  };

  const addArrayField = (field: string) => {
    setCourseData(prev => ({
      ...prev,
      [field]: [...prev[field as keyof typeof prev], '']
    }));
  };

  const removeArrayField = (field: string, index: number) => {
    setCourseData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSaveCourse = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      
      // Validate required fields
      if (!courseData.title || !courseData.description || !courseData.category) {
        toast.showSuccess('Please fill in all required fields');
        return;
      }
      
      // Clean up array fields (remove empty strings)
      const cleanedData = {
        ...courseData,
        entity_id: currentUser.entity_id || 'default-entity',
        instructor_id: currentUser.id,
        prerequisites: courseData.prerequisites.filter(p => p.trim() !== ''),
        requirements: courseData.requirements.filter(r => r.trim() !== ''),
        target_audience: courseData.target_audience.filter(t => t.trim() !== ''),
        learning_objectives: courseData.learning_objectives.filter(l => l.trim() !== ''),
        skills_gained: courseData.skills_gained.filter(s => s.trim() !== ''),
        tags: courseData.tags.filter(t => t.trim() !== '')
      };
      
      let result;
      if (isEditing && courseId) {
        result = await LMSService.updateCourse(courseId, cleanedData);
      } else {
        result = await LMSService.createCourse(cleanedData);
      }
      
      toast.showInfo(isEditing ? 'Course updated successfully!' : 'Course created successfully!');
      navigate(`/dashboard/lms/courses/${result.id}/edit`);
    } catch (error) {
      console.error('Error saving course:', error);
      toast.showSuccess('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const renderArrayField = (
    label: string,
    field: string,
    placeholder: string,
    required: boolean = false
  ) => {
    const fieldValue = courseData[field as keyof typeof courseData] as string[];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {fieldValue.map((item, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={item}
              onChange={(e) => handleArrayFieldChange(field, index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {fieldValue.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayField(field, index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayField(field)}
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          + Add {label.slice(0, -1)}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isEditing ? 'Edit Course' : 'Create New Course'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Update your course information' : 'Build a comprehensive learning experience'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard/lms')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCourse}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </div>

        {/* Course Creation Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter course title"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseData.short_description}
                    onChange={(e) => handleInputChange('short_description', e.target.value)}
                    placeholder="Brief description for course cards"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={courseData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed course description"
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={courseData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                    value={courseData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {Object.values(CourseLevel).map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Pricing</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_free"
                    checked={courseData.is_free}
                    onChange={(e) => handleInputChange('is_free', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="is_free" className="ml-2 text-sm font-medium text-gray-700">
                    This is a free course
                  </label>
                </div>
                
                {!courseData.is_free && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price
                      </label>
                      <input
                        type="number"
                        value={courseData.price}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discounted Price (optional)
                      </label>
                      <input
                        type="number"
                        value={courseData.discounted_price}
                        onChange={(e) => handleInputChange('discounted_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={courseData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Course Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Course Details</h2>
              <div className="space-y-6">
                {renderArrayField('Prerequisites', 'prerequisites', 'Enter prerequisite')}
                {renderArrayField('Requirements', 'requirements', 'Enter requirement')}
                {renderArrayField('Target Audience', 'target_audience', 'Enter target audience')}
                {renderArrayField('Learning Objectives', 'learning_objectives', 'Enter learning objective')}
                {renderArrayField('Skills Gained', 'skills_gained', 'Enter skill')}
                {renderArrayField('Tags', 'tags', 'Enter tag')}
              </div>
            </div>

            {/* Certification */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Certification</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="provides_certificate"
                    checked={courseData.provides_certificate}
                    onChange={(e) => handleInputChange('provides_certificate', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="provides_certificate" className="ml-2 text-sm font-medium text-gray-700">
                    Provide certificate upon completion
                  </label>
                </div>
                
                {courseData.provides_certificate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CEU Credits
                      </label>
                      <input
                        type="number"
                        value={courseData.ceu_credits}
                        onChange={(e) => handleInputChange('ceu_credits', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accreditation Body
                      </label>
                      <input
                        type="text"
                        value={courseData.accreditation_body}
                        onChange={(e) => handleInputChange('accreditation_body', e.target.value)}
                        placeholder="Enter accreditation body"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCreationPage;