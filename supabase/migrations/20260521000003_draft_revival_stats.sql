-- Statistika oživení draftů.
-- was_draft = řádek kdy byl rozpracovaná konfigurace; zůstává TRUE i po odeslání
--   poptávky, takže lze poznat, kolik draftů se podařilo „oživit".
-- anonymized_at = čas GDPR anonymizace (NULL = neanonymizováno).

ALTER TABLE configurations
  ADD COLUMN IF NOT EXISTS was_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Backfill: aktuálně rozpracované konfigurace zpětně označit jako draft.
UPDATE configurations SET was_draft = TRUE WHERE is_draft = TRUE;
