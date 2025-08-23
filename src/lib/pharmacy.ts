// Pharmacy Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { EmailNotificationService } from './email-notifications';

// Pharmacy Inventory Interface
export interface PharmacyInventory {
  id: string;
  entity_id: string; // Pharmacy entity ID
  
  // Drug details
  drug_name: string;
  generic_name?: string;
  brand_name?: string;
  ndc_number?: string; // National Drug Code
  strength: string;
  dosage_form: string; // tablet, capsule, liquid, etc.
  
  // Inventory details
  quantity_on_hand: number;
  unit_of_measure: string; // tablets, bottles, vials, etc.
  minimum_stock_level: number;
  maximum_stock_level: number;
  reorder_point: number;
  
  // Pricing
  unit_cost: number;
  selling_price: number;
  
  // Lot information
  lot_batches: Array<{
    lot_number: string;
    expiry_date: string;
    quantity: number;
    manufacturer: string;
    received_date: string;
  }>;
  
  // Status
  is_active: boolean;
  is_controlled_substance: boolean;
  controlled_schedule?: string; // C-I through C-V
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Pharmacy Order Interface (for stock replenishment)
export interface PharmacyOrder {
  id: string;
  entity_id: string;
  
  // Order details
  order_number: string;
  supplier_name: string;
  order_date: string;
  expected_delivery: string;
  status: 'pending' | 'ordered' | 'shipped' | 'received' | 'cancelled';
  
  // Items
  items: Array<{
    drug_name: string;
    ndc_number?: string;
    quantity_ordered: number;
    unit_cost: number;
    total_cost: number;
  }>;
  
  // Totals
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  
  // Notes
  notes?: string;
  
  // Metadata
  ordered_by: string;
  created_at: string;
  updated_at: string;
}

export class PharmacyService {
  
