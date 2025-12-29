-- Add idempotency_key column to prevent duplicate submissions
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(32);

-- Add index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_configurations_idempotency_key
ON configurations(idempotency_key, created_at DESC)
WHERE idempotency_key IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN configurations.idempotency_key IS 'SHA256 hash of email+shape+type+dimensions to prevent duplicate submissions within 5 minutes';
