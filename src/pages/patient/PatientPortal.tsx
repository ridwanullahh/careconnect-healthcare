// Patient Portal - Main Patient Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { EncounterService } from '@/lib/encounters';
import { LabService } from '@/lib/labs';
import { MedicationService } from '@/lib/medications';
import { githubDB as dbHelpers, collections } from '@/lib/database';
import { 
  User, 
  Calendar, 
  Pill, 
  TestTube, 
  FileText, 
  Clock,
  Heart,
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  Download,
  Phone,
  Mail
} from 'lucide-react';

interface PatientDashboardData {
  patient: any;
  upcomingAppointments: any[];
  recentEncounters: any[];
  activeMedications: any[];
  recentLabResults: any[];
  pendingTasks: any[];
}

export default function PatientPortal() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Get patient details
        const patientDetails = await PatientService.getPatientDetails(user.id, user.id);
        if (cancelled) return;
        if (!patientDetails) {
          if (!cancelled) {
            setError('Patient record not found.');
            setDashboardData(null);
          }
          return;
        }

        // Get encounters
        const allEncounters = await EncounterService.getPatientEncounters(patientDetails.id);
        if (cancelled) return;
        const upcomingAppointments = allEncounters
          .filter((encounter: any) => {
            const appointmentDate = new Date(encounter.scheduled_start);
            return appointmentDate > new Date() && encounter.status === 'scheduled';
          })
          .slice(0, 5);

        const recentEncounters = allEncounters
          .filter((encounter: any) => {
            const appointmentDate = new Date(encounter.scheduled_start);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return appointmentDate > thirtyDaysAgo && encounter.status === 'completed';
          })
          .slice(0, 5);

        // Get medications
        const activeMedications = await MedicationService.getPatientActiveMedications(
          patientDetails.id
        );
        if (cancelled) return;

        // Get lab results
        const recentLabResults = await LabService.getPatientLabResults(patientDetails.id, true);
        if (cancelled) return;

        // Derive real pending tasks from upcoming bookings + pending lab orders.
        // Bookings and lab_orders are scoped by patient_id; statuses indicate
        // what still needs the patient's attention.
        const [upcomingBookings, pendingLabOrders] = await Promise.all([
          dbHelpers
            .find(collections.bookings, { patient_id: patientDetails.id })
            .catch(() => []),
          dbHelpers
            .find(collections.lab_orders, { patient_id: patientDetails.id })
            .catch(() => [])
        ]);
        if (cancelled) return;

        const now = new Date();
        const pendingBookings = (upcomingBookings || [])
          .filter((b: any) => ['confirmed', 'pending'].includes(b.status))
          .filter((b: any) => {
            const d = b.appointment_date ? new Date(b.appointment_date) : null;
            return !d || d >= now;
          })
          .map((b: any) => ({
            id: `booking-${b.id}`,
            title: `Upcoming ${b.service_name || b.type || 'appointment'}`,
            description: b.notes || `Scheduled for ${b.appointment_date || 'a future date'} at ${b.appointment_time || ''}`.trim(),
            priority: b.status === 'pending' ? 'medium' : 'low',
            due_date: b.appointment_date
              ? new Date(b.appointment_date).toISOString()
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }));

        const pendingLabs = (pendingLabOrders || [])
          .filter((l: any) => !['completed', 'cancelled', 'rejected'].includes(l.status))
          .map((l: any) => ({
            id: `lab-${l.id}`,
            title: `Lab result pending: ${l.test_name || l.panel || 'Ordered test'}`,
            description:
              l.notes ||
              (l.status
                ? `Status: ${l.status.replace(/_/g, ' ')}`
                : 'Awaiting results from the laboratory.'),
            priority: ['urgent', 'emergency', 'stat'].includes(l.priority) ? 'high' : 'medium',
            due_date: l.ordered_at
              ? new Date(l.ordered_at).toISOString()
              : new Date().toISOString()
          }));

        const pendingTasks = [...pendingBookings, ...pendingLabs].slice(0, 8);

        if (!cancelled) {
          setDashboardData({
            patient: patientDetails,
            upcomingAppointments,
            recentEncounters,
            activeMedications: activeMedications.slice(0, 5),
            recentLabResults: recentLabResults.slice(0, 5),
            pendingTasks
          });
        }
      } catch (err) {
        console.error('Failed to load patient dashboard:', err);
        if (!cancelled) {
          setError('Failed to load your patient data. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const getEncounterTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'inpatient': return <Heart className="h-4 w-4 text-blue-500" />;
      case 'telehealth': return <Phone className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[priority] || colors['low']}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="text-center py-12">
        {error && (
          <div className="mb-4 inline-flex items-center bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Patient Data</h2>
        <p className="text-muted-foreground mb-4">
          We couldn't find your patient record. Please contact support.
        </p>
      </div>
    );
  }

  const { patient, upcomingAppointments, recentEncounters, activeMedications, recentLabResults, pendingTasks } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {patient.name}</h1>
          <p className="text-muted-foreground">
            Patient ID: {patient.patient_code} • Here's your health summary
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Records
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Medications</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMedications.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently prescribed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Lab Results</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentLabResults.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 90 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Action items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled visits and consultations</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center space-x-4">
                        {getEncounterTypeIcon(appointment.type)}
                        <div>
                          <p className="font-medium">{appointment.reason_for_visit}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.type.toUpperCase()} • {appointment.department || 'General'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(appointment.scheduled_start).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming appointments</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Lab Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Lab Results</CardTitle>
                  <CardDescription>Your latest test results and reports</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentLabResults.length > 0 ? (
                <div className="space-y-4">
                  {recentLabResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center space-x-4">
                        <TestTube className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium">{result.test_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.resulted_at).toLocaleDateString()}
                          </p>
                          {result.critical_value && (
                            <Badge variant="destructive" className="mt-1">
                              Critical Value
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent lab results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>Items that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingTasks.length > 0 ? (
                <div className="space-y-4">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending tasks</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Medications */}
          <Card>
            <CardHeader>
              <CardTitle>Current Medications</CardTitle>
              <CardDescription>Your active prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {activeMedications.length > 0 ? (
                <div className="space-y-3">
                  {activeMedications.map((medication) => (
                    <div key={medication.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{medication.drug_name}</h4>
                        <Badge variant="outline">{medication.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {medication.strength} • {medication.form}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {medication.frequency} • {medication.instructions}
                      </p>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    View All Medications
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active medications</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Pill className="h-4 w-4 mr-2" />
                  Request Prescription Refill
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Message Your Provider
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Records
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>24/7 medical assistance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Emergency Line</p>
                    <p className="text-sm text-muted-foreground">Call 911</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Nurse Hotline</p>
                    <p className="text-sm text-muted-foreground">(555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Patient Portal</p>
                    <p className="text-sm text-muted-foreground">Secure messaging</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}