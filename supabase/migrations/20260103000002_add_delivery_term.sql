-- Add delivery_term column to quotes table
-- Migration: 20260103000002_add_delivery_term.sql

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_term TEXT DEFAULT '4-8 týdnů';

COMMENT ON COLUMN quotes.delivery_term IS 'Estimated delivery time shown on quote PDF (e.g., "4-8 týdnů")';
