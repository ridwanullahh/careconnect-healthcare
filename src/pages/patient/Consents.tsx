// Patient Consents - Patient Portal Consent Management
import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { ConsentService } from '@/lib/consents';
import { AccessGrantService } from '@/lib/access-grants';
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  Edit,
  Plus,
  AlertTriangle,
  Download,
  Settings
} from 'lucide-react';

export default function Consents() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState(null);
  const [consents, setConsents] = useState([]);
  const [accessGrants, setAccessGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantForm, setShowGrantForm] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadConsentData();
    }
  }, [user?.id]);

  const loadConsentData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get patient details first
      const patientDetails = await PatientService.getPatientDetails(user.id, user.id);
      
      if (!patientDetails) {
        throw new Error('Patient record not found');
      }

      // Load consent and access grant data
      const [
        patientConsents,
        patientAccessGrants
      ] = await Promise.all([
        ConsentService.getPatientConsents(patientDetails.id),
        AccessGrantService.getPatientAccessGrants(patientDetails.id)
      ]);

      setPatientData(patientDetails);
      setConsents(patientConsents);
      setAccessGrants(patientAccessGrants);

    } catch (error) {
      console.error('Failed to load consent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatusBadge = (status: string) => {
    const variants = {
      'granted': { variant: 'default', color: 'text-green-600', icon: CheckCircle },
      'denied': { variant: 'destructive', color: 'text-red-600', icon: XCircle },
      'pending': { variant: 'secondary', color: 'text-yellow-600', icon: Clock },
      'withdrawn': { variant: 'outline', color: 'text-gray-600', icon: XCircle },
      'expired': { variant: 'outline', color: 'text-gray-600', icon: Clock }
    };
    
    const config = variants[status] || variants['pending'];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center space-x-1`}>
        <IconComponent className="h-3 w-3" />
        <span>{status.toUpperCase()}</span>
      </Badge>
    );
  };

  const getAccessGrantStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default', color: 'text-green-600' },
      'pending': { variant: 'secondary', color: 'text-yellow-600' },
      'suspended': { variant: 'destructive', color: 'text-orange-600' },
      'expired': { variant: 'outline', color: 'text-gray-600' },
      'revoked': { variant: 'destructive', color: 'text-red-600' }
    };
    
    const config = variants[status] || variants['pending'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleRevokeGrant = async (grantId: string) => {
    try {
      await AccessGrantService.revokeAccessGrant(grantId, user?.id || '', 'Revoked by patient');
      loadConsentData();
    } catch (error) {
      console.error('Failed to revoke access grant:', error);
      toast.showSuccess('Failed to revoke access grant');
    }
  };

  const handleWithdrawConsent = async (consentId: string) => {
    try {
      await ConsentService.withdrawConsent(consentId, user?.id || '', 'Withdrawn by patient');
      loadConsentData();
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      toast.showSuccess('Failed to withdraw consent');
    }
  };

  const AccessGrantForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Grant Access to Caregiver</CardTitle>
        <CardDescription>
          Allow a family member or caregiver to access your health information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Full Name *</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md mt-1"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Relationship *</label>
            <select className="w-full p-2 border rounded-md mt-1">
              <option value="">Select relationship</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="caregiver">Caregiver</option>
              <option value="legal_guardian">Legal Guardian</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Contact Information *</label>
          <input 
            type="email" 
            className="w-full p-2 border rounded-md mt-1"
            placeholder="Email address"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Access Level *</label>
          <select className="w-full p-2 border rounded-md mt-1">
            <option value="view_only">View Only</option>
            <option value="limited">Limited Access</option>
            <option value="full">Full Access</option>
            <option value="emergency_only">Emergency Only</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium">What can they access?</label>
          <div className="mt-2 space-y-2">
            {[
              { id: 'demographics', label: 'Personal Information' },
              { id: 'medical_history', label: 'Medical History' },
              { id: 'medications', label: 'Medications' },
              { id: 'lab_results', label: 'Lab Results' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'billing', label: 'Billing Information' }
            ].map((item) => (
              <label key={item.id} className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Expiration (Optional)</label>
          <input 
            type="date" 
            className="w-full p-2 border rounded-md mt-1"
          />
        </div>
        
        <div className="flex space-x-2 pt-4">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Grant Access
          </Button>
          <Button variant="outline" onClick={() => setShowGrantForm(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Consent Data</h2>
        <p className="text-muted-foreground">
          We couldn't find your consent records. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy & Consents</h1>
          <p className="text-muted-foreground">
            Manage your privacy settings and data sharing preferences
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Privacy Report
        </Button>
      </div>

      {/* Privacy Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-800">Your Privacy Matters</h4>
              <p className="text-sm text-blue-700">
                You have full control over who can access your health information. Review and manage your privacy settings below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {consents.filter(c => c.status === 'granted').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently granted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Grants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accessGrants.filter(g => g.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">People with access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {consents.filter(c => c.status === 'pending').length + accessGrants.filter(g => g.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy Level</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Standard</div>
            <p className="text-xs text-muted-foreground">Current setting</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {showGrantForm ? (
        <AccessGrantForm />
      ) : (
        <Tabs defaultValue="consents" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="consents">Medical Consents ({consents.length})</TabsTrigger>
            <TabsTrigger value="access">Access Grants ({accessGrants.length})</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
          </TabsList>

          {/* Medical Consents */}
          <TabsContent value="consents" className="space-y-4">
            {consents.length > 0 ? (
              <div className="space-y-4">
                {consents.map((consent) => (
                  <Card key={consent.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Shield className="h-5 w-5 text-blue-500" />
                          <div>
                            <h3 className="font-medium">{consent.scope}</h3>
                            <p className="text-sm text-muted-foreground">
                              {consent.consent_type.replace('_', ' ')} • {consent.purpose}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Granted: {consent.granted_at ? new Date(consent.granted_at).toLocaleDateString() : 'Pending'}
                              {consent.expires_at && ` • Expires: ${new Date(consent.expires_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {getConsentStatusBadge(consent.status)}
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            {consent.status === 'granted' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleWithdrawConsent(consent.id)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {consent.legal_basis && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Legal Basis:</span> {consent.legal_basis}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No consent records</h3>
                <p className="text-muted-foreground">
                  Your medical consent history will appear here
                </p>
              </div>
            )}
          </TabsContent>

          {/* Access Grants */}
          <TabsContent value="access" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">People with Access to Your Records</h3>
              <Button onClick={() => setShowGrantForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Grant Access
              </Button>
            </div>
            
            {accessGrants.length > 0 ? (
              <div className="space-y-4">
                {accessGrants.map((grant) => (
                  <Card key={grant.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Users className="h-5 w-5 text-green-500" />
                          <div>
                            <h3 className="font-medium">{grant.grantee_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {grant.grantee_type.replace('_', ' ')} • {grant.relationship_to_patient || 'No relationship specified'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Access Level: {grant.access_level.replace('_', ' ')}
                              {grant.expires_at && ` • Expires: ${new Date(grant.expires_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {getAccessGrantStatusBadge(grant.status)}
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            
                            {grant.status === 'active' && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleRevokeGrant(grant.id)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Can Access:</p>
                        <div className="flex flex-wrap gap-2">
                          {grant.scope.map((scope, index) => (
                            <Badge key={index} variant="outline">
                              {scope.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {grant.last_accessed_at && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Last Access:</span> {new Date(grant.last_accessed_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No access grants</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't granted anyone access to your health records yet
                </p>
                <Button onClick={() => setShowGrantForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Grant First Access
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Preferences</CardTitle>
                <CardDescription>
                  Control how your health information is used and shared
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Communication Preferences</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Email notifications about appointments</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm">SMS reminders for medications</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Lab result notifications</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Data Sharing</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Share data for medical research (anonymized)</span>
                      <input type="checkbox" className="rounded" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Quality improvement programs</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Emergency access by healthcare providers</span>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Privacy Level</h4>
                  <select className="w-full p-2 border rounded-md">
                    <option value="standard">Standard - Normal privacy protections</option>
                    <option value="restricted">Restricted - Enhanced privacy controls</option>
                    <option value="maximum">Maximum - Strictest privacy settings</option>
                  </select>
                </div>
                
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Privacy Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}