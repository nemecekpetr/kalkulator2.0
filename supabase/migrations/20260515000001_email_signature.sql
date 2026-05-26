-- Email signature generator
-- Extends user_profiles with signature settings, creates signature_banners library,
-- sets up Storage bucket for banner images, seeds default evergreen banner.

-- 1. Extend user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS signature_template TEXT DEFAULT 'banner',
  ADD COLUMN IF NOT EXISTS signature_banner_id UUID;

-- 2. Banner library table
CREATE TABLE IF NOT EXISTS signature_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  is_evergreen BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- 3. Only one evergreen banner at a time
CREATE UNIQUE INDEX IF NOT EXISTS signature_banners_evergreen_unique
  ON signature_banners (is_evergreen)
  WHERE is_evergreen = TRUE;

-- 4. FK from user_profiles.signature_banner_id → signature_banners.id
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_signature_banner_fk
  FOREIGN KEY (signature_banner_id)
  REFERENCES signature_banners(id)
  ON DELETE SET NULL;

-- 5. updated_at trigger
CREATE TRIGGER update_signature_banners_updated_at
  BEFORE UPDATE ON signature_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Storage bucket (public read for email clients to fetch banner images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('signature-banners', 'signature-banners', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed default evergreen banner (path-only image_url, resolved against NEXT_PUBLIC_APP_URL at render time)
INSERT INTO signature_banners (name, image_url, link_url, is_evergreen, sort_order)
SELECT
  'Spočítejte si bazén zdarma',
  '/logo-email.png',
  'https://rentmil.cz/konfigurator',
  TRUE,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM signature_banners WHERE is_evergreen = TRUE
);
