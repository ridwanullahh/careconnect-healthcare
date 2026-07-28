// Referrals Management Page - HMS Referral Operations
import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { ReferralService } from '@/lib/referrals';
import PatientSearch from '@/components/ui/PatientSearch';
import { 
  Send, 
  Inbox, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Eye,
  MessageSquare
} from 'lucide-react';

export default function ReferralsPage() {
  const { user, hasPermission } = useAuth();
  const [outgoingReferrals, setOutgoingReferrals] = useState([]);
  const [incomingReferrals, setIncomingReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outgoing');
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.entity_id) {
      loadReferralsData();
    }
  }, [user?.entity_id]);

  const loadReferralsData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      const [outgoing, incoming] = await Promise.all([
        ReferralService.getOutgoingReferrals(user.entity_id),
        ReferralService.getIncomingReferrals(user.entity_id)
      ]);
      
      setOutgoingReferrals(outgoing);
      setIncomingReferrals(incoming);
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (referralData: any) => {
    if (!hasPermission(Permission.CREATE_REFERRALS)) {
      toast.showSuccess('You do not have permission to create referrals');
      return;
    }

    try {
      const referral = await ReferralService.createReferral({
        ...referralData,
        from_entity_id: user?.entity_id,
        referring_provider_id: user?.id,
        created_by: user?.id
      });
      
      await ReferralService.sendReferral(referral.id, user?.id || '');
      
      setShowReferralForm(false);
      setSelectedPatient(null);
      loadReferralsData();
    } catch (error) {
      console.error('Failed to create referral:', error);
      toast.showSuccess('Failed to create referral');
    }
  };

  const handleAcceptReferral = async (referralId: string) => {
    try {
      await ReferralService.acceptReferral(referralId, user?.id || '', 'Referral accepted');
      loadReferralsData();
    } catch (error) {
      console.error('Failed to accept referral:', error);
      toast.showSuccess('Failed to accept referral');
    }
  };

  const handleDeclineReferral = async (referralId: string, reason: string) => {
    try {
      await ReferralService.declineReferral(referralId, user?.id || '', reason);
      loadReferralsData();
    } catch (error) {
      console.error('Failed to decline referral:', error);
      toast.showSuccess('Failed to decline referral');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'draft': { variant: 'secondary', color: 'text-gray-600', icon: Clock },
      'sent': { variant: 'default', color: 'text-blue-600', icon: Send },
      'received': { variant: 'secondary', color: 'text-orange-600', icon: Inbox },
      'accepted': { variant: 'outline', color: 'text-green-600', icon: CheckCircle },
      'declined': { variant: 'destructive', color: 'text-red-600', icon: XCircle },
      'completed': { variant: 'outline', color: 'text-gray-600', icon: CheckCircle },
      'cancelled': { variant: 'destructive', color: 'text-red-600', icon: XCircle }
    };
    
    const config = variants[status] || variants['draft'];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center space-x-1`}>
        <IconComponent className="h-3 w-3" />
        <span>{status.toUpperCase()}</span>
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

  const ReferralForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create Referral</CardTitle>
        <CardDescription>Refer a patient to another healthcare provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PatientSearch
          onPatientSelect={setSelectedPatient}
          placeholder="Search for patient..."
          entityId={user?.entity_id}
        />
        
        {selectedPatient && (
          <>
            <div>
              <label className="text-sm font-medium">Referring To *</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="">Select provider/facility</option>
                <option value="specialist_clinic">Cardiology Clinic</option>
                <option value="imaging_center">Radiology Center</option>
                <option value="lab_center">Laboratory Services</option>
                <option value="therapy_center">Physical Therapy</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Referral Type *</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="consultation">Consultation</option>
                <option value="treatment">Treatment</option>
                <option value="procedure">Procedure</option>
                <option value="second_opinion">Second Opinion</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Priority *</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Specialty Required</label>
              <Input placeholder="e.g., Cardiology, Orthopedics" className="mt-1" />
            </div>
            
            <div>
              <label className="text-sm font-medium">Reason for Referral *</label>
              <textarea 
                className="w-full p-2 border rounded-md mt-1"
                placeholder="Brief reason for referral..."
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Clinical Summary *</label>
              <textarea 
                className="w-full p-2 border rounded-md mt-1"
                placeholder="Patient's clinical history and current status..."
                rows={4}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Requested Timeframe</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="">No specific timeframe</option>
                <option value="within_1_week">Within 1 week</option>
                <option value="within_2_weeks">Within 2 weeks</option>
                <option value="within_1_month">Within 1 month</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="follow_up" />
              <label htmlFor="follow_up" className="text-sm">Require follow-up report</label>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={() => handleCreateReferral({
                patient_id: selectedPatient.id,
                to_entity_id: 'specialist_entity_id',
                type: 'consultation',
                priority: 'routine',
                reason_for_referral: 'Consultation needed',
                clinical_summary: 'Patient requires specialist evaluation',
                follow_up_required: true
              })}>
                <Send className="h-4 w-4 mr-2" />
                Send Referral
              </Button>
              <Button variant="outline" onClick={() => setShowReferralForm(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
          <p className="text-muted-foreground">
            Manage patient referrals and inter-provider communication
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {hasPermission(Permission.CREATE_REFERRALS) && (
            <Button onClick={() => setShowReferralForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Referral
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outgoing Referrals</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outgoingReferrals.length}</div>
            <p className="text-xs text-muted-foreground">Sent to specialists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming Referrals</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incomingReferrals.length}</div>
            <p className="text-xs text-muted-foreground">Received from providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {[...outgoingReferrals, ...incomingReferrals].filter((r: any) => ['sent', 'received'].includes(r.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {[...outgoingReferrals, ...incomingReferrals].filter((r: any) => ['completed', 'accepted'].includes(r.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Successful referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {showReferralForm ? (
        <ReferralForm />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outgoing">Outgoing ({outgoingReferrals.length})</TabsTrigger>
            <TabsTrigger value="incoming">Incoming ({incomingReferrals.length})</TabsTrigger>
          </TabsList>

          {/* Outgoing Referrals */}
          <TabsContent value="outgoing" className="space-y-4">
            {outgoingReferrals.length > 0 ? (
              <div className="space-y-4">
                {outgoingReferrals.map((referral: any) => (
                  <Card key={referral.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Send className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">Referral #{referral.referral_number}</h3>
                            <p className="text-sm text-muted-foreground">
                              Patient: {referral.patient_id} • {referral.type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              To: {referral.to_entity_id} • {referral.specialty_required || 'General'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(referral.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusBadge(referral.status)}
                            {getPriorityBadge(referral.priority)}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            {referral.status === 'draft' && (
                              <Button size="sm" onClick={() => ReferralService.sendReferral(referral.id, user?.id || '')}>
                                <Send className="h-3 w-3 mr-1" />
                                Send
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Reason:</span> {referral.reason_for_referral}
                        </p>
                        <p className="text-sm mt-2">
                          <span className="font-medium">Summary:</span> {referral.clinical_summary}
                        </p>
                      </div>
                      
                      {referral.response_notes && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm">
                            <span className="font-medium">Response:</span> {referral.response_notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No outgoing referrals</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't created any referrals yet
                </p>
                {hasPermission(Permission.CREATE_REFERRALS) && (
                  <Button onClick={() => setShowReferralForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Referral
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Incoming Referrals */}
          <TabsContent value="incoming" className="space-y-4">
            {incomingReferrals.length > 0 ? (
              <div className="space-y-4">
                {incomingReferrals.map((referral: any) => (
                  <Card key={referral.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Inbox className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">Referral #{referral.referral_number}</h3>
                            <p className="text-sm text-muted-foreground">
                              Patient: {referral.patient_id} • {referral.type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              From: {referral.from_entity_id} • {referral.specialty_required || 'General'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Received: {referral.received_at ? new Date(referral.received_at).toLocaleDateString() : 'Pending'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusBadge(referral.status)}
                            {getPriorityBadge(referral.priority)}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            {referral.status === 'received' && (
                              <>
                                <Button size="sm" onClick={() => handleAcceptReferral(referral.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Accept
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeclineReferral(referral.id, 'Unable to accommodate at this time')}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Reason:</span> {referral.reason_for_referral}
                        </p>
                        <p className="text-sm mt-2">
                          <span className="font-medium">Summary:</span> {referral.clinical_summary}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No incoming referrals</h3>
                <p className="text-muted-foreground">
                  You haven't received any referrals yet
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}