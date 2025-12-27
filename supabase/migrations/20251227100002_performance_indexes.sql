-- Migration: Performance indexes
-- Date: 2025-12-27
-- Description: Add indexes for common query patterns

-- =============================================================================
-- Configurations
-- =============================================================================

-- Index for listing configurations by date (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_configurations_created_at
  ON configurations(created_at DESC);

-- Index for searching by email
CREATE INDEX IF NOT EXISTS idx_configurations_email
  ON configurations(email);

-- Index for searching by phone
CREATE INDEX IF NOT EXISTS idx_configurations_phone
  ON configurations(phone);

-- =============================================================================
-- Quotes
-- =============================================================================

-- Index for listing quotes by date
CREATE INDEX IF NOT EXISTS idx_quotes_created_at
  ON quotes(created_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_quotes_status
  ON quotes(status);

-- Index for searching by quote number
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number
  ON quotes(quote_number);

-- Index for filtering by configuration (foreign key lookup)
CREATE INDEX IF NOT EXISTS idx_quotes_configuration_id
  ON quotes(configuration_id);

-- =============================================================================
-- Quote Items
-- =============================================================================

-- Index for fetching items by quote
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id
  ON quote_items(quote_id);

-- Index for sorting items within quote
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order
  ON quote_items(quote_id, sort_order);

-- =============================================================================
-- Quote Variants
-- =============================================================================

-- Index for fetching variants by quote
CREATE INDEX IF NOT EXISTS idx_quote_variants_quote_id
  ON quote_variants(quote_id);

-- Index for sorting variants
CREATE INDEX IF NOT EXISTS idx_quote_variants_sort_order
  ON quote_variants(quote_id, sort_order);

-- =============================================================================
-- Quote Variant Items
-- =============================================================================

-- Index for fetching items by variant
CREATE INDEX IF NOT EXISTS idx_quote_variant_items_variant_id
  ON quote_variant_items(variant_id);

-- =============================================================================
-- Orders
-- =============================================================================

-- Index for listing orders by date
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);

-- Index for searching by order number
CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON orders(order_number);

-- Index for filtering by quote (foreign key lookup)
CREATE INDEX IF NOT EXISTS idx_orders_quote_id
  ON orders(quote_id);

-- =============================================================================
-- Order Items
-- =============================================================================

-- Index for fetching items by order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items(order_id);

-- =============================================================================
-- Production Orders
-- =============================================================================

-- Index for listing production orders by date
CREATE INDEX IF NOT EXISTS idx_production_orders_created_at
  ON production_orders(created_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_production_orders_status
  ON production_orders(status);

-- Index for searching by production number
CREATE INDEX IF NOT EXISTS idx_production_orders_production_number
  ON production_orders(production_number);

-- Index for filtering by order (foreign key lookup)
CREATE INDEX IF NOT EXISTS idx_production_orders_order_id
  ON production_orders(order_id);

-- =============================================================================
-- Production Order Items
-- =============================================================================

-- Index for fetching items by production order
CREATE INDEX IF NOT EXISTS idx_production_order_items_production_order_id
  ON production_order_items(production_order_id);

-- =============================================================================
-- Products
-- =============================================================================

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products(category);

-- Index for searching by code
CREATE INDEX IF NOT EXISTS idx_products_code
  ON products(code);

-- Index for searching by name (for autocomplete/search)
CREATE INDEX IF NOT EXISTS idx_products_name
  ON products(name);

-- Index for active products
CREATE INDEX IF NOT EXISTS idx_products_active
  ON products(active) WHERE active = true;

-- =============================================================================
-- Product Mapping Rules
-- =============================================================================

-- Index for filtering by config field
CREATE INDEX IF NOT EXISTS idx_product_mapping_rules_config_field
  ON product_mapping_rules(config_field);

-- Index for filtering by active rules
CREATE INDEX IF NOT EXISTS idx_product_mapping_rules_active
  ON product_mapping_rules(active) WHERE active = true;

-- =============================================================================
-- User Profiles
-- =============================================================================

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON user_profiles(role);

-- Index for active users
CREATE INDEX IF NOT EXISTS idx_user_profiles_active
  ON user_profiles(active) WHERE active = true;

-- =============================================================================
-- Sync Logs
-- =============================================================================

-- Index for listing sync logs by date
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at
  ON sync_logs(synced_at DESC);

-- =============================================================================
-- Quote Versions
-- =============================================================================

-- Index for fetching versions by quote
CREATE INDEX IF NOT EXISTS idx_quote_versions_quote_id
  ON quote_versions(quote_id);

-- Index for ordering versions
CREATE INDEX IF NOT EXISTS idx_quote_versions_version_number
  ON quote_versions(quote_id, version_number DESC);

