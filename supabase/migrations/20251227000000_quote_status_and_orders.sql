-- Migration: Add quote status and orders table
-- Date: 2025-12-27

-- =============================================================================
-- 1. Quote Status Enum and Column
-- =============================================================================

-- Create quote status enum
CREATE TYPE quote_status AS ENUM (
  'draft',      -- Rozpracovaná nabídka
  'sent',       -- Odesláno zákazníkovi
  'accepted',   -- Zákazník akceptoval
  'rejected',   -- Zákazník odmítl
  'expired',    -- Vypršela platnost
  'converted'   -- Převedeno na objednávku
);

-- Add status column to quotes table
ALTER TABLE quotes
ADD COLUMN status quote_status NOT NULL DEFAULT 'draft';

-- Add sent_at timestamp for tracking when quote was sent
ALTER TABLE quotes
ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

-- Add accepted_at timestamp
ALTER TABLE quotes
ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;

-- =============================================================================
-- 2. Order Status Enum
-- =============================================================================

CREATE TYPE order_status AS ENUM (
  'created',        -- Vytvořena
  'confirmed',      -- Potvrzena zákazníkem
  'in_production',  -- Ve výrobě
  'ready',          -- Připraveno k dodání
  'delivered',      -- Dodáno
  'completed',      -- Dokončeno (předáno)
  'cancelled'       -- Zrušeno
);

-- =============================================================================
-- 3. Orders Table
-- =============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Order identification
  order_number TEXT UNIQUE NOT NULL,  -- OBJ-2025-001

  -- Link to quote (optional - orders can exist without quote)
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Status tracking
  status order_status NOT NULL DEFAULT 'created',

  -- Customer info (copied from quote or entered manually)
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_ico TEXT,      -- IČO pro firmy
  customer_dic TEXT,      -- DIČ pro firmy

  -- Contract details
  contract_date DATE,           -- Datum podpisu smlouvy
  delivery_date DATE,           -- Plánované datum dodání
  delivery_address TEXT,        -- Adresa dodání (pokud jiná než customer_address)

  -- Pool configuration (copied from quote)
  pool_config JSONB,

  -- Pricing
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Payment tracking
  deposit_amount DECIMAL(12, 2) DEFAULT 0,      -- Záloha
  deposit_paid_at TIMESTAMP WITH TIME ZONE,     -- Kdy byla záloha zaplacena
  final_payment_at TIMESTAMP WITH TIME ZONE,    -- Kdy bylo doplaceno

  -- Notes
  notes TEXT,                   -- Poznámky viditelné zákazníkovi
  internal_notes TEXT,          -- Interní poznámky

  -- Audit
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- =============================================================================
-- 4. Order Items Table
-- =============================================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product reference (optional)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Item details (copied from quote_items or entered manually)
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'jine',

  -- Pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ks',
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- =============================================================================
-- 5. Sequences for Document Numbering
-- =============================================================================

-- Sequence for order numbers (starting from 1 for 2025)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  seq_num := nextval('order_number_seq');
  RETURN 'OBJ-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. Indexes
-- =============================================================================

CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_orders_quote_id ON orders(quote_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- =============================================================================
-- 7. Triggers for updated_at
-- =============================================================================

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. Row Level Security
-- =============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for orders (authenticated users can do everything)
CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- Policies for order_items
CREATE POLICY "Authenticated users can view order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete order_items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);
