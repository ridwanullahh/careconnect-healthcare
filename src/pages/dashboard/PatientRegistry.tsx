// Patient Registry - HMS Patient Management
import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { EncounterService } from '@/lib/encounters';
import { 
  Search, 
  Plus, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Edit,
  Eye,
  Shield,
  AlertCircle
} from 'lucide-react';

interface PatientSummary {
  id: string;
  patient_code: string;
  name_snippet: string;
  primary_entity_id: string;
  is_active: boolean;
  last_encounter_date?: string;
  encounter_count: number;
}

export default function PatientRegistry() {
  const { user, hasPermission } = useAuth();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientForm, setShowPatientForm] = useState(false);

  useEffect(() => {
    if (user?.entity_id) {
      loadPatients();
    }
  }, [user?.entity_id, searchQuery]);

  const loadPatients = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      // Search patients with safe projections
      const searchResults = await PatientService.searchPatients(
        searchQuery || '', 
        user.entity_id, 
        50
      );

      // Get encounter counts for each patient
      const patientsWithEncounters = await Promise.all(
        searchResults.map(async (patient) => {
          const encounters = await EncounterService.getPatientEncounters(patient.id);
          const lastEncounter = encounters[0];
          
          return {
            ...patient,
            last_encounter_date: lastEncounter?.scheduled_start,
            encounter_count: encounters.length
          };
        })
      );

      setPatients(patientsWithEncounters);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patientId: string) => {
    if (!hasPermission(Permission.VIEW_PATIENT_DATA)) {
      toast.showSuccess('You do not have permission to view patient details');
      return;
    }

    try {
      const patientDetails = await PatientService.getPatientDetails(patientId, user?.id || '');
      setSelectedPatient(patientDetails);
    } catch (error) {
      console.error('Failed to load patient details:', error);
      toast.showSuccess('Failed to load patient details');
    }
  };

  const PatientCard = ({ patient }: { patient: PatientSummary }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => handlePatientSelect(patient.id)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">{patient.name_snippet}</h3>
              <p className="text-sm text-muted-foreground">ID: {patient.patient_code}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={patient.is_active ? "default" : "secondary"}>
              {patient.is_active ? "Active" : "Inactive"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {patient.encounter_count} encounters
            </p>
            {patient.last_encounter_date && (
              <p className="text-xs text-muted-foreground">
                Last: {new Date(patient.last_encounter_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PatientDetails = ({ patient }: { patient: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{patient.name}</span>
            </CardTitle>
            <CardDescription>Patient ID: {patient.patient_code}</CardDescription>
          </div>
          <div className="flex space-x-2">
            {hasPermission(Permission.MANAGE_PATIENTS) && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Full Record
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="demographics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="encounters">Encounters</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demographics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <p className="text-sm text-muted-foreground">{patient.dob}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Sex</label>
                <p className="text-sm text-muted-foreground">{patient.sex}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.phones?.[0] || 'Not provided'}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.emails?.[0] || 'Not provided'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Address</label>
              <div className="flex items-start space-x-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  {patient.address ? (
                    <>
                      <p>{patient.address.street}</p>
                      <p>{patient.address.city}, {patient.address.state} {patient.address.postal_code}</p>
                      <p>{patient.address.country}</p>
                    </>
                  ) : (
                    'Address not provided'
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="encounters" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Encounter history will be displayed here</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Schedule New Encounter
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="contacts" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Emergency Contacts</h4>
              {patient.emergency_contacts?.length > 0 ? (
                <div className="space-y-3">
                  {patient.emergency_contacts.map((contact: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{contact.phone}</p>
                          {contact.email && (
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No emergency contacts on file</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="insurance" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Insurance information will be displayed here</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  const PatientForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Register New Patient</CardTitle>
        <CardDescription>
          Enter patient information to create a new record
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input placeholder="Enter first name" />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input placeholder="Enter last name" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Date of Birth *</label>
              <Input type="date" />
            </div>
            <div>
              <label className="text-sm font-medium">Sex *</label>
              <select className="w-full p-2 border rounded-md">
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input placeholder="Phone number" />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="Email address" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input placeholder="Street address" />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="City" />
              <Input placeholder="State" />
              <Input placeholder="Postal Code" />
            </div>
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register Patient
            </Button>
            <Button variant="outline" onClick={() => setShowPatientForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Registry</h1>
          <p className="text-muted-foreground">
            Manage patient records and information
          </p>
        </div>
        {hasPermission(Permission.MANAGE_PATIENTS) && (
          <Button onClick={() => setShowPatientForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register New Patient
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, patient ID, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              Advanced Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patients ({patients.length})</CardTitle>
              <CardDescription>
                {searchQuery ? `Search results for "${searchQuery}"` : 'All registered patients'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-4 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : patients.length > 0 ? (
                <div className="space-y-2 p-4 max-h-96 overflow-y-auto">
                  {patients.map((patient) => (
                    <PatientCard key={patient.id} patient={patient} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No patients found</p>
                  {searchQuery && (
                    <p className="text-sm">Try adjusting your search terms</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Patient Details */}
        <div className="lg:col-span-2">
          {showPatientForm ? (
            <PatientForm />
          ) : selectedPatient ? (
            <PatientDetails patient={selectedPatient} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Select a patient</h3>
                  <p className="text-sm">Choose a patient from the list to view their details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}