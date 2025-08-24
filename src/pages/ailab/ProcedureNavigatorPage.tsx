// AI Procedure Navigator Page
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { procedureNavigatorService, ProcedureNavigator as ProcedureNavigatorType } from '../../lib/ai/procedure-navigator';
import ProcedureNavigator from '../../components/ai/ProcedureNavigator';
import {
  Navigation,
  Search,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Calendar,
  Clock
} from 'lucide-react';

const ProcedureNavigatorPage: React.FC = () => {
  const { user } = useAuth();
  const [procedureName, setProcedureName] = useState('');
  const [navigator, setNavigator] = useState<ProcedureNavigatorType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateNavigator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureName.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await procedureNavigatorService.generateProcedureNavigator(procedureName.trim(), user?.id);
      setNavigator(result);
    } catch (err) {
      setError('Failed to generate procedure navigator. Please try again.');
      console.error('Error generating navigator:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const commonProcedures = [
    'Colonoscopy',
    'Upper Endoscopy',
    'Cataract Surgery',
    'Knee Arthroscopy',
    'Gallbladder Surgery',
    'Hernia Repair',
    'Skin Biopsy',
    'Cardiac Catheterization',
    'MRI with Contrast',
    'CT Scan with Contrast',
    'Mammography',
    'Bone Density Scan',
    'Stress Test',
    'Echocardiogram',
    'Minor Surgery',
    'Dental Extraction'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Navigation className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Procedure Navigator</h1>
              <p className="text-lg text-gray-600">Comprehensive 3-phase guidance for medical procedures</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* How It Works */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-6 w-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">How the Procedure Navigator Works</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Enter any medical procedure or surgery name</li>
                <li>• Get comprehensive 3-phase guidance: Before, Day-of, and After-care</li>
                <li>• Receive detailed checklists and timeline information</li>
                <li>• Learn about warning signs and when to contact your provider</li>
                <li>• Print, email, or add reminders to your calendar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleGenerateNavigator} className="space-y-4">
            <div>
              <label htmlFor="procedureName" className="block text-sm font-medium text-gray-700 mb-2">
                Procedure or Surgery Name
              </label>
              <input
                id="procedureName"
                type="text"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
                placeholder="e.g., Colonoscopy, Cataract Surgery, MRI with Contrast..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!procedureName.trim() || isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              <span>
                {isLoading ? 'Generating Navigator...' : 'Generate Procedure Navigator'}
              </span>
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Common Procedures */}
        {!navigator && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <span>Common Procedures</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {commonProcedures.map((procedure, index) => (
                <button
                  key={index}
                  onClick={() => setProcedureName(procedure)}
                  className="text-left p-3 border border-gray-200 rounded-md hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm text-gray-700"
                  disabled={isLoading}
                >
                  {procedure}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generated Navigator */}
        {navigator && (
          <div className="mb-8">
            <ProcedureNavigator
              procedureName={navigator.procedureName}
              onNavigatorGenerated={() => {}}
            />
          </div>
        )}

        {/* Features Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">3-Phase Guidance</h4>
            </div>
            <p className="text-sm text-gray-600">
              Comprehensive preparation, day-of, and aftercare instructions organized by timeline.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Safety Monitoring</h4>
            </div>
            <p className="text-sm text-gray-600">
              Clear warning signs and instructions for when to contact your healthcare provider.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Calendar Integration</h4>
            </div>
            <p className="text-sm text-gray-600">
              Export reminders and important dates directly to your calendar application.
            </p>
          </div>
        </div>

        {/* Integration with Booking */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">Integrated with Booking System</h3>
          <p className="text-sm text-blue-800">
            When you book procedures through CareConnect, procedure navigators are automatically generated and sent to you. 
            This helps reduce no-shows and improves preparation compliance.
          </p>
        </div>

        {/* Safety Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">Important Procedure Guidance</h4>
              <p className="text-sm text-yellow-800">
                This navigator provides general guidance only. Always follow the specific instructions provided by your healthcare team, 
                as they may differ from this general information based on your individual medical situation. 
                Contact your provider if you have any questions or concerns about your procedure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcedureNavigatorPage;