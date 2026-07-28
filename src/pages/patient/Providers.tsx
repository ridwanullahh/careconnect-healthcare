// Patient Providers - Patient Portal Healthcare Provider Management
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { ReferralService } from '@/lib/referrals';
import { 
  Stethoscope, 
  Building, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Clock,
  Eye,
  MessageSquare,
  Plus,
  Star,
  Users
} from 'lucide-react';

export default function Providers() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState(null);
  const [linkedProviders, setLinkedProviders] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProviderData();
    }
  }, [user?.id]);

  const loadProviderData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get patient details first
      const patientDetails = await PatientService.getPatientDetails(user.id, user.id);
      
      if (!patientDetails) {
        throw new Error('Patient record not found');
      }

      // Load provider and referral data
      const [
        entityLinks,
        patientReferrals
      ] = await Promise.all([
        PatientService.getLinkedEntities(patientDetails.id),
        ReferralService.getPatientReferrals(patientDetails.id)
      ]);

      // Mock provider details (in real implementation, would fetch from entities collection)
      const mockProviders = entityLinks.map(link => ({
        ...link,
        entity_name: getEntityName(link.relationship_type),
        entity_type: getEntityType(link.relationship_type),
        specialties: getEntitySpecialties(link.relationship_type),
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 star rating
        phone: '(555) 123-4567',
        email: 'contact@provider.com',
        address: '123 Medical Center Dr, City, ST 12345'
      }));

      setPatientData(patientDetails);
      setLinkedProviders(mockProviders);
      setReferrals(patientReferrals);

    } catch (error) {
      console.error('Failed to load provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityName = (relationshipType: string) => {
    const names = {
      'primary_care': 'Family Health Center',
      'specialist': 'Specialty Medical Group',
      'pharmacy': 'Community Pharmacy',
      'lab': 'Diagnostic Laboratory',
      'imaging': 'Radiology Center',
      'emergency': 'Emergency Medical Center'
    };
    return names[relationshipType] || 'Healthcare Provider';
  };

  const getEntityType = (relationshipType: string) => {
    const types = {
      'primary_care': 'Primary Care',
      'specialist': 'Specialist',
      'pharmacy': 'Pharmacy',
      'lab': 'Laboratory',
      'imaging': 'Imaging Center',
      'emergency': 'Emergency Care'
    };
    return types[relationshipType] || 'Healthcare Provider';
  };

  const getEntitySpecialties = (relationshipType: string) => {
    const specialties = {
      'primary_care': ['Family Medicine', 'Internal Medicine'],
      'specialist': ['Cardiology', 'Endocrinology'],
      'pharmacy': ['Prescription Services', 'Medication Counseling'],
      'lab': ['Blood Tests', 'Diagnostics'],
      'imaging': ['X-Ray', 'MRI', 'CT Scan'],
      'emergency': ['Emergency Medicine', '24/7 Care']
    };
    return specialties[relationshipType] || ['General Services'];
  };

  const getProviderIcon = (entityType: string) => {
    switch (entityType) {
      case 'Primary Care':
        return <Stethoscope className="h-5 w-5 text-blue-500" />;
      case 'Specialist':
        return <Users className="h-5 w-5 text-purple-500" />;
      case 'Pharmacy':
        return <Building className="h-5 w-5 text-green-500" />;
      default:
        return <Building className="h-5 w-5 text-gray-500" />;
    }
  };

  const getReferralStatusBadge = (status: string) => {
    const variants = {
      'sent': { variant: 'secondary', color: 'text-blue-600' },
      'received': { variant: 'default', color: 'text-orange-600' },
      'accepted': { variant: 'outline', color: 'text-green-600' },
      'declined': { variant: 'destructive', color: 'text-red-600' },
      'completed': { variant: 'outline', color: 'text-gray-600' }
    };
    
    const config = variants[status] || variants['sent'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}.0)</span>
      </div>
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
        <Building className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Provider Data</h2>
        <p className="text-muted-foreground">
          We couldn't find your provider information. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Healthcare Providers</h1>
          <p className="text-muted-foreground">
            View and manage your healthcare team and referrals
          </p>
        </div>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Find Provider
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkedProviders.length}</div>
            <p className="text-xs text-muted-foreground">In your network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Care</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {linkedProviders.filter(p => p.relationship_type === 'primary_care').length}
            </div>
            <p className="text-xs text-muted-foreground">Primary providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Specialists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {linkedProviders.filter(p => p.relationship_type === 'specialist').length}
            </div>
            <p className="text-xs text-muted-foreground">Specialty care</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referrals.length}</div>
            <p className="text-xs text-muted-foreground">Total referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers">My Providers ({linkedProviders.length})</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="directory">Find Providers</TabsTrigger>
        </TabsList>

        {/* My Providers */}
        <TabsContent value="providers" className="space-y-4">
          {linkedProviders.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {linkedProviders.map((provider) => (
                <Card key={provider.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getProviderIcon(provider.entity_type)}
                        <div>
                          <h3 className="font-medium text-lg">{provider.entity_name}</h3>
                          <p className="text-sm text-muted-foreground">{provider.entity_type}</p>
                          {renderStarRating(provider.rating)}
                        </div>
                      </div>
                      
                      <Badge variant="outline" className="text-green-600">
                        {provider.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {provider.specialties.map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{provider.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{provider.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{provider.address}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Connected since: {new Date(provider.linked_at).toLocaleDateString()}
                        </p>
                        <div className="flex space-x-2">
                          <Button size="sm" className="flex-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            Book
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Message
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No providers found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't connected with any healthcare providers yet
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Find Providers
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Referrals */}
        <TabsContent value="referrals" className="space-y-4">
          {referrals.length > 0 ? (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <Card key={referral.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Users className="h-5 w-5 text-purple-500" />
                        <div>
                          <h3 className="font-medium">Referral #{referral.referral_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {referral.type.replace('_', ' ')} • {referral.specialty_required || 'General'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(referral.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {getReferralStatusBadge(referral.status)}
                        <p className="text-sm text-muted-foreground mt-1">
                          Priority: {referral.priority}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Reason:</span> {referral.reason_for_referral}
                      </p>
                      {referral.clinical_summary && (
                        <p className="text-sm mt-2">
                          <span className="font-medium">Summary:</span> {referral.clinical_summary}
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      
                      {referral.status === 'accepted' && (
                        <Button size="sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No referrals</h3>
              <p className="text-muted-foreground">
                Your specialist referrals will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Find Providers */}
        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Healthcare Providers</CardTitle>
              <CardDescription>
                Search for healthcare providers in your area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Specialty</label>
                    <select className="w-full p-2 border rounded-md mt-1">
                      <option value="">All specialties</option>
                      <option value="primary_care">Primary Care</option>
                      <option value="cardiology">Cardiology</option>
                      <option value="dermatology">Dermatology</option>
                      <option value="orthopedics">Orthopedics</option>
                      <option value="psychiatry">Psychiatry</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md mt-1"
                      placeholder="City, State or ZIP code"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Distance</label>
                    <select className="w-full p-2 border rounded-md mt-1">
                      <option value="5">Within 5 miles</option>
                      <option value="10">Within 10 miles</option>
                      <option value="25">Within 25 miles</option>
                      <option value="50">Within 50 miles</option>
                    </select>
                  </div>
                </div>
                
                <Button className="w-full">
                  <Building className="h-4 w-4 mr-2" />
                  Search Providers
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Provider Directory</h3>
            <p className="text-muted-foreground">
              Search results will appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}