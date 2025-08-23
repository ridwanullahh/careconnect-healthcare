// Billing Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { EnhancedPaymentService } from './payments-enhanced';

// Billing Item Interface
export interface BillingItem {
  id: string;
  encounter_id: string;
  patient_id: string;
  entity_id: string;
  
  // Item details
  service_code?: string; // CPT code or internal code
  service_name: string;
  description?: string;
  category: 'consultation' | 'procedure' | 'diagnostic' | 'medication' | 'room_charge' | 'nursing' | 'other';
  
  // Pricing
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  
  // Provider
  provider_id?: string;
  department?: string;
  
  // Dates
  service_date: string;
  
  // Status
  status: 'pending' | 'approved' | 'disputed' | 'cancelled';
  
  // Notes
  notes?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Invoice Interface
export interface Invoice {
  id: string;
  encounter_id: string;
  patient_id: string;
  entity_id: string;
  
  // Invoice details
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  
  // Items
  billing_items: BillingItem[];
  
  // Totals
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'disputed';
  
  // Insurance
  insurance_claim_id?: string;
  insurance_amount?: number;
  patient_responsibility?: number;
  
  // Notes
  notes?: string;
  payment_terms?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Insurance Claim Interface
export interface InsuranceClaim {
  id: string;
  patient_id: string;
  entity_id: string;
  encounter_id: string;
  invoice_id?: string;
  
  // Claim details
  claim_number: string;
  claim_type: 'medical' | 'pharmacy' | 'dental' | 'vision' | 'mental_health';
  
  // Insurance info
  insurance_provider: string;
  policy_number: string;
  group_number?: string;
  member_id: string;
  
  // Claim amounts
  claimed_amount: number;
  approved_amount?: number;
  paid_amount?: number;
  denied_amount?: number;
  patient_responsibility?: number;
  
  // Status tracking
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'denied' | 'paid' | 'appealed';
  submission_date?: string;
  response_date?: string;
  payment_date?: string;
  
  // Response details
  denial_reason?: string;
  explanation_of_benefits?: string;
  
