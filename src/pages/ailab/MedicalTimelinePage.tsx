// AILab Task 5 - Medical Record Timeline Builder Page
// Auto-loads the current patient's records and builds an AI-synthesized
// chronological timeline of their care journey.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  MedicalTimelineService,
  AIServiceNotConfiguredError,
  type MedicalTimeline,
  type TimelineEvent,
  type PatientRecords,
} from '../../lib/ai/medical-timeline';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Calendar,
  Stethoscope,
  Pill,
  FlaskConical,
  ScanLine,
  HeartPulse,
  Lightbulb,
  ListChecks,
  ClipboardList,
  Activity,
  Sparkles,
} from 'lucide-react';

// Map a timeline event category to a colour + icon.
function categoryStyle(category?: string): {
  icon: React.ElementType;
  bg: string;
  text: string;
  bar: string;
} {
  const c = (category || '').toLowerCase();
  if (c.includes('encounter') || c.includes('visit'))
    return { icon: Stethoscope, bg: 'bg-teal-100', text: 'text-teal-700', bar: 'bg-teal-500' };
  if (c.includes('medic') || c.includes('prescri') || c.includes('drug'))
    return { icon: Pill, bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' };
  if (c.includes('lab') || c.includes('test') || c.includes('result'))
    return {
      icon: FlaskConical,
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      bar: 'bg-amber-500',
    };
  if (c.includes('imag') || c.includes('scan') || c.includes('radiol'))
    return { icon: ScanLine, bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500' };
  if (c.includes('condit') || c.includes('diagnos'))
    return { icon: HeartPulse, bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-500' };
  return { icon: Activity, bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-500' };
}

function severityBadgeVariant(sev?: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' {
  const s = (sev || '').toLowerCase();
  if (s.includes('critical') || s.includes('emergency') || s.includes('severe'))
    return 'destructive';
  if (s.includes('moder')) return 'default';
  if (s.includes('mild') || s.includes('low') || s.includes('minor') || s.includes('normal'))
    return 'success';
  return 'outline';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Date not available';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const MedicalTimelinePage: React.FC = () => {
  const { user } = useAuth();
  const isPatient = user?.user_type === 'patient';

  const [records, setRecords] = useState<PatientRecords | null>(null);
  const [timeline, setTimeline] = useState<MedicalTimeline | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // Auto-load records for patients.
  useEffect(() => {
    if (!isPatient || !user?.id) return;
    let cancelled = false;
    (async () => {
      setIsLoadingRecords(true);
      setRecordsError(null);
      try {
        const recs = await MedicalTimelineService.fetchPatientRecords(user.id);
        if (!cancelled) setRecords(recs);
      } catch (err) {
        if (!cancelled)
          setRecordsError(
            'Could not load your medical records. You can still build a timeline manually below.',
          );
        console.error('fetchPatientRecords error:', err);
      } finally {
        if (!cancelled) setIsLoadingRecords(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPatient, user?.id]);

  const recordCounts = useMemo(() => {
    if (!records) return null;
    return {
      encounters: records.encounters.length,
      conditions: records.conditions.length,
      medications: records.medications.length,
      labResults: records.labResults.length,
      imagingResults: records.imagingResults.length,
      total:
        records.encounters.length +
        records.conditions.length +
        records.medications.length +
        records.labResults.length +
        records.imagingResults.length,
    };
  }, [records]);

  const handleBuild = async () => {
    if (!records) return;
    setIsBuilding(true);
    setError(null);
    setTimeline(null);
    try {
      const result = await MedicalTimelineService.buildTimeline({
        encounters: records.encounters,
        conditions: records.conditions,
        medications: records.medications,
        labResults: records.labResults,
        imagingResults: records.imagingResults,
      });
      setTimeline(result);
    } catch (err) {
      if (err instanceof AIServiceNotConfiguredError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to build the timeline. Please try again.',
        );
      }
      console.error('MedicalTimelinePage.build error:', err);
    } finally {
      setIsBuilding(false);
    }
  };

  const events: TimelineEvent[] = Array.isArray(timeline?.events)
    ? timeline!.events!
    : [];
  const patterns: string[] = Array.isArray(timeline?.patterns) ? timeline!.patterns! : [];
  const recommendations: string[] = Array.isArray(timeline?.recommendations)
    ? timeline!.recommendations!
    : [];

  // Sort events by date (oldest first) when possible.
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : NaN;
      const tb = b.date ? new Date(b.date).getTime() : NaN;
      if (isNaN(ta) && isNaN(tb)) return 0;
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      return ta - tb;
    });
  }, [events]);

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
            <div className="bg-teal-600 p-3 rounded-lg">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Medical Record Timeline Builder
              </h1>
              <p className="text-base text-slate-600 mt-1">
                Turn your encounters, conditions, medications, labs, and imaging into a
                chronological care journey.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Not a patient banner */}
        {!isPatient && (
          <div className="bg-amber-50 border border-amber-300 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                Only signed-in patient accounts can auto-load medical records. Sign in as a
                patient to use the auto-build feature.
              </p>
            </div>
          </div>
        )}

        {/* Records loading state */}
        {isPatient && isLoadingRecords && (
          <Card>
            <CardContent className="py-12">
              <LoadingSpinner size="lg" text="Loading your medical records..." />
            </CardContent>
          </Card>
        )}

        {/* Records error */}
        {recordsError && (
          <div className="bg-red-50 border border-red-300 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-900">{recordsError}</p>
            </div>
          </div>
        )}

        {/* Records summary + build button */}
        {isPatient && !isLoadingRecords && records && recordCounts && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-slate-900 flex items-center">
                <ClipboardList className="h-5 w-5 mr-2 text-teal-600" />
                Your medical records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                <RecordStat label="Encounters" count={recordCounts.encounters} />
                <RecordStat label="Conditions" count={recordCounts.conditions} />
                <RecordStat label="Medications" count={recordCounts.medications} />
                <RecordStat label="Lab results" count={recordCounts.labResults} />
                <RecordStat label="Imaging" count={recordCounts.imagingResults} />
              </div>

              {recordCounts.total === 0 ? (
                <div className="text-center py-6">
                  <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-700 font-medium">No records found yet.</p>
                  <p className="text-sm text-slate-500">
                    Once your care team adds encounters, labs, or medications, you can build a
                    timeline here.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleBuild}
                  size="lg"
                  disabled={isBuilding}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isBuilding ? 'Building timeline...' : 'Build Timeline'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Build loading */}
        {isBuilding && (
          <Card>
            <CardContent className="py-12">
              <LoadingSpinner size="lg" text="Synthesizing your care timeline with AI..." />
            </CardContent>
          </Card>
        )}

        {/* Build error */}
        {error && !isBuilding && (
          <div className="bg-red-50 border border-red-300 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
          </div>
        )}

        {/* Timeline results */}
        {!isBuilding && timeline && (
          <div className="space-y-6">
            {/* Summary */}
            {timeline.summary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-teal-600" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {timeline.summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Timeline events */}
            {sortedEvents.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-teal-600" />
                    Chronological timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                    {sortedEvents.map((ev, idx) => {
                      const style = categoryStyle(ev.category);
                      const Icon = style.icon;
                      return (
                        <li key={idx} className="ml-6 relative">
                          {/* Node */}
                          <span
                            className={`absolute -left-[2.15rem] flex items-center justify-center w-7 h-7 rounded-full ${style.bg} ring-4 ring-white`}
                          >
                            <Icon className={`h-4 w-4 ${style.text}`} />
                          </span>
                          <div className="border border-slate-200 rounded-md p-4 bg-white">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(ev.date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {ev.category && (
                                  <Badge variant="outline" className="capitalize">
                                    {String(ev.category)}
                                  </Badge>
                                )}
                                {ev.severity && (
                                  <Badge variant={severityBadgeVariant(ev.severity)} className="capitalize">
                                    {String(ev.severity)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {ev.title && (
                              <h4 className="font-semibold text-slate-900 mb-1">
                                {String(ev.title)}
                              </h4>
                            )}
                            {ev.description && (
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {String(ev.description)}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">
                    The AI did not return any timeline events.
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Try adding more records and rebuild the timeline.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Patterns + recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {patterns.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-slate-900 flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-amber-600" />
                      Identified patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {patterns.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-slate-900 flex items-center">
                      <ListChecks className="h-5 w-5 mr-2 text-emerald-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {recommendations.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <ListChecks className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
                The AI-generated timeline is a summary of your records for educational purposes
                only. It is not a diagnosis or treatment recommendation. Always discuss
                findings and recommendations with your qualified healthcare provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordStat: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="border border-slate-200 rounded-md p-3 bg-slate-50 text-center">
    <p className="text-2xl font-bold text-slate-900">{count}</p>
    <p className="text-xs text-slate-600 mt-0.5">{label}</p>
  </div>
);

export default MedicalTimelinePage;
