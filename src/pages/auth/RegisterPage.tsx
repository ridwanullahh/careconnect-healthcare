// Register Page for CareConnect Healthcare Platform
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, UserType } from '../../lib/auth';
import { useToast } from '../../components/ui/Toast';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Building,
  Stethoscope,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { success, error: showError } = useToast();
  
  const defaultUserType = searchParams.get('type') === 'provider' ? UserType.PRACTITIONER : UserType.PUBLIC_USER;
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Account Type
    user_type: defaultUserType,
    
    // Step 2: Basic Info
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    
    // Step 3: Professional Info (for providers)
    specialties: [] as string[],
    license_number: '',
    bio: '',
    languages: ['English'],
    
    // Step 3: Entity Info (for entities)
    entity_name: '',
    entity_description: '',
    entity_address: '',
    entity_phone: '',
    entity_email: '',
    entity_services: [] as string[],
    
    // Terms
    acceptTerms: false,
    acceptPrivacy: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const userTypeOptions = [
    {
      type: UserType.PUBLIC_USER,
      title: 'Patient / Public User',
      description: 'Find providers, access health tools, book appointments',
      icon: User
    },
    {
      type: UserType.PRACTITIONER,
      title: 'Individual Practitioner',
      description: 'Healthcare professional providing services',
      icon: Stethoscope
    },
    {
      type: UserType.HEALTH_CENTER,
      title: 'Health Center / Clinic',
      description: 'Medical facility with multiple practitioners',
      icon: Building
    },
    {
      type: UserType.PHARMACY,
      title: 'Pharmacy',
      description: 'Pharmacy providing medications and health products',
      icon: Building
    }
  ];

  const specialtyOptions = [
    'Family Medicine', 'Internal Medicine', 'Pediatrics', 'Cardiology',
    'Dermatology', 'Psychiatry', 'Orthopedics', 'Neurology',
    'Gynecology', 'Ophthalmology', 'ENT', 'Emergency Medicine'
  ];

  const serviceOptions = [
    'Primary Care', 'Specialist Consultations', 'Diagnostic Services',
    'Laboratory Services', 'Imaging Services', 'Emergency Care',
    'Surgical Services', 'Rehabilitation', 'Mental Health Services',
    'Preventive Care', 'Chronic Disease Management', 'Telemedicine'
  ];

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: target.checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      if (name === 'password') {
        setPasswordStrength(calculatePasswordStrength(value));
      }
    }
    
    setError('');
  };

  const handleSpecialtyChange = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleServiceChange = (service: string) => {
    setFormData(prev => ({
      ...prev,
      entity_services: prev.entity_services.includes(service)
        ? prev.entity_services.filter(s => s !== service)
        : [...prev.entity_services, service]
    }));
  };

  const validateStep = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return formData.user_type !== '';
        
      case 2:
        return formData.email && 
               formData.password && 
               formData.confirmPassword && 
               formData.first_name && 
               formData.last_name &&
               formData.password === formData.confirmPassword &&
               passwordStrength >= 3;
               
      case 3:
        if (formData.user_type === UserType.PUBLIC_USER) return true;
        if ([UserType.HEALTH_CENTER, UserType.PHARMACY].includes(formData.user_type)) {
          return formData.entity_name && 
                 formData.entity_description && 
                 formData.entity_address && 
                 formData.entity_phone && 
                 formData.entity_services.length > 0;
        }
        return formData.specialties.length > 0;
        
      case 4:
        return formData.acceptTerms && formData.acceptPrivacy;
        
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    } else {
      setError('Please fill in all required fields correctly.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      setError('Please accept the terms and privacy policy.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const registrationSuccess = await register(formData);
      if (registrationSuccess) {
        success('Account Created!', 'Welcome to CareConnect. Your account has been created successfully. Please login to continue.');
        // Navigate to login page instead of auto-login
        navigate('/login?message=registration_success');
      } else {
        showError('Registration Failed', 'Unable to create your account. Please try again.');
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      showError('Registration Error', err.message || 'An unexpected error occurred during registration.');
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDashboardRoute = (userType: UserType) => {
    switch (userType) {
      case UserType.SUPER_ADMIN:
        return '/dashboard/super-admin';
      case UserType.HOSPITAL_ADMIN:
      case UserType.HEALTH_CENTER:
        return '/dashboard/hospital';
      case UserType.PRACTITIONER:
      case UserType.PHYSICIAN:
      case UserType.NURSE:
        return '/dashboard/provider';
      case UserType.PHARMACY:
      case UserType.PHARMACIST:
        return '/dashboard/pharmacy';
      case UserType.PATIENT:
      case UserType.PUBLIC_USER:
        return '/dashboard/patient';
      default:
        return '/dashboard';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { text: 'Weak', color: 'text-red-500' };
      case 2:
      case 3:
        return { text: 'Medium', color: 'text-yellow-500' };
      case 4:
      case 5:
        return { text: 'Strong', color: 'text-green-500' };
      default:
        return { text: 'Weak', color: 'text-red-500' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-dark">
            Join CareConnect
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to access comprehensive healthcare services
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNum <= step
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNum < step ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  stepNum
                )}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account Type */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-dark mb-2">
                    Choose Your Account Type
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select the option that best describes you
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userTypeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, user_type: option.type }))}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.user_type === option.type
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className={`w-6 h-6 mt-1 ${
                            formData.user_type === option.type ? 'text-primary' : 'text-gray-400'
                          }`} />
                          <div>
                            <h4 className="font-medium text-dark">{option.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(1)}
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Basic Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-dark mb-2">
                    Basic Information
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter your contact details and create a secure password
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            passwordStrength <= 2 ? 'bg-red-500' :
                            passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs ${getPasswordStrengthText().color}`}>
                        {getPasswordStrengthText().text}
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!validateStep(2)}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Professional/Entity Information */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-dark mb-2">
                    {formData.user_type === UserType.PUBLIC_USER 
                      ? 'Almost Done!' 
                      : [UserType.HEALTH_CENTER, UserType.PHARMACY].includes(formData.user_type)
                        ? 'Entity Information'
                        : 'Professional Information'
                    }
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formData.user_type === UserType.PUBLIC_USER 
                      ? 'Just a few more details to complete your profile'
                      : [UserType.HEALTH_CENTER, UserType.PHARMACY].includes(formData.user_type)
                        ? 'Tell us about your healthcare facility'
                        : 'Tell us about your professional background'
                    }
                  </p>
                </div>
                
                {/* Entity Information for Health Centers and Pharmacies */}
                {[UserType.HEALTH_CENTER, UserType.PHARMACY].includes(formData.user_type) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.user_type === UserType.HEALTH_CENTER ? 'Health Center Name' : 'Pharmacy Name'} *
                      </label>
                      <input
                        type="text"
                        name="entity_name"
                        value={formData.entity_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder={formData.user_type === UserType.HEALTH_CENTER ? 'e.g., City Medical Center' : 'e.g., HealthPlus Pharmacy'}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        name="entity_description"
                        value={formData.entity_description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Brief description of your facility and services"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                      </label>
                      <input
                        type="text"
                        name="entity_address"
                        value={formData.entity_address}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Full address of your facility"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="entity_phone"
                          value={formData.entity_phone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Facility phone number"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="entity_email"
                          value={formData.entity_email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Facility email (optional)"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Services Offered *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {serviceOptions.map(service => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => handleServiceChange(service)}
                            className={`p-2 text-xs rounded border transition-colors ${
                              formData.entity_services.includes(service)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                            }`}
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Professional Information for Individual Practitioners */}
                {formData.user_type === UserType.PRACTITIONER && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialties
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {specialtyOptions.map(specialty => (
                          <button
                            key={specialty}
                            type="button"
                            onClick={() => handleSpecialtyChange(specialty)}
                            className={`p-2 text-xs rounded border transition-colors ${
                              formData.specialties.includes(specialty)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                            }`}
                          >
                            {specialty}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Professional license number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Professional Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Brief description of your practice and experience"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!validateStep(3)}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Terms & Conditions */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-dark mb-2">
                    Terms & Conditions
                  </h3>
                  <p className="text-sm text-gray-600">
                    Please review and accept our terms to complete registration
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="text-sm text-gray-700">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:text-primary/80">
                        Terms of Service
                      </Link>{' '}
                      and understand the platform's medical disclaimer
                    </label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      name="acceptPrivacy"
                      checked={formData.acceptPrivacy}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="text-sm text-gray-700">
                      I agree to the{' '}
                      <Link to="/privacy" className="text-primary hover:text-primary/80">
                        Privacy Policy
                      </Link>{' '}
                      and consent to data processing as described
                    </label>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Medical Disclaimer:</strong> CareConnect is a platform that connects 
                    patients with healthcare providers. It is not a substitute for professional 
                    medical advice, diagnosis, or treatment. Always consult with qualified 
                    healthcare professionals for medical concerns.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!validateStep(4) || isLoading}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/80"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
