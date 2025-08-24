import { githubDB, collections } from '../database';
import { ProductCategory } from '../ecommerce';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedProducts() {
  if (!(await isEmpty(collections.products))) return;
  const nowStr = new Date().toISOString();
  const products = [
    {
      entity_id: 'entity_pharmacy_01',
      name: 'Automatic Blood Pressure Monitor (Upper Arm)',
      description: 'Clinically validated upper‑arm BP monitor with adjustable cuff and memory storage for 2 users.',
      category: ProductCategory.MEDICAL_DEVICES,
      brand: 'HealthPro',
      manufacturer: 'HealthPro Devices',
      price: 54.99,
      currency: 'USD',
      stock_quantity: 25,
      low_stock_threshold: 5,
      sku: 'HP-BP-200',
      requires_prescription: false,
      controlled_substance: false,
      prescription_types: [],
      images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop'],
      specifications: { form: 'device' },
      warnings: ['Use as directed. Consult a clinician for diagnosis.'],
      contraindications: [],
      side_effects: [],
      storage_instructions: 'Store in a cool, dry place.',
      expiry_tracking: false,
      tags: ['blood pressure','home monitoring'],
      search_keywords: ['bp monitor','blood pressure cuff'],
      is_active: true,
      is_featured: true,
      requires_age_verification: false,
      rating: 4.6,
      review_count: 124,
      created_at: nowStr,
      updated_at: nowStr
    },
    {
      entity_id: 'entity_pharmacy_01',
      name: 'Vitamin D3 2000 IU (90 softgels)',
      description: 'High‑quality vitamin D3 to support bone, immune, and mood health.',
      category: ProductCategory.SUPPLEMENTS,
      brand: 'NutraWell',
      manufacturer: 'NutraWell Labs',
      price: 12.99,
      discounted_price: 9.99,
      currency: 'USD',
      stock_quantity: 120,
      low_stock_threshold: 10,
      sku: 'NW-D3-2000',
      requires_prescription: false,
      controlled_substance: false,
      prescription_types: [],
      images: ['https://images.unsplash.com/photo-1597076537064-5c23686a3a36?q=80&w=1600&auto=format&fit=crop'],
      specifications: { form: 'softgel', strength: '2000 IU' },
      warnings: ['Do not exceed recommended dose unless directed by a clinician.'],
      contraindications: [],
      side_effects: ['Rare: nausea'],
      storage_instructions: 'Keep tightly closed; store at room temperature.',
      expiry_tracking: true,
      tags: ['vitamin D','supplement'],
      search_keywords: ['vitamin d3','cholecalciferol'],
      is_active: true,
      is_featured: false,
      requires_age_verification: false,
      rating: 4.4,
      review_count: 89,
      created_at: nowStr,
      updated_at: nowStr
    },
    {
      entity_id: 'entity_pharmacy_02',
      name: 'Reusable Hot/Cold Gel Pack (Large)',
      description: 'Flexible gel pack for hot or cold therapy. Microwave or freeze as needed for pain relief.',
      category: ProductCategory.HEALTH_PRODUCTS,
      brand: 'ThermaFlex',
      manufacturer: 'ThermaFlex Health',
      price: 8.99,
      currency: 'USD',
      stock_quantity: 60,
      low_stock_threshold: 8,
      sku: 'TF-GEL-XL',
      requires_prescription: false,
      controlled_substance: false,
      prescription_types: [],
      images: ['https://images.unsplash.com/photo-1602741924124-b23bd0b7082e?q=80&w=1600&auto=format&fit=crop'],
      specifications: { size: 'Large' },
      warnings: ['Test temperature before skin contact; wrap in cloth.'],
      contraindications: [],
      side_effects: [],
      storage_instructions: 'Store at room temperature or in freezer as needed.',
      expiry_tracking: false,
      tags: ['pain relief','therapy'],
      search_keywords: ['ice pack','heat pack'],
      is_active: true,
      is_featured: false,
      requires_age_verification: false,
      rating: 4.2,
      review_count: 45,
      created_at: nowStr,
      updated_at: nowStr
    }
  ];
  for (const p of products) await githubDB.insert(collections.products, p as any);
}
