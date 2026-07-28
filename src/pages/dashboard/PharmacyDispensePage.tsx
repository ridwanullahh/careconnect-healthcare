// Pharmacy Dispense Page - HMS Pharmacy Operations
import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { PharmacyService } from '@/lib/pharmacy';
import { MedicationService } from '@/lib/medications';
import { 
  Pill, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Search,
  Plus,
  Eye,
  Truck,
  BarChart3
} from 'lucide-react';

export default function PharmacyDispensePage() {
  const { user, hasPermission } = useAuth();
  const [pendingRx, setPendingRx] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.entity_id) {
      loadPharmacyData();
    }
  }, [user?.entity_id]);

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
                        
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                          
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
            <h3 className="text-lg font-medium">Drug Inventory</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Inventory Management</h3>
            <p className="text-muted-foreground">
              Drug inventory will be displayed here
            </p>
          </div>
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
    </div>
  );
}