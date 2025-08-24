// AI Care Path Cards Page
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { carePathService, CarePathCard as CarePathCardType } from '../../lib/ai/care-path';
import CarePathCard from '../../components/ai/CarePathCard';
import '../../lib/ai/ai-debug'; // Import debug helper
import {
  Stethoscope,
  Search,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

const CarePathPage: React.FC = () => {
  const { user } = useAuth();
  const [concern, setConcern] = useState('');
  const [carePathCard, setCarePathCard] = useState<CarePathCardType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCarePathCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concern.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await carePathService.generateCarePathCard(concern.trim(), user?.id);
      setCarePathCard(result);
    } catch (err) {
      setError('Failed to generate care path card. Please try again.');
      console.error('Error generating care path card:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindProviders = () => {
    // This will be handled by the CarePathCard component
  };

  const exampleConcerns = [
    "I've been having persistent headaches for the past week",
    "I have chest pain when I exercise",
    "My child has a fever and won't eat",
    "I'm experiencing anxiety and trouble sleeping",
    "I have a rash that's been spreading",
    "I need help managing my diabetes"
  ];

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <div className="bg-surface/80 backdrop-blur-lg shadow-theme border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-gradient-primary p-4 rounded-2xl shadow-lg">
              <Stethoscope className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Care Path Cards
              </h1>
              <p className="text-base sm:text-lg text-text-secondary mt-1">
                Transform your health concerns into actionable care guidance
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* How It Works */}
        <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="bg-gradient-accent p-3 rounded-2xl shadow-lg shrink-0">
              <Lightbulb className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-text text-xl sm:text-2xl mb-4">How AI Care Path Cards Work</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 bg-white/50 rounded-xl p-3 border border-primary/10">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm font-medium text-text-secondary">Describe your health concern in plain English</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/50 rounded-xl p-3 border border-primary/10">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-sm font-medium text-text-secondary">Get AI-powered specialty recommendations</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/50 rounded-xl p-3 border border-primary/10">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm font-medium text-text-secondary">Receive preparation checklists and questions</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/50 rounded-xl p-3 border border-primary/10">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-sm font-medium text-text-secondary">Find providers and save your care path</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-surface rounded-2xl shadow-theme border border-border p-6 sm:p-8 backdrop-blur-sm">
          <form onSubmit={handleGenerateCarePathCard} className="space-y-6">
            <div>
              <label htmlFor="concern" className="block text-base font-bold text-text mb-3">
                Describe your health concern
              </label>
              <textarea
                id="concern"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                placeholder="Example: I've been having persistent headaches for the past week, especially in the morning..."
                className="w-full px-4 py-4 border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 bg-white/50 backdrop-blur-sm text-text placeholder-text-secondary resize-none"
                rows={4}
                maxLength={500}
                disabled={isLoading}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-text-secondary">
                  {concern.length}/500 characters
                </p>
                <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary transition-all duration-300"
                    style={{ width: `${(concern.length / 500) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!concern.trim() || isLoading}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-primary text-white px-8 py-4 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none font-bold text-lg"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Search className="h-6 w-6" />
              )}
              <span>
                {isLoading ? 'Generating AI Care Path...' : 'Generate AI Care Path Card'}
              </span>
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500 p-2 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Example Concerns */}
        {!carePathCard && (
          <div className="bg-surface rounded-2xl shadow-theme border border-border p-6 sm:p-8 backdrop-blur-sm">
            <h3 className="font-bold text-text text-xl mb-6 flex items-center space-x-3">
              <div className="bg-gradient-accent p-2 rounded-xl">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <span>Try These Example Health Concerns</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exampleConcerns.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setConcern(example)}
                  className="group text-left p-4 border-2 border-border rounded-2xl hover:border-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-300 text-sm font-medium text-text-secondary hover:text-text transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  disabled={isLoading}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 group-hover:bg-accent transition-colors"></div>
                    <span className="flex-1">"{example}"</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generated Care Path Card */}
        {carePathCard && (
          <div className="mb-8">
            <CarePathCard
              carePathCard={carePathCard}
              onFindProviders={handleFindProviders}
            />
          </div>
        )}

        {/* Safety Notice */}
        <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-2xl shadow-lg shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-yellow-900 text-lg sm:text-xl mb-3">Important Medical Disclaimer</h4>
              <p className="text-sm sm:text-base font-medium text-yellow-800 leading-relaxed">
                AI Care Path Cards provide educational guidance only and do not constitute medical advice, diagnosis, or treatment recommendations. Always consult with qualified healthcare professionals for medical decisions. In emergency situations, call 911 or go to the nearest emergency room immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarePathPage;