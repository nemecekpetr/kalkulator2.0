-- =============================================
-- Email and Pipedrive tracking columns
-- =============================================
-- Adds columns to track email sending and Pipedrive person ID

-- Add pipedrive_person_id to configurations
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS pipedrive_person_id INTEGER;

-- Add email tracking columns
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Add comment for documentation
COMMENT ON COLUMN configurations.pipedrive_person_id IS 'Pipedrive Person/Contact ID';
COMMENT ON COLUMN configurations.email_sent_at IS 'Timestamp when confirmation email was sent';
COMMENT ON COLUMN configurations.email_error IS 'Error message if email sending failed';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_configurations_pipedrive_person_id
ON configurations(pipedrive_person_id);

CREATE INDEX IF NOT EXISTS idx_configurations_email_sent_at
ON configurations(email_sent_at);
