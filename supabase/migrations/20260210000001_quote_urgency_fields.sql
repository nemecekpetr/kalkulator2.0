-- Add urgency/seasonal availability fields to quotes
ALTER TABLE quotes
  ADD COLUMN order_deadline DATE,
  ADD COLUMN delivery_deadline DATE,
  ADD COLUMN capacity_month TEXT,
  ADD COLUMN available_installations INTEGER DEFAULT 3;
