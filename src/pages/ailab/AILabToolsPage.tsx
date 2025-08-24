// Additional AI Tools Page - Future AILab Features
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  AlertTriangle,
  Calendar,
  Heart,
  Camera,
  Users,
  Target,
  Dna,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  Construction
} from 'lucide-react';

const AILabToolsPage: React.FC = () => {
  const upcomingTools = [
    {
      id: 'emergency-bridge',
      title: 'AI Emergency Communication Bridge',
      description: 'Instant location-aware emergency action plans with GPS guidance to nearest facilities and 911 communication templates.',
      icon: AlertTriangle,
      color: 'bg-red-500',
      status: 'Coming Soon',
      features: [
        'Emergency keyword detection',
        'GPS-based facility location',
        'Turn-by-turn directions',
        '911 communication templates',
        'Emergency contact management'
      ]
    },
    {
      id: 'medical-timeline',
      title: 'AI Medical Record Timeline Builder',
      description: 'Transform scattered medical events into visual chronological timelines with AI-powered insights and gap analysis.',
      icon: Calendar,
      color: 'bg-blue-500',
      status: 'In Development',
      features: [
        'Drag-drop medical record upload',
        'Visual timeline creation',
        'Pattern recognition',
        'Care gap identification',
        'Provider sharing capabilities'
      ]
    },
    {
      id: 'cultural-advisor',
      title: 'AI Cultural & Religious Care Advisor',
      description: 'Culturally-sensitive care guidance including halal alternatives, prayer-friendly scheduling, and dietary considerations.',
      icon: Heart,
      color: 'bg-purple-500',
      status: 'Planning',
      features: [
        'Cultural preference settings',
        'Halal medication alternatives',
        'Prayer-friendly scheduling',
        'Modesty accommodations',
        'Dietary restriction guidance'
      ]
    },
    {
      id: 'photo-analyzer',
      title: 'AI Symptom Photography Analyzer',
      description: 'Upload photos of symptoms for structured assessment, urgency evaluation, and provider visit preparation.',
      icon: Camera,
      color: 'bg-green-500',
      status: 'Research Phase',
      features: [
        'Secure photo upload',
        'Visual symptom analysis',
        'Urgency level assessment',
        'Specialist recommendations',
        'Documentation for providers'
      ]
    },
    {
      id: 'care-coordinator',
      title: 'AI Care Team Coordination Hub',
      description: 'Monitor provider relationships, detect care gaps and conflicts, and generate coordination alerts.',
      icon: Users,
      color: 'bg-indigo-500',
      status: 'Concept',
      features: [
        'Provider relationship mapping',
        'Care gap detection',
        'Conflict identification',
        'Handoff summaries',
        'Communication templates'
      ]
    },
    {
      id: 'goal-planner',
      title: 'AI Health Goal Achievement Planner',
      description: 'Personalized week-by-week action plans for health goals with provider integration and milestone tracking.',
      icon: Target,
      color: 'bg-yellow-500',
      status: 'Design Phase',
      features: [
        'Goal-setting wizard',
        'Weekly action plans',
        'Progress tracking',
        'Provider touchpoints',
        'Milestone celebrations'
      ]
    },
    {
      id: 'genetics-synthesizer',
      title: 'AI Family Health Genetics Synthesizer',
      description: 'Family history analysis with personalized risk insights, screening recommendations, and genetic counseling guidance.',
      icon: Dna,
      color: 'bg-pink-500',
      status: 'Research',
      features: [
        'Family tree builder',
        'Risk assessment',
        'Screening recommendations',
        'Genetic counseling referrals',
        'Family communication templates'
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Coming Soon':
        return 'bg-green-100 text-green-800';
      case 'In Development':
        return 'bg-blue-100 text-blue-800';
      case 'Planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'Research Phase':
        return 'bg-purple-100 text-purple-800';
      case 'Concept':
        return 'bg-gray-100 text-gray-800';
      case 'Design Phase':
        return 'bg-indigo-100 text-indigo-800';
      case 'Research':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Additional AI Tools</h1>
              <p className="text-lg text-gray-600">Advanced AI features in development for comprehensive healthcare support</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Tools Quick Access */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center space-x-2">
            <Sparkles className="h-6 w-6" />
            <span>Available Now</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/ailab/care-path"
              className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="bg-blue-500 p-2 rounded">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">AI Care Path Cards</h3>
                <p className="text-sm text-gray-600">Health concern guidance</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>

            <Link
              to="/ailab/lab-explainer"
              className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="bg-green-500 p-2 rounded">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Lab & Imaging Explainer</h3>
                <p className="text-sm text-gray-600">Test explanations</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>

            <Link
              to="/ailab/procedure-navigator"
              className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="bg-purple-500 p-2 rounded">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Procedure Navigator</h3>
                <p className="text-sm text-gray-600">3-phase procedure guides</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Upcoming Tools */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Construction className="h-6 w-6 text-gray-600" />
            <span>Upcoming AI Tools</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {upcomingTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`${tool.color} p-3 rounded-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{tool.title}</h3>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tool.status)}`}>
                            {tool.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{tool.description}</p>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Planned Features:</h4>
                      <ul className="space-y-1">
                        {tool.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <Clock className="h-3 w-3 text-gray-400 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-gray-50 px-3 py-2 rounded-md">
                      <p className="text-xs text-gray-500">
                        This tool is currently {tool.status.toLowerCase()}. 
                        {tool.status === 'Coming Soon' && ' Expected release in the next update.'}
                        {tool.status === 'In Development' && ' Actively being developed.'}
                        {tool.status === 'Planning' && ' In planning and design phase.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Development Roadmap */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Development Roadmap</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 w-4 h-4 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Phase 1: Core AI Tools (Completed)</p>
                <p className="text-sm text-gray-600">Care Path Cards, Lab Explainer, Procedure Navigator</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 w-4 h-4 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Phase 2: Emergency & Timeline Tools (Q2 2024)</p>
                <p className="text-sm text-gray-600">Emergency Bridge, Medical Timeline Builder</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 w-4 h-4 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Phase 3: Advanced Analysis (Q3 2024)</p>
                <p className="text-sm text-gray-600">Photo Analyzer, Cultural Advisor, Care Coordinator</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-400 w-4 h-4 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Phase 4: Personalization & Genetics (Q4 2024)</p>
                <p className="text-sm text-gray-600">Goal Planner, Genetics Synthesizer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Help Shape the Future of AI Healthcare</h3>
          <p className="text-gray-700 mb-4">
            Your feedback helps us prioritize which AI tools to develop next. Let us know which features would be most valuable for your healthcare journey.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Request Feature
            </button>
            <button className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">
              Join Beta Testing
            </button>
            <button className="bg-white text-purple-600 border border-purple-600 px-4 py-2 rounded-md hover:bg-purple-50 transition-colors">
              Provide Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILabToolsPage;