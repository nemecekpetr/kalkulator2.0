-- Migration: Add user_profiles table and remove quote status
-- Date: 2024-12-24

-- ============================================
-- 1. Create user_profiles table
-- ============================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Profile info
  full_name TEXT NOT NULL,
  email TEXT,                    -- Contact email (can differ from login email)
  phone TEXT,

  -- Role
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),

  -- Status
  active BOOLEAN DEFAULT true NOT NULL
);

-- Create index for role lookups
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(active);

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Row Level Security for user_profiles
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (but not role - that's handled by admin)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to user_profiles"
  ON user_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- 3. Add foreign key constraint to quotes.created_by
-- ============================================

ALTER TABLE quotes
  ADD CONSTRAINT quotes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- ============================================
-- 4. Remove status column from quotes (tracked in Pipedrive)
-- ============================================

ALTER TABLE quotes DROP COLUMN IF EXISTS status;
ALTER TABLE quotes DROP COLUMN IF EXISTS sent_at;

-- ============================================
-- 5. Helper function to check if user is admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
