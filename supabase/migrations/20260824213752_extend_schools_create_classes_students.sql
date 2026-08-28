/*
# Extend schools table and create classes/students tables

1. Modified Tables
- `schools` — add columns for school management:
  - `address` (text, nullable) — physical address of the school
  - `renewal_date` (date, nullable) — subscription renewal date
  - `contact_name` (text, nullable) — name of the school's admin contact
  - `contact_email` (text, nullable) — email of the school's admin contact

2. New Tables
- `classes` — classes within a school
  - `id` (uuid, primary key)
  - `school_id` (uuid, FK to schools, cascade delete)
  - `name` (text, not null) — class name (e.g. "6ème A")
  - `level` (text) — educational level (e.g. "Collège", "Lycée")
  - `created_at` (timestamptz)

- `students` — students enrolled in a school
  - `id` (uuid, primary key)
  - `school_id` (uuid, FK to schools, cascade delete)
  - `class_id` (uuid, FK to classes, cascade delete)
  - `first_name` (text, not null)
  - `last_name` (text, not null)
  - `created_at` (timestamptz)

3. Security
- Enable RLS on classes and students.
- super_admin: full CRUD on classes and students (all schools).
- Other roles: can read classes and students within their own school only.
- user_profiles: add INSERT policy for super_admin (to create admin_ecole profiles).

4. Notes
- Teachers are counted via user_profiles where role = 'enseignant' and school_id matches.
- Student counts come from the students table.
- The edge function creates auth users + profiles using the service role key (bypasses RLS).
*/

-- Step 1: Add columns to schools
DO $$ BEGIN
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS address text;
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS renewal_date date;
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_name text;
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_email text;
END $$;

-- Step 2: Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- super_admin can do everything on classes
DROP POLICY IF EXISTS "super_admin_all_classes" ON classes;
CREATE POLICY "super_admin_all_classes" ON classes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin')
  );

-- Other roles can read classes in their own school
DROP POLICY IF EXISTS "read_own_school_classes" ON classes;
CREATE POLICY "read_own_school_classes" ON classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.school_id = classes.school_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

-- Step 3: Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- super_admin can do everything on students
DROP POLICY IF EXISTS "super_admin_all_students" ON students;
CREATE POLICY "super_admin_all_students" ON students
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin')
  );

-- Other roles can read students in their own school
DROP POLICY IF EXISTS "read_own_school_students" ON students;
CREATE POLICY "read_own_school_students" ON students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.school_id = students.school_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- Step 4: Add INSERT policy for super_admin on user_profiles
-- (needed so the edge function can create profiles, though it uses service role key which bypasses RLS)
DROP POLICY IF EXISTS "super_admin_insert_profiles" ON user_profiles;
CREATE POLICY "super_admin_insert_profiles" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );
