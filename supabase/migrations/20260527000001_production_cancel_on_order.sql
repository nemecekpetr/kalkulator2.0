-- Migration: When an order is cancelled, automatically cancel its production_order
-- Date: 2026-05-27
-- Purpose: Avoid orphaned production_orders when a sales rep clicks
-- „Vrátit k úpravě nabídky" on an order that already has a production_order
-- attached. Only cancel production that hasn't physically started yet
-- (status = 'pending'). If production is in_progress or completed, leave it
-- alone — physical pool exists, sales rep needs to handle it manually with
-- the production team.

CREATE OR REPLACE FUNCTION cancel_production_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when transitioning to 'cancelled' (not on every update)
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE production_orders
    SET status = 'cancelled'
    WHERE order_id = NEW.id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cancel_production_on_order_cancel ON orders;
CREATE TRIGGER trigger_cancel_production_on_order_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION cancel_production_on_order_cancel();
