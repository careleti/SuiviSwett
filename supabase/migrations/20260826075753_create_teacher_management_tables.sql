/*
# Teacher management: activation status + assignment junction tables

1. Modified Tables
- `user_profiles` — add `is_active` column (boolean, default true)
  - Used to activate/deactivate teacher (and other) accounts without deleting them
  - When false, the user still exists in auth.users but is effectively disabled

2. New Tables
- `teacher_classes` — many-to-many: which classes a teacher is assigned to
  - `id` (uuid, primary key)
  - `teacher_id` (uuid, FK to user_profiles ON DELETE CASCADE)
  - `class_id` (uuid, FK to classes ON DELETE CASCADE)
  - `school_id` (uuid, FK to schools ON DELETE CASCADE) — denormalized for RLS scoping
  - `created_at` (timestamptz)
  - UNIQUE constraint on (teacher_id, class_id)

- `teacher_subjects` — many-to-many: which subjects a teacher teaches
  - `id` (uuid, primary key)
  - `teacher_id` (uuid, FK to user_profiles ON DELETE CASCADE)
  - `subject_id` (uuid, FK to subjects ON DELETE CASCADE)
  - `school_id` (uuid, FK to schools ON DELETE CASCADE) — denormalized for RLS scoping
  - `created_at` (timestamptz)
  - UNIQUE constraint on (teacher_id, subject_id)

3. Security
- Enable RLS on both new tables.
- School-scoped policies: school admins and super admins can CRUD rows for their own school.
- Uses the is_super_admin() SECURITY DEFINER function (already exists) for super_admin checks.
- School admins: checked via user_profiles.school_id matching the junction table's school_id AND role = 'admin_ecole'.

4. Notes
- Subjects are currently global (no school_id). The teacher_subjects junction links a teacher
  to a subject within a school context, so the school_id column enables proper RLS scoping.
- Deactivating a teacher sets is_active = false on user_profiles; the account remains but
  cannot be used for login (enforced via the is_active column check, though Supabase Auth
  itself doesn't enforce this — the app checks it).
*/

-- Step 1: Add is_active column to user_profiles
DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
END $$;

-- Step 2: Create teacher_classes junction table
CREATE TABLE IF NOT EXISTS teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, class_id)
);

ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON teacher_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_school_id ON teacher_classes(school_id);

-- Step 3: Create teacher_subjects junction table
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_id ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_school_id ON teacher_subjects(school_id);

-- Step 4: RLS policies for teacher_classes
-- School admin can manage their school's teacher-class assignments
DROP POLICY IF EXISTS "school_admin_read_teacher_classes" ON teacher_classes;
CREATE POLICY "school_admin_read_teacher_classes" ON teacher_classes
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin_ecole'
        AND user_profiles.school_id = teacher_classes.school_id
      )
    )
  );

DROP POLICY IF EXISTS "school_admin_insert_teacher_classes" ON teacher_classes;
CREATE POLICY "school_admin_insert_teacher_classes" ON teacher_classes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin_ecole'
        AND user_profiles.school_id = teacher_classes.school_id
      )
    )
  );

DROP POLICY IF EXISTS "school_admin_delete_teacher_classes" ON teacher_classes;
CREATE POLICY "school_admin_delete_teacher_classes" ON teacher_classes
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin_ecole'
        AND user_profiles.school_id = teacher_classes.school_id
      )
    )
  );

-- Step 5: RLS policies for teacher_subjects
DROP POLICY IF EXISTS "school_admin_read_teacher_subjects" ON teacher_subjects;
CREATE POLICY "school_admin_read_teacher_subjects" ON teacher_subjects
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin_ecole'
        AND user_profiles.school_id = teacher_subjects.school_id
      )
    )
  );

DROP POLICY IF EXISTS "school_admin_insert_teacher_subjects" ON teacher_subjects;
CREATE POLICY "school_admin_insert_teacher_subjects" ON teacher_subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin_ecole'
        AND user_profiles.school_id = teacher_subjects.school_id
      )
    )
  );

DROP POLICY IF EXISTS "school_admin_delete_teacher_subjects" ON teacher_subjects;
CREATE POLICY "school_admin_delete_teacher_subjects" ON teacher_subjects
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin_ecole'
        AND user_profiles.school_id = teacher_subjects.school_id
      )
    )
  );

-- Step 6: Allow school admins to update is_active on user_profiles for teachers in their school
-- (They need UPDATE on user_profiles rows where role = 'enseignant' and school_id matches)
DROP POLICY IF EXISTS "school_admin_update_teacher_active" ON user_profiles;
CREATE POLICY "school_admin_update_teacher_active" ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = user_profiles.school_id
      )
      AND user_profiles.role = 'enseignant'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = user_profiles.school_id
      )
      AND user_profiles.role = 'enseignant'
    )
  );

-- Step 7: Allow school admins to read teacher profiles in their school
-- (read_own_profile already exists, but school admins need to read ALL profiles in their school)
DROP POLICY IF EXISTS "school_admin_read_school_profiles" ON user_profiles;
CREATE POLICY "school_admin_read_school_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = user_profiles.school_id
      )
    )
  );
