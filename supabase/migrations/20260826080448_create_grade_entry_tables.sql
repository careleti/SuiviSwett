/*
# Grade entry: grade sessions and individual scores

1. New Tables
- `grade_sessions` — a grade entry session created by a teacher for a specific class + subject
  - `id` (uuid, primary key)
  - `teacher_id` (uuid, FK to user_profiles ON DELETE CASCADE)
  - `class_id` (uuid, FK to classes ON DELETE CASCADE)
  - `subject_id` (uuid, FK to subjects ON DELETE CASCADE)
  - `school_id` (uuid, FK to schools ON DELETE CASCADE) — denormalized for RLS scoping
  - `title` (text, not null) — e.g. "Contrôle 1"
  - `max_score` (numeric, default 20)
  - `status` (text, not null, default 'draft') — 'draft' | 'submitted' | 'validated'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - CHECK constraint on status values

- `grade_scores` — individual student scores within a grade session
  - `id` (uuid, primary key)
  - `session_id` (uuid, FK to grade_sessions ON DELETE CASCADE)
  - `student_id` (uuid, FK to students ON DELETE CASCADE)
  - `score` (numeric, nullable) — null means not yet entered
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE on (session_id, student_id)

2. Security
- Enable RLS on both tables.
- Teachers can CRUD their own grade_sessions (teacher_id = auth.uid()).
- Teachers can CRUD grade_scores for sessions they own.
- School admins can read all grade_sessions/scores in their school and update status (validate).
- Students/parents see nothing until status = 'validated' (no policy for anon/parent read).
- Teacher_classes and teacher_subjects: add SELECT policy so teachers can read their own assignments.

3. Notes
- A grade session is created when a teacher starts entering notes for a class+subject.
- 'draft' = only the teacher sees it. 'submitted' = admin can see and validate. 'validated' = visible to students/parents (future).
- Scores are nullable so un-entered students show as blank, not zero.
*/

-- Step 1: Create grade_sessions table
CREATE TABLE IF NOT EXISTS grade_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Évaluation',
  max_score numeric NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE grade_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_grade_sessions_teacher_id ON grade_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grade_sessions_class_id ON grade_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_grade_sessions_subject_id ON grade_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_grade_sessions_school_id ON grade_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_grade_sessions_status ON grade_sessions(status);

-- Step 2: Create grade_scores table
CREATE TABLE IF NOT EXISTS grade_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES grade_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (session_id, student_id)
);

ALTER TABLE grade_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_grade_scores_session_id ON grade_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_grade_scores_student_id ON grade_scores(student_id);

-- Step 3: RLS policies for grade_sessions
-- Teachers can CRUD their own sessions
DROP POLICY IF EXISTS "teacher_select_own_sessions" ON grade_sessions;
CREATE POLICY "teacher_select_own_sessions" ON grade_sessions
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = grade_sessions.school_id
      )
    )
  );

DROP POLICY IF EXISTS "teacher_insert_own_sessions" ON grade_sessions;
CREATE POLICY "teacher_insert_own_sessions" ON grade_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'enseignant'
      AND up.school_id = grade_sessions.school_id
    )
  );

DROP POLICY IF EXISTS "teacher_update_own_sessions" ON grade_sessions;
CREATE POLICY "teacher_update_own_sessions" ON grade_sessions
  FOR UPDATE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = grade_sessions.school_id
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
        AND up.school_id = grade_sessions.school_id
      )
    )
  );

DROP POLICY IF EXISTS "teacher_delete_own_sessions" ON grade_sessions;
CREATE POLICY "teacher_delete_own_sessions" ON grade_sessions
  FOR DELETE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
  );

-- Step 4: RLS policies for grade_scores
-- Teachers can read/write scores for their own sessions
DROP POLICY IF EXISTS "teacher_select_own_scores" ON grade_scores;
CREATE POLICY "teacher_select_own_scores" ON grade_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_sessions gs
      WHERE gs.id = grade_scores.session_id
      AND (
        gs.teacher_id = auth.uid()
        OR public.is_super_admin()
        OR (
          EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin_ecole'
            AND up.school_id = gs.school_id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "teacher_insert_own_scores" ON grade_scores;
CREATE POLICY "teacher_insert_own_scores" ON grade_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grade_sessions gs
      WHERE gs.id = grade_scores.session_id
      AND gs.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_update_own_scores" ON grade_scores;
CREATE POLICY "teacher_update_own_scores" ON grade_scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_sessions gs
      WHERE gs.id = grade_scores.session_id
      AND gs.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grade_sessions gs
      WHERE gs.id = grade_scores.session_id
      AND gs.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_delete_own_scores" ON grade_scores;
CREATE POLICY "teacher_delete_own_scores" ON grade_scores
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_sessions gs
      WHERE gs.id = grade_scores.session_id
      AND gs.teacher_id = auth.uid()
    )
  );

-- Step 5: Allow teachers to read their own assignments from teacher_classes and teacher_subjects
DROP POLICY IF EXISTS "teacher_read_own_class_assignments" ON teacher_classes;
CREATE POLICY "teacher_read_own_class_assignments" ON teacher_classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = teacher_classes.school_id
      )
    )
  );

DROP POLICY IF EXISTS "teacher_read_own_subject_assignments" ON teacher_subjects;
CREATE POLICY "teacher_read_own_subject_assignments" ON teacher_subjects
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = teacher_subjects.school_id
      )
    )
  );

-- Step 6: Allow teachers to read students in their assigned classes
DROP POLICY IF EXISTS "teacher_read_class_students" ON students;
CREATE POLICY "teacher_read_class_students" ON students
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = students.school_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
        AND tc.class_id = students.class_id
      )
    )
  );

-- Step 7: Allow teachers to read class names for their assigned classes
DROP POLICY IF EXISTS "teacher_read_assigned_classes" ON classes;
CREATE POLICY "teacher_read_assigned_classes" ON classes
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
        AND up.school_id = classes.school_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
        AND tc.class_id = classes.id
      )
    )
  );

-- Step 8: Allow teachers to read subjects they are assigned to
DROP POLICY IF EXISTS "teacher_read_assigned_subjects" ON subjects;
CREATE POLICY "teacher_read_assigned_subjects" ON subjects
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin_ecole'
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM teacher_subjects ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.subject_id = subjects.id
      )
    )
  );
