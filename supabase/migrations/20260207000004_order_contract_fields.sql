-- Add contract fields to orders table for contract/invoice generation
-- Fields: fulfillment address, construction readiness, expected delivery,
-- delivery method, delivery cost, total weight, VAT rate

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_address TEXT,
  ADD COLUMN IF NOT EXISTS construction_readiness_date DATE,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'rentmil_dap',
  ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_cost_free BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_weight NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 12;
