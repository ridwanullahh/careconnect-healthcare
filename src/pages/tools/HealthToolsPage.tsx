// Health Tools Page for CareConnect Healthcare Platform
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  masterHealthToolsService as HealthToolsService, 
  ToolCategory, 
  ToolType,
  initializeMasterHealthTools
} from '../../lib/health-tools-master';
import {
  Search,
  Filter,
  Heart,
  Brain,
  Calculator,
  Activity,
  Baby,
  Pill,
  Shield,
  Users,
  Clock,
  Star,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';

const HealthToolsPage: React.FC = () => {
  const [tools, setTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | ''>('');
  const [selectedType, setSelectedType] = useState<ToolType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: ToolCategory.GENERAL_TRIAGE,
      name: 'General Health',
      description: 'Symptom checkers and health assessments',
      icon: Heart,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: ToolCategory.NUTRITION,
      name: 'Nutrition & Diet',
      description: 'Calorie calculators and meal planning',
      icon: Activity,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: ToolCategory.MENTAL_WELLNESS,
      name: 'Mental Health',
      description: 'Mood tracking and wellness assessments',
      icon: Brain,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: ToolCategory.MATERNAL_HEALTH,
      name: 'Maternal & Child',
      description: 'Pregnancy and pediatric health tools',
      icon: Baby,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      id: ToolCategory.FITNESS,
      name: 'Fitness & Activity',
      description: 'Exercise calculators and fitness trackers',
      icon: Activity,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: ToolCategory.MEDICATION_SAFETY,
      name: 'Medication Safety',
      description: 'Drug interactions and safety checks',
      icon: Pill,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      id: ToolCategory.CHRONIC_CONDITIONS,
      name: 'Chronic Conditions',
      description: 'Diabetes, hypertension management tools',
      icon: Shield,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: ToolCategory.PREVENTIVE_CARE,
      name: 'Preventive Care',
      description: 'Screening schedules and health maintenance',
      icon: Shield,
      color: 'bg-teal-100 text-teal-600'
    },
    {
      id: ToolCategory.EMERGENCY_PREP,
      name: 'Emergency Prep',
      description: 'Emergency response and first aid tools',
      icon: Shield,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: ToolCategory.SLEEP_WELLNESS,
      name: 'Sleep Health',
      description: 'Sleep quality and insomnia management',
      icon: Brain,
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  const toolTypes = [
    { id: ToolType.AI_CHAT, name: 'AI Chat', icon: Sparkles },
    { id: ToolType.AI_POWERED, name: 'AI-Powered', icon: Sparkles },
    { id: ToolType.CALCULATOR, name: 'Calculators', icon: Calculator },
    { id: ToolType.TRACKER, name: 'Trackers', icon: Activity },
    { id: ToolType.ASSESSMENT, name: 'Assessments', icon: Heart },
    { id: ToolType.SCREENER, name: 'Screeners', icon: Search },
    { id: ToolType.GUIDE, name: 'Guides', icon: Users },
    { id: ToolType.EMERGENCY_TOOL, name: 'Emergency Tools', icon: Shield },
    { id: ToolType.WELLNESS_COACH, name: 'Wellness Coach', icon: Brain }
  ];

  useEffect(() => {
    loadTools();
    // Initialize tools if not already present
    initializeMasterHealthTools();
  }, [selectedCategory]);

  const loadTools = async () => {
    setIsLoading(true);
    try {
      let results;
      if (selectedCategory) {
        results = await HealthToolsService.getToolsByCategory(selectedCategory);
      } else {
        results = await HealthToolsService.getAllTools();
      }
      setTools(results || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = !searchQuery || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = !selectedType || tool.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const featuredTools = [
    {
      id: 'health-tool-1',
      name: 'AI Comprehensive Symptom Checker',
      description: 'Advanced AI analysis of multiple symptoms with risk assessment',
      category: 'General Health',
      type: 'AI-Powered',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      isNew: true
    },
    {
      id: 'health-tool-2',
      name: 'Emergency AI Triage System',
      description: 'Rapid AI assessment for emergency situations',
      category: 'Emergency Prep',
      type: 'AI Emergency Tool',
      icon: Shield,
      color: 'bg-gradient-to-r from-red-500 to-orange-500',
      isNew: true
    },
    {
      id: 'health-tool-3',
      name: 'AI Mental Health Companion',
      description: 'Comprehensive mental wellness support with personalized strategies',
      category: 'Mental Health',
      type: 'AI Wellness Coach',
      icon: Brain,
      color: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      isNew: true
    },
    {
      id: 'health-tool-6',
      name: 'AI Personal Nutrition Coach',
      description: 'Personalized meal planning and nutrition guidance',
      category: 'Nutrition',
      type: 'AI Wellness Coach',
      icon: Activity,
      color: 'bg-gradient-to-r from-green-500 to-emerald-500',
      isNew: true
    }
  ];

  return (
    <div className="min-h-screen bg-light">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-dark mb-6">
              100+ Health Tools
              <span className="block text-primary">Powered by AI & Science</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Access comprehensive health calculators, AI-powered assessments, and tracking tools 
              to better understand and manage your health.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search health tools, conditions, or symptoms..."
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            </div>
            
            {/* Medical Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-4xl mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Medical Disclaimer:</strong> These tools are for informational purposes only 
                and are not a substitute for professional medical advice. Always consult with healthcare 
                providers for proper diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Tools */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-dark mb-6">Featured Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={index}
                  to={`/health-tools/${tool.id}`}
                  className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className={`${tool.color} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="w-8 h-8" />
                      {tool.isNew && (
                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
                    <p className="text-white/90 text-sm mb-4">{tool.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/80">{tool.category}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Categories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-dark mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(isSelected ? '' : category.id)}
                  className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-dark mb-2">{category.name}</h3>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tool Type Filters */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType('')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === ''
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-primary'
              }`}
            >
              All Tools
            </button>
            {toolTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(isSelected ? '' : type.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-primary'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {type.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tools Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark">
              {selectedCategory ? 
                categories.find(c => c.id === selectedCategory)?.name + ' Tools' : 
                'All Health Tools'
              }
            </h2>
            <p className="text-gray-600">
              {filteredTools.length} tools available
            </p>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading health tools...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => {
                const categoryInfo = categories.find(c => c.id === tool.category);
                const typeInfo = toolTypes.find(t => t.id === tool.type);
                const TypeIcon = typeInfo?.icon || Calculator;
                
                return (
                  <Link
                    key={tool.id}
                    to={`/health-tools/${tool.id}`}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg ${categoryInfo?.color || 'bg-gray-100 text-gray-600'} flex items-center justify-center`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center space-x-2">
                        {tool.type === ToolType.AI_POWERED && (
                          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                            AI
                          </span>
                        )}
                        {tool.emergency_tool && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            Emergency
                          </span>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {tool.estimated_duration}m
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-dark mb-2 group-hover:text-primary transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">{tool.rating || 4.5}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 ml-1">{tool.usage_count || 0}</span>
                        </div>
                      </div>
                      
                      <span className="text-xs text-gray-500 capitalize">
                        {categoryInfo?.name}
                      </span>
                    </div>
                    
                    {tool.tags && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        {tool.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {filteredTools.length === 0 && !isLoading && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tools found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedType('');
                }}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section className="mt-16 bg-gradient-to-r from-primary to-primary/80 rounded-xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-white/90 mb-6">
            Our healthcare providers can help you with personalized assessments and recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/directory"
              className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Find Healthcare Providers
            </Link>
            <Link
              to="/contact"
              className="bg-accent text-dark px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HealthToolsPage;
