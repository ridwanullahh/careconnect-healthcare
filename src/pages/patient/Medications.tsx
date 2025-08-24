// Patient Medications - Patient Portal Medication Management
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { MedicationService } from '@/lib/medications';
import { 
  Pill, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Phone,
  Calendar,
  Package,
  Eye,
  Download
} from 'lucide-react';

export default function Medications() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState(null);
  const [activeMedications, setActiveMedications] = useState([]);
  const [medicationRequests, setMedicationRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadMedicationData();
    }
  }, [user?.id]);

  const loadMedicationData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get patient details first
      const patientDetails = await PatientService.getPatientDetails(user.id, user.id);
      
      if (!patientDetails) {
        throw new Error('Patient record not found');
      }

      // Load medication data
      const [
        activeMeds,
        medRequests
      ] = await Promise.all([
        MedicationService.getPatientActiveMedications(patientDetails.id),
        MedicationService.getPatientMedicationRequests(patientDetails.id)
      ]);

      setPatientData(patientDetails);
      setActiveMedications(activeMeds);
      setMedicationRequests(medRequests);

    } catch (error) {
      console.error('Failed to load medication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default', color: 'text-green-600' },
      'inactive': { variant: 'secondary', color: 'text-gray-600' },
      'completed': { variant: 'outline', color: 'text-blue-600' },
      'discontinued': { variant: 'destructive', color: 'text-red-600' },
      'paused': { variant: 'secondary', color: 'text-yellow-600' }
    };
    
    const config = variants[status] || variants['active'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getRequestStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default', color: 'text-blue-600' },
      'completed': { variant: 'outline', color: 'text-green-600' },
      'cancelled': { variant: 'destructive', color: 'text-red-600' }
    };
    
    const config = variants[status] || variants['active'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const isRefillDue = (medication: any) => {
    if (!medication.next_refill_due) return false;
    const today = new Date();
    const refillDate = new Date(medication.next_refill_due);
    const daysDiff = Math.ceil((refillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  };

  const handleRefillRequest = (medicationId: string) => {
    // This would integrate with the medication request system
    alert('Refill request functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="text-center py-12">
        <Pill className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Medications</h2>
        <p className="text-muted-foreground">
          We couldn't find your medication records. Please contact support.
        </p>
      </div>
    );
  }

  const refillsDue = activeMedications.filter(isRefillDue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Medications</h1>
          <p className="text-muted-foreground">
            Manage your prescriptions and medication schedule
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Medication List
        </Button>
      </div>

      {/* Alert for refills due */}
      {refillsDue.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Refills Due Soon</h4>
                <p className="text-sm text-yellow-700">
                  You have {refillsDue.length} medication{refillsDue.length !== 1 ? 's' : ''} that need refilling within the next week.
                </p>
              </div>
              <Button size="sm" className="ml-auto">
                <RefreshCw className="h-3 w-3 mr-1" />
                Request Refills
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Medications</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMedications.length}</div>
            <p className="text-xs text-muted-foreground">Currently prescribed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refills Due</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{refillsDue.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicationRequests.length}</div>
            <p className="text-xs text-muted-foreground">Total orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeMedications.length > 0 ? new Date(activeMedications[0].updated_at).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent change</p>
          </CardContent>
        </Card>
      </div>

      {/* Medications Content */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Medications ({activeMedications.length})</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions ({medicationRequests.length})</TabsTrigger>
          <TabsTrigger value="refills">Refill Center</TabsTrigger>
        </TabsList>

        {/* Active Medications */}
        <TabsContent value="active" className="space-y-4">
          {activeMedications.length > 0 ? (
            <div className="space-y-4">
              {activeMedications.map((medication) => (
                <Card key={medication.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Pill className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-lg">{medication.drug_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {medication.strength} • {medication.form} • {medication.route}
                          </p>
                          <p className="text-sm font-medium text-blue-600">
                            {medication.frequency}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {getStatusBadge(medication.status)}
                        {isRefillDue(medication) && (
                          <Badge variant="secondary" className="text-yellow-600 mt-1 block">
                            Refill Due
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Instructions:</p>
                          <p className="text-sm text-muted-foreground">{medication.instructions}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Started:</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(medication.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        {medication.indication && (
                          <div>
                            <p className="text-sm font-medium">For:</p>
                            <p className="text-sm text-muted-foreground">{medication.indication}</p>
                          </div>
                        )}
                        {medication.next_refill_due && (
                          <div>
                            <p className="text-sm font-medium">Next Refill:</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(medication.next_refill_due).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      {isRefillDue(medication) && (
                        <Button size="sm" onClick={() => handleRefillRequest(medication.id)}>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Request Refill
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-3 w-3 mr-1" />
                        Contact Pharmacy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No active medications</h3>
              <p className="text-muted-foreground">
                Your active prescriptions will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions" className="space-y-4">
          {medicationRequests.length > 0 ? (
            <div className="space-y-4">
              {medicationRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Prescription #{request.prescription_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          Prescribed: {new Date(request.authored_on).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.medications?.length || 0} medication{request.medications?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {getRequestStatusBadge(request.status)}
                        <Button variant="outline" size="sm" className="mt-2">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                    
                    {request.medications && request.medications.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Medications:</p>
                        <div className="space-y-2">
                          {request.medications.map((med, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded flex justify-between">
                              <span className="text-sm">
                                {med.drug_name} {med.strength} {med.form}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Qty: {med.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No prescriptions</h3>
              <p className="text-muted-foreground">
                Your prescription history will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Refill Center */}
        <TabsContent value="refills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refill Center</CardTitle>
              <CardDescription>
                Request refills for your medications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {refillsDue.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Medications Due for Refill</h4>
                    <div className="space-y-2">
                      {refillsDue.map((medication) => (
                        <div key={medication.id} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{medication.drug_name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              Due: {medication.next_refill_due ? new Date(medication.next_refill_due).toLocaleDateString() : 'Soon'}
                            </span>
                          </div>
                          <Button size="sm" onClick={() => handleRefillRequest(medication.id)}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Request Refill
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Request All Refills
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All medications up to date</h3>
                  <p className="text-muted-foreground">
                    No refills are due at this time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pharmacy Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Information</CardTitle>
              <CardDescription>
                Contact your pharmacy for questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Main Pharmacy</p>
                    <p className="text-sm text-muted-foreground">(555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Hours</p>
                    <p className="text-sm text-muted-foreground">Mon-Fri: 8am-9pm, Sat-Sun: 9am-6pm</p>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Pharmacy
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}