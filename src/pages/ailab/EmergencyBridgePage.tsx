// AILab Task 4 - Emergency Communication Bridge Page
// Generates an AI-powered emergency response plan from a short description.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EmergencyBridgeService,
  AIServiceNotConfiguredError,
  type EmergencyPlan,
  type EmergencyType,
  type EmergencySeverity,
} from '../../lib/ai/emergency-bridge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Users,
  Activity,
  ShieldAlert,
  ClipboardList,
  PhoneCall,
  Building2,
  XCircle,
  CalendarCheck,
  ArrowLeft,
  Siren,
} from 'lucide-react';

const EMERGENCY_TYPES: { value: EmergencyType; label: string }[] = [
  { value: 'medical', label: 'Medical' },
  { value: 'accident', label: 'Accident / Trauma' },
  { value: 'fire', label: 'Fire' },
  { value: 'cardiac', label: 'Cardiac' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'bleeding', label: 'Bleeding' },
  { value: 'poisoning', label: 'Poisoning' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: { value: EmergencySeverity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const EmergencyBridgePage: React.FC = () => {
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('medical');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [numPeople, setNumPeople] = useState<number | ''>(1);
  const [severity, setSeverity] = useState<EmergencySeverity>('moderate');

  const [plan, setPlan] = useState<EmergencyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe the emergency situation.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPlan(null);

    try {
      const result = await EmergencyBridgeService.generatePlan({
        emergencyType,
        description: description.trim(),
        location: location.trim() || undefined,
        numPeople: typeof numPeople === 'number' && numPeople > 0 ? numPeople : undefined,
        severity,
      });
      setPlan(result);
    } catch (err) {
      if (err instanceof AIServiceNotConfiguredError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to generate the emergency plan. Please try again.',
        );
      }
      console.error('EmergencyBridgePage.generate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const immediateSteps = Array.isArray(plan?.immediate_steps) ? plan!.immediate_steps! : [];
  const whoToContact = Array.isArray(plan?.who_to_contact) ? plan!.who_to_contact! : [];
  const nearestResources = Array.isArray(plan?.nearest_resources)
    ? plan!.nearest_resources!
    : [];
  const doNotDo = Array.isArray(plan?.do_not_do) ? plan!.do_not_do! : [];
  const followUp = Array.isArray(plan?.follow_up) ? plan!.follow_up! : [];

  const hasAnyResult =
    immediateSteps.length > 0 ||
    whoToContact.length > 0 ||
    nearestResources.length > 0 ||
    doNotDo.length > 0 ||
    followUp.length > 0;

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
            <div className="bg-red-600 p-3 rounded-lg">
              <Siren className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Emergency Communication Bridge
              </h1>
              <p className="text-base text-slate-600 mt-1">
                Generate an AI-assisted emergency response plan in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Critical emergency banner */}
        <div className="bg-red-600 text-white rounded-lg p-5 sm:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-red-700 p-3 rounded-lg shrink-0">
              <PhoneCall className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold">
                If this is a life-threatening emergency, call 112 (Nigeria) or your local
                emergency number immediately.
              </h2>
              <p className="text-sm sm:text-base text-red-100 mt-1">
                This tool is for planning and guidance only. It does not dispatch emergency
                services and is not a substitute for trained emergency responders.
              </p>
            </div>
          </div>
        </div>

        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 flex items-center">
              <ClipboardList className="h-5 w-5 mr-2 text-teal-600" />
              Describe the emergency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="emergency-type"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Emergency type
                  </label>
                  <select
                    id="emergency-type"
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
                  >
                    {EMERGENCY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="severity"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Severity
                  </label>
                  <select
                    id="severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as EmergencySeverity)}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  What is happening?
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: An elderly man collapsed at a bus stop and is unresponsive. He is breathing but not waking up."
                  rows={4}
                  maxLength={1000}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 placeholder:text-slate-400 resize-none disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {description.length}/1000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    <MapPin className="inline h-4 w-4 mr-1 text-slate-500" />
                    Location (optional)
                  </label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Example: Ikeja, Lagos"
                    disabled={isLoading}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label
                    htmlFor="num-people"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    <Users className="inline h-4 w-4 mr-1 text-slate-500" />
                    Number of people affected (optional)
                  </label>
                  <Input
                    id="num-people"
                    type="number"
                    min={1}
                    max={9999}
                    value={numPeople}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNumPeople(v === '' ? '' : Math.max(1, parseInt(v, 10) || 1));
                    }}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !description.trim()}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? 'Generating plan...' : 'Generate Emergency Plan'}
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

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="py-12">
              <LoadingSpinner size="lg" text="Generating emergency response plan..." />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!isLoading && plan && hasAnyResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <ShieldAlert className="h-6 w-6 mr-2 text-red-600" />
                Emergency Response Plan
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {emergencyType}
                </Badge>
                <Badge
                  variant={
                    severity === 'critical' || severity === 'severe'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="capitalize"
                >
                  Severity: {severity}
                </Badge>
              </div>
            </div>

            {/* Immediate steps */}
            {immediateSteps.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-teal-600" />
                    Immediate steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {immediateSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-slate-700 leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Who to contact */}
            {whoToContact.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-teal-600" />
                    Who to contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {whoToContact.map((contact, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-200 rounded-md p-4 bg-slate-50"
                      >
                        <p className="font-semibold text-slate-900">
                          {String(contact?.role ?? `Contact ${idx + 1}`)}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {String(contact?.reason ?? '')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nearest resources */}
              {nearestResources.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-slate-900 flex items-center">
                      <Building2 className="h-5 w-5 mr-2 text-emerald-600" />
                      Nearest resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {nearestResources.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Do NOT do */}
              {doNotDo.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-slate-900 flex items-center">
                      <XCircle className="h-5 w-5 mr-2 text-red-600" />
                      Do NOT do
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {doNotDo.map((d, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Follow-up */}
            {followUp.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-2 text-teal-600" />
                    Follow-up actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {followUp.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-2 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty result fallback */}
        {!isLoading && plan && !hasAnyResult && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">
                The AI returned a response but no structured plan was found.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Try rephrasing your description and try again.
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
                This AI-generated plan is for educational and planning purposes only and does
                not replace professional emergency response. Always prioritize calling local
                emergency services (112 in Nigeria, 911 in the US, 999 in the UK) for
                life-threatening situations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyBridgePage;
