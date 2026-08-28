/*
# Create schools and user_profiles tables for role-based auth

1. New Tables
- `schools` — represents a school/establishment on the platform
  - `id` (uuid, primary key)
  - `name` (text, not null) — school name
  - `city` (text) — city where the school is located
  - `country` (text, default 'Bénin')
  - `subscription_status` (text, default 'trial') — trial, active, suspended, expired
  - `created_at` (timestamptz)

- `user_profiles` — links a Supabase auth user to a role and optionally a school
  - `id` (uuid, primary key, references auth.users ON DELETE CASCADE)
  - `email` (text, not null)
  - `full_name` (text) — display name
  - `role` (text, not null) — one of: super_admin, admin_ecole, enseignant, parent
  - `school_id` (uuid, nullable, references schools ON DELETE SET NULL) — null for super_admin
  - `created_at` (timestamptz)

2. Security
- Enable RLS on both tables.
- `schools`: super_admin can CRUD all schools; other roles can read their own school.
- `user_profiles`: each user reads their own profile; super_admin reads all.
- No INSERT/UPDATE/DELETE on user_profiles via the API (managed server-side).

3. Notes
- super_admin has school_id = null and sees all schools.
- All other roles are associated with exactly one school.
- Email confirmation is OFF (Supabase default).
*/

-- Step 1: Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  country text NOT NULL DEFAULT 'Bénin',
  subscription_status text NOT NULL DEFAULT 'trial',
  created_at timestamptz DEFAULT now()
);

-- Step 2: Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin_ecole', 'enseignant', 'parent')),
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 3: Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Schools policies
-- super_admin can do everything on schools
DROP POLICY IF EXISTS "super_admin_all_schools" ON schools;
CREATE POLICY "super_admin_all_schools" ON schools
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Non-super-admin users can read their own school
DROP POLICY IF EXISTS "read_own_school" ON schools;
CREATE POLICY "read_own_school" ON schools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.school_id = schools.id
    )
  );

-- Step 5: user_profiles policies
-- Each user can read their own profile
DROP POLICY IF EXISTS "read_own_profile" ON user_profiles;
CREATE POLICY "read_own_profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- super_admin can read all profiles
DROP POLICY IF EXISTS "super_admin_read_all_profiles" ON user_profiles;
CREATE POLICY "super_admin_read_all_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Step 6: Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Step 7: Insert a demo school
INSERT INTO schools (name, city, country, subscription_status)
SELECT 'École Pilote de Cotonou', 'Cotonou', 'Bénin', 'active'
WHERE NOT EXISTS (SELECT 1 FROM schools LIMIT 1);
