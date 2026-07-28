// Lab Orders Management Page - HMS Lab Operations
import React, { useState, useEffect, useCallback } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { LabService, LAB_TEST_TEMPLATES } from '@/lib/labs';
import { getEntity } from '@/lib/entities';
import { githubDB as dbHelpers, collections } from '@/lib/database';
import { generateLabReport } from '@/lib/hms-print-templates';
import { validateLOINC } from '@/lib/hms-code-validators';
import PrintButton from '@/components/hms/PrintButton';
import PatientSearch from '@/components/ui/PatientSearch';
import { 
  TestTube, 
  Plus, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Eye,
  Beaker,
  Printer,
  Loader2,
  Trash2
} from 'lucide-react';

export default function LabOrdersPage() {
  const { user, hasPermission } = useAuth();
  const toast = useToastService();
  const [labOrders, setLabOrders] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityInfo, setEntityInfo] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({
    category: 'chemistry',
    priority: 'routine',
    reason_for_test: '',
    clinical_info: '',
    tests: [] as Array<{ test_code: string; test_name: string; specimen_type: string; panel?: string }>
  });
  const [manualTest, setManualTest] = useState({ test_code: '', test_name: '', specimen_type: 'blood' });
  const [loincValidation, setLoincValidation] = useState<{ valid: boolean; formatted?: string; description?: string } | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  useEffect(() => {
    if (user?.entity_id) {
      loadLabData();
      loadEntityInfo();
    }
  }, [user?.entity_id, activeTab]);

  const loadEntityInfo = async () => {
    if (!user?.entity_id) return;
    try {
      const ent = await getEntity(user.entity_id);
      setEntityInfo(ent);
    } catch (e) {
      setEntityInfo(null);
    }
  };

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
      toast.showSuccess('You do not have permission to order lab tests');
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
      toast.showSuccess('Failed to create lab order');
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
      toast.showSuccess('Failed to record specimen collection');
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

  // ---- Lab Report Print Button (lazy fetch + PrintButton) ----
  const LabReportPrintButton: React.FC<{ order: any }> = ({ order }) => {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePrepare = useCallback(async () => {
      if (loading || html) return;
      setLoading(true);
      try {
        const results = await LabService.getLabResults(order.id);
        if (!results || results.length === 0) {
          toast.showWarning('No lab results available to print for this order.');
          setLoading(false);
          return;
        }
        // Use the latest result (results are returned sorted newest-first by the service).
        const latestResult = results[0];
        const generated = generateLabReport(
          order,
          latestResult,
          { name: order.patient_id || 'Patient', patient_code: order.patient_id },
          {
            name: entityInfo?.name,
            type: entityInfo?.entity_type ? String(entityInfo.entity_type).replace(/_/g, ' ') : undefined,
            address: entityInfo?.address,
            phone: entityInfo?.phone,
            email: entityInfo?.email,
            website: entityInfo?.website
          }
        );
        setHtml(generated);
      } catch (err) {
        console.error('Failed to generate lab report:', err);
        toast.showError('Failed to generate lab report.');
      } finally {
        setLoading(false);
      }
    }, [order, entityInfo, loading, html]);

    if (html) {
      return (
        <PrintButton
          html={html}
          filename={`lab-report-${order.order_number || order.id}.html`}
          label="Print Report"
          autoPrint
        />
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handlePrepare}
        disabled={loading}
        aria-label={`Print lab report for order ${order.order_number}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Printer className="h-3 w-3 mr-1" />
        )}
        {loading ? 'Preparing...' : 'Print Report'}
      </Button>
    );
  };

  // ---- LOINC validation for manual test code entry ----
  const handleLoincBlur = (code: string) => {
    if (!code || !code.trim()) {
      setLoincValidation(null);
      return;
    }
    const result = validateLOINC(code);
    setLoincValidation(result);
    if (result.valid && result.formatted && result.formatted !== code) {
      setManualTest((prev) => ({ ...prev, test_code: result.formatted! }));
    }
  };

  const handleAddManualTest = () => {
    if (!manualTest.test_name.trim()) {
      toast.showError('Test name is required.');
      return;
    }
    if (manualTest.test_code.trim() && !loincValidation?.valid) {
      toast.showError('LOINC code is invalid. Please correct it before adding.');
      return;
    }
    setOrderForm((prev) => ({
      ...prev,
      tests: [
        ...prev.tests,
        {
          test_code: loincValidation?.formatted || manualTest.test_code.trim() || '',
          test_name: manualTest.test_name.trim(),
          specimen_type: manualTest.specimen_type
        }
      ]
    }));
    setManualTest({ test_code: '', test_name: '', specimen_type: 'blood' });
    setLoincValidation(null);
  };

  const handleAddTemplateTest = (template: any) => {
    setOrderForm((prev) => ({
      ...prev,
      tests: [
        ...prev.tests,
        {
          test_code: template.test_code || '',
          test_name: template.test_name,
          specimen_type: template.specimen_type,
          panel: template.panel
        }
      ]
    }));
  };

  const handleRemoveTest = (index: number) => {
    setOrderForm((prev) => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitOrder = async () => {
    if (!selectedPatient) {
      toast.showError('Please select a patient.');
      return;
    }
    if (orderForm.tests.length === 0) {
      toast.showError('Please add at least one test to the order.');
      return;
    }
    if (!orderForm.reason_for_test.trim()) {
      toast.showError('Reason for test is required.');
      return;
    }

    setOrderSubmitting(true);
    try {
      await handleCreateOrder({
        patient_id: (selectedPatient as any)?.id,
        category: orderForm.category,
        priority: orderForm.priority,
        reason_for_test: orderForm.reason_for_test.trim(),
        clinical_info: orderForm.clinical_info.trim() || undefined,
        tests: orderForm.tests.map((t) => ({
          test_code: t.test_code || undefined,
          test_name: t.test_name,
          specimen_type: t.specimen_type,
          panel: t.panel
        }))
      });
      // Reset form on success
      setOrderForm({
        category: 'chemistry',
        priority: 'routine',
        reason_for_test: '',
        clinical_info: '',
        tests: []
      });
      setManualTest({ test_code: '', test_name: '', specimen_type: 'blood' });
      setLoincValidation(null);
    } catch (err) {
      console.error('Failed to create lab order:', err);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const OrderForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create Lab Order</CardTitle>
        <CardDescription>Order laboratory tests for a patient. LOINC codes are validated in the format nnnn-n (e.g. 2339-0).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PatientSearch
          onPatientSelect={setSelectedPatient}
          placeholder="Search for patient..."
          entityId={user?.entity_id}
        />
        
        {selectedPatient && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="of-category">Test Category</Label>
                <select
                  id="of-category"
                  value={orderForm.category}
                  onChange={(e) => setOrderForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="chemistry">Chemistry</option>
                  <option value="hematology">Hematology</option>
                  <option value="microbiology">Microbiology</option>
                  <option value="immunology">Immunology</option>
                  <option value="pathology">Pathology</option>
                  <option value="molecular">Molecular</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-priority">Priority</Label>
                <select
                  id="of-priority"
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="asap">ASAP</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Common Tests</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {Object.entries(LAB_TEST_TEMPLATES).map(([key, template]: [string, any]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTemplateTest(template)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {template.test_name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <Label>Add Test Manually (LOINC validated)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <div className="space-y-1">
                  <Input
                    placeholder="LOINC code (e.g. 2339-0)"
                    value={manualTest.test_code}
                    onChange={(e) => {
                      setManualTest((p) => ({ ...p, test_code: e.target.value }));
                      if (loincValidation) setLoincValidation(null);
                    }}
                    onBlur={(e) => handleLoincBlur(e.target.value)}
                    className={loincValidation ? (loincValidation.valid ? 'border-emerald-500' : 'border-red-500') : ''}
                    aria-invalid={loincValidation ? !loincValidation.valid : undefined}
                  />
                  {loincValidation?.valid && loincValidation.formatted && (
                    <p className="text-xs text-emerald-700">OK: {loincValidation.formatted}</p>
                  )}
                  {loincValidation && !loincValidation.valid && (
                    <p className="text-xs text-red-600">Invalid LOINC format</p>
                  )}
                  {loincValidation?.valid && loincValidation.description && (
                    <p className="text-xs text-amber-700">{loincValidation.description}</p>
                  )}
                </div>
                <Input
                  placeholder="Test name"
                  value={manualTest.test_name}
                  onChange={(e) => setManualTest((p) => ({ ...p, test_name: e.target.value }))}
                />
                <div className="flex gap-2">
                  <select
                    value={manualTest.specimen_type}
                    onChange={(e) => setManualTest((p) => ({ ...p, specimen_type: e.target.value }))}
                    className="flex-1 h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  >
                    <option value="blood">Blood</option>
                    <option value="urine">Urine</option>
                    <option value="stool">Stool</option>
                    <option value="sputum">Sputum</option>
                    <option value="tissue">Tissue</option>
                    <option value="swab">Swab</option>
                    <option value="other">Other</option>
                  </select>
                  <Button size="sm" variant="outline" onClick={handleAddManualTest} aria-label="Add test">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {orderForm.tests.length > 0 && (
              <div className="space-y-2">
                <Label>Tests in this order ({orderForm.tests.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1
                  [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded
                  [&::-webkit-scrollbar-track]:bg-gray-100 [scrollbar-width:thin]">
                  {orderForm.tests.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                      <div className="min-w-0">
                        <span className="font-medium text-sm">{t.test_name}</span>
                        {t.test_code && (
                          <span className="text-xs text-muted-foreground ml-2">LOINC: {t.test_code}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-2">• {t.specimen_type}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveTest(i)}
                        aria-label={`Remove ${t.test_name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="of-reason">Reason for Test <span className="text-red-600">*</span></Label>
              <textarea
                id="of-reason"
                value={orderForm.reason_for_test}
                onChange={(e) => setOrderForm((p) => ({ ...p, reason_for_test: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                placeholder="Clinical indication for testing..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="of-clinical">Clinical Info (optional)</Label>
              <textarea
                id="of-clinical"
                value={orderForm.clinical_info}
                onChange={(e) => setOrderForm((p) => ({ ...p, clinical_info: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                placeholder="Additional clinical context, current medications, fasting status..."
                rows={2}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleSubmitOrder} disabled={orderSubmitting}>
                {orderSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Create Order
              </Button>
              <Button variant="outline" onClick={() => setShowOrderForm(false)} disabled={orderSubmitting}>
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
                          
                          <div className="flex flex-wrap gap-2 justify-end">
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
                              <>
                                <Button variant="outline" size="sm">
                                  <Download className="h-3 w-3 mr-1" />
                                  Results
                                </Button>
                                <LabReportPrintButton order={order} />
                              </>
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