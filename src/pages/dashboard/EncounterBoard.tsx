// Encounter Board - HMS Encounter Management
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { EncounterService } from '@/lib/encounters';
import { PatientService } from '@/lib/patients';
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
  XCircle,
  Activity
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
  const [encounters, setEncounters] = useState<EncounterWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user?.entity_id) {
      loadEncounters();
    }
  }, [user?.entity_id, selectedDate]);

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
      alert('You do not have permission to update encounter status');
      return;
    }

    try {
      await EncounterService.updateStatus(encounterId, newStatus as any, user?.id || '');
      loadEncounters(); // Reload to reflect changes
    } catch (error) {
      console.error('Failed to update encounter status:', error);
      alert('Failed to update encounter status');
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
          <div className="flex space-x-2 pt-2">
            {getStatusActions(encounter)}
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
    </div>
  );
}