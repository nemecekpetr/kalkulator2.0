-- =============================================================================
-- AI Assistant Tables
-- Tabulky pro AI asistenta "Rentmil" s podporou konverzací, RAG a audit logu
-- =============================================================================

-- Konverzace uživatele s asistentem
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,  -- Auto-generováno z první zprávy
  is_active BOOLEAN DEFAULT TRUE
);

-- Jednotlivé zprávy v konverzaci
CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  -- Tool use tracking
  tool_calls JSONB,  -- Array of {tool_name, tool_input, tool_result, status}
  -- Kontext stránky při odeslání zprávy
  page_context JSONB,  -- {pathname, entityId, entityType}
  -- Tokeny pro analytiku (volitelné)
  input_tokens INTEGER,
  output_tokens INTEGER
);

-- RAG knowledge base pro obsah z rentmil.cz
CREATE TABLE IF NOT EXISTS assistant_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('page', 'faq', 'product', 'blog', 'pricing')),
  title TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,  -- Pro detekci změn a deduplikaci
  -- Metadata pro lepší vyhledávání
  keywords TEXT[],  -- Klíčová slova pro keyword search
  metadata JSONB,  -- Další strukturovaná data
  active BOOLEAN DEFAULT TRUE,
  -- Unique constraint pro URL a hash
  UNIQUE (source_url, content_hash)
);

-- Audit log pro write operace AI asistenta
CREATE TABLE IF NOT EXISTS assistant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES assistant_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES assistant_messages(id) ON DELETE SET NULL,
  -- Co bylo provedeno
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  tool_result JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  -- Co bylo ovlivněno
  affected_table TEXT,
  affected_record_id UUID
);

-- =============================================================================
-- Indexy
-- =============================================================================

CREATE INDEX idx_assistant_conversations_user
  ON assistant_conversations(user_id, is_active);

CREATE INDEX idx_assistant_conversations_updated
  ON assistant_conversations(updated_at DESC);

CREATE INDEX idx_assistant_messages_conversation
  ON assistant_messages(conversation_id, created_at);

CREATE INDEX idx_assistant_knowledge_source
  ON assistant_knowledge(source_url);

CREATE INDEX idx_assistant_knowledge_type
  ON assistant_knowledge(source_type, active);

CREATE INDEX idx_assistant_knowledge_keywords
  ON assistant_knowledge USING GIN(keywords);

CREATE INDEX idx_assistant_audit_user
  ON assistant_audit_log(user_id, created_at DESC);

CREATE INDEX idx_assistant_audit_conversation
  ON assistant_audit_log(conversation_id);

-- =============================================================================
-- Trigger pro updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_assistant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assistant_conversations_updated_at
  BEFORE UPDATE ON assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_updated_at();

CREATE TRIGGER assistant_knowledge_updated_at
  BEFORE UPDATE ON assistant_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_updated_at();

-- Také aktualizovat conversation.updated_at při nové zprávě
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assistant_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assistant_messages_update_conversation
  AFTER INSERT ON assistant_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_audit_log ENABLE ROW LEVEL SECURITY;

-- Uživatelé vidí pouze své konverzace
CREATE POLICY "Users own their conversations"
  ON assistant_conversations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Uživatelé vidí pouze zprávy ve svých konverzacích
CREATE POLICY "Users own their messages"
  ON assistant_messages FOR ALL
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM assistant_conversations WHERE user_id = auth.uid()
    )
  );

-- Knowledge base je čitelná pro všechny autentizované uživatele
CREATE POLICY "Knowledge readable by authenticated"
  ON assistant_knowledge FOR SELECT
  TO authenticated
  USING (active = true);

-- Knowledge base může upravovat pouze service role (pro indexovací script)
-- (Insert/Update/Delete pouze přes service role key)

-- Uživatelé vidí svůj vlastní audit log
CREATE POLICY "Users view their audit log"
  ON assistant_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert do audit logu povoleno pro všechny autentizované
CREATE POLICY "Users can insert audit log"
  ON assistant_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- Komentáře
-- =============================================================================

COMMENT ON TABLE assistant_conversations IS 'Konverzace uživatelů s AI asistentem Rentmil';
COMMENT ON TABLE assistant_messages IS 'Zprávy v konverzacích s AI asistentem';
COMMENT ON TABLE assistant_knowledge IS 'RAG knowledge base s obsahem z rentmil.cz';
COMMENT ON TABLE assistant_audit_log IS 'Audit log write operací provedených AI asistentem';
