// Hospital Dashboard - Main HMS Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { EncounterService } from '@/lib/encounters';
import { PatientService } from '@/lib/patients';
import { BedService } from '@/lib/bed-management';
import { LabService } from '@/lib/labs';
import { ObservationService } from '@/lib/observations';
import { 
  Users, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  Bed, 
  TestTube, 
  FileText,
  Clock,
  TrendingUp,
  UserPlus
} from 'lucide-react';

interface DashboardStats {
  todayEncounters: number;
  activePatients: number;
  occupiedBeds: number;
  pendingLabResults: number;
  criticalAlerts: number;
  avgWaitTime: number;
}

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayEncounters: 0,
    activePatients: 0,
    occupiedBeds: 0,
    pendingLabResults: 0,
    criticalAlerts: 0,
    avgWaitTime: 0
  });
  const [recentEncounters, setRecentEncounters] = useState([]);
  const [bedOccupancy, setBedOccupancy] = useState(null);
  const [criticalVitals, setCriticalVitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entity_id) {
      loadDashboardData();
    }
  }, [user?.entity_id]);

  const loadDashboardData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      // Get today's date range
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Load various statistics
      const [
        todayEncounters,
        encountersData,
        bedData,
        criticalVitalsData
      ] = await Promise.all([
        EncounterService.getEntityEncounters(user.entity_id, today, tomorrowStr),
        EncounterService.getEntityEncounters(user.entity_id, today, tomorrowStr),
        BedService.getWardOccupancy(user.entity_id),
        ObservationService.getAbnormalVitals(user.entity_id, 24)
      ]);

      // Get pending lab results
      const pendingLabs = await LabService.getEntityLabOrders(user.entity_id, 'in_progress');
      const criticalResults = await LabService.getCriticalResults(user.entity_id);

      // Calculate statistics
      const activePatients = new Set(todayEncounters.map(e => e.patient_id)).size;
      const criticalCount = criticalVitalsData.length + criticalResults.length;
      
      // Calculate average wait time (simplified)
      const completedToday = todayEncounters.filter(e => e.status === 'completed');
      let avgWaitTime = 0;
      if (completedToday.length > 0) {
        const totalWaitTime = completedToday.reduce((sum, encounter) => {
          if (encounter.actual_start && encounter.scheduled_start) {
            const waitTime = new Date(encounter.actual_start).getTime() - new Date(encounter.scheduled_start).getTime();
            return sum + (waitTime / (1000 * 60)); // Convert to minutes
          }
          return sum;
        }, 0);
        avgWaitTime = Math.round(totalWaitTime / completedToday.length);
      }

      setStats({
        todayEncounters: todayEncounters.length,
        activePatients,
        occupiedBeds: bedData.occupied_beds,
        pendingLabResults: pendingLabs.length,
        criticalAlerts: criticalCount,
        avgWaitTime
      });

      setRecentEncounters(encountersData.slice(0, 10));
      setBedOccupancy(bedData);
      setCriticalVitals(criticalVitalsData.slice(0, 5));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEncounterStatusBadge = (status: string) => {
    const variants = {
      'scheduled': 'secondary',
      'in_progress': 'default',
      'completed': 'outline',
      'cancelled': 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const getEncounterTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'inpatient': return <Bed className="h-4 w-4 text-blue-500" />;
      case 'telehealth': return <Activity className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.profile?.first_name}. Here's what's happening today.
          </p>
        </div>
        <Button onClick={loadDashboardData}>
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Encounters</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayEncounters}</div>
            <p className="text-xs text-muted-foreground">
              Active appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePatients}</div>
            <p className="text-xs text-muted-foreground">
              Unique patients today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">
              {bedOccupancy ? `${bedOccupancy.occupancy_rate}% occupancy` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Labs</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLabResults}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWaitTime}m</div>
            <p className="text-xs text-muted-foreground">
              Today's average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="encounters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="encounters">Recent Encounters</TabsTrigger>
          <TabsTrigger value="alerts">Critical Alerts</TabsTrigger>
          <TabsTrigger value="beds">Bed Status</TabsTrigger>
        </TabsList>

        <TabsContent value="encounters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Encounters</CardTitle>
              <CardDescription>
                Latest patient encounters and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEncounters.map((encounter: any) => (
                  <div key={encounter.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      {getEncounterTypeIcon(encounter.type)}
                      <div>
                        <p className="font-medium">Patient ID: {encounter.patient_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {encounter.type.toUpperCase()} - {encounter.reason_for_visit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(encounter.scheduled_start).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getEncounterStatusBadge(encounter.status)}
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                {recentEncounters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No encounters found for today
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>
                Critical vitals and lab results requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criticalVitals.map((vital: any) => (
                  <div key={vital.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">
                          {vital.display_name}: {vital.value_quantity} {vital.unit}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Patient ID: {vital.patient_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(vital.measured_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {vital.abnormal_flag?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
                {criticalVitals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No critical alerts at this time
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bed Occupancy Overview</CardTitle>
              <CardDescription>
                Current bed status and availability across all wards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bedOccupancy && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{bedOccupancy.total_beds}</div>
                      <div className="text-sm text-blue-600">Total Beds</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{bedOccupancy.occupied_beds}</div>
                      <div className="text-sm text-red-600">Occupied</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{bedOccupancy.available_beds}</div>
                      <div className="text-sm text-green-600">Available</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{bedOccupancy.cleaning_beds}</div>
                      <div className="text-sm text-yellow-600">Cleaning</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">By Bed Type</h4>
                    {Object.entries(bedOccupancy.by_type).map(([type, data]: [string, any]) => (
                      <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-sm">
                          {data.occupied}/{data.total} ({Math.round((data.occupied / data.total) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts for hospital staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <UserPlus className="h-6 w-6 mb-2" />
              Register Patient
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              Schedule Encounter
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <TestTube className="h-6 w-6 mb-2" />
              Order Lab Test
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <FileText className="h-6 w-6 mb-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}