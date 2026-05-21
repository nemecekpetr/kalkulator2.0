-- Tracking rozpracovaných (nedokončených) konfigurací
-- Konfigurace se nově ukládá jako draft už při přechodu z kroku 10 na krok 11.
-- Draft se při odeslání poptávky povýší na is_draft = FALSE.

ALTER TABLE configurations
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_email_id TEXT,
  ADD COLUMN IF NOT EXISTS reminder_scheduled_at TIMESTAMPTZ;

-- Existující řádky byly odeslané → is_draft = FALSE (zařídí DEFAULT).
-- reminder_email_id: ID naplánovaného připomínkového e-mailu v Resendu (handle pro zrušení).
-- reminder_scheduled_at: čas, na který je připomínka naplánovaná (pro zobrazení v adminu).

-- Index pro admin filtr rozpracovaných konfigurací.
CREATE INDEX IF NOT EXISTS configurations_is_draft_idx
  ON configurations (is_draft);
