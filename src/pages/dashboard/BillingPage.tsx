// Billing Management Page - HMS Billing Operations
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, Permission } from '@/lib/auth';
import { BillingService } from '@/lib/billing';
import { 
  DollarSign, 
  Plus, 
  Search, 
  FileText, 
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Send
} from 'lucide-react';

export default function BillingPage() {
  const { user, hasPermission } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [claims, setClaims] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.entity_id) {
      loadBillingData();
    }
  }, [user?.entity_id]);

  const loadBillingData = async () => {
    if (!user?.entity_id) return;

    try {
      setLoading(true);
      
      // Get date range for current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      const [summary] = await Promise.all([
        BillingService.getBillingSummary(user.entity_id, startDate, endDate)
      ]);
      
      setBillingSummary(summary);
      
      // Mock data for demo - in real implementation would come from BillingService
      setInvoices([
        {
          id: '1',
          invoice_number: 'INV-2024-001',
          patient_id: 'PT001',
          total_amount: 450.00,
          amount_paid: 450.00,
          balance_due: 0.00,
          status: 'paid',
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          invoice_number: 'INV-2024-002',
          patient_id: 'PT002',
          total_amount: 750.00,
          amount_paid: 0.00,
          balance_due: 750.00,
          status: 'sent',
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
      
      setClaims([
        {
          id: '1',
          claim_number: 'CLM-2024-001',
          patient_id: 'PT001',
          claimed_amount: 450.00,
          approved_amount: 450.00,
          status: 'paid',
          insurance_provider: 'Blue Cross Blue Shield',
          submission_date: new Date().toISOString()
        }
      ]);
      
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    const variants = {
      'draft': { variant: 'secondary', color: 'text-gray-600' },
      'sent': { variant: 'default', color: 'text-blue-600' },
      'paid': { variant: 'outline', color: 'text-green-600' },
      'partially_paid': { variant: 'secondary', color: 'text-yellow-600' },
      'overdue': { variant: 'destructive', color: 'text-red-600' },
      'cancelled': { variant: 'destructive', color: 'text-red-600' }
    };
    
    const config = variants[status] || variants['draft'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getClaimStatusBadge = (status: string) => {
    const variants = {
      'draft': { variant: 'secondary', color: 'text-gray-600' },
      'submitted': { variant: 'default', color: 'text-blue-600' },
      'pending': { variant: 'secondary', color: 'text-orange-600' },
      'approved': { variant: 'outline', color: 'text-green-600' },
      'denied': { variant: 'destructive', color: 'text-red-600' },
      'paid': { variant: 'outline', color: 'text-green-600' }
    };
    
    const config = variants[status] || variants['draft'];
    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredInvoices = invoices.filter((invoice: any) => 
    !searchQuery || 
    invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClaims = claims.filter((claim: any) => 
    !searchQuery || 
    claim.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-3xl font-bold tracking-tight">Billing & Claims</h1>
          <p className="text-muted-foreground">
            Manage invoices, payments, and insurance claims
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices/claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {hasPermission(Permission.PROCESS_BILLING) && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {billingSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(billingSummary.total_amount)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(billingSummary.amount_paid)}</div>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(billingSummary.outstanding_amount)}</div>
              <p className="text-xs text-muted-foreground">Pending payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(billingSummary.overdue_amount)}</div>
              <p className="text-xs text-muted-foreground">Past due</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="claims">Insurance Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-4">
          {filteredInvoices.length > 0 ? (
            <div className="space-y-4">
              {filteredInvoices.map((invoice: any) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{invoice.invoice_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            Patient: {invoice.patient_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Date: {new Date(invoice.invoice_date).toLocaleDateString()} • 
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="mb-2">
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(invoice.total_amount)}</p>
                        {invoice.balance_due > 0 && (
                          <p className="text-sm text-red-600">
                            Balance: {formatCurrency(invoice.balance_due)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total:</span> {formatCurrency(invoice.total_amount)}
                      </div>
                      <div>
                        <span className="font-medium">Paid:</span> {formatCurrency(invoice.amount_paid)}
                      </div>
                      <div>
                        <span className="font-medium">Balance:</span> {formatCurrency(invoice.balance_due)}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      
                      {invoice.status === 'draft' && (
                        <Button size="sm">
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                      )}
                      
                      {invoice.balance_due > 0 && (
                        <Button size="sm">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No invoices found</h3>
              <p className="text-muted-foreground mb-4">
                No invoices match your search criteria
              </p>
              {hasPermission(Permission.PROCESS_BILLING) && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Invoice
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Insurance Claims */}
        <TabsContent value="claims" className="space-y-4">
          {filteredClaims.length > 0 ? (
            <div className="space-y-4">
              {filteredClaims.map((claim: any) => (
                <Card key={claim.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{claim.claim_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            Patient: {claim.patient_id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {claim.insurance_provider}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {new Date(claim.submission_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="mb-2">
                          {getClaimStatusBadge(claim.status)}
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(claim.claimed_amount)}</p>
                        {claim.approved_amount && (
                          <p className="text-sm text-green-600">
                            Approved: {formatCurrency(claim.approved_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Claimed:</span> {formatCurrency(claim.claimed_amount)}
                      </div>
                      <div>
                        <span className="font-medium">Approved:</span> {formatCurrency(claim.approved_amount || 0)}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {claim.status}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      
                      {claim.status === 'denied' && (
                        <Button size="sm">
                          <FileText className="h-3 w-3 mr-1" />
                          Appeal
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No insurance claims found</h3>
              <p className="text-muted-foreground mb-4">
                No claims match your search criteria
              </p>
              {hasPermission(Permission.MANAGE_INSURANCE_CLAIMS) && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Claim
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Reports</CardTitle>
                <CardDescription>Financial performance and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Monthly Revenue Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Accounts Receivable Aging
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Payment Collection Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Reports</CardTitle>
                <CardDescription>Claims processing and reimbursement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Claims Status Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Denial Analysis Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Payer Performance Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}