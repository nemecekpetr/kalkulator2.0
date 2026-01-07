-- =============================================================================
-- AI Assistant Improvements
-- Tabulky pro proaktivní upozornění a učení preferencí uživatele
-- =============================================================================

-- Proaktivní alerty/upozornění
CREATE TABLE IF NOT EXISTS assistant_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = pro všechny uživatele
  -- Typ a priorita
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'expiring_quote',      -- Nabídka brzy expiruje
    'inactive_quote',      -- Nabídka bez odpovědi
    'production_delay',    -- Zpoždění výroby
    'missing_data',        -- Chybějící data (cena produktu, atd.)
    'upsell_opportunity',  -- Příležitost pro upselling
    'customer_followup',   -- Čas na follow-up zákazníka
    'system'               -- Systémové upozornění
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  -- Co se týká
  entity_type TEXT,  -- 'quote', 'order', 'customer', 'product', 'production'
  entity_id UUID,
  -- Obsah
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,  -- URL kam má alert odkázat
  -- Stav
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB
);

-- Uživatelské preference pro personalizaci asistenta
CREATE TABLE IF NOT EXISTS assistant_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Typ preference
  preference_type TEXT NOT NULL CHECK (preference_type IN (
    'discount_range',       -- Typický rozsah slev
    'favorite_products',    -- Oblíbené produkty/kategorie
    'communication_style',  -- Preferovaný styl komunikace
    'default_actions',      -- Výchozí akce
    'notification_prefs',   -- Nastavení notifikací
    'ui_prefs'              -- UI preference
  )),
  preference_key TEXT NOT NULL,
  -- Hodnota preference
  preference_value JSONB NOT NULL,
  -- Jak byla preference zjištěna
  learned_from TEXT NOT NULL CHECK (learned_from IN ('explicit', 'implicit')),
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  -- Počet pozorování (pro implicitní učení)
  observation_count INTEGER DEFAULT 1,
  -- Unique per user + type + key
  UNIQUE(user_id, preference_type, preference_key)
);

-- =============================================================================
-- Indexy
-- =============================================================================

-- Alerty
CREATE INDEX idx_assistant_alerts_user_unread
  ON assistant_alerts(user_id)
  WHERE is_read = FALSE AND dismissed_at IS NULL;

CREATE INDEX idx_assistant_alerts_user_priority
  ON assistant_alerts(user_id, priority, created_at DESC);

CREATE INDEX idx_assistant_alerts_entity
  ON assistant_alerts(entity_type, entity_id);

CREATE INDEX idx_assistant_alerts_type
  ON assistant_alerts(alert_type, created_at DESC);

-- Preference
CREATE INDEX idx_assistant_preferences_user
  ON assistant_user_preferences(user_id);

CREATE INDEX idx_assistant_preferences_user_type
  ON assistant_user_preferences(user_id, preference_type);

-- =============================================================================
-- Trigger pro updated_at
-- =============================================================================

CREATE TRIGGER assistant_preferences_updated_at
  BEFORE UPDATE ON assistant_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE assistant_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_user_preferences ENABLE ROW LEVEL SECURITY;

-- Alerty: uživatel vidí své alerty a alerty pro všechny (user_id IS NULL)
CREATE POLICY "Users view their alerts"
  ON assistant_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Alerty: uživatel může upravovat pouze své (označit jako přečtené)
CREATE POLICY "Users update their alerts"
  ON assistant_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Insert do alertů pouze pro service role (cron job)
-- UPDATE pro dismiss/read povoleno přes policy výše

-- Preference: uživatel má přístup pouze ke svým preferencím
CREATE POLICY "Users own their preferences"
  ON assistant_user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- Komentáře
-- =============================================================================

COMMENT ON TABLE assistant_alerts IS 'Proaktivní upozornění AI asistenta';
COMMENT ON TABLE assistant_user_preferences IS 'Naučené preference uživatele pro personalizaci asistenta';

COMMENT ON COLUMN assistant_alerts.priority IS 'Priorita: low, normal, high, urgent';
COMMENT ON COLUMN assistant_user_preferences.learned_from IS 'Zdroj: explicit (uživatel řekl), implicit (asistent se naučil)';
COMMENT ON COLUMN assistant_user_preferences.confidence IS 'Míra jistoty preference (0-1)';
