-- Připomínka rozpracované konfigurace se odesílá ručně z administrace,
-- ne automaticky přes Resend scheduling. Sloupec pro plánovaný čas tedy
-- nahrazujeme sloupcem pro čas skutečného odeslání.

ALTER TABLE configurations
  DROP COLUMN IF EXISTS reminder_scheduled_at;

ALTER TABLE configurations
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- reminder_sent_at: kdy administrace ručně odeslala připomínku (NULL = neodeslána).
-- reminder_email_id: ID odeslaného e-mailu v Resendu (pro dohledání v support).
