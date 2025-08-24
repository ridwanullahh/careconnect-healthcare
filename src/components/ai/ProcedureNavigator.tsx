// AI Procedure Navigator Component
import React, { useState } from 'react';
import { ProcedureNavigator as ProcedureNavigatorType, procedureNavigatorService } from '../../lib/ai/procedure-navigator';
import { useAuth } from '../../lib/auth';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Printer,
  Mail,
  Download,
  Loader2,
  ChevronDown
} from 'lucide-react';

interface ProcedureNavigatorProps {
  procedureName: string;
  className?: string;
  onNavigatorGenerated?: (navigator: ProcedureNavigatorType) => void;
}

const ProcedureNavigator: React.FC<ProcedureNavigatorProps> = ({
  procedureName,
  className = '',
  onNavigatorGenerated
}) => {
  const { user } = useAuth();
  const [navigator, setNavigator] = useState<ProcedureNavigatorType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'prep' | 'day_of' | 'after_care'>('prep');
  const [isVisible, setIsVisible] = useState(false);

  const generateNavigator = async () => {
    setIsLoading(true);
    try {
      const result = await procedureNavigatorService.generateProcedureNavigator(procedureName, user?.id);
      setNavigator(result);
      setIsVisible(true);
      onNavigatorGenerated?.(result);
    } catch (error) {
      console.error('Error generating procedure navigator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClick = async (tab: 'prep' | 'day_of' | 'after_care') => {
    setActiveTab(tab);
    if (navigator) {
      await procedureNavigatorService.trackMetric(navigator.id, 'viewed', tab, user?.id);
    }
  };

  const handlePrint = async () => {
    if (navigator) {
      await procedureNavigatorService.trackMetric(navigator.id, 'printed', undefined, user?.id);
      window.print();
    }
  };

  const handleEmail = async () => {
    if (navigator) {
      const email = user?.email || prompt('Enter email address:');
      if (email) {
        await procedureNavigatorService.trackMetric(navigator.id, 'emailed', undefined, user?.id);
        // Email functionality would be implemented here
      }
    }
  };

  const handleCalendarDownload = async () => {
    if (navigator) {
      await procedureNavigatorService.trackMetric(navigator.id, 'calendar_added', undefined, user?.id);
      // Calendar download functionality would be implemented here
    }
  };

  if (!isVisible && !navigator) {
    return (
      <div className={`${className}`}>
        <button
          onClick={generateNavigator}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span>
            {isLoading ? 'Generating Navigator...' : 'Generate Procedure Navigator'}
          </span>
        </button>
      </div>
    );
  }

  if (!navigator) return null;

  const tabs = [
    { id: 'prep', label: 'Before Procedure', icon: CheckCircle, phase: navigator.prepPhase },
    { id: 'day_of', label: 'Day of Procedure', icon: Clock, phase: navigator.dayOfPhase },
    { id: 'after_care', label: 'After Care', icon: AlertTriangle, phase: navigator.afterCarePhase }
  ];

  const activePhase = tabs.find(tab => tab.id === activeTab)?.phase;

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 bg-green-50 border-b border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Procedure Navigator</h3>
              <p className="text-sm text-green-700">{navigator.procedureName}</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {activePhase && (
          <div className="space-y-4">
            {/* Phase Title */}
            <h4 className="text-xl font-semibold text-gray-900">{activePhase.title}</h4>

            {/* Timeline */}
            {activePhase.timeline && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Timeline</span>
                </div>
                <p className="text-sm text-blue-800">{activePhase.timeline}</p>
              </div>
            )}

            {/* Checklist */}
            {activePhase.checklist && activePhase.checklist.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Checklist</span>
                </h5>
                <ul className="space-y-2">
                  {activePhase.checklist.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Restrictions (Prep Phase) */}
            {activeTab === 'prep' && activePhase.restrictions && activePhase.restrictions.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span>Important Restrictions</span>
                </h5>
                <ul className="space-y-1">
                  {activePhase.restrictions.map((restriction, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-orange-700">
                      <span className="text-orange-500 mt-1">⚠</span>
                      <span>{restriction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expectations (Day Of Phase) */}
            {activeTab === 'day_of' && activePhase.expectations && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                  <span>What to Expect</span>
                </h5>
                <p className="text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded-md">
                  {activePhase.expectations}
                </p>
              </div>
            )}

            {/* Warning Signs (After Care Phase) */}
            {activeTab === 'after_care' && activePhase.warningSigns && activePhase.warningSigns.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Warning Signs - Call Your Provider</span>
                </h5>
                <ul className="space-y-1">
                  {activePhase.warningSigns.map((sign, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                      <span className="text-red-500 mt-1">🚨</span>
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow Up (After Care Phase) */}
            {activeTab === 'after_care' && activePhase.followUp && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Follow-Up Care</span>
                </h5>
                <p className="text-sm text-gray-700 bg-purple-50 px-3 py-2 rounded-md">
                  {activePhase.followUp}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="font-medium text-red-900">Emergency Contacts</span>
          </div>
          <p className="text-sm text-red-800">{navigator.emergencyContacts}</p>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-xs text-yellow-800">
            <strong>Important:</strong> {navigator.disclaimer}
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
            <span>Print Navigator</span>
          </button>
          
          <button
            onClick={handleEmail}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span>Email Navigator</span>
          </button>
          
          <button
            onClick={handleCalendarDownload}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Add to Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcedureNavigator;