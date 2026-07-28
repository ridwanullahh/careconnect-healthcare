// AILab Task 6 - Cultural & Religious Care Advisor Page
// Generates AI-powered, culturally-sensitive care guidance for healthcare
// providers and patients navigating diverse cultural and religious contexts.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CulturalAdvisorService,
  AIServiceNotConfiguredError,
  type CulturalGuidance,
} from '../../lib/ai/cultural-advisor';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  ArrowLeft,
  AlertTriangle,
  Globe2,
  Utensils,
  MessageSquare,
  BookOpen,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
  SearchCheck,
  Sparkles,
} from 'lucide-react';

const SUGGESTED_CULTURES = [
  'Islam',
  'Christianity',
  'Judaism',
  'Hinduism',
  'Buddhism',
  'Yoruba',
  'Igbo',
  'Hausa',
];

function ListSection({
  icon: Icon,
  title,
  items,
  accent = 'text-teal-600',
  bulletClass = 'bg-teal-500',
}: {
  icon: React.ElementType;
  title: string;
  items: string[] | undefined;
  accent?: string;
  bulletClass?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-slate-900 flex items-center">
          <Icon className={`h-5 w-5 mr-2 ${accent}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700">
              <span className={`w-1.5 h-1.5 rounded-full ${bulletClass} mt-2 shrink-0`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const CulturalAdvisorPage: React.FC = () => {
  const [cultureOrReligion, setCultureOrReligion] = useState('');
  const [medicalContext, setMedicalContext] = useState('');
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState('English');

  const [guidance, setGuidance] = useState<CulturalGuidance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cultureOrReligion.trim()) {
      setError('Please enter a culture or religion.');
      return;
    }
    if (!medicalContext.trim()) {
      setError('Please describe the medical context.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGuidance(null);

    try {
      const result = await CulturalAdvisorService.getGuidance({
        cultureOrReligion: cultureOrReligion.trim(),
        medicalContext: medicalContext.trim(),
        question: question.trim() || undefined,
        language: language.trim() || 'English',
      });
      setGuidance(result);
    } catch (err) {
      if (err instanceof AIServiceNotConfiguredError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch cultural guidance. Please try again.',
        );
      }
      console.error('CulturalAdvisorPage error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAnyResult = !!(
    guidance &&
    (guidance.overview ||
      (Array.isArray(guidance.dietary_considerations) &&
        guidance.dietary_considerations.length > 0) ||
      (Array.isArray(guidance.communication_preferences) &&
        guidance.communication_preferences.length > 0) ||
      (Array.isArray(guidance.religious_practices) &&
        guidance.religious_practices.length > 0) ||
      (Array.isArray(guidance.end_of_life_considerations) &&
        guidance.end_of_life_considerations.length > 0) ||
      (Array.isArray(guidance.practical_tips) && guidance.practical_tips.length > 0) ||
      (Array.isArray(guidance.important_caveats) && guidance.important_caveats.length > 0) ||
      (Array.isArray(guidance.sources_to_verify) && guidance.sources_to_verify.length > 0))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Link
            to="/ailab"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to AILab
          </Link>
          <div className="flex items-center space-x-4">
            <div className="bg-emerald-600 p-3 rounded-lg">
              <Globe2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Cultural &amp; Religious Care Advisor
              </h1>
              <p className="text-base text-slate-600 mt-1">
                Culturally and religiously sensitive care guidance for diverse patient
                populations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Disclaimer banner */}
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 sm:p-5">
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
              <ShieldAlert className="h-5 w-5 text-emerald-700" />
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed">
              This guidance is general. Always verify with the individual patient — practices
              vary widely within communities.
            </p>
          </div>
        </div>

        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-emerald-600" />
              Request cultural care guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGetGuidance} className="space-y-5">
              <div>
                <label
                  htmlFor="culture"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Culture or religion
                </label>
                <Input
                  id="culture"
                  value={cultureOrReligion}
                  onChange={(e) => setCultureOrReligion(e.target.value)}
                  placeholder="Example: Islam, Yoruba, Buddhism..."
                  disabled={isLoading}
                  maxLength={100}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUGGESTED_CULTURES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCultureOrReligion(c)}
                      disabled={isLoading}
                      className="text-xs px-2.5 py-1 rounded-full border border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="context"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Medical context
                </label>
                <textarea
                  id="context"
                  value={medicalContext}
                  onChange={(e) => setMedicalContext(e.target.value)}
                  placeholder="Example: End-of-life care for an elderly patient; medication adherence during Ramadan; dietary restrictions during a hospital stay."
                  rows={4}
                  maxLength={1500}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 placeholder:text-slate-400 resize-none disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {medicalContext.length}/1500 characters
                </p>
              </div>

              <div>
                <label
                  htmlFor="question"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Specific question (optional)
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Example: Are there specific prayers or rituals that should be accommodated before surgery?"
                  rows={3}
                  maxLength={800}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 placeholder:text-slate-400 resize-none disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Response language
                </label>
                <Input
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="English"
                  disabled={isLoading}
                  maxLength={50}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !cultureOrReligion.trim() || !medicalContext.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? 'Getting guidance...' : 'Get Guidance'}
                </Button>
              </div>
            </form>

            {/* Error banner */}
            {error && (
              <div className="mt-5 bg-red-50 border border-red-300 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardContent className="py-12">
              <LoadingSpinner size="lg" text="Generating culturally sensitive guidance..." />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!isLoading && guidance && hasAnyResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <Globe2 className="h-6 w-6 mr-2 text-emerald-600" />
                Guidance for {cultureOrReligion}
              </h2>
              {language && language.trim() && (
                <Badge variant="secondary">Language: {language}</Badge>
              )}
            </div>

            {/* Overview */}
            {guidance.overview && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-emerald-600" />
                    Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {guidance.overview}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ListSection
                icon={Utensils}
                title="Dietary considerations"
                items={guidance.dietary_considerations}
                accent="text-teal-600"
                bulletClass="bg-teal-500"
              />
              <ListSection
                icon={MessageSquare}
                title="Communication preferences"
                items={guidance.communication_preferences}
                accent="text-emerald-600"
                bulletClass="bg-emerald-500"
              />
              <ListSection
                icon={BookOpen}
                title="Religious practices"
                items={guidance.religious_practices}
                accent="text-amber-600"
                bulletClass="bg-amber-500"
              />
              <ListSection
                icon={HeartPulse}
                title="End-of-life considerations"
                items={guidance.end_of_life_considerations}
                accent="text-rose-600"
                bulletClass="bg-rose-500"
              />
              <ListSection
                icon={Lightbulb}
                title="Practical tips"
                items={guidance.practical_tips}
                accent="text-teal-600"
                bulletClass="bg-teal-500"
              />
              <ListSection
                icon={ShieldAlert}
                title="Important caveats"
                items={guidance.important_caveats}
                accent="text-amber-600"
                bulletClass="bg-amber-500"
              />
            </div>

            {/* Sources to verify */}
            {Array.isArray(guidance.sources_to_verify) &&
              guidance.sources_to_verify.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-slate-900 flex items-center">
                      <SearchCheck className="h-5 w-5 mr-2 text-emerald-600" />
                      Sources to verify
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {guidance.sources_to_verify.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <SearchCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Empty result fallback */}
        {!isLoading && guidance && !hasAnyResult && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">
                The AI returned a response but no structured guidance was found.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Try rephrasing your medical context or question and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Safety notice */}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 sm:p-6">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-100 p-2 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1">Important disclaimer</h4>
              <p className="text-sm text-amber-800 leading-relaxed">
                This AI-generated guidance is general and intended to support culturally
                competent care, not replace individualized assessment. Practices, beliefs, and
                preferences vary widely within any community. Always verify with the individual
                patient and family, and consult cultural liaisons or chaplains when available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CulturalAdvisorPage;
