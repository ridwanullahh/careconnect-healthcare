// Bed Management Page - HMS Bed and Ward Operations
import React, { useState, useEffect, useMemo } from 'react';
import { useToastService } from '../../lib/toast-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { BedService } from '@/lib/bed-management';
import { getEntity } from '@/lib/entities';
import { githubDB as dbHelpers, collections } from '@/lib/database';
import { generateBedOccupancyReport } from '@/lib/hms-print-templates';
import PrintButton from '@/components/hms/PrintButton';
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
  BarChart3,
  Printer,
  Loader2,
  Calendar
} from 'lucide-react';

export default function BedManagementPage() {
  const { user, hasPermission } = useAuth();
  const toast = useToastService();
  const [beds, setBeds] = useState([]);
  const [occupancyStats, setOccupancyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWard, setSelectedWard] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityInfo, setEntityInfo] = useState<any>(null);
  // Reports state
  const [reportBeds, setReportBeds] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string>('');
  const [reportDateFrom, setReportDateFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportDateTo, setReportDateTo] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user?.entity_id) {
      loadBedData();
      loadEntityInfo();
    }
  }, [user?.entity_id, selectedWard]);

  // Load bed data when the Reports tab is opened.
  useEffect(() => {
    if (activeTab === 'reports' && user?.entity_id) {
      loadReportBeds();
    }
  }, [activeTab, user?.entity_id]);

  const loadEntityInfo = async () => {
    if (!user?.entity_id) return;
    try {
      const ent = await getEntity(user.entity_id);
      setEntityInfo(ent);
    } catch (e) {
      setEntityInfo(null);
    }
  };

  const loadReportBeds = async () => {
    if (!user?.entity_id) return;
    setReportLoading(true);
    setReportError('');
    try {
      const allBeds = await dbHelpers.find(collections.bed_management, { entity_id: user.entity_id });
      setReportBeds(Array.isArray(allBeds) ? allBeds : []);
    } catch (err) {
      console.error('Failed to load bed report data:', err);
      setReportError('Failed to load bed occupancy data. Please try again.');
      setReportBeds([]);
    } finally {
      setReportLoading(false);
    }
  };

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
      return await dbHelpers.find(collections.bed_management, { entity_id: entityId });
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
    const wards = [...new Set(beds.map((bed: any) => bed.ward).filter(Boolean))];
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
          <BedOccupancyReport
            beds={reportBeds}
            loading={reportLoading}
            error={reportError}
            entityInfo={entityInfo}
            dateFrom={reportDateFrom}
            dateTo={reportDateTo}
            onDateFromChange={setReportDateFrom}
            onDateToChange={setReportDateTo}
            onRefresh={loadReportBeds}
            hasManagePermission={!!hasPermission(Permission.MANAGE_BEDS)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bed Occupancy Report (Reports tab)
// ---------------------------------------------------------------------------

interface BedOccupancyReportProps {
  beds: any[];
  loading: boolean;
  error: string;
  entityInfo: any;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onRefresh: () => void;
  hasManagePermission: boolean;
}

const BedOccupancyReport: React.FC<BedOccupancyReportProps> = ({
  beds,
  loading,
  error,
  entityInfo,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onRefresh,
  hasManagePermission
}) => {
  // Compute aggregate stats and breakdowns from the beds array.
  const stats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const available = beds.filter((b) => b.status === 'available').length;
    const cleaning = beds.filter((b) => b.status === 'cleaning').length;
    const maintenance = beds.filter(
      (b) => b.status === 'maintenance' || b.status === 'out_of_service'
    ).length;
    const reserved = beds.filter((b) => b.status === 'reserved').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Breakdown by ward
    const wardMap = new Map<string, { total: number; occupied: number; available: number; maintenance: number }>();
    for (const b of beds) {
      const ward = b.ward || 'Unassigned';
      const cur = wardMap.get(ward) || { total: 0, occupied: 0, available: 0, maintenance: 0 };
      cur.total += 1;
      if (b.status === 'occupied') cur.occupied += 1;
      else if (b.status === 'available') cur.available += 1;
      else if (b.status === 'maintenance' || b.status === 'out_of_service') cur.maintenance += 1;
      wardMap.set(ward, cur);
    }
    const byWard = Array.from(wardMap.entries())
      .map(([ward, s]) => ({
        ward,
        total: s.total,
        occupied: s.occupied,
        available: s.available,
        maintenance: s.maintenance,
        occupancyRate: s.total > 0 ? Math.round((s.occupied / s.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Breakdown by bed type
    const typeMap = new Map<string, { total: number; occupied: number; available: number }>();
    for (const b of beds) {
      const t = b.bed_type || 'regular';
      const cur = typeMap.get(t) || { total: 0, occupied: 0, available: 0 };
      cur.total += 1;
      if (b.status === 'occupied') cur.occupied += 1;
      else if (b.status === 'available') cur.available += 1;
      typeMap.set(t, cur);
    }
    const byBedType = Array.from(typeMap.entries())
      .map(([bedType, s]) => ({
        bedType,
        total: s.total,
        occupied: s.occupied,
        available: s.available
      }))
      .sort((a, b) => b.total - a.total);

    return { total, occupied, available, cleaning, maintenance, reserved, occupancyRate, byWard, byBedType };
  }, [beds]);

  const facilityName = entityInfo?.name || 'CareConnect Health Facility';

  // Build the printable HTML for the report (memoized so PrintButton doesn't re-render unnecessarily).
  const reportHtml = useMemo(() => {
    if (stats.total === 0) return '';
    return generateBedOccupancyReport(
      {
        facilityName,
        generatedAt: new Date().toISOString(),
        dateRangeStart: dateFrom,
        dateRangeEnd: dateTo,
        totalBeds: stats.total,
        occupied: stats.occupied,
        available: stats.available,
        maintenance: stats.maintenance,
        cleaning: stats.cleaning,
        reserved: stats.reserved,
        occupancyRate: stats.occupancyRate,
        byWard: stats.byWard,
        byBedType: stats.byBedType
      },
      {
        name: facilityName,
        type: entityInfo?.entity_type ? String(entityInfo.entity_type).replace(/_/g, ' ') : undefined,
        address: entityInfo?.address,
        phone: entityInfo?.phone,
        email: entityInfo?.email,
        website: entityInfo?.website
      }
    );
  }, [stats, facilityName, entityInfo, dateFrom, dateTo]);

  const occupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Bed Occupancy Report</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="report-from" className="sr-only">From date</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
                <span className="text-xs text-muted-foreground px-1">to</span>
                <Label htmlFor="report-to" className="sr-only">To date</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <BarChart3 className="h-3 w-3 mr-1" />}
                Refresh
              </Button>
              {reportHtml && (
                <PrintButton
                  html={reportHtml}
                  filename={`bed-occupancy-report-${dateFrom}-to-${dateTo}.html`}
                  label="Print Report"
                />
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Snapshot of bed status across all wards. Reporting period: {dateFrom} to {dateTo}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={onRefresh} disabled={loading}>
                  Retry
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading bed data...</span>
            </div>
          ) : stats.total === 0 ? (
            <div className="text-center py-12">
              <Bed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No beds recorded</h3>
              <p className="text-muted-foreground">
                Add beds to the system to see occupancy analytics here.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total Beds</div>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{stats.occupied}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Occupied</div>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{stats.available}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Available</div>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{stats.cleaning}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Cleaning</div>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{stats.maintenance}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Maintenance</div>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
                  <div className={`text-2xl font-bold ${occupancyColor(stats.occupancyRate)}`}>{stats.occupancyRate}%</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Occupancy</div>
                </div>
              </div>

              {/* Occupancy bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">Overall Occupancy</span>
                  <span className={`text-sm font-bold ${occupancyColor(stats.occupancyRate)}`}>{stats.occupancyRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={stats.occupancyRate} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={`h-3 rounded-full transition-all ${
                      stats.occupancyRate >= 90 ? 'bg-red-500' : stats.occupancyRate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${stats.occupancyRate}%` }}
                  />
                </div>
              </div>

              {/* Breakdown by Ward */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-slate-800">Breakdown by Ward</h4>
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Ward</th>
                        <th className="text-center px-3 py-2 font-semibold">Total</th>
                        <th className="text-center px-3 py-2 font-semibold">Occupied</th>
                        <th className="text-center px-3 py-2 font-semibold">Available</th>
                        <th className="text-center px-3 py-2 font-semibold">Maintenance</th>
                        <th className="text-center px-3 py-2 font-semibold">Occupancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.byWard.map((w) => (
                        <tr key={w.ward} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{w.ward}</td>
                          <td className="px-3 py-2 text-center">{w.total}</td>
                          <td className="px-3 py-2 text-center text-amber-700">{w.occupied}</td>
                          <td className="px-3 py-2 text-center text-emerald-700">{w.available}</td>
                          <td className="px-3 py-2 text-center text-red-700">{w.maintenance}</td>
                          <td className={`px-3 py-2 text-center font-bold ${occupancyColor(w.occupancyRate)}`}>{w.occupancyRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Breakdown by Bed Type */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-slate-800">Breakdown by Bed Type</h4>
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Bed Type</th>
                        <th className="text-center px-3 py-2 font-semibold">Total</th>
                        <th className="text-center px-3 py-2 font-semibold">Occupied</th>
                        <th className="text-center px-3 py-2 font-semibold">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.byBedType.map((t) => (
                        <tr key={t.bedType} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-slate-800 capitalize">{t.bedType.replace(/_/g, ' ')}</td>
                          <td className="px-3 py-2 text-center">{t.total}</td>
                          <td className="px-3 py-2 text-center text-amber-700">{t.occupied}</td>
                          <td className="px-3 py-2 text-center text-emerald-700">{t.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!hasManagePermission && (
                <p className="text-xs text-muted-foreground italic">
                  You have view-only access to bed reports. Contact an administrator to manage beds.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};