-- Add unique constraint on idempotency_key to prevent duplicate submissions at DB level
-- This is a safety net in addition to application-level checks

-- First, clean up any duplicate idempotency_keys (keep oldest)
WITH duplicates AS (
  SELECT id, idempotency_key,
    ROW_NUMBER() OVER (PARTITION BY idempotency_key ORDER BY created_at ASC) AS rn
  FROM configurations
  WHERE idempotency_key IS NOT NULL
)
UPDATE configurations
SET idempotency_key = NULL
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Drop old non-unique index if exists
DROP INDEX IF EXISTS idx_configurations_idempotency_key;

-- Create simple unique index (only for non-null values)
-- Time-based duplicate prevention is handled in application code
CREATE UNIQUE INDEX IF NOT EXISTS idx_configurations_idempotency_key_unique
ON configurations(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON INDEX idx_configurations_idempotency_key_unique IS 'Prevents duplicate form submissions with same idempotency key';
