// AI Care Path Card Component
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarePathCard as CarePathCardType, carePathService } from '../../lib/ai/care-path';
import { useAuth } from '../../lib/auth';
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Video,
  MapPin,
  Save,
  Printer,
  Mail,
  Clock,
  Stethoscope
} from 'lucide-react';

interface CarePathCardProps {
  carePathCard: CarePathCardType;
  onFindProviders?: () => void;
  className?: string;
}

const CarePathCard: React.FC<CarePathCardProps> = ({
  carePathCard,
  onFindProviders,
  className = ''
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showFullCard, setShowFullCard] = useState(false);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-900';
      case 'urgent':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 text-orange-900';
      default:
        return 'bg-gradient-primary border-primary/20 text-primary';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'urgent':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await carePathService.saveCarePathCard(carePathCard.id, user?.id);
      // Show success toast
    } catch (error) {
      console.error('Error saving care path card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    setIsLoading(true);
    try {
      await carePathService.printCarePathCard(carePathCard.id, user?.id);
      window.print();
    } catch (error) {
      console.error('Error printing care path card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmail = async () => {
    setIsLoading(true);
    try {
      const email = user?.email || prompt('Enter email address:');
      if (email) {
        await carePathService.emailCarePathCard(carePathCard.id, email, user?.id);
        // Show success toast
      }
    } catch (error) {
      console.error('Error emailing care path card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindProviders = async () => {
    try {
      await carePathService.findProvidersClicked(carePathCard.id, user?.id);
      if (onFindProviders) {
        onFindProviders();
      } else {
        navigate(`/directory?specialty=${encodeURIComponent(carePathCard.suggestedSpecialty)}`);
      }
    } catch (error) {
      console.error('Error tracking find providers click:', error);
    }
  };

  const getTelehealthSuitabilityColor = (suitability: string) => {
    if (suitability.toLowerCase().includes('high')) return 'text-green-600';
    if (suitability.toLowerCase().includes('medium')) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-surface rounded-2xl shadow-theme border border-border overflow-hidden backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className={`px-4 sm:px-6 py-4 sm:py-6 ${getUrgencyColor(carePathCard.urgencyLevel)}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            {getUrgencyIcon(carePathCard.urgencyLevel)}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">AI Care Path Recommendation</h3>
              <p className="text-sm opacity-90 line-clamp-2 break-words">Based on: "{carePathCard.concern}"</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-50 rounded">
              {carePathCard.urgencyLevel.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Suggested Specialty */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-bold text-text text-lg">Recommended Specialty</h4>
          </div>
          <p className="text-text-secondary font-medium bg-white/50 px-4 py-3 rounded-lg border border-primary/10">
            {carePathCard.suggestedSpecialty}
          </p>
        </div>

        {/* Telehealth Suitability */}
        <div className="bg-gradient-to-r from-accent/5 to-primary/5 rounded-xl p-4 border border-accent/10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-accent/10 p-2 rounded-lg">
              <Video className="h-5 w-5 text-accent" />
            </div>
            <h4 className="font-bold text-text text-lg">Telehealth Suitability</h4>
          </div>
          <p className={`text-sm font-medium bg-white/50 px-4 py-3 rounded-lg border border-accent/10 ${getTelehealthSuitabilityColor(carePathCard.telehealthSuitability)}`}>
            {carePathCard.telehealthSuitability}
          </p>
        </div>

        {/* Expandable Sections */}
        {showFullCard && (
          <>
            {/* Red Flags */}
            {carePathCard.redFlags.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold text-gray-900">Warning Signs</h4>
                </div>
                <ul className="space-y-1">
                  {carePathCard.redFlags.map((flag, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prep Checklist */}
            {carePathCard.prepChecklist.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Preparation Checklist</h4>
                </div>
                <ul className="space-y-1">
                  {carePathCard.prepChecklist.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions to Ask */}
            {carePathCard.questionsToAsk.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Questions to Ask Your Provider</h4>
                </div>
                <ul className="space-y-1">
                  {carePathCard.questionsToAsk.map((question, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-1">?</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setShowFullCard(!showFullCard)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
        >
          {showFullCard ? 'Show Less' : 'Show Full Details'}
        </button>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <p className="text-xs text-yellow-800">
            <strong>Medical Disclaimer:</strong> {carePathCard.disclaimer}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-surface/50 to-background/50 border-t border-border backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={handleFindProviders}
            className="flex items-center justify-center space-x-2 bg-gradient-primary text-white px-4 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-semibold text-sm"
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Find Providers</span>
            <span className="sm:hidden">Find</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 bg-gradient-accent text-white px-4 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none font-semibold text-sm"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
            <span className="sm:hidden">Save</span>
          </button>
          
          <button
            onClick={handlePrint}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none font-semibold text-sm"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
            <span className="sm:hidden">Print</span>
          </button>
          
          <button
            onClick={handleEmail}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none font-semibold text-sm"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
            <span className="sm:hidden">Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarePathCard;