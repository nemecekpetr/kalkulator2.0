-- Add delivery_term column to orders table
-- Migration: 20260103000003_add_order_delivery_term.sql

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_term TEXT DEFAULT '4-8 týdnů';

COMMENT ON COLUMN orders.delivery_term IS 'Delivery term copied from quote (e.g., "4-8 týdnů")';
