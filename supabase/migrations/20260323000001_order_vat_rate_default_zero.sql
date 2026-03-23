-- Change order vat_rate default from 12 to 0 to match quote default
-- VAT rate should be explicitly set, not assumed
ALTER TABLE orders ALTER COLUMN vat_rate SET DEFAULT 0;