  // Services
  services: Array<{
    service_code: string;
    service_name: string;
    service_date: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    claimed_amount: number;
    approved_amount?: number;
    denied_amount?: number;
  }>;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class BillingService {
  
  // Add billing item to encounter
  static async addBillingItem(itemData: {
    encounter_id: string;
    patient_id: string;
    entity_id: string;
    service_code?: string;
    service_name: string;
    description?: string;
    category: BillingItem['category'];
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_rate?: number;
    provider_id?: string;
    department?: string;
    service_date?: string;
    notes?: string;
    created_by: string;
  }): Promise<BillingItem> {
    try {
      const discountAmount = itemData.discount_amount || 0;
      const subtotal = itemData.quantity * itemData.unit_price;
      const discountedAmount = subtotal - discountAmount;
      const taxAmount = discountedAmount * (itemData.tax_rate || 0) / 100;
      const totalAmount = discountedAmount + taxAmount;
      
      const billingItem = await githubDB.insert(collections.billing_items, {
        encounter_id: itemData.encounter_id,
        patient_id: itemData.patient_id,
        entity_id: itemData.entity_id,
        service_code: itemData.service_code,
        service_name: itemData.service_name,
        description: itemData.description,
        category: itemData.category,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        provider_id: itemData.provider_id,
        department: itemData.department,
        service_date: itemData.service_date || new Date().toISOString(),
        status: 'pending',
        notes: itemData.notes,
        created_by: itemData.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('billing_item_added', billingItem.id, itemData.created_by);
      
      logger.info('billing_item_added', 'Billing item added successfully', {
        item_id: billingItem.id,
        encounter_id: itemData.encounter_id,
        service_name: itemData.service_name,
        total_amount: totalAmount
      });
      
      return billingItem;
    } catch (error) {
      logger.error('billing_item_add_failed', 'Failed to add billing item', { error: error.message });
      throw error;
    }
  }
  
  // Generate invoice for encounter
  static async generateInvoice(encounterData: {
    encounter_id: string;
    patient_id: string;
    entity_id: string;
    due_days?: number;
    payment_terms?: string;
    notes?: string;
    created_by: string;
  }): Promise<Invoice> {
    try {
      // Get all approved billing items for the encounter
      const billingItems = await githubDB.find(collections.billing_items, {
        encounter_id: encounterData.encounter_id,
        status: 'approved'
      });
      
      if (billingItems.length === 0) {
        throw new Error('No approved billing items found for encounter');
      }
      
      // Calculate totals
      const subtotal = billingItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const discountTotal = billingItems.reduce((sum, item) => sum + item.discount_amount, 0);
      const taxTotal = billingItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const totalAmount = subtotal - discountTotal + taxTotal;
      
      const invoiceNumber = await this.generateInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (encounterData.due_days || 30));
      
      const invoice = await githubDB.insert(collections.invoices, {
        encounter_id: encounterData.encounter_id,
        patient_id: encounterData.patient_id,
        entity_id: encounterData.entity_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        due_date: dueDate.toISOString(),
        billing_items: billingItems,
        subtotal: subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        total_amount: totalAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        status: 'draft',
        payment_terms: encounterData.payment_terms || 'Net 30',
        notes: encounterData.notes,
        created_by: encounterData.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('invoice_generated', invoice.id, encounterData.created_by);
      
      logger.info('invoice_generated', 'Invoice generated successfully', {
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        total_amount: totalAmount
      });
      
      return invoice;
    } catch (error) {
      logger.error('invoice_generation_failed', 'Failed to generate invoice', { error: error.message });
      throw error;
    }
  }
  
  // Send invoice
  static async sendInvoice(invoiceId: string, sentBy: string): Promise<Invoice> {
    try {
      const invoice = await githubDB.update(collections.invoices, invoiceId, {
        status: 'sent',
        updated_at: new Date().toISOString()
      });
      
      // Create payment intent
      await EnhancedPaymentService.createPaymentIntent({
        amount: invoice.total_amount,
        currency: 'USD',
        metadata: {
          type: 'invoice_payment',
          invoice_id: invoiceId,
          patient_id: invoice.patient_id,
          entity_id: invoice.entity_id
        },
        description: `Invoice ${invoice.invoice_number} payment`
      });
      
      await this.logAuditEvent('invoice_sent', invoiceId, sentBy);
      
      return invoice;
    } catch (error) {
      logger.error('invoice_send_failed', 'Failed to send invoice', { 
        invoice_id: invoiceId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Record payment
  static async recordPayment(invoiceId: string, paymentData: {
    amount: number;
    payment_method: string;
    payment_reference?: string;
    payment_date?: string;
    notes?: string;
    recorded_by: string;
  }): Promise<Invoice> {
    try {
      const invoice = await githubDB.findById(collections.invoices, invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      
      const newAmountPaid = invoice.amount_paid + paymentData.amount;
      const newBalanceDue = invoice.total_amount - newAmountPaid;
      
      let newStatus = invoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partially_paid';
      }
      
      const updatedInvoice = await githubDB.update(collections.invoices, invoiceId, {
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // Record payment transaction
      await githubDB.insert(collections.payments, {
        invoice_id: invoiceId,
        patient_id: invoice.patient_id,
        entity_id: invoice.entity_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference,
        payment_date: paymentData.payment_date || new Date().toISOString(),
        status: 'completed',
        notes: paymentData.notes,
        recorded_by: paymentData.recorded_by,
        created_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('payment_recorded', invoiceId, paymentData.recorded_by, {
        amount: paymentData.amount,
        payment_method: paymentData.payment_method
      });
      
      return updatedInvoice;
    } catch (error) {
      logger.error('payment_record_failed', 'Failed to record payment', { 
        invoice_id: invoiceId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Create insurance claim
  static async createInsuranceClaim(claimData: {
    patient_id: string;
    entity_id: string;
    encounter_id: string;
    invoice_id?: string;
    claim_type: InsuranceClaim['claim_type'];
    insurance_provider: string;
    policy_number: string;
    group_number?: string;
    member_id: string;
    services: InsuranceClaim['services'];
    notes?: string;
    created_by: string;
  }): Promise<InsuranceClaim> {
    try {
      const claimNumber = await this.generateClaimNumber();
      const claimedAmount = claimData.services.reduce((sum, service) => sum + service.claimed_amount, 0);
      
      const claim = await githubDB.insert(collections.insurance_claims, {
        ...claimData,
        claim_number: claimNumber,
        claimed_amount: claimedAmount,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('insurance_claim_created', claim.id, claimData.created_by);
      
      logger.info('insurance_claim_created', 'Insurance claim created successfully', {
        claim_id: claim.id,
        claim_number: claimNumber,
        claimed_amount: claimedAmount
      });
      
      return claim;
    } catch (error) {
      logger.error('insurance_claim_creation_failed', 'Failed to create insurance claim', { error: error.message });
      throw error;
    }
  }
  
  // Submit insurance claim
  static async submitInsuranceClaim(claimId: string, submittedBy: string): Promise<InsuranceClaim> {
    try {
      const claim = await githubDB.update(collections.insurance_claims, claimId, {
        status: 'submitted',
        submission_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('insurance_claim_submitted', claimId, submittedBy);
      
      return claim;
    } catch (error) {
      logger.error('insurance_claim_submit_failed', 'Failed to submit insurance claim', { 
        claim_id: claimId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Process insurance claim response
  static async processClaimResponse(claimId: string, responseData: {
    status: 'approved' | 'denied' | 'paid';
    approved_amount?: number;
    paid_amount?: number;
    denied_amount?: number;
    patient_responsibility?: number;
    denial_reason?: string;
    explanation_of_benefits?: string;
    service_adjustments?: Array<{
      service_code: string;
      approved_amount?: number;
      denied_amount?: number;
    }>;
    processed_by: string;
  }): Promise<InsuranceClaim> {
    try {
      const claim = await githubDB.findById(collections.insurance_claims, claimId);
      if (!claim) throw new Error('Insurance claim not found');
      
      // Update service amounts if provided
      let updatedServices = claim.services;
      if (responseData.service_adjustments) {
        updatedServices = claim.services.map(service => {
          const adjustment = responseData.service_adjustments?.find(adj => adj.service_code === service.service_code);
          if (adjustment) {
            return {
              ...service,
              approved_amount: adjustment.approved_amount,
              denied_amount: adjustment.denied_amount
            };
          }
          return service;
        });
      }
      
      const updatedClaim = await githubDB.update(collections.insurance_claims, claimId, {
        status: responseData.status,
        approved_amount: responseData.approved_amount,
        paid_amount: responseData.paid_amount,
        denied_amount: responseData.denied_amount,
        patient_responsibility: responseData.patient_responsibility,
        denial_reason: responseData.denial_reason,
        explanation_of_benefits: responseData.explanation_of_benefits,
        services: updatedServices,
        response_date: new Date().toISOString(),
        payment_date: responseData.status === 'paid' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('insurance_claim_processed', claimId, responseData.processed_by, {
        status: responseData.status,
        approved_amount: responseData.approved_amount
      });
      
      return updatedClaim;
    } catch (error) {
      logger.error('insurance_claim_process_failed', 'Failed to process insurance claim', { 
        claim_id: claimId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get entity billing summary
  static async getBillingSummary(entityId: string, startDate: string, endDate: string): Promise<{
    total_invoices: number;
    total_amount: number;
    amount_paid: number;
    outstanding_amount: number;
    overdue_amount: number;
    insurance_pending: number;
    by_status: { [key: string]: { count: number; amount: number } };
  }> {
    try {
      let invoices = await githubDB.find(collections.invoices, { entity_id: entityId });
      
      // Filter by date range
      invoices = invoices.filter(invoice => {
        const invoiceDate = invoice.invoice_date;
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });
      
      const summary = {
        total_invoices: invoices.length,
        total_amount: 0,
        amount_paid: 0,
        outstanding_amount: 0,
        overdue_amount: 0,
        insurance_pending: 0,
        by_status: {} as { [key: string]: { count: number; amount: number } }
      };
      
      const now = new Date();
      
      invoices.forEach(invoice => {
        summary.total_amount += invoice.total_amount;
        summary.amount_paid += invoice.amount_paid;
        summary.outstanding_amount += invoice.balance_due;
        
        // Check if overdue
        if (invoice.balance_due > 0 && new Date(invoice.due_date) < now) {
          summary.overdue_amount += invoice.balance_due;
        }
        
        // Count by status
        if (!summary.by_status[invoice.status]) {
          summary.by_status[invoice.status] = { count: 0, amount: 0 };
        }
        summary.by_status[invoice.status].count++;
        summary.by_status[invoice.status].amount += invoice.total_amount;
      });
      
      // Get insurance claims pending
      const claims = await githubDB.find(collections.insurance_claims, {
        entity_id: entityId,
        status: 'submitted'
      });
      summary.insurance_pending = claims.reduce((sum, claim) => sum + claim.claimed_amount, 0);
      
      return summary;
    } catch (error) {
      logger.error('get_billing_summary_failed', 'Failed to get billing summary', { error: error.message });
      return {
        total_invoices: 0,
        total_amount: 0,
        amount_paid: 0,
        outstanding_amount: 0,
        overdue_amount: 0,
        insurance_pending: 0,
        by_status: {}
      };
    }
  }
  
  // Generate invoice number
  private static async generateInvoiceNumber(): Promise<string> {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Generate claim number
  private static async generateClaimNumber(): Promise<string> {
    const prefix = 'CLM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'billing',
        resource_id: resourceId,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: 'unknown',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch (error) {
      logger.error('audit_log_failed', 'Failed to log audit event', { error: error.message });
    }
  }
}