// AILab Dashboard - Main Hub for AI Features
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { githubDB } from '../../lib/github-db-sdk';
import {
  Brain,
  Stethoscope,
  FileText,
  Navigation,
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  ArrowRight,
  Activity
} from 'lucide-react';

interface AILabStats {
  totalGenerations: number;
  carePathsGenerated: number;
  explanationsGenerated: number;
  navigatorsGenerated: number;
  recentActivity: any[];
}

const AILabPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AILabStats>({
    totalGenerations: 0,
    carePathsGenerated: 0,
    explanationsGenerated: 0,
    navigatorsGenerated: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // Load analytics data
      const analyticsEvents = await githubDB.query('analytics_events', {
        event_type: ['care_path_action', 'lab_explainer_action', 'procedure_navigator_action']
      });

      const carePathEvents = analyticsEvents.filter(e => e.event_type === 'care_path_action');
      const explainerEvents = analyticsEvents.filter(e => e.event_type === 'lab_explainer_action');
      const navigatorEvents = analyticsEvents.filter(e => e.event_type === 'procedure_navigator_action');

      setStats({
        totalGenerations: analyticsEvents.length,
        carePathsGenerated: carePathEvents.filter(e => e.action === 'generated').length,
        explanationsGenerated: explainerEvents.filter(e => e.action === 'generated').length,
        navigatorsGenerated: navigatorEvents.filter(e => e.action === 'generated').length,
        recentActivity: analyticsEvents
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
      });
    } catch (error) {
      console.error('Error loading AILab stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const aiFeatures = [
    {
      id: 'care-path',
      title: 'AI Care Path Cards',
      description: 'Transform health concerns into structured, actionable care guidance with specialty recommendations, preparation checklists, and provider questions.',
      icon: Stethoscope,
      href: '/ailab/care-path',
      color: 'bg-blue-500',
      stats: `${stats.carePathsGenerated} generated`,
      features: [
        'Specialty recommendations',
        'Red flag warnings',
        'Preparation checklists',
        'Provider questions',
        'Telehealth suitability'
      ]
    },
    {
      id: 'lab-explainer',
      title: 'AI Lab & Imaging Explainer',
      description: 'Get patient-friendly explanations of medical tests and imaging procedures, including preparation steps, expectations, and next steps.',
      icon: FileText,
      href: '/ailab/lab-explainer',
      color: 'bg-green-500',
      stats: `${stats.explanationsGenerated} generated`,
      features: [
        'Test purpose explanation',
        'Preparation instructions',
        'What to expect',
        'Risk information',
        'Next steps guidance'
      ]
    },
    {
      id: 'procedure-navigator',
      title: 'AI Procedure Navigator',
      description: 'Comprehensive 3-phase guides for medical procedures with prep checklists, day-of guidance, and aftercare instructions.',
      icon: Navigation,
      href: '/ailab/procedure-navigator',
      color: 'bg-purple-500',
      stats: `${stats.navigatorsGenerated} generated`,
      features: [
        'Pre-procedure preparation',
        'Day-of guidance',
        'Aftercare instructions',
        'Warning signs',
        'Calendar integration'
      ]
    },
    {
      id: 'ai-tools',
      title: 'Additional AI Tools',
      description: 'Explore more AI-powered healthcare tools including emergency planning, medical timelines, and cultural care guidance.',
      icon: Brain,
      href: '/ailab/tools',
      color: 'bg-indigo-500',
      stats: 'Coming soon',
      features: [
        'Emergency communication',
        'Medical record timeline',
        'Cultural care advisor',
        'Symptom photography',
        'Care coordination'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <div className="bg-surface/80 backdrop-blur-lg shadow-theme border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-2xl shadow-lg">
              <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AILab
              </h1>
              <p className="text-base sm:text-lg text-text-secondary mt-1">
                Intelligent healthcare navigation powered by AI
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Generations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalGenerations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Care Paths</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.carePathsGenerated}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Explanations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.explanationsGenerated}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Navigation className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Navigators</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.navigatorsGenerated}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {aiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`${feature.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.stats}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1">
                      {feature.features.map((feat, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <Sparkles className="h-3 w-3 text-yellow-500 mr-2" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Link
                    to={feature.href}
                    className="inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
                  >
                    <span>Explore Tool</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent AI Activity</h3>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading activity...</p>
              </div>
            ) : stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
                    <div className="bg-blue-100 p-1 rounded">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.event_type === 'care_path_action' && 'Care Path Card'}
                        {activity.event_type === 'lab_explainer_action' && 'Lab Explanation'}
                        {activity.event_type === 'procedure_navigator_action' && 'Procedure Navigator'}
                        {' '}
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">Start using AI tools to see activity here</p>
              </div>
            )}
          </div>
        </div>

        {/* Safety Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">AI Safety & Disclaimer</h4>
              <p className="text-sm text-yellow-800">
                All AI-generated content is for educational and informational purposes only. This technology does not provide medical diagnoses, treatment recommendations, or replace professional medical advice. Always consult with qualified healthcare providers for medical decisions. In emergency situations, call 911 or go to the nearest emergency room immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILabPage;