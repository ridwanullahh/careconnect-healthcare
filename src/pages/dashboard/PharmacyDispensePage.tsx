// Pharmacy Dispense Page - HMS Pharmacy Operations
import React, { useState, useEffect, useCallback } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuth, Permission } from '@/lib/auth';
import { PharmacyService } from '@/lib/pharmacy';
import { MedicationService } from '@/lib/medications';
import { getEntity } from '@/lib/entities';
import { githubDB as dbHelpers, collections } from '@/lib/database';
import { generatePrescription } from '@/lib/hms-print-templates';
import { validateNDC } from '@/lib/hms-code-validators';
import PrintButton from '@/components/hms/PrintButton';
import { 
  Pill, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Eye,
  Truck,
  BarChart3,
  Printer,
  Loader2
} from 'lucide-react';

export default function PharmacyDispensePage() {
  const { user, hasPermission } = useAuth();
  const toast = useToastService();
  const [pendingRx, setPendingRx] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityInfo, setEntityInfo] = useState<any>(null);
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    drug_name: '',
    generic_name: '',
    ndc_number: '',
    strength: '',
    dosage_form: 'tablet',
    quantity_on_hand: '',
    unit_of_measure: 'tablets',
    reorder_point: '',
    unit_cost: '',
    selling_price: ''
  });
  const [ndcValidation, setNdcValidation] = useState<{ valid: boolean; formatted?: string; description?: string } | null>(null);
  const [inventorySubmitting, setInventorySubmitting] = useState(false);

  useEffect(() => {
    if (user?.entity_id) {
      loadPharmacyData();
      loadEntityInfo();
      loadInventory();
    }
  }, [user?.entity_id]);

  const loadEntityInfo = async () => {
    if (!user?.entity_id) return;
    try {
      const ent = await getEntity(user.entity_id);
      setEntityInfo(ent);
    } catch (e) {
      setEntityInfo(null);
    }
  };

  const loadInventory = async () => {
    if (!user?.entity_id) return;
    try {
      const items = await dbHelpers.find(collections.pharmacy_inventory, { entity_id: user.entity_id });
      setInventory(items || []);
    } catch (e) {
      setInventory([]);
    }
  };

  const loadPharmacyData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      const [
        pendingRequests,
        lowStock,
        expiring
      ] = await Promise.all([
        MedicationService.getPharmacyPendingRequests(user.entity_id),
        PharmacyService.getLowStockItems(user.entity_id),
        PharmacyService.getExpiringItems(user.entity_id, 90)
      ]);

      setPendingRx(pendingRequests);
      setLowStockItems(lowStock);
      setExpiringItems(expiring);
    } catch (error) {
      console.error('Failed to load pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (requestId: string, medicationData: any) => {
    if (!hasPermission(Permission.DISPENSE_MEDICATIONS)) {
      toast.showSuccess('You do not have permission to dispense medications');
      return;
    }

    try {
      await PharmacyService.processMedicationDispense({
        medication_request_id: requestId,
        pharmacy_entity_id: user?.entity_id || '',
        patient_id: medicationData.patient_id,
        medications: medicationData.medications,
        dispenser_id: user?.id || '',
        counseling_provided: true,
        pickup_method: 'in_person'
      });
      
      loadPharmacyData();
    } catch (error) {
      console.error('Failed to dispense medication:', error);
      toast.showInfo('Failed to dispense medication: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default', color: 'text-blue-600' },
      'preparation': { variant: 'secondary', color: 'text-orange-600' },
      'ready': { variant: 'outline', color: 'text-green-600' },
      'completed': { variant: 'outline', color: 'text-gray-600' }
    };
    
    const config = variants[status] || variants['active'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStockStatus = (item: any) => {
    if (item.quantity_on_hand <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.quantity_on_hand <= item.reorder_point) {
      return <Badge variant="secondary" className="text-yellow-600">Low Stock</Badge>;
    }
    return <Badge variant="outline" className="text-green-600">In Stock</Badge>;
  };

  const filteredPendingRx = pendingRx.filter(rx => 
    !searchQuery || 
    rx.prescription_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rx.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---- Prescription Print Button (lazy fetch + PrintButton) ----
  const PrescriptionPrintButton: React.FC<{ rx: any }> = ({ rx }) => {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePrepare = useCallback(async () => {
      if (loading || html) return;
      setLoading(true);
      try {
        // Fetch prescriber profile (best-effort). Patient name falls back to patient_id.
        let prescriber: any = {};
        const patientName = rx.patient_id || 'Patient';
        try {
          const profile = await dbHelpers.find(collections.profiles, { user_id: rx.prescriber_id });
          if (profile && profile.length > 0) {
            const p = profile[0];
            prescriber = {
              name: [p.first_name, p.last_name].filter(Boolean).join(' '),
              license_number: p.license_number,
              specialty: (p.specialties && p.specialties[0]) || undefined,
              email: p.email || undefined,
              phone: p.phone || undefined
            };
          }
        } catch (_) {
          // ignore prescriber lookup failure
        }

        const generated = generatePrescription(
          rx,
          { name: patientName, patient_code: rx.patient_id },
          prescriber,
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
        console.error('Failed to generate prescription print:', err);
        toast.showError('Failed to generate prescription sheet.');
      } finally {
        setLoading(false);
      }
    }, [rx, entityInfo, loading, html]);

    if (html) {
      return (
        <PrintButton
          html={html}
          filename={`prescription-${rx.prescription_number || rx.id}.html`}
          label="Print Prescription"
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
        aria-label={`Print prescription ${rx.prescription_number}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Printer className="h-3 w-3 mr-1" />
        )}
        {loading ? 'Preparing...' : 'Print Prescription'}
      </Button>
    );
  };

  // ---- Inventory Add Item Dialog (NDC validated) ----
  const handleOpenAddInventory = () => {
    if (!hasPermission(Permission.MANAGE_PHARMACY_INVENTORY)) {
      toast.showWarning('You do not have permission to manage pharmacy inventory.');
      return;
    }
    setInventoryForm({
      drug_name: '',
      generic_name: '',
      ndc_number: '',
      strength: '',
      dosage_form: 'tablet',
      quantity_on_hand: '',
      unit_of_measure: 'tablets',
      reorder_point: '',
      unit_cost: '',
      selling_price: ''
    });
    setNdcValidation(null);
    setAddInventoryOpen(true);
  };

  const handleNdcBlur = (code: string) => {
    if (!code || !code.trim()) {
      setNdcValidation(null);
      return;
    }
    const result = validateNDC(code);
    setNdcValidation(result);
    if (result.valid && result.formatted && result.formatted !== code) {
      setInventoryForm((prev) => ({ ...prev, ndc_number: result.formatted! }));
    }
  };

  const handleInventorySubmit = async () => {
    if (!user?.entity_id) return;

    if (!inventoryForm.drug_name.trim()) {
      toast.showError('Drug name is required.');
      return;
    }
    if (inventoryForm.ndc_number.trim() && !ndcValidation?.valid) {
      toast.showError('NDC code is invalid. Please correct it before saving.');
      return;
    }

    setInventorySubmitting(true);
    try {
      await dbHelpers.insert(collections.pharmacy_inventory, {
        entity_id: user.entity_id,
        drug_name: inventoryForm.drug_name.trim(),
        generic_name: inventoryForm.generic_name.trim() || undefined,
        ndc_number: ndcValidation?.formatted || inventoryForm.ndc_number.trim() || undefined,
        strength: inventoryForm.strength.trim() || undefined,
        dosage_form: inventoryForm.dosage_form,
        quantity_on_hand: Number(inventoryForm.quantity_on_hand) || 0,
        unit_of_measure: inventoryForm.unit_of_measure,
        minimum_stock_level: 0,
        maximum_stock_level: 0,
        reorder_point: Number(inventoryForm.reorder_point) || 0,
        unit_cost: Number(inventoryForm.unit_cost) || 0,
        selling_price: Number(inventoryForm.selling_price) || 0,
        lot_batches: [],
        is_active: true,
        is_controlled_substance: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      toast.showSuccess('Inventory item added successfully.');
      setAddInventoryOpen(false);
      loadInventory();
    } catch (err) {
      console.error('Failed to save inventory item:', err);
      toast.showError('Failed to save inventory item.');
    } finally {
      setInventorySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy Operations</h1>
          <p className="text-muted-foreground">
            Manage prescriptions, inventory, and dispensing
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prescriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRx.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringItems.length}</div>
            <p className="text-xs text-muted-foreground">Next 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Fills</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">24</div>
            <p className="text-xs text-muted-foreground">Dispensed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending Rx ({pendingRx.length})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock ({lowStockItems.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringItems.length})</TabsTrigger>
        </TabsList>

        {/* Pending Prescriptions */}
        <TabsContent value="pending" className="space-y-4">
          {filteredPendingRx.length > 0 ? (
            <div className="space-y-4">
              {filteredPendingRx.map((rx) => (
                <Card key={rx.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Pill className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">Rx #{rx.prescription_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            Patient: {rx.patient_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Prescribed: {new Date(rx.authored_on).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(rx.status)}
                        
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                          
                          <PrescriptionPrintButton rx={rx} />

                          <Button 
                            size="sm"
                            onClick={() => handleDispense(rx.id, {
                              patient_id: rx.patient_id,
                              medications: rx.medications.map(med => ({
                                drug_name: med.drug_name,
                                quantity_dispensed: parseInt(med.quantity) || 1
                              }))
                            })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Dispense
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium">Medications:</p>
                      <div className="mt-2 space-y-2">
                        {rx.medications?.map((med, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{med.drug_name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {med.strength} {med.form}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">Qty: {med.quantity}</p>
                              <p className="text-xs text-muted-foreground">{med.frequency}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending prescriptions</h3>
              <p className="text-muted-foreground">
                All prescriptions have been processed
              </p>
            </div>
          )}
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Drug Inventory ({inventory.length})</h3>
            {hasPermission(Permission.MANAGE_PHARMACY_INVENTORY) && (
              <Button onClick={handleOpenAddInventory}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>

          {inventory.length > 0 ? (
            <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-1
              [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded
              [&::-webkit-scrollbar-track]:bg-gray-100 [scrollbar-width:thin]">
              {inventory.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{item.drug_name}</h4>
                          {item.generic_name && (
                            <span className="text-xs text-muted-foreground">({item.generic_name})</span>
                          )}
                          {item.is_controlled_substance && (
                            <Badge variant="destructive" className="text-[10px]">Controlled ({item.controlled_schedule || 'C'})</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.strength} • {item.dosage_form}
                        </p>
                        {item.ndc_number && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            NDC: {item.ndc_number}
                          </p>
                        )}
                        <p className="text-sm mt-1">
                          On hand: <span className="font-medium">{item.quantity_on_hand} {item.unit_of_measure}</span>
                          {item.reorder_point ? ` • Reorder at: ${item.reorder_point}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {getStockStatus(item)}
                        {typeof item.selling_price === 'number' && item.selling_price > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ${item.selling_price.toFixed(2)} / {item.unit_of_measure}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No inventory items yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first drug to start tracking pharmacy stock.
              </p>
              {hasPermission(Permission.MANAGE_PHARMACY_INVENTORY) && (
                <Button onClick={handleOpenAddInventory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Low Stock */}
        <TabsContent value="low-stock" className="space-y-4">
          {lowStockItems.length > 0 ? (
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{item.drug_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.strength} • {item.dosage_form}
                        </p>
                        <p className="text-sm">
                          Current: {item.quantity_on_hand} {item.unit_of_measure}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {getStockStatus(item)}
                        <Button variant="outline" size="sm" className="mt-2">
                          <Truck className="h-3 w-3 mr-1" />
                          Reorder
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All items well stocked</h3>
              <p className="text-muted-foreground">
                No items currently below reorder point
              </p>
            </div>
          )}
        </TabsContent>

        {/* Expiring Items */}
        <TabsContent value="expiring" className="space-y-4">
          {expiringItems.length > 0 ? (
            <div className="space-y-4">
              {expiringItems.map((item) => (
                <Card key={item.inventory.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{item.inventory.drug_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.inventory.strength} • {item.inventory.dosage_form}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="destructive" className="mb-2">
                          Expires in {item.expiring_batches[0]?.days_to_expiry} days
                        </Badge>
                        <p className="text-sm">
                          Lot: {item.expiring_batches[0]?.lot_number}
                        </p>
                        <p className="text-sm">
                          Qty: {item.expiring_batches[0]?.quantity}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No items expiring soon</h3>
              <p className="text-muted-foreground">
                All inventory has sufficient shelf life
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Inventory Dialog (NDC validated) */}
      <Dialog open={addInventoryOpen} onOpenChange={setAddInventoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Pharmacy Inventory Item</DialogTitle>
            <DialogDescription>
              Record a new drug in the pharmacy inventory. NDC is validated against the standard 5-4-2 / 5-4-1 / 5-3-2 segment formats.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-drug">Drug Name <span className="text-red-600">*</span></Label>
                <Input
                  id="inv-drug"
                  value={inventoryForm.drug_name}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, drug_name: e.target.value }))}
                  placeholder="e.g. Amoxicillin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-generic">Generic Name</Label>
                <Input
                  id="inv-generic"
                  value={inventoryForm.generic_name}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, generic_name: e.target.value }))}
                  placeholder="e.g. amoxicillin trihydrate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-ndc">NDC (National Drug Code)</Label>
                <div className="relative">
                  <Input
                    id="inv-ndc"
                    value={inventoryForm.ndc_number}
                    onChange={(e) => {
                      setInventoryForm((p) => ({ ...p, ndc_number: e.target.value }));
                      if (ndcValidation) setNdcValidation(null);
                    }}
                    onBlur={(e) => handleNdcBlur(e.target.value)}
                    placeholder="e.g. 00310-0701-30"
                    className={ndcValidation ? (ndcValidation.valid ? 'border-emerald-500 pr-9' : 'border-red-500 pr-9') : 'pr-9'}
                    aria-invalid={ndcValidation ? !ndcValidation.valid : undefined}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {ndcValidation?.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Valid NDC" />
                    ) : ndcValidation ? (
                      <XCircle className="h-4 w-4 text-red-600" aria-label="Invalid NDC" />
                    ) : null}
                  </span>
                </div>
                {ndcValidation?.valid && ndcValidation.formatted && (
                  <p className="text-xs text-emerald-700">Formatted: {ndcValidation.formatted}</p>
                )}
                {ndcValidation?.valid && ndcValidation.description && (
                  <p className="text-xs text-muted-foreground">{ndcValidation.description}</p>
                )}
                {ndcValidation && !ndcValidation.valid && (
                  <p className="text-xs text-red-600">
                    Invalid NDC. Expected a 5-4-2, 5-4-1, or 5-3-2 segment format (e.g. 00310-0701-30).
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-strength">Strength</Label>
                <Input
                  id="inv-strength"
                  value={inventoryForm.strength}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, strength: e.target.value }))}
                  placeholder="e.g. 500 mg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-form">Dosage Form</Label>
                <select
                  id="inv-form"
                  value={inventoryForm.dosage_form}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, dosage_form: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="liquid">Liquid</option>
                  <option value="injection">Injection</option>
                  <option value="cream">Cream</option>
                  <option value="ointment">Ointment</option>
                  <option value="drops">Drops</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="suppository">Suppository</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-qty">Quantity On Hand</Label>
                <Input
                  id="inv-qty"
                  type="number"
                  min="0"
                  value={inventoryForm.quantity_on_hand}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, quantity_on_hand: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-uom">Unit of Measure</Label>
                <Input
                  id="inv-uom"
                  value={inventoryForm.unit_of_measure}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, unit_of_measure: e.target.value }))}
                  placeholder="tablets"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-reorder">Reorder Point</Label>
                <Input
                  id="inv-reorder"
                  type="number"
                  min="0"
                  value={inventoryForm.reorder_point}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, reorder_point: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-cost">Unit Cost ($)</Label>
                <Input
                  id="inv-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={inventoryForm.unit_cost}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, unit_cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-price">Selling Price ($)</Label>
                <Input
                  id="inv-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={inventoryForm.selling_price}
                  onChange={(e) => setInventoryForm((p) => ({ ...p, selling_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddInventoryOpen(false)}
              disabled={inventorySubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleInventorySubmit} disabled={inventorySubmitting}>
              {inventorySubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}