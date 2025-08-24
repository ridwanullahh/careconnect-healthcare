// AI Lab & Imaging Explainer Component
import React, { useState } from 'react';
import { LabImagingExplanation, orderExplainerService } from '../../lib/ai/order-explainer';
import { useAuth } from '../../lib/auth';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Printer,
  Mail,
  Loader2
} from 'lucide-react';

interface LabImagingExplainerProps {
  testName: string;
  modality?: string;
  className?: string;
  onExplanationGenerated?: (explanation: LabImagingExplanation) => void;
}

const LabImagingExplainer: React.FC<LabImagingExplainerProps> = ({
  testName,
  modality = 'lab',
  className = '',
  onExplanationGenerated
}) => {
  const { user } = useAuth();
  const [explanation, setExplanation] = useState<LabImagingExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const generateExplanation = async () => {
    setIsLoading(true);
    try {
      const result = await orderExplainerService.generateExplanation(testName, modality, user?.id);
      setExplanation(result);
      setIsVisible(true);
      onExplanationGenerated?.(result);
    } catch (error) {
      console.error('Error generating explanation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    if (explanation) {
      await orderExplainerService.trackMetric(explanation.id, 'printed', user?.id);
      window.print();
    }
  };

  const handleEmail = async () => {
    if (explanation) {
      const email = user?.email || prompt('Enter email address:');
      if (email) {
        await orderExplainerService.trackMetric(explanation.id, 'emailed', user?.id);
        // Email functionality would be implemented here
      }
    }
  };

  if (!isVisible && !explanation) {
    return (
      <div className={`${className}`}>
        <button
          onClick={generateExplanation}
          disabled={isLoading}
          className="flex items-center justify-center space-x-3 bg-gradient-primary text-white px-6 py-4 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none font-semibold text-sm sm:text-base w-full sm:w-auto"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          <span>
            {isLoading ? 'Generating AI Summary...' : 'Get Patient-Friendly AI Summary'}
          </span>
        </button>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className={`bg-surface rounded-2xl shadow-theme border border-border overflow-hidden backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-accent/10 to-primary/10 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Patient-Friendly Summary</h3>
              <p className="text-sm text-blue-700">{explanation.testName} ({explanation.modality})</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-blue-600 hover:text-blue-800"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-6">
        {/* Purpose */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Purpose of This Test</h4>
          </div>
          <p className="text-gray-700 bg-green-50 px-3 py-2 rounded-md">
            {explanation.purpose}
          </p>
        </div>

        {/* Duration */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">How Long It Takes</h4>
          </div>
          <p className="text-gray-700 bg-blue-50 px-3 py-2 rounded-md">
            {explanation.duration}
          </p>
        </div>

        {/* Preparation */}
        {explanation.preparation.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">How to Prepare</h4>
            </div>
            <div className="bg-purple-50 px-3 py-2 rounded-md">
              <ul className="space-y-1">
                {explanation.preparation.map((step, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="text-purple-500 mt-1">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* What to Expect */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h4 className="font-semibold text-gray-900">What to Expect</h4>
          </div>
          <p className="text-gray-700 bg-indigo-50 px-3 py-2 rounded-md">
            {explanation.whatToExpect}
          </p>
        </div>

        {/* Risks */}
        {explanation.risks.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold text-gray-900">Risks & Safety</h4>
            </div>
            <div className="bg-orange-50 px-3 py-2 rounded-md">
              <ul className="space-y-1">
                {explanation.risks.map((risk, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <ArrowRight className="h-5 w-5 text-teal-600" />
            <h4 className="font-semibold text-gray-900">What Happens Next</h4>
          </div>
          <p className="text-gray-700 bg-teal-50 px-3 py-2 rounded-md">
            {explanation.nextSteps}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-xs text-yellow-800">
            <strong>Educational Information:</strong> {explanation.disclaimer}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Summary</span>
          </button>
          
          <button
            onClick={handleEmail}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span>Email Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabImagingExplainer;