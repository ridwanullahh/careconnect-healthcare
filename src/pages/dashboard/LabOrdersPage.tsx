// Lab Orders Management Page - HMS Lab Operations
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { LabService, LAB_TEST_TEMPLATES } from '@/lib/labs';
import PatientSearch from '@/components/ui/PatientSearch';
import { 
  TestTube, 
  Plus, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Download,
  Eye,
  Beaker
} from 'lucide-react';

export default function LabOrdersPage() {
  const { user, hasPermission } = useAuth();
  const [labOrders, setLabOrders] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.entity_id) {
      loadLabData();
    }
  }, [user?.entity_id, activeTab]);

  const loadLabData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      const [orders, criticalResults] = await Promise.all([
        LabService.getEntityLabOrders(user.entity_id),
        LabService.getCriticalResults(user.entity_id)
      ]);

      setLabOrders(orders);
      setLabResults(criticalResults);
    } catch (error) {
      console.error('Failed to load lab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (orderData: any) => {
    if (!hasPermission(Permission.ORDER_LABS)) {
      alert('You do not have permission to order lab tests');
      return;
    }

    try {
      await LabService.createLabOrder({
        ...orderData,
        entity_id: user?.entity_id,
        orderer_id: user?.id
      });
      
      setShowOrderForm(false);
      setSelectedPatient(null);
      loadLabData();
    } catch (error) {
      console.error('Failed to create lab order:', error);
      alert('Failed to create lab order');
    }
  };

  const handleSpecimenCollection = async (orderId: string) => {
    try {
      await LabService.recordSpecimenCollection(orderId, {
        collected_by: user?.id || ''
      });
      loadLabData();
    } catch (error) {
      console.error('Failed to record specimen collection:', error);
      alert('Failed to record specimen collection');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'requested': { variant: 'secondary', color: 'text-blue-600' },
      'received': { variant: 'default', color: 'text-orange-600' },
      'in_progress': { variant: 'default', color: 'text-yellow-600' },
      'completed': { variant: 'outline', color: 'text-green-600' },
      'cancelled': { variant: 'destructive', color: 'text-red-600' }
    };
    
    const config = variants[status] || variants['requested'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'stat': 'bg-red-100 text-red-800',
      'asap': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-yellow-100 text-yellow-800',
      'routine': 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[priority] || colors['routine']}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const filteredOrders = labOrders.filter(order => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'pending' && ['requested', 'received', 'in_progress'].includes(order.status)) ||
      (activeTab === 'completed' && order.status === 'completed') ||
      (activeTab === 'stat' && order.priority === 'stat');
    
    const matchesSearch = !searchQuery || 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.patient_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const OrderForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create Lab Order</CardTitle>
        <CardDescription>Order laboratory tests for a patient</CardDescription>
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
              <label className="text-sm font-medium">Test Category</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="">Select category</option>
                <option value="chemistry">Chemistry</option>
                <option value="hematology">Hematology</option>
                <option value="microbiology">Microbiology</option>
                <option value="immunology">Immunology</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Common Tests</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(LAB_TEST_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add test to order
                    }}
                  >
                    {template.test_name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="asap">ASAP</option>
                <option value="stat">STAT</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Reason for Test</label>
              <textarea 
                className="w-full p-2 border rounded-md mt-1"
                placeholder="Clinical indication for testing..."
                rows={3}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={() => handleCreateOrder({})}>
                <TestTube className="h-4 w-4 mr-2" />
                Create Order
              </Button>
              <Button variant="outline" onClick={() => setShowOrderForm(false)}>
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
          <h1 className="text-3xl font-bold tracking-tight">Lab Orders</h1>
          <p className="text-muted-foreground">
            Manage laboratory test orders and results
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {hasPermission(Permission.ORDER_LABS) && (
            <Button onClick={() => setShowOrderForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labOrders.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {labOrders.filter(o => ['requested', 'received', 'in_progress'].includes(o.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">STAT Orders</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {labOrders.filter(o => o.priority === 'stat' && o.status !== 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Urgent processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Results</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{labResults.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {showOrderForm ? (
        <OrderForm />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending ({labOrders.filter(o => ['requested', 'received', 'in_progress'].includes(o.status)).length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({labOrders.filter(o => o.status === 'completed').length})</TabsTrigger>
            <TabsTrigger value="stat">STAT ({labOrders.filter(o => o.priority === 'stat').length})</TabsTrigger>
            <TabsTrigger value="all">All ({labOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Beaker className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{order.order_number}</h3>
                            <p className="text-sm text-muted-foreground">
                              Patient: {order.patient_id} • {order.category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ordered: {new Date(order.ordered_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            {getStatusBadge(order.status)}
                            <div className="mt-1">
                              {getPriorityBadge(order.priority)}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {!order.specimen_collected && order.status === 'requested' && (
                              <Button
                                size="sm"
                                onClick={() => handleSpecimenCollection(order.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Collect
                              </Button>
                            )}
                            
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            {order.status === 'completed' && (
                              <Button variant="outline" size="sm">
                                <Download className="h-3 w-3 mr-1" />
                                Results
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm font-medium">Tests Ordered:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {order.tests?.map((test, index) => (
                            <Badge key={index} variant="outline">
                              {test.test_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm">
                          <span className="font-medium">Reason:</span> {order.reason_for_test}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No lab orders found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'pending' && 'No pending orders at this time'}
                  {activeTab === 'completed' && 'No completed orders to show'}
                  {activeTab === 'stat' && 'No STAT orders currently'}
                  {activeTab === 'all' && 'No lab orders have been created yet'}
                </p>
                {hasPermission(Permission.ORDER_LABS) && activeTab === 'all' && (
                  <Button onClick={() => setShowOrderForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Order
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