// Care Plans Management Page - HMS Care Plan Operations
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { CarePlanService } from '@/lib/care-plans';
import PatientSearch from '@/components/ui/PatientSearch';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Clock, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Eye,
  Edit
} from 'lucide-react';

export default function CarePlansPage() {
  const { user, hasPermission } = useAuth();
  const [carePlans, setCarePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.entity_id) {
      loadCarePlansData();
    }
  }, [user?.entity_id, activeTab]);

  const loadCarePlansData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      const plans = await CarePlanService.getActiveCarePlans(user.entity_id);
      setCarePlans(plans);
    } catch (error) {
      console.error('Failed to load care plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (planData: any) => {
    if (!hasPermission(Permission.MANAGE_CARE_PLANS)) {
      alert('You do not have permission to manage care plans');
      return;
    }

    try {
      await CarePlanService.createCarePlan({
        ...planData,
        entity_id: user?.entity_id,
        created_by: user?.id,
        goals: [],
        activities: [],
        care_team: []
      });
      
      setShowPlanForm(false);
      setSelectedPatient(null);
      loadCarePlansData();
    } catch (error) {
      console.error('Failed to create care plan:', error);
      alert('Failed to create care plan');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'draft': { variant: 'secondary', color: 'text-gray-600' },
      'active': { variant: 'default', color: 'text-green-600' },
      'on_hold': { variant: 'secondary', color: 'text-yellow-600' },
      'completed': { variant: 'outline', color: 'text-blue-600' },
      'revoked': { variant: 'destructive', color: 'text-red-600' }
    };
    
    const config = variants[status] || variants['draft'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      'assessment': 'bg-blue-100 text-blue-800',
      'treatment': 'bg-green-100 text-green-800',
      'education': 'bg-purple-100 text-purple-800',
      'prevention': 'bg-orange-100 text-orange-800',
      'discharge': 'bg-gray-100 text-gray-800',
      'follow_up': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[category] || colors['treatment']}`}>
        {category.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getGoalProgress = (goals: any[]) => {
    if (!goals || goals.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = goals.filter(g => g.status === 'completed' || g.achievement_status === 'achieved').length;
    const total = goals.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  };

  const filteredPlans = carePlans.filter((plan: any) => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'active' && plan.status === 'active') ||
      (activeTab === 'draft' && plan.status === 'draft') ||
      (activeTab === 'completed' && plan.status === 'completed');
    
    const matchesSearch = !searchQuery || 
      plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.patient_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const PlanForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create Care Plan</CardTitle>
        <CardDescription>Create a comprehensive care plan for a patient</CardDescription>
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
              <label className="text-sm font-medium">Plan Title *</label>
              <Input placeholder="Enter care plan title" className="mt-1" />
            </div>
            
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="treatment">Treatment</option>
                <option value="assessment">Assessment</option>
                <option value="education">Education</option>
                <option value="prevention">Prevention</option>
                <option value="discharge">Discharge</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description *</label>
              <textarea 
                className="w-full p-2 border rounded-md mt-1"
                placeholder="Describe the care plan objectives..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Target End Date</label>
                <Input type="date" className="mt-1" />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={() => handleCreatePlan({
                patient_id: selectedPatient.id,
                title: 'New Care Plan',
                description: 'Care plan description',
                category: 'treatment',
                intent: 'plan',
                period: {
                  start: new Date().toISOString(),
                  end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
              })}>
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
              <Button variant="outline" onClick={() => setShowPlanForm(false)}>
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
          <h1 className="text-3xl font-bold tracking-tight">Care Plans</h1>
          <p className="text-muted-foreground">
            Manage patient care plans and track progress
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search care plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {hasPermission(Permission.MANAGE_CARE_PLANS) && (
            <Button onClick={() => setShowPlanForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carePlans.length}</div>
            <p className="text-xs text-muted-foreground">All care plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {carePlans.filter((p: any) => p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0</div>
            <p className="text-xs text-muted-foreground">Activities due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {carePlans.filter((p: any) => p.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Finished plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {showPlanForm ? (
        <PlanForm />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">Active ({carePlans.filter((p: any) => p.status === 'active').length})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({carePlans.filter((p: any) => p.status === 'draft').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({carePlans.filter((p: any) => p.status === 'completed').length})</TabsTrigger>
            <TabsTrigger value="all">All ({carePlans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredPlans.length > 0 ? (
              <div className="space-y-4">
                {filteredPlans.map((plan: any) => {
                  const progress = getGoalProgress(plan.goals);
                  
                  return (
                    <Card key={plan.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <ClipboardList className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-lg">{plan.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                Patient: {plan.patient_id}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                {getCategoryBadge(plan.category)}
                                {getStatusBadge(plan.status)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              Progress: {progress.completed}/{progress.total} goals
                            </div>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {progress.percentage}% complete
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Start Date</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(plan.period.start).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Care Team</p>
                              <p className="text-xs text-muted-foreground">
                                {plan.care_team?.length || 0} members
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Activities</p>
                              <p className="text-xs text-muted-foreground">
                                {plan.activities?.length || 0} planned
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 pt-2 border-t">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          
                          {hasPermission(Permission.MANAGE_CARE_PLANS) && (
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit Plan
                            </Button>
                          )}
                          
                          <Button variant="outline" size="sm">
                            <Target className="h-3 w-3 mr-1" />
                            Add Goal
                          </Button>
                          
                          <Button variant="outline" size="sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            Add Activity
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No care plans found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'active' && 'No active care plans at this time'}
                  {activeTab === 'draft' && 'No draft care plans to show'}
                  {activeTab === 'completed' && 'No completed care plans'}
                  {activeTab === 'all' && 'No care plans have been created yet'}
                </p>
                {hasPermission(Permission.MANAGE_CARE_PLANS) && activeTab === 'all' && (
                  <Button onClick={() => setShowPlanForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Plan
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}