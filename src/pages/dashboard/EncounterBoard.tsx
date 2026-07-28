// Encounter Board - HMS Encounter Management
import React, { useState, useEffect, useCallback } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuth, Permission } from '@/lib/auth';
import { EncounterService } from '@/lib/encounters';
import { PatientService } from '@/lib/patients';
import { getEntity } from '@/lib/entities';
import { githubDB as dbHelpers, collections } from '@/lib/database';
import { generateEncounterSummary } from '@/lib/hms-print-templates';
import { validateICD10 } from '@/lib/hms-code-validators';
import PrintButton from '@/components/hms/PrintButton';
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  AlertTriangle, 
  Bed, 
  Video, 
  FileText,
  Plus,
  Edit,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Activity,
  Printer,
  Loader2
} from 'lucide-react';

interface EncounterWithPatient {
  id: string;
  patient_id: string;
  patient_name?: string;
  encounter_code: string;
  type: string;
  status: string;
  priority: string;
  scheduled_start: string;
  actual_start?: string;
  actual_end?: string;
  reason_for_visit: string;
  chief_complaint?: string;
  attending_physician_id?: string;
  department?: string;
  bed_id?: string;
  ward?: string;
}

export default function EncounterBoard() {
  const { user, hasPermission } = useAuth();
  const toast = useToastService();
  const [encounters, setEncounters] = useState<EncounterWithPatient[]>([]);
  const [entityInfo, setEntityInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('all');
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [conditionEncounter, setConditionEncounter] = useState<EncounterWithPatient | null>(null);
  const [conditionForm, setConditionForm] = useState({
    condition_name: '',
    code: '',
    code_system: 'ICD-10',
    category: 'diagnosis',
    clinical_status: 'active',
    verification_status: 'provisional',
    severity: '',
    notes: ''
  });
  const [icd10Validation, setIcd10Validation] = useState<{ valid: boolean; formatted?: string; description?: string } | null>(null);
  const [conditionSubmitting, setConditionSubmitting] = useState(false);

  useEffect(() => {
    if (user?.entity_id) {
      loadEncounters();
      loadEntityInfo();
    }
  }, [user?.entity_id, selectedDate]);

  const loadEntityInfo = async () => {
    if (!user?.entity_id) return;
    try {
      const ent = await getEntity(user.entity_id);
      setEntityInfo(ent);
    } catch (e) {
      setEntityInfo(null);
    }
  };

  const loadEncounters = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      // Calculate date range (selected date + next day for comparison)
      const startDate = selectedDate;
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get encounters for the selected date
      const encounterData = await EncounterService.getEntityEncounters(
        user.entity_id, 
        startDate, 
        endDateStr
      );

      // Enhance encounters with patient names (safe snippets only)
      const enhancedEncounters = await Promise.all(
        encounterData.map(async (encounter) => {
          try {
            // Get safe patient search result to get name snippet
            const patientResults = await PatientService.searchPatients(
              encounter.patient_id,
              user.entity_id,
              1
            );
            
            return {
              ...encounter,
              patient_name: patientResults[0]?.name_snippet || 'Unknown Patient'
            };
          } catch (error) {
            return {
              ...encounter,
              patient_name: 'Unknown Patient'
            };
          }
        })
      );

      setEncounters(enhancedEncounters);
    } catch (error) {
      console.error('Failed to load encounters:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEncounterStatus = async (encounterId: string, newStatus: string) => {
    if (!hasPermission(Permission.MANAGE_ENCOUNTERS)) {
      toast.showSuccess('You do not have permission to update encounter status');
      return;
    }

    try {
      await EncounterService.updateStatus(encounterId, newStatus as any, user?.id || '');
      loadEncounters(); // Reload to reflect changes
    } catch (error) {
      console.error('Failed to update encounter status:', error);
      toast.showSuccess('Failed to update encounter status');
    }
  };

  const getEncounterTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'inpatient': return <Bed className="h-4 w-4 text-blue-500" />;
      case 'telehealth': return <Video className="h-4 w-4 text-green-500" />;
      case 'opd': return <Stethoscope className="h-4 w-4 text-purple-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      'scheduled': { variant: 'secondary', color: 'text-blue-600' },
      'in_progress': { variant: 'default', color: 'text-green-600' },
      'completed': { variant: 'outline', color: 'text-gray-600' },
      'cancelled': { variant: 'destructive', color: 'text-red-600' },
      'no_show': { variant: 'destructive', color: 'text-orange-600' }
    };
    
    const config = variants[status] || variants['scheduled'];
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'emergency': 'bg-red-100 text-red-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'routine': 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[priority] || colors['routine']}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getStatusActions = (encounter: EncounterWithPatient) => {
    const actions = [];
    
    switch (encounter.status) {
      case 'scheduled':
        actions.push(
          <Button
            key="start"
            size="sm"
            onClick={() => updateEncounterStatus(encounter.id, 'in_progress')}
          >
            <Activity className="h-3 w-3 mr-1" />
            Start
          </Button>
        );
        actions.push(
          <Button
            key="cancel"
            variant="outline"
            size="sm"
            onClick={() => updateEncounterStatus(encounter.id, 'cancelled')}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        );
        break;
      
      case 'in_progress':
        actions.push(
          <Button
            key="complete"
            size="sm"
            onClick={() => updateEncounterStatus(encounter.id, 'completed')}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Button>
        );
        break;
      
      default:
        actions.push(
          <Button key="view" variant="outline" size="sm">
            <FileText className="h-3 w-3 mr-1" />
            View
          </Button>
        );
    }
    
    return actions;
  };

  const filterEncounters = (encounters: EncounterWithPatient[], filterType: string) => {
    switch (filterType) {
      case 'opd':
        return encounters.filter(e => e.type === 'opd');
      case 'emergency':
        return encounters.filter(e => e.type === 'emergency');
      case 'inpatient':
        return encounters.filter(e => e.type === 'inpatient');
      case 'telehealth':
        return encounters.filter(e => e.type === 'telehealth');
      default:
        return encounters;
    }
  };

  // ---- Encounter Print Button (lazy fetch + PrintButton) ----
  const EncounterPrintButton: React.FC<{ encounter: EncounterWithPatient }> = ({ encounter }) => {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePrepare = useCallback(async () => {
      if (loading || html) return;
      setLoading(true);
      try {
        const details = await EncounterService.getEncounterDetails(encounter.id);
        const generated = generateEncounterSummary(
          details?.encounter || encounter,
          {
            name: encounter.patient_name || 'Patient',
            patient_code: encounter.patient_id
          },
          details?.vitals || [],
          details?.conditions || [],
          {
            name: entityInfo?.name,
            type: entityInfo?.entity_type ? String(entityInfo.entity_type).replace(/_/g, ' ') : undefined,
            address: entityInfo?.address,
            phone: entityInfo?.phone,
            email: entityInfo?.email,
            website: entityInfo?.website
          }
        );
        setHtml(generated);
      } catch (err) {
        console.error('Failed to generate encounter summary:', err);
        toast.showError('Failed to generate encounter summary.');
      } finally {
        setLoading(false);
      }
    }, [encounter, entityInfo, loading, html]);

    if (html) {
      return (
        <PrintButton
          html={html}
          filename={`encounter-summary-${encounter.encounter_code || encounter.id}.html`}
          label="Print Summary"
          autoPrint
        />
      );
    }

    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handlePrepare}
        disabled={loading}
        aria-label={`Print summary for encounter ${encounter.encounter_code}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Printer className="h-3 w-3 mr-1" />
        )}
        {loading ? 'Preparing...' : 'Print Summary'}
      </Button>
    );
  };

  // ---- Condition entry dialog handlers (ICD-10 validation on blur) ----
  const handleOpenConditionDialog = (encounter: EncounterWithPatient) => {
    if (!hasPermission(Permission.MANAGE_CONDITIONS)) {
      toast.showWarning('You do not have permission to add conditions.');
      return;
    }
    setConditionEncounter(encounter);
    setConditionForm({
      condition_name: '',
      code: '',
      code_system: 'ICD-10',
      category: 'diagnosis',
      clinical_status: 'active',
      verification_status: 'provisional',
      severity: '',
      notes: ''
    });
    setIcd10Validation(null);
    setConditionDialogOpen(true);
  };

  const handleIcd10Blur = (code: string) => {
    if (!code || !code.trim()) {
      setIcd10Validation(null);
      return;
    }
    const result = validateICD10(code);
    setIcd10Validation(result);
    if (result.valid && result.formatted && result.formatted !== code) {
      setConditionForm((prev) => ({ ...prev, code: result.formatted! }));
    }
  };

  const handleConditionSubmit = async () => {
    if (!conditionEncounter || !user?.entity_id) return;

    if (!conditionForm.condition_name.trim()) {
      toast.showError('Condition name is required.');
      return;
    }

    if (conditionForm.code.trim() && !icd10Validation?.valid) {
      toast.showError('ICD-10 code is invalid. Please correct it before saving.');
      return;
    }

    setConditionSubmitting(true);
    try {
      await dbHelpers.insert(collections.conditions, {
        patient_id: conditionEncounter.patient_id,
        encounter_id: conditionEncounter.id,
        entity_id: user.entity_id,
        condition_name: conditionForm.condition_name.trim(),
        code: icd10Validation?.formatted || conditionForm.code.trim() || undefined,
        code_system: conditionForm.code.trim() ? conditionForm.code_system : undefined,
        code_display: icd10Validation?.description || undefined,
        category: conditionForm.category,
        clinical_status: conditionForm.clinical_status,
        verification_status: conditionForm.verification_status,
        severity: conditionForm.severity || undefined,
        notes: conditionForm.notes.trim() || undefined,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      toast.showSuccess('Condition recorded successfully.');
      setConditionDialogOpen(false);
      setConditionEncounter(null);
    } catch (err) {
      console.error('Failed to save condition:', err);
      toast.showError('Failed to save condition.');
    } finally {
      setConditionSubmitting(false);
    }
  };

  const EncounterCard = ({ encounter }: { encounter: EncounterWithPatient }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getEncounterTypeIcon(encounter.type)}
              <span className="font-medium text-sm">{encounter.encounter_code}</span>
              {getPriorityBadge(encounter.priority)}
            </div>
            {getStatusBadge(encounter.status)}
          </div>
          
          {/* Patient Info */}
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{encounter.patient_name}</span>
          </div>
          
          {/* Time Info */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(encounter.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {encounter.actual_start && (
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3" />
                <span>Started: {new Date(encounter.actual_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
          
          {/* Clinical Info */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{encounter.reason_for_visit}</p>
            {encounter.chief_complaint && (
              <p className="text-xs text-muted-foreground">{encounter.chief_complaint}</p>
            )}
          </div>
          
          {/* Location Info */}
          {encounter.department && (
            <div className="text-xs text-muted-foreground">
              Department: {encounter.department}
              {encounter.ward && ` • Ward: ${encounter.ward}`}
              {encounter.bed_id && ` • Bed: ${encounter.bed_id}`}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {getStatusActions(encounter)}
            <EncounterPrintButton encounter={encounter} />
            {hasPermission(Permission.MANAGE_CONDITIONS) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenConditionDialog(encounter)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Condition
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const filteredEncounters = filterEncounters(encounters, activeTab);
  const encountersByStatus = {
    scheduled: filteredEncounters.filter(e => e.status === 'scheduled'),
    in_progress: filteredEncounters.filter(e => e.status === 'in_progress'),
    completed: filteredEncounters.filter(e => e.status === 'completed'),
    cancelled: filteredEncounters.filter(e => ['cancelled', 'no_show'].includes(e.status))
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Encounter Board</h1>
          <p className="text-muted-foreground">
            Manage patient encounters and appointments
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          {hasPermission(Permission.CREATE_ENCOUNTERS) && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Encounter
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Encounters</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{encounters.length}</div>
            <p className="text-xs text-muted-foreground">
              For {new Date(selectedDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{encountersByStatus.in_progress.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{encountersByStatus.scheduled.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting start
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{encountersByStatus.completed.length}</div>
            <p className="text-xs text-muted-foreground">
              Finished today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({encounters.length})</TabsTrigger>
          <TabsTrigger value="opd">OPD ({filterEncounters(encounters, 'opd').length})</TabsTrigger>
          <TabsTrigger value="emergency">Emergency ({filterEncounters(encounters, 'emergency').length})</TabsTrigger>
          <TabsTrigger value="inpatient">Inpatient ({filterEncounters(encounters, 'inpatient').length})</TabsTrigger>
          <TabsTrigger value="telehealth">Telehealth ({filterEncounters(encounters, 'telehealth').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Scheduled Column */}
            <div>
              <h3 className="font-medium mb-4 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Scheduled ({encountersByStatus.scheduled.length})
              </h3>
              <div className="space-y-3">
                {encountersByStatus.scheduled.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
                {encountersByStatus.scheduled.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No scheduled encounters</p>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div>
              <h3 className="font-medium mb-4 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-green-500" />
                In Progress ({encountersByStatus.in_progress.length})
              </h3>
              <div className="space-y-3">
                {encountersByStatus.in_progress.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
                {encountersByStatus.in_progress.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active encounters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Column */}
            <div>
              <h3 className="font-medium mb-4 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                Completed ({encountersByStatus.completed.length})
              </h3>
              <div className="space-y-3">
                {encountersByStatus.completed.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
                {encountersByStatus.completed.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No completed encounters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cancelled/No Show Column */}
            <div>
              <h3 className="font-medium mb-4 flex items-center">
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Cancelled ({encountersByStatus.cancelled.length})
              </h3>
              <div className="space-y-3">
                {encountersByStatus.cancelled.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
                {encountersByStatus.cancelled.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No cancelled encounters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Condition Dialog (ICD-10 validated) */}
      <Dialog open={conditionDialogOpen} onOpenChange={setConditionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Condition / Diagnosis</DialogTitle>
            <DialogDescription>
              {conditionEncounter
                ? `Recording a condition for encounter ${conditionEncounter.encounter_code} — patient ${conditionEncounter.patient_name}.`
                : 'Recording a new condition.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cond-name">Condition Name <span className="text-red-600">*</span></Label>
              <Input
                id="cond-name"
                value={conditionForm.condition_name}
                onChange={(e) => setConditionForm((p) => ({ ...p, condition_name: e.target.value }))}
                placeholder="e.g. Essential Hypertension"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cond-code">ICD-10 Code</Label>
                <div className="relative">
                  <Input
                    id="cond-code"
                    value={conditionForm.code}
                    onChange={(e) => {
                      setConditionForm((p) => ({ ...p, code: e.target.value }));
                      if (icd10Validation) setIcd10Validation(null);
                    }}
                    onBlur={(e) => handleIcd10Blur(e.target.value)}
                    placeholder="e.g. I10 or E11.9"
                    className={icd10Validation ? (icd10Validation.valid ? 'border-emerald-500 pr-9' : 'border-red-500 pr-9') : 'pr-9'}
                    aria-invalid={icd10Validation ? !icd10Validation.valid : undefined}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {icd10Validation?.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Valid ICD-10 code" />
                    ) : icd10Validation ? (
                      <XCircle className="h-4 w-4 text-red-600" aria-label="Invalid ICD-10 code" />
                    ) : null}
                  </span>
                </div>
                {icd10Validation?.valid && icd10Validation.description && (
                  <p className="text-xs text-emerald-700">{icd10Validation.description}</p>
                )}
                {icd10Validation?.valid && icd10Validation.formatted && (
                  <p className="text-xs text-muted-foreground">Formatted: {icd10Validation.formatted}</p>
                )}
                {icd10Validation && !icd10Validation.valid && (
                  <p className="text-xs text-red-600">
                    Invalid ICD-10 format. Expected pattern: letter + 2 digits + optional dot + 1-4 alphanumeric (e.g. I10, E11.9).
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cond-category">Category</Label>
                <select
                  id="cond-category"
                  value={conditionForm.category}
                  onChange={(e) => setConditionForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="diagnosis">Diagnosis</option>
                  <option value="problem_list">Problem List</option>
                  <option value="symptom">Symptom</option>
                  <option value="complaint">Complaint</option>
                  <option value="finding">Finding</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cond-clinical">Clinical Status</Label>
                <select
                  id="cond-clinical"
                  value={conditionForm.clinical_status}
                  onChange={(e) => setConditionForm((p) => ({ ...p, clinical_status: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resolved">Resolved</option>
                  <option value="remission">Remission</option>
                  <option value="relapse">Relapse</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cond-verification">Verification</Label>
                <select
                  id="cond-verification"
                  value={conditionForm.verification_status}
                  onChange={(e) => setConditionForm((p) => ({ ...p, verification_status: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="provisional">Provisional</option>
                  <option value="differential">Differential</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="refuted">Refuted</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cond-severity">Severity</Label>
                <select
                  id="cond-severity"
                  value={conditionForm.severity}
                  onChange={(e) => setConditionForm((p) => ({ ...p, severity: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="">—</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cond-notes">Notes</Label>
              <textarea
                id="cond-notes"
                value={conditionForm.notes}
                onChange={(e) => setConditionForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Additional clinical notes..."
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConditionDialogOpen(false);
                setConditionEncounter(null);
              }}
              disabled={conditionSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleConditionSubmit} disabled={conditionSubmitting}>
              {conditionSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Save Condition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}