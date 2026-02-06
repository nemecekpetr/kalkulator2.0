-- Add set_addons JSONB column to products table
-- Stores addon definitions for set products (category 'sety')
-- Structure: [{"id": "uuid", "name": "string", "price": number, "sort_order": number}]
ALTER TABLE products ADD COLUMN IF NOT EXISTS set_addons JSONB DEFAULT '[]';
