/*
# Appreciation entry: sessions and per-student text comments

1. New Tables
- `appreciation_sessions` — a comment-entry session created by a teacher for a specific class + subject
  - `id` (uuid, primary key)
  - `teacher_id` (uuid, FK to user_profiles ON DELETE CASCADE)
  - `class_id` (uuid, FK to classes ON DELETE CASCADE)
  - `subject_id` (uuid, FK to subjects ON DELETE CASCADE)
  - `school_id` (uuid, FK to schools ON DELETE CASCADE) — denormalized for RLS scoping
  - `term` (text, not null, default 'current') — identifies the grading period ('current', 'previous', 'T1', etc.)
  - `status` (text, not null, default 'draft') — 'draft' | 'submitted' | 'validated'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - CHECK constraint on status values

- `appreciation_entries` — individual student text comments within a session
  - `id` (uuid, primary key)
  - `session_id` (uuid, FK to appreciation_sessions ON DELETE CASCADE)
  - `student_id` (uuid, FK to students ON DELETE CASCADE)
  - `comment` (text, nullable) — the free-text appreciation
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE on (session_id, student_id)

2. Security
- Enable RLS on both tables.
- Teachers can CRUD their own appreciation_sessions (teacher_id = auth.uid()).
- Teachers can CRUD appreciation_entries for sessions they own.
- School admins can read all sessions/entries in their school and update status (validate).
- Students/parents see nothing until status = 'validated' (no anon/parent read policy).

3. Notes
- An appreciation session mirrors the grade session pattern but stores text comments instead of numeric scores.
- The `term` column allows distinguishing the current term from previous terms, enabling the
  "previous term recall" feature where the teacher sees a greyed-out read-only copy of last term's
  appreciation while writing the current one.
- 'draft' = only the teacher sees it. 'submitted' = admin can validate. 'validated' = visible to students/parents (future).
*/

-- Step 1: Create appreciation_sessions table
CREATE TABLE IF NOT EXISTS appreciation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term text NOT NULL DEFAULT 'current',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appreciation_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_appreciation_sessions_teacher_id ON appreciation_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_appreciation_sessions_class_id ON appreciation_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_appreciation_sessions_subject_id ON appreciation_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_appreciation_sessions_school_id ON appreciation_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_appreciation_sessions_status ON appreciation_sessions(status);

-- Step 2: Create appreciation_entries table
CREATE TABLE IF NOT EXISTS appreciation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES appreciation_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (session_id, student_id)
);

ALTER TABLE appreciation_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_appreciation_entries_session_id ON appreciation_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_appreciation_entries_student_id ON appreciation_entries(student_id);

-- Step 3: RLS policies for appreciation_sessions
DROP POLICY IF EXISTS "teacher_select_own_appreciation_sessions" ON appreciation_sessions;
CREATE POLICY "teacher_select_own_appreciation_sessions" ON appreciation_sessions
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = appreciation_sessions.school_id
      )
    )
  );

DROP POLICY IF EXISTS "teacher_insert_own_appreciation_sessions" ON appreciation_sessions;
CREATE POLICY "teacher_insert_own_appreciation_sessions" ON appreciation_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'enseignant'
      AND up.school_id = appreciation_sessions.school_id
    )
  );

DROP POLICY IF EXISTS "teacher_update_own_appreciation_sessions" ON appreciation_sessions;
CREATE POLICY "teacher_update_own_appreciation_sessions" ON appreciation_sessions
  FOR UPDATE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = appreciation_sessions.school_id
      )
    )
  )
  WITH CHECK (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = appreciation_sessions.school_id
      )
    )
  );

DROP POLICY IF EXISTS "teacher_delete_own_appreciation_sessions" ON appreciation_sessions;
CREATE POLICY "teacher_delete_own_appreciation_sessions" ON appreciation_sessions
  FOR DELETE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
  );

-- Step 4: RLS policies for appreciation_entries
DROP POLICY IF EXISTS "teacher_select_own_appreciation_entries" ON appreciation_entries;
CREATE POLICY "teacher_select_own_appreciation_entries" ON appreciation_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appreciation_sessions aps
      WHERE aps.id = appreciation_entries.session_id
      AND (
        aps.teacher_id = auth.uid()
        OR public.is_super_admin()
        OR (
          EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin_ecole'
            AND up.school_id = aps.school_id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "teacher_insert_own_appreciation_entries" ON appreciation_entries;
CREATE POLICY "teacher_insert_own_appreciation_entries" ON appreciation_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appreciation_sessions aps
      WHERE aps.id = appreciation_entries.session_id
      AND aps.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_update_own_appreciation_entries" ON appreciation_entries;
CREATE POLICY "teacher_update_own_appreciation_entries" ON appreciation_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appreciation_sessions aps
      WHERE aps.id = appreciation_entries.session_id
      AND aps.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appreciation_sessions aps
      WHERE aps.id = appreciation_entries.session_id
      AND aps.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_delete_own_appreciation_entries" ON appreciation_entries;
CREATE POLICY "teacher_delete_own_appreciation_entries" ON appreciation_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appreciation_sessions aps
      WHERE aps.id = appreciation_entries.session_id
      AND aps.teacher_id = auth.uid()
    )
  );
