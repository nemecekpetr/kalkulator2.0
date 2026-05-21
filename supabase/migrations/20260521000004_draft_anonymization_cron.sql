-- GDPR: denní anonymizace neodeslaných draftů starších 1 měsíce.
-- Smaže kontaktní údaje, ale zachová řádek + příznaky (was_draft, is_draft,
-- reminder_sent_at, created_at, konfiguraci bazénu) pro statistiku oživení.
-- Odeslané poptávky (i z draftů) se neanonymizují — to jsou reální zákazníci.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'anonymize-stale-drafts',
  '0 3 * * *',
  $$
    UPDATE configurations
    SET contact_name = '',
        contact_email = '',
        contact_phone = NULL,
        contact_address = NULL,
        idempotency_key = NULL,
        anonymized_at = now()
    WHERE is_draft = TRUE
      AND anonymized_at IS NULL
      AND created_at < now() - INTERVAL '1 month'
  $$
);
