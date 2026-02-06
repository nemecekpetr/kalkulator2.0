-- Add customer_salutation column to quotes table
-- Stores formal Czech greeting in vocative case (e.g. "Vážený pane Nováku")
ALTER TABLE quotes ADD COLUMN customer_salutation TEXT;
