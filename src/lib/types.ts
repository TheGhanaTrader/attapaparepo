export type UserRole = 'ceo' | 'sales_staff';

export interface Branch {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  car_make: string;
  car_model: string;
  car_year: string;
  light_type: 'Headlight' | 'Taillight' | 'Fog Light' | 'Boot Light';
  variant: string;
  side: 'Left' | 'Right' | 'Center' | 'Pair' | 'Set';
  condition: string;
  quantity: number;
  quantity_threshold: number;
  reference_price: number;
  branch_id: string;
  notes: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface FairGuy {
  id: string;
  name: string;
  phone: string;
  location: string;
  notes: string;
  total_owed: number;
  branch_id: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  transaction_ref: string;
  branch_id: string;
  staff_id: string;
  payment_type: 'cash' | 'credit';
  fair_guy_id: string | null;
  subtotal: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes: string;
  status: 'completed' | 'voided' | 'returned';
  created_at: string;
  branch?: Branch;
  staff?: Profile;
  fair_guy?: FairGuy;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export interface DebtPayment {
  id: string;
  fair_guy_id: string;
  sale_id: string | null;
  amount: number;
  payment_method: string;
  notes: string;
  recorded_by: string | null;
  created_at: string;
}

export interface Return {
  id: string;
  return_ref: string;
  original_sale_id: string | null;
  branch_id: string;
  processed_by: string;
  reason: string;
  total_refund: number;
  notes: string;
  created_at: string;
  branch?: Branch;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  created_at: string;
  product?: Product;
}

export interface StockIntake {
  id: string;
  intake_ref: string;
  branch_id: string;
  recorded_by: string;
  supplier_note: string;
  total_items: number;
  notes: string;
  created_at: string;
  branch?: Branch;
  items?: StockIntakeItem[];
}

export interface StockIntakeItem {
  id: string;
  intake_id: string;
  product_id: string;
  quantity_added: number;
  notes: string;
  created_at: string;
  product?: Product;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
  profile?: Profile;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
}
