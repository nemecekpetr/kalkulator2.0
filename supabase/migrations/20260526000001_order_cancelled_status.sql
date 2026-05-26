-- Migration: Allow 'cancelled' status on orders
-- Date: 2026-05-26
-- Purpose: Used by „Vrátit k úpravě nabídky" — order is cancelled (kept for audit)
-- and the user is redirected back to the related quote for editing. A new order
-- is then produced from the edited quote.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('created', 'sent', 'in_production', 'cancelled'));