  // Add inventory item
  static async addInventoryItem(inventoryData: {
    entity_id: string;
    drug_name: string;
    generic_name?: string;
    brand_name?: string;
    ndc_number?: string;
    strength: string;
    dosage_form: string;
    quantity_on_hand: number;
    unit_of_measure: string;
    minimum_stock_level: number;
    maximum_stock_level: number;
    reorder_point: number;
    unit_cost: number;
    selling_price: number;
    lot_batches: PharmacyInventory['lot_batches'];
    is_controlled_substance: boolean;
    controlled_schedule?: string;
  }): Promise<PharmacyInventory> {
    try {
      const inventory = await githubDB.insert(collections.pharmacy_inventory, {
        ...inventoryData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('inventory_item_added', inventory.id, 'system');
      
      logger.info('inventory_item_added', 'Inventory item added successfully', {
        inventory_id: inventory.id,
        drug_name: inventoryData.drug_name,
        entity_id: inventoryData.entity_id
      });
      
      return inventory;
    } catch (error) {
      logger.error('inventory_item_add_failed', 'Failed to add inventory item', { error: error.message });
      throw error;
    }
  }
  
  // Update inventory quantity
  static async updateInventoryQuantity(inventoryId: string, quantityChange: number, reason: string, updatedBy: string): Promise<PharmacyInventory> {
    try {
      const inventory = await githubDB.findById(collections.pharmacy_inventory, inventoryId);
      if (!inventory) throw new Error('Inventory item not found');
      
      const newQuantity = inventory.quantity_on_hand + quantityChange;
      if (newQuantity < 0) {
        throw new Error('Insufficient inventory quantity');
      }
      
      const updatedInventory = await githubDB.update(collections.pharmacy_inventory, inventoryId, {
        quantity_on_hand: newQuantity,
        updated_at: new Date().toISOString()
      });
      
      // Check for low stock alert
      if (newQuantity <= inventory.reorder_point) {
        await this.createLowStockAlert(inventoryId);
      }
      
      await this.logAuditEvent('inventory_quantity_updated', inventoryId, updatedBy, {
        quantity_change: quantityChange,
        new_quantity: newQuantity,
        reason: reason
      });
      
      return updatedInventory;
    } catch (error) {
      logger.error('inventory_quantity_update_failed', 'Failed to update inventory quantity', { 
        inventory_id: inventoryId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Process medication dispense
  static async processMedicationDispense(dispenseData: {
    medication_request_id: string;
    pharmacy_entity_id: string;
    patient_id: string;
    medications: Array<{
      drug_name: string;
      quantity_dispensed: number;
      lot_number?: string;
      expiry_date?: string;
    }>;
    dispenser_id: string;
    counseling_provided: boolean;
    pickup_method: 'in_person' | 'delivery' | 'mail' | 'curbside';
    notes?: string;
  }): Promise<void> {
    try {
      // Check inventory availability
      for (const med of dispenseData.medications) {
        const inventory = await this.findInventoryByDrug(dispenseData.pharmacy_entity_id, med.drug_name);
        if (!inventory || inventory.quantity_on_hand < med.quantity_dispensed) {
          throw new Error(`Insufficient inventory for ${med.drug_name}`);
        }
      }
      
      // Update inventory quantities
      for (const med of dispenseData.medications) {
        const inventory = await this.findInventoryByDrug(dispenseData.pharmacy_entity_id, med.drug_name);
        if (inventory) {
          await this.updateInventoryQuantity(
            inventory.id, 
            -med.quantity_dispensed, 
            `Dispensed to patient ${dispenseData.patient_id}`,
            dispenseData.dispenser_id
          );
        }
      }
      
      // Create dispense record (this would integrate with MedicationService)
      await githubDB.insert(collections.medication_dispenses, {
        medication_request_id: dispenseData.medication_request_id,
        pharmacy_entity_id: dispenseData.pharmacy_entity_id,
        patient_id: dispenseData.patient_id,
        status: 'completed',
        dispensed_medications: dispenseData.medications.map(med => ({
          drug_name: med.drug_name,
          quantity_dispensed: med.quantity_dispensed,
          lot_number: med.lot_number,
          expiry_date: med.expiry_date
        })),
        dispenser_id: dispenseData.dispenser_id,
        counseling_provided: dispenseData.counseling_provided,
        pickup_method: dispenseData.pickup_method,
        patient_acknowledged: true,
        dispensed_at: new Date().toISOString(),
        notes: dispenseData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      logger.info('medication_dispensed', 'Medication dispensed successfully', {
        request_id: dispenseData.medication_request_id,
        pharmacy_id: dispenseData.pharmacy_entity_id,
        patient_id: dispenseData.patient_id
      });
      
    } catch (error) {
      logger.error('medication_dispense_failed', 'Failed to process medication dispense', { error: error.message });
      throw error;
    }
  }
  
  // Create purchase order
  static async createPurchaseOrder(orderData: {
    entity_id: string;
    supplier_name: string;
    expected_delivery: string;
    items: PharmacyOrder['items'];
    shipping_cost: number;
    tax_rate: number;
    ordered_by: string;
    notes?: string;
  }): Promise<PharmacyOrder> {
    try {
      const orderNumber = await this.generateOrderNumber();
      
      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + item.total_cost, 0);
      const taxAmount = subtotal * (orderData.tax_rate / 100);
      const totalAmount = subtotal + taxAmount + orderData.shipping_cost;
      
      const order = await githubDB.insert(collections.pharmacy_orders, {
        ...orderData,
        order_number: orderNumber,
        order_date: new Date().toISOString(),
        status: 'pending',
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('purchase_order_created', order.id, orderData.ordered_by);
      
      logger.info('purchase_order_created', 'Purchase order created successfully', {
        order_id: order.id,
        order_number: orderNumber,
        total_amount: totalAmount
      });
      
      return order;
    } catch (error) {
      logger.error('purchase_order_creation_failed', 'Failed to create purchase order', { error: error.message });
      throw error;
    }
  }
  
  // Receive purchase order
  static async receivePurchaseOrder(orderId: string, receivedItems: Array<{
    drug_name: string;
    quantity_received: number;
    lot_number: string;
    expiry_date: string;
    manufacturer: string;
  }>, receivedBy: string): Promise<PharmacyOrder> {
    try {
      // Update order status
      const order = await githubDB.update(collections.pharmacy_orders, orderId, {
        status: 'received',
        updated_at: new Date().toISOString()
      });
      
      // Update inventory for each received item
      for (const item of receivedItems) {
        let inventory = await this.findInventoryByDrug(order.entity_id, item.drug_name);
        
        if (inventory) {
          // Update existing inventory
          const updatedBatches = [...inventory.lot_batches, {
            lot_number: item.lot_number,
            expiry_date: item.expiry_date,
            quantity: item.quantity_received,
            manufacturer: item.manufacturer,
            received_date: new Date().toISOString()
          }];
          
          await githubDB.update(collections.pharmacy_inventory, inventory.id, {
            quantity_on_hand: inventory.quantity_on_hand + item.quantity_received,
            lot_batches: updatedBatches,
            updated_at: new Date().toISOString()
          });
        }
      }
      
      await this.logAuditEvent('purchase_order_received', orderId, receivedBy);
      
      return order;
    } catch (error) {
      logger.error('purchase_order_receive_failed', 'Failed to receive purchase order', { 
        order_id: orderId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get low stock items
  static async getLowStockItems(entityId: string): Promise<PharmacyInventory[]> {
    try {
      const inventory = await githubDB.find(collections.pharmacy_inventory, {
        entity_id: entityId,
        is_active: true
      });
      
      return inventory.filter(item => item.quantity_on_hand <= item.reorder_point);
    } catch (error) {
      logger.error('get_low_stock_items_failed', 'Failed to get low stock items', { error: error.message });
      return [];
    }
  }
  
  // Get expiring items
  static async getExpiringItems(entityId: string, daysAhead: number = 90): Promise<Array<{
    inventory: PharmacyInventory;
    expiring_batches: Array<{
      lot_number: string;
      expiry_date: string;
      quantity: number;
      days_to_expiry: number;
    }>;
  }>> {
    try {
      const inventory = await githubDB.find(collections.pharmacy_inventory, {
        entity_id: entityId,
        is_active: true
      });
      
      const expiringItems = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      
      for (const item of inventory) {
        const expiringBatches = item.lot_batches
          .filter(batch => new Date(batch.expiry_date) <= cutoffDate)
          .map(batch => ({
            lot_number: batch.lot_number,
            expiry_date: batch.expiry_date,
            quantity: batch.quantity,
            days_to_expiry: Math.floor((new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          }))
          .sort((a, b) => a.days_to_expiry - b.days_to_expiry);
        
        if (expiringBatches.length > 0) {
          expiringItems.push({
            inventory: item,
            expiring_batches: expiringBatches
          });
        }
      }
      
      return expiringItems;
    } catch (error) {
      logger.error('get_expiring_items_failed', 'Failed to get expiring items', { error: error.message });
      return [];
    }
  }
  
  // Search inventory
  static async searchInventory(entityId: string, query: string): Promise<PharmacyInventory[]> {
    try {
      const inventory = await githubDB.find(collections.pharmacy_inventory, {
        entity_id: entityId,
        is_active: true
      });
      
      const lowerQuery = query.toLowerCase();
      return inventory.filter(item => 
        item.drug_name.toLowerCase().includes(lowerQuery) ||
        item.generic_name?.toLowerCase().includes(lowerQuery) ||
        item.brand_name?.toLowerCase().includes(lowerQuery) ||
        item.ndc_number?.includes(query)
      );
    } catch (error) {
      logger.error('search_inventory_failed', 'Failed to search inventory', { error: error.message });
      return [];
    }
  }
  
  // Find inventory by drug name
  private static async findInventoryByDrug(entityId: string, drugName: string): Promise<PharmacyInventory | null> {
    try {
      const inventory = await githubDB.find(collections.pharmacy_inventory, {
        entity_id: entityId,
        drug_name: drugName,
        is_active: true
      });
      
      return inventory.length > 0 ? inventory[0] : null;
    } catch (error) {
      logger.error('find_inventory_by_drug_failed', 'Failed to find inventory by drug', { error: error.message });
      return null;
    }
  }
  
  // Create low stock alert
  private static async createLowStockAlert(inventoryId: string): Promise<void> {
    try {
      const inventory = await githubDB.findById(collections.pharmacy_inventory, inventoryId);
      if (!inventory) return;
      
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: inventory.entity_id,
        type: 'low_stock_alert',
        title: 'Low Stock Alert',
        message: `${inventory.drug_name} is running low (${inventory.quantity_on_hand} ${inventory.unit_of_measure} remaining)`,
        data: { 
          inventory_id: inventoryId,
          drug_name: inventory.drug_name,
          current_quantity: inventory.quantity_on_hand,
          reorder_point: inventory.reorder_point
        },
        priority: 'medium',
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      logger.warn('low_stock_alert_created', 'Low stock alert created', {
        inventory_id: inventoryId,
        drug_name: inventory.drug_name,
        current_quantity: inventory.quantity_on_hand
      });
      
    } catch (error) {
      logger.error('create_low_stock_alert_failed', 'Failed to create low stock alert', { error: error.message });
    }
  }
  
  // Generate order number
  private static async generateOrderNumber(): Promise<string> {
    const prefix = 'PO';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'pharmacy',
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