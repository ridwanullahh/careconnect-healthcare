// Bed Management Page - HMS Bed and Ward Operations
import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { BedService } from '@/lib/bed-management';
import { 
  Bed, 
  Plus, 
  Search, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Settings,
  BarChart3
} from 'lucide-react';

export default function BedManagementPage() {
  const { user, hasPermission } = useAuth();
  const [beds, setBeds] = useState([]);
  const [occupancyStats, setOccupancyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWard, setSelectedWard] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.entity_id) {
      loadBedData();
    }
  }, [user?.entity_id, selectedWard]);

  const loadBedData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      const [wardOccupancy, wardBeds] = await Promise.all([
        BedService.getWardOccupancy(user.entity_id, selectedWard === 'all' ? undefined : selectedWard),
        selectedWard === 'all' 
          ? await getBedsByEntity(user.entity_id)
          : BedService.getBedsByWard(user.entity_id, selectedWard)
      ]);
      
      setOccupancyStats(wardOccupancy);
      setBeds(wardBeds);
    } catch (error) {
      console.error('Failed to load bed data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBedsByEntity = async (entityId: string) => {
    // Fallback method to get all beds for entity
    try {
      return await githubDB.find('bed_management', { entity_id: entityId });
    } catch (error) {
      return [];
    }
  };

  const handleBedStatusChange = async (bedId: string, newStatus: string) => {
    if (!hasPermission(Permission.MANAGE_BEDS)) {
      toast.showSuccess('You do not have permission to manage beds');
      return;
    }

    try {
      switch (newStatus) {
        case 'available':
          await BedService.markBedAvailable(bedId, user?.id || '');
          break;
        case 'maintenance':
          await BedService.setBedMaintenance(bedId, 'Scheduled maintenance', user?.id || '');
          break;
        default:
          // Handle other status changes
          break;
      }
      loadBedData();
    } catch (error) {
      console.error('Failed to update bed status:', error);
      toast.showSuccess('Failed to update bed status');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'available': { variant: 'outline', color: 'text-green-600', icon: CheckCircle },
      'occupied': { variant: 'default', color: 'text-blue-600', icon: Users },
      'cleaning': { variant: 'secondary', color: 'text-yellow-600', icon: Settings },
      'maintenance': { variant: 'destructive', color: 'text-orange-600', icon: AlertTriangle },
      'reserved': { variant: 'secondary', color: 'text-purple-600', icon: Users },
      'out_of_service': { variant: 'destructive', color: 'text-red-600', icon: XCircle }
    };
    
    const config = variants[status] || variants['available'];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className={`${config.color} flex items-center space-x-1`}>
        <IconComponent className="h-3 w-3" />
        <span>{status.replace('_', ' ').toUpperCase()}</span>
      </Badge>
    );
  };

  const getBedTypeIcon = (bedType: string) => {
    const colors = {
      'regular': 'text-blue-500',
      'icu': 'text-red-500',
      'nicu': 'text-purple-500',
      'isolation': 'text-orange-500',
      'private': 'text-green-500',
      'semi_private': 'text-teal-500',
      'observation': 'text-gray-500'
    };
    
    return <Bed className={`h-5 w-5 ${colors[bedType] || colors['regular']}`} />;
  };

  const getUniqueWards = () => {
  const toast = useToastService();
    const wards = [...new Set(beds.map((bed: any) => bed.ward))];
    return wards.sort();
  };

  const filteredBeds = beds.filter((bed: any) => {
    const matchesSearch = !searchQuery || 
      bed.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bed.bed_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bed.ward.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const BedCard = ({ bed }: { bed: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getBedTypeIcon(bed.bed_type)}
            <div>
              <h3 className="font-medium">
                {bed.ward} - Room {bed.room_number}
              </h3>
              <p className="text-sm text-muted-foreground">
                Bed {bed.bed_number} • {bed.bed_type.replace('_', ' ')}
              </p>
            </div>
          </div>
          
          {getStatusBadge(bed.status)}
        </div>
        
        {bed.current_patient_id && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">Current Patient</p>
            <p className="text-sm text-muted-foreground">ID: {bed.current_patient_id}</p>
            {bed.occupied_since && (
              <p className="text-xs text-muted-foreground">
                Since: {new Date(bed.occupied_since).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
        
        {bed.features && bed.features.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Features:</p>
            <div className="flex flex-wrap gap-1">
              {bed.features.map((feature: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          {bed.status === 'cleaning' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleBedStatusChange(bed.id, 'available')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark Clean
            </Button>
          )}
          
          {bed.status === 'available' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleBedStatusChange(bed.id, 'maintenance')}
            >
              <Settings className="h-3 w-3 mr-1" />
              Maintenance
            </Button>
          )}
          
          {bed.status === 'occupied' && (
            <Button size="sm" variant="outline">
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Transfer
            </Button>
          )}
        </div>
        
        {bed.notes && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-muted-foreground">
            {bed.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const WardOverview = ({ wardName, wardBeds }: { wardName: string; wardBeds: any[] }) => {
    const wardStats = {
      total: wardBeds.length,
      available: wardBeds.filter(b => b.status === 'available').length,
      occupied: wardBeds.filter(b => b.status === 'occupied').length,
      cleaning: wardBeds.filter(b => b.status === 'cleaning').length,
      maintenance: wardBeds.filter(b => ['maintenance', 'out_of_service'].includes(b.status)).length
    };
    
    const occupancyRate = wardStats.total > 0 ? Math.round((wardStats.occupied / wardStats.total) * 100) : 0;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{wardName} Ward</span>
            <Badge variant="outline">{occupancyRate}% occupied</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{wardStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Beds</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{wardStats.available}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{wardStats.occupied}</div>
              <div className="text-xs text-muted-foreground">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{wardStats.cleaning}</div>
              <div className="text-xs text-muted-foreground">Cleaning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{wardStats.maintenance}</div>
              <div className="text-xs text-muted-foreground">Maintenance</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {wardBeds.slice(0, 8).map((bed) => (
              <div key={bed.id} className="text-center p-2 border rounded">
                <div className="flex items-center justify-center mb-1">
                  {getBedTypeIcon(bed.bed_type)}
                </div>
                <div className="text-xs font-medium">{bed.room_number}-{bed.bed_number}</div>
                <div className="text-xs">{getStatusBadge(bed.status)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
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
          <h1 className="text-3xl font-bold tracking-tight">Bed Management</h1>
          <p className="text-muted-foreground">
            Monitor bed occupancy and manage ward operations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedWard} 
            onChange={(e) => setSelectedWard(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="all">All Wards</option>
            {getUniqueWards().map((ward) => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {hasPermission(Permission.MANAGE_BEDS) && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Bed
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {occupancyStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyStats.total_beds}</div>
              <p className="text-xs text-muted-foreground">
                {selectedWard === 'all' ? 'All wards' : `${selectedWard} ward`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{occupancyStats.occupied_beds}</div>
              <p className="text-xs text-muted-foreground">
                {occupancyStats.occupancy_rate}% occupancy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{occupancyStats.available_beds}</div>
              <p className="text-xs text-muted-foreground">Ready for patients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{occupancyStats.maintenance_beds}</div>
              <p className="text-xs text-muted-foreground">Out of service</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Ward Overview</TabsTrigger>
          <TabsTrigger value="beds">Bed Details ({filteredBeds.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Ward Overview */}
        <TabsContent value="overview" className="space-y-4">
          {selectedWard === 'all' ? (
            <div className="space-y-4">
              {getUniqueWards().map((ward) => {
                const wardBeds = beds.filter((bed: any) => bed.ward === ward);
                return (
                  <WardOverview key={ward} wardName={ward} wardBeds={wardBeds} />
                );
              })}
            </div>
          ) : (
            <WardOverview wardName={selectedWard} wardBeds={filteredBeds} />
          )}
        </TabsContent>

        {/* Bed Details */}
        <TabsContent value="beds" className="space-y-4">
          {filteredBeds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBeds.map((bed: any) => (
                <BedCard key={bed.id} bed={bed} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No beds found</h3>
              <p className="text-muted-foreground mb-4">
                No beds match your current filter criteria
              </p>
              {hasPermission(Permission.MANAGE_BEDS) && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Bed
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Bed Management Reports</span>
              </CardTitle>
              <CardDescription>
                Occupancy trends and operational metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Reports Coming Soon</h3>
                <p className="text-muted-foreground">
                  Bed occupancy analytics and trending reports will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}