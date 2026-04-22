/*
  # ATTAPAPA Inventory & Sales System - Core Schema v2

  ## Overview
  Complete schema for the ATTAPAPA stock and sales management system.
  Tables created in dependency order, RLS policies added after all tables exist.

  ## Tables
  1. branches - Business branch locations
  2. profiles - User accounts with roles
  3. products - Inventory items
  4. product_images - Product photos
  5. fair_guys - Credit customers (debtors)
  6. sales - Sale transaction headers
  7. sale_items - Line items per sale
  8. debt_payments - Debt payment records
  9. returns - Return transaction headers
  10. return_items - Return line items
  11. stock_intakes - Stock arrival records
  12. stock_intake_items - Items in each intake
  13. audit_logs - System audit trail
*/

-- =============================================
-- BRANCHES
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed initial branches
INSERT INTO branches (name, location) VALUES
  ('Main Branch', 'Head Office'),
  ('Second Branch', 'Second Location')
ON CONFLICT DO NOTHING;

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'sales_staff' CHECK (role IN ('ceo', 'sales_staff')),
  branch_id uuid REFERENCES branches(id),
  phone text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales_staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  car_make text NOT NULL DEFAULT '',
  car_model text NOT NULL DEFAULT '',
  car_year text NOT NULL DEFAULT '',
  light_type text NOT NULL DEFAULT '' CHECK (light_type IN ('Headlight', 'Taillight', 'Fog Light', 'Boot Light')),
  variant text NOT NULL DEFAULT 'Normal',
  side text NOT NULL DEFAULT '' CHECK (side IN ('Left', 'Right', 'Center', 'Pair', 'Set')),
  condition text NOT NULL DEFAULT 'Foreign Used',
  quantity integer NOT NULL DEFAULT 0,
  quantity_threshold integer NOT NULL DEFAULT 5,
  reference_price numeric(10,2) DEFAULT 0,
  branch_id uuid NOT NULL REFERENCES branches(id),
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_branch ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_car_make ON products(car_make);
CREATE INDEX IF NOT EXISTS idx_products_light_type ON products(light_type);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- =============================================
-- PRODUCT IMAGES
-- =============================================
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- FAIR GUYS (DEBTORS)
-- =============================================
CREATE TABLE IF NOT EXISTS fair_guys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  location text DEFAULT '',
  notes text DEFAULT '',
  total_owed numeric(10,2) DEFAULT 0,
  branch_id uuid REFERENCES branches(id),
  created_by uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fair_guys_name ON fair_guys(name);

-- =============================================
-- SALES
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref text UNIQUE NOT NULL,
  branch_id uuid NOT NULL REFERENCES branches(id),
  staff_id uuid NOT NULL REFERENCES profiles(id),
  payment_type text NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'credit')),
  fair_guy_id uuid REFERENCES fair_guys(id),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  balance_due numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'returned')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_staff ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_fair_guy ON sales(fair_guy_id);
CREATE INDEX IF NOT EXISTS idx_sales_ref ON sales(transaction_ref);

-- =============================================
-- SALE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- =============================================
-- DEBT PAYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_guy_id uuid NOT NULL REFERENCES fair_guys(id),
  sale_id uuid REFERENCES sales(id),
  amount numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'cash',
  notes text DEFAULT '',
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- RETURNS
-- =============================================
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_ref text UNIQUE NOT NULL,
  original_sale_id uuid REFERENCES sales(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  processed_by uuid NOT NULL REFERENCES profiles(id),
  reason text DEFAULT '',
  total_refund numeric(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- RETURN ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  refund_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- STOCK INTAKES
-- =============================================
CREATE TABLE IF NOT EXISTS stock_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_ref text UNIQUE NOT NULL,
  branch_id uuid NOT NULL REFERENCES branches(id),
  recorded_by uuid NOT NULL REFERENCES profiles(id),
  supplier_note text DEFAULT '',
  total_items integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- STOCK INTAKE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS stock_intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES stock_intakes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity_added integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text DEFAULT '',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE fair_guys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Branches
CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "CEO can insert branches"
  ON branches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can update branches"
  ON branches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "CEO can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ceo'));

CREATE POLICY "Anyone can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "CEO can update all profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ceo'));

-- Products
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "CEO can insert products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can update products"
  ON products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can delete products"
  ON products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Product images
CREATE POLICY "Authenticated users can view product images"
  ON product_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "CEO can insert product images"
  ON product_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can delete product images"
  ON product_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Fair guys
CREATE POLICY "Authenticated users can view fair guys"
  ON fair_guys FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fair guys"
  ON fair_guys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "CEO can update fair guys"
  ON fair_guys FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Sales
CREATE POLICY "CEO can view all sales"
  ON sales FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Staff can view own sales"
  ON sales FOR SELECT TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "CEO can update sales"
  ON sales FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Sale items
CREATE POLICY "CEO can view all sale items"
  ON sale_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Staff can view own sale items"
  ON sale_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.staff_id = auth.uid())
  );

CREATE POLICY "Authenticated users can insert sale items"
  ON sale_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.staff_id = auth.uid())
  );

-- Debt payments
CREATE POLICY "CEO can view debt payments"
  ON debt_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can insert debt payments"
  ON debt_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Returns
CREATE POLICY "CEO can view returns"
  ON returns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can insert returns"
  ON returns FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Return items
CREATE POLICY "CEO can view return items"
  ON return_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can insert return items"
  ON return_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Stock intakes
CREATE POLICY "CEO can view stock intakes"
  ON stock_intakes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can insert stock intakes"
  ON stock_intakes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Stock intake items
CREATE POLICY "CEO can view stock intake items"
  ON stock_intake_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "CEO can insert stock intake items"
  ON stock_intake_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- Audit logs
CREATE POLICY "CEO can view audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_ref()
RETURNS text AS $$
DECLARE
  ref text;
  count_today integer;
BEGIN
  SELECT COUNT(*) + 1 INTO count_today
  FROM sales WHERE DATE(created_at) = CURRENT_DATE;
  ref := 'ATP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(count_today::text, 4, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Generate intake reference
CREATE OR REPLACE FUNCTION generate_intake_ref()
RETURNS text AS $$
DECLARE
  ref text;
  count_today integer;
BEGIN
  SELECT COUNT(*) + 1 INTO count_today
  FROM stock_intakes WHERE DATE(created_at) = CURRENT_DATE;
  ref := 'STK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(count_today::text, 4, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Generate return reference
CREATE OR REPLACE FUNCTION generate_return_ref()
RETURNS text AS $$
DECLARE
  ref text;
  count_today integer;
BEGIN
  SELECT COUNT(*) + 1 INTO count_today
  FROM returns WHERE DATE(created_at) = CURRENT_DATE;
  ref := 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(count_today::text, 4, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;
