-- ============================================================================
-- UNIQUE CONSTRAINT na order_id v production_orders
-- ============================================================================
-- Zabrání vytvoření dvou výrobních zadání pro stejnou objednávku
-- (řeší race condition při současném kliknutí)

-- Přidání UNIQUE constraint
ALTER TABLE production_orders
ADD CONSTRAINT production_orders_order_id_unique UNIQUE (order_id);

-- Index pro rychlé vyhledávání (pokud ještě neexistuje)
CREATE INDEX IF NOT EXISTS idx_production_orders_order_id_unique
ON production_orders(order_id);
