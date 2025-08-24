// Patient Records - Patient Portal Medical Records View
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { EncounterService } from '@/lib/encounters';
import { LabService } from '@/lib/labs';
import { ConditionService } from '@/lib/conditions';
import { 
  FileText, 
  Calendar, 
  TestTube, 
  Stethoscope, 
  Download, 
  Eye,
  Heart,
  Activity,
  ClipboardList,
  Image
} from 'lucide-react';

export default function Records() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState(null);
  const [encounters, setEncounters] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadPatientRecords();
    }
  }, [user?.id]);

  const loadPatientRecords = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get patient details
      const patientDetails = await PatientService.getPatientDetails(user.id, user.id);
      
      if (!patientDetails) {
        throw new Error('Patient record not found');
      }

      // Load medical records
      const [
        encounterData,
        labData,
        conditionData
      ] = await Promise.all([
        EncounterService.getPatientEncounters(patientDetails.id),
        LabService.getPatientLabResults(patientDetails.id, true),
        ConditionService.getPatientConditions(patientDetails.id)
      ]);

      setPatientData(patientDetails);
      setEncounters(encounterData);
      setLabResults(labData);
      setConditions(conditionData);

    } catch (error) {
      console.error('Failed to load patient records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEncounterTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <Heart className="h-4 w-4 text-red-500" />;
      case 'inpatient': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'telehealth': return <Stethoscope className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConditionStatus = (condition: any) => {
    const variants = {
      'active': { variant: 'default', color: 'text-red-600' },
      'resolved': { variant: 'outline', color: 'text-green-600' },
      'inactive': { variant: 'secondary', color: 'text-gray-600' }
    };
    
    const config = variants[condition.clinical_status] || variants['active'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {condition.clinical_status.toUpperCase()}
      </Badge>
    );
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
        <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Records</h2>
        <p className="text-muted-foreground">
          We couldn't find your medical records. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground">
            Your complete medical history and health information
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export All Records
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{encounters.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Results</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labResults.length}</div>
            <p className="text-xs text-muted-foreground">Available reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conditions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conditions.filter(c => c.clinical_status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Current diagnoses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Visit</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {encounters.length > 0 ? new Date(encounters[0].scheduled_start).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Content */}
      <Tabs defaultValue="visits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visits">Visit History ({encounters.length})</TabsTrigger>
          <TabsTrigger value="labs">Lab Results ({labResults.length})</TabsTrigger>
          <TabsTrigger value="conditions">Conditions ({conditions.length})</TabsTrigger>
          <TabsTrigger value="imaging">Imaging (0)</TabsTrigger>
        </TabsList>

        {/* Visit History */}
        <TabsContent value="visits" className="space-y-4">
          {encounters.length > 0 ? (
            <div className="space-y-4">
              {encounters.map((encounter) => (
                <Card key={encounter.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getEncounterTypeIcon(encounter.type)}
                        <div>
                          <h3 className="font-medium">{encounter.reason_for_visit}</h3>
                          <p className="text-sm text-muted-foreground">
                            {encounter.type.toUpperCase()} • {encounter.department || 'General'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(encounter.scheduled_start).toLocaleDateString()} at{' '}
                            {new Date(encounter.scheduled_start).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={encounter.status === 'completed' ? 'outline' : 'default'}>
                          {encounter.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                    
                    {encounter.chief_complaint && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Chief Complaint:</span> {encounter.chief_complaint}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No visit history</h3>
              <p className="text-muted-foreground">
                Your medical visits will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Lab Results */}
        <TabsContent value="labs" className="space-y-4">
          {labResults.length > 0 ? (
            <div className="space-y-4">
              {labResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <TestTube className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{result.test_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Resulted: {new Date(result.resulted_at).toLocaleDateString()}
                          </p>
                          {result.critical_value && (
                            <Badge variant="destructive" className="mt-1">
                              Critical Value
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View Results
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    
                    {result.analytes && result.analytes.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Key Results:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {result.analytes.slice(0, 4).map((analyte, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">{analyte.analyte_name}</span>
                                <span className={`text-sm ${analyte.abnormal_flag ? 'text-red-600 font-medium' : ''}`}>
                                  {analyte.value} {analyte.unit}
                                </span>
                              </div>
                              {analyte.reference_range && (
                                <p className="text-xs text-muted-foreground">
                                  Normal: {analyte.reference_range}
                                </p>
                              )}
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
              <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No lab results</h3>
              <p className="text-muted-foreground">
                Your lab test results will appear here once available
              </p>
            </div>
          )}
        </TabsContent>

        {/* Conditions */}
        <TabsContent value="conditions" className="space-y-4">
          {conditions.length > 0 ? (
            <div className="space-y-4">
              {conditions.map((condition) => (
                <Card key={condition.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{condition.condition_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {condition.category.replace('_', ' ')} • 
                          Recorded: {new Date(condition.recorded_at).toLocaleDateString()}
                        </p>
                        {condition.onset_date && (
                          <p className="text-sm text-muted-foreground">
                            Onset: {new Date(condition.onset_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {getConditionStatus(condition)}
                        {condition.severity && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Severity: {condition.severity}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {condition.description && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{condition.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No conditions recorded</h3>
              <p className="text-muted-foreground">
                Your medical conditions and diagnoses will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Imaging */}
        <TabsContent value="imaging" className="space-y-4">
          <div className="text-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No imaging studies</h3>
            <p className="text-muted-foreground">
              Your imaging reports and scans will appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}