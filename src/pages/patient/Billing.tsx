// Patient Billing - Patient Portal Billing and Payments
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { PatientService } from '@/lib/patients';
import { githubDB } from '@/lib/database';
import { 
  FileText, 
  CreditCard, 
  DollarSign, 
  Download, 
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function Billing() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadBilling();
    }
  }, [user?.id]);

  const loadBilling = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const p = await PatientService.getPatientDetails(user.id, user.id);
      if (!p) throw new Error('Patient record not found');
      setPatient(p);

      // Load invoices and payments from githubDB by patient_id
      const [inv, pays] = await Promise.all([
        githubDB.find('invoices', { patient_id: p.id }),
        githubDB.find('payments', { patient_id: p.id })
      ]);

      // Sort newest first
      inv.sort((a: any, b: any) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
      pays.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

      setInvoices(inv);
      setPayments(pays);
    } catch (e) {
      console.error('Failed to load billing', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const getInvoiceStatusBadge = (status: string) => {
    const variants: any = {
      draft: { variant: 'secondary', className: 'text-gray-600' },
      sent: { variant: 'default', className: 'text-blue-600' },
      paid: { variant: 'outline', className: 'text-green-600' },
      partially_paid: { variant: 'secondary', className: 'text-yellow-600' },
      overdue: { variant: 'destructive', className: 'text-red-600' },
      cancelled: { variant: 'destructive', className: 'text-red-600' },
    };
    const cfg = variants[status] || variants.draft;
    return <Badge variant={cfg.variant} className={cfg.className}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const filteredInvoices = invoices.filter((inv) =>
    !searchQuery ||
    inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}><CardContent className="h-24" /></Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">View and manage your invoices and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground absolute ml-3 mt-3" />
          <Input
            placeholder="Search invoices by number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm">Amount Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(invoices.reduce((s, i) => s + (i.amount_paid || 0), 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm">Balance Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(invoices.reduce((s, i) => s + (i.balance_due || 0), 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm">Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your invoices listed by date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="font-medium">{inv.invoice_number}</div>
                  <div className="text-sm text-muted-foreground">
                    Date: {new Date(inv.invoice_date).toLocaleDateString()} • Due: {new Date(inv.due_date).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    Total: {formatCurrency(inv.total_amount)} • Paid: {formatCurrency(inv.amount_paid)} • Balance: {formatCurrency(inv.balance_due)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getInvoiceStatusBadge(inv.status)}
                  <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" /> Download</Button>
                  {inv.balance_due > 0 && (
                    <Button size="sm"><CreditCard className="h-3 w-3 mr-1" /> Pay</Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground">No invoices found</div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>History of payments you’ve made</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payments.length > 0 ? (
            payments.map((pmt) => (
              <div key={pmt.id} className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="font-medium">{formatCurrency(pmt.amount)} • {pmt.payment_method}</div>
                  <div className="text-sm text-muted-foreground">Date: {new Date(pmt.payment_date).toLocaleDateString()}</div>
                  {pmt.payment_reference && (
                    <div className="text-xs text-muted-foreground">Ref: {pmt.payment_reference}</div>
                  )}
                </div>
                <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" /> Receipt</Button>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground">No payments found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}