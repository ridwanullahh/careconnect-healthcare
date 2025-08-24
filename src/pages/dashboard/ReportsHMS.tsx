// HMS Reports Page - Operational and Clinical Analytics
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { EncounterService } from '@/lib/encounters';
import { LabService } from '@/lib/labs';
import { MedicationService } from '@/lib/medications';
import { BedService } from '@/lib/bed-management';
import { BillingService } from '@/lib/billing';
import { ReferralService } from '@/lib/referrals';
import {
  BarChart3,
  Activity,
  TestTube,
  Pill,
  Bed,
  DollarSign,
  Users,
  Calendar,
  Search
} from 'lucide-react';

export default function ReportsHMS() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState<string>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [encounterStats, setEncounterStats] = useState<any>(null);
  const [labStats, setLabStats] = useState<any>(null);
  const [medStats, setMedStats] = useState<any>(null);
  const [bedStats, setBedStats] = useState<any>(null);
  const [billingSummary, setBillingSummary] = useState<any>(null);
  const [referralStats, setReferralStats] = useState<any>(null);

  const range = useMemo(() => ({
    start: new Date(dateFrom).toISOString(),
    end: new Date(new Date(dateTo).getTime() + 24 * 60 * 60 * 1000).toISOString()
  }), [dateFrom, dateTo]);

  useEffect(() => {
    if (!user?.entity_id) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.entity_id, range.start, range.end]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [enc, lab, med, ward, bill, ref] = await Promise.all([
        EncounterService.getEncounterStats(user!.entity_id, range.start, range.end),
        LabService.getLabStats(user!.entity_id, range.start, range.end),
        MedicationService.getMedicationStats(user!.entity_id, range.start, range.end),
        BedService.getWardOccupancy(user!.entity_id),
        BillingService.getBillingSummary(user!.entity_id, range.start, range.end),
        ReferralService.getReferralStats(user!.entity_id, range.start, range.end)
      ]);
      setEncounterStats(enc);
      setLabStats(lab);
      setMedStats(med);
      setBedStats(ward);
      setBillingSummary(bill);
      setReferralStats(ref);
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  const statCard = (title: string, value: React.ReactNode, icon: React.ReactNode, desc?: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">HMS Reports</h1>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Button onClick={loadAll}><Search className="h-4 w-4 mr-2" /> Refresh</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="h-24 animate-pulse" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HMS Reports</h1>
          <p className="text-muted-foreground">Operational and clinical analytics for your facility</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button onClick={loadAll}><Search className="h-4 w-4 mr-2" /> Refresh</Button>
        </div>
      </div>

      {/* Overview KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {statCard('Encounters', encounterStats?.total ?? 0, <Activity className="h-4 w-4 text-muted-foreground" />)}
        {statCard('Avg Duration', `${Math.round(encounterStats?.average_duration ?? 0)}m`, <Calendar className="h-4 w-4 text-muted-foreground" />, 'Completed encounters')}
        {statCard('No-Show Rate', `${Math.round(encounterStats?.no_show_rate ?? 0)}%`, <Users className="h-4 w-4 text-muted-foreground" />)}
        {statCard('Lab Orders', labStats?.total_orders ?? 0, <TestTube className="h-4 w-4 text-muted-foreground" />)}
        {statCard('Critical Results', labStats?.critical_results ?? 0, <AlertTriangle className="h-4 w-4 text-muted-foreground" />)}
        {statCard('Prescriptions', medStats?.total_prescriptions ?? 0, <Pill className="h-4 w-4 text-muted-foreground" />)}
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="encounters">Encounters</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bed className="h-5 w-5" /> Bed Occupancy</CardTitle>
              <CardDescription>Current bed status by type</CardDescription>
            </CardHeader>
            <CardContent>
              {bedStats ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Beds</span>
                      <span className="font-medium">{bedStats.total_beds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Occupied</span>
                      <span className="font-medium text-blue-600">{bedStats.occupied_beds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available</span>
                      <span className="font-medium text-green-600">{bedStats.available_beds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cleaning</span>
                      <span className="font-medium text-yellow-600">{bedStats.cleaning_beds}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(bedStats.by_type || {}).map(([type, data]: any) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-medium">{data.occupied}/{data.total} ({Math.round((data.occupied / data.total) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No bed data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encounters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Encounter Breakdown</CardTitle>
              <CardDescription>Volume by type and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">By Type</h4>
                  <div className="space-y-1">
                    {Object.entries(encounterStats?.by_type || {}).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">By Status</h4>
                  <div className="space-y-1">
                    {Object.entries(encounterStats?.by_status || {}).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace('_', ' ')}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lab Performance</CardTitle>
              <CardDescription>Orders and turnaround times</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm">Total Orders</div>
                  <div className="text-xl font-bold">{labStats?.total_orders ?? 0}</div>
                </div>
                <div>
                  <div className="text-sm">Completed</div>
                  <div className="text-xl font-bold">{labStats?.completed_orders ?? 0}</div>
                </div>
                <div>
                  <div className="text-sm">Avg TAT (hrs)</div>
                  <div className="text-xl font-bold">{Math.round(labStats?.average_turnaround_time ?? 0)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prescription Insights</CardTitle>
              <CardDescription>Medication orders and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">By Status</h4>
                  <div className="space-y-1">
                    {Object.entries(medStats?.by_status || {}).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace('_', ' ')}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Medications</h4>
                  <div className="space-y-1">
                    {medStats?.most_prescribed?.slice(0, 10).map((m: any) => (
                      <div key={m.drug_name} className="flex justify-between">
                        <span>{m.drug_name}</span>
                        <Badge variant="outline">{m.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Financial Summary</CardTitle>
              <CardDescription>Revenue and collections</CardDescription>
            </CardHeader>
            <CardContent>
              {billingSummary ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Total Invoices</span><span className="font-medium">{billingSummary.total_invoices}</span></div>
                    <div className="flex justify-between"><span>Total Amount</span><span className="font-medium">${billingSummary.total_amount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Amount Paid</span><span className="font-medium text-green-600">${billingSummary.amount_paid.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Outstanding</span><span className="font-medium text-orange-600">${billingSummary.outstanding_amount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Overdue</span><span className="font-medium text-red-600">${billingSummary.overdue_amount.toFixed(2)}</span></div>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(billingSummary.by_status || {}).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace('_', ' ')}</span>
                        <span className="font-medium">{v.count} invoices</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No finance data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}