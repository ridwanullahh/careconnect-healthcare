// AI Lab & Imaging Explainer Page
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { orderExplainerService, LabImagingExplanation } from '../../lib/ai/order-explainer';
import LabImagingExplainer from '../../components/ai/LabImagingExplainer';
import {
  FileText,
  Search,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  TestTube,
  Camera
} from 'lucide-react';

const LabExplainerPage: React.FC = () => {
  const { user } = useAuth();
  const [testName, setTestName] = useState('');
  const [modality, setModality] = useState<'lab' | 'imaging'>('lab');
  const [explanation, setExplanation] = useState<LabImagingExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await orderExplainerService.generateExplanation(testName.trim(), modality, user?.id);
      setExplanation(result);
    } catch (err) {
      setError('Failed to generate explanation. Please try again.');
      console.error('Error generating explanation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const commonTests = {
    lab: [
      'Complete Blood Count (CBC)',
      'Basic Metabolic Panel',
      'Lipid Panel',
      'Thyroid Function Tests',
      'Hemoglobin A1C',
      'Liver Function Tests',
      'Urinalysis',
      'Vitamin D Level'
    ],
    imaging: [
      'Chest X-ray',
      'MRI Brain',
      'CT Scan Abdomen',
      'Ultrasound',
      'Mammography',
      'DEXA Scan',
      'Echocardiogram',
      'Colonoscopy'
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Lab & Imaging Explainer</h1>
              <p className="text-lg text-gray-600">Get patient-friendly explanations of medical tests and procedures</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* How It Works */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-6 w-6 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900 mb-2">How the AI Explainer Works</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Enter the name of any lab test or imaging procedure</li>
                <li>• Get clear explanations of purpose, preparation, and expectations</li>
                <li>• Understand risks and what happens after the test</li>
                <li>• Print or email the summary for your records</li>
                <li>• Reduce anxiety and improve preparation for your appointment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleGenerateExplanation} className="space-y-4">
            {/* Modality Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="lab"
                    checked={modality === 'lab'}
                    onChange={(e) => setModality(e.target.value as 'lab' | 'imaging')}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <TestTube className="h-4 w-4 mr-1" />
                  Laboratory Test
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="imaging"
                    checked={modality === 'imaging'}
                    onChange={(e) => setModality(e.target.value as 'lab' | 'imaging')}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <Camera className="h-4 w-4 mr-1" />
                  Imaging/Procedure
                </label>
              </div>
            </div>

            {/* Test Name Input */}
            <div>
              <label htmlFor="testName" className="block text-sm font-medium text-gray-700 mb-2">
                Test or Procedure Name
              </label>
              <input
                id="testName"
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder={modality === 'lab' ? 'e.g., Complete Blood Count' : 'e.g., MRI Brain'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!testName.trim() || isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              <span>
                {isLoading ? 'Generating Explanation...' : 'Generate Patient-Friendly Summary'}
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

        {/* Common Tests */}
        {!explanation && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <span>Common {modality === 'lab' ? 'Lab Tests' : 'Imaging Procedures'}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commonTests[modality].map((test, index) => (
                <button
                  key={index}
                  onClick={() => setTestName(test)}
                  className="text-left p-3 border border-gray-200 rounded-md hover:border-green-300 hover:bg-green-50 transition-colors text-sm text-gray-700"
                  disabled={isLoading}
                >
                  {test}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generated Explanation */}
        {explanation && (
          <div className="mb-8">
            <LabImagingExplainer
              testName={explanation.testName}
              modality={explanation.modality}
              onExplanationGenerated={() => {}}
            />
          </div>
        )}

        {/* Integration with HMS */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">For Healthcare Providers</h3>
          <p className="text-sm text-blue-800">
            This AI explainer can be integrated into lab and imaging order workflows to automatically provide patient education materials. 
            Contact your system administrator to enable automatic explanations for ordered tests.
          </p>
        </div>

        {/* Safety Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">Educational Information Only</h4>
              <p className="text-sm text-yellow-800">
                These explanations are for educational purposes only and do not replace instructions from your healthcare provider. 
                Always follow the specific preparation instructions given to you by your medical team. If you have questions or concerns, 
                contact your healthcare provider directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabExplainerPage;