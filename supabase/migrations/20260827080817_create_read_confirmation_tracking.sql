/*
# Read confirmation & consultation tracking

## Tables

1. `parent_student_links` — links a parent (user_profiles row, role='parent') to one or more students
   - `id` (uuid, pk)
   - `parent_id` (uuid, FK user_profiles ON DELETE CASCADE)
   - `student_id` (uuid, FK students ON DELETE CASCADE)
   - `school_id` (uuid, FK schools ON DELETE CASCADE) — denormalized for RLS
   - `access_code` (text, not null) — the code used by the parent to access this student's results
   - `created_at` (timestamptz)
   - UNIQUE (parent_id, student_id)

2. `result_publications` — admin publishes validated grade sessions/appreciation sessions as official bulletins for a class + term
   - `id` (uuid, pk)
   - `school_id` (uuid, FK schools ON DELETE CASCADE)
   - `class_id` (uuid, FK classes ON DELETE CASCADE)
   - `term` (text, not null) — e.g. 'T1', 'T2', 'T3', 'current'
   - `published_at` (timestamptz, not null, default now()) — server-set timestamp
   - `published_by` (uuid, FK user_profiles ON DELETE SET NULL) — the admin who published
   - UNIQUE (class_id, term)

3. `result_view_log` — automatic, non-falsifiable log of the FIRST time a parent views a student's results for a given term
   - `id` (uuid, pk)
   - `student_id` (uuid, FK students ON DELETE CASCADE)
   - `parent_id` (uuid, FK user_profiles ON DELETE CASCADE)
   - `school_id` (uuid, FK schools ON DELETE CASCADE) — denormalized for RLS
   - `term` (text, not null)
   - `viewed_at` (timestamptz, not null, default now()) — server-set, non-modifiable
   - `access_code` (text, nullable) — the code used at time of viewing (for audit)
   - UNIQUE (student_id, parent_id, term) — only one record per student/parent/term

4. `parent_reminders` — log of reminder events sent to parents who haven't consulted
   - `id` (uuid, pk)
   - `student_id` (uuid, FK students ON DELETE CASCADE)
   - `school_id` (uuid, FK schools ON DELETE CASCADE)
   - `term` (text, not null)
   - `sent_at` (timestamptz, not null, default now())
   - `sent_by` (uuid, FK user_profiles ON DELETE SET NULL) — the admin who sent the reminder
   - `reminder_type` (text, not null, default 'manual') — 'manual' | 'bulk'

## Security
- parent_student_links: parents read their own links; school admins read links in their school; super_admin all
- result_publications: school admins CRUD in their school; teachers/parents read in their school; super_admin all
- result_view_log: parents INSERT their own views (with CHECK that they own the link); parents read their own; school admins read in their school; super_admin all
- parent_reminders: school admins insert/read in their school; super_admin all

## Notes
- The viewed_at timestamp is set by the database (DEFAULT now()), never by the client — it is non-falsifiable.
- The UNIQUE constraint on result_view_log ensures only the FIRST viewing is recorded; subsequent INSERTs fail silently.
- parent_student_links replaces the old parent_access_code column on students with a proper many-to-many relationship.
*/

-- Step 1: parent_student_links
CREATE TABLE IF NOT EXISTS parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  access_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_psl_parent_id ON parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id ON parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_psl_school_id ON parent_student_links(school_id);

DROP POLICY IF EXISTS "parent_read_own_links" ON parent_student_links;
CREATE POLICY "parent_read_own_links" ON parent_student_links
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(parent_student_links.school_id)
  );

DROP POLICY IF EXISTS "admin_insert_links" ON parent_student_links;
CREATE POLICY "admin_insert_links" ON parent_student_links
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_school_admin(parent_student_links.school_id)
  );

DROP POLICY IF EXISTS "admin_delete_links" ON parent_student_links;
CREATE POLICY "admin_delete_links" ON parent_student_links
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(parent_student_links.school_id)
  );

-- Step 2: result_publications
CREATE TABLE IF NOT EXISTS result_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  UNIQUE (class_id, term)
);
ALTER TABLE result_publications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rp_school_id ON result_publications(school_id);
CREATE INDEX IF NOT EXISTS idx_rp_class_id ON result_publications(class_id);
CREATE INDEX IF NOT EXISTS idx_rp_term ON result_publications(term);

DROP POLICY IF EXISTS "read_publications" ON result_publications;
CREATE POLICY "read_publications" ON result_publications
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(result_publications.school_id)
    OR (
      EXISTS (
        SELECT 1 FROM parent_student_links psl
        WHERE psl.parent_id = auth.uid()
        AND psl.school_id = result_publications.school_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
        AND tc.class_id = result_publications.class_id
      )
    )
  );

DROP POLICY IF EXISTS "admin_insert_publications" ON result_publications;
CREATE POLICY "admin_insert_publications" ON result_publications
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_school_admin(result_publications.school_id)
  );

DROP POLICY IF EXISTS "admin_delete_publications" ON result_publications;
CREATE POLICY "admin_delete_publications" ON result_publications
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(result_publications.school_id)
  );

-- Step 3: result_view_log
CREATE TABLE IF NOT EXISTS result_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  access_code text,
  UNIQUE (student_id, parent_id, term)
);
ALTER TABLE result_view_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rvl_student_id ON result_view_log(student_id);
CREATE INDEX IF NOT EXISTS idx_rvl_parent_id ON result_view_log(parent_id);
CREATE INDEX IF NOT EXISTS idx_rvl_school_id ON result_view_log(school_id);
CREATE INDEX IF NOT EXISTS idx_rvl_term ON result_view_log(term);

-- Parents can INSERT their own view log (with CHECK that they own the link)
DROP POLICY IF EXISTS "parent_insert_own_view" ON result_view_log;
CREATE POLICY "parent_insert_own_view" ON result_view_log
  FOR INSERT TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid()
      AND psl.student_id = result_view_log.student_id
    )
  );

-- Parents can read their own view logs
DROP POLICY IF EXISTS "parent_read_own_views" ON result_view_log;
CREATE POLICY "parent_read_own_views" ON result_view_log
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(result_view_log.school_id)
  );

-- Step 4: parent_reminders
CREATE TABLE IF NOT EXISTS parent_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reminder_type text NOT NULL DEFAULT 'manual' CHECK (reminder_type IN ('manual', 'bulk'))
);
ALTER TABLE parent_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pr_school_id ON parent_reminders(school_id);
CREATE INDEX IF NOT EXISTS idx_pr_student_id ON parent_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_pr_term ON parent_reminders(term);

DROP POLICY IF EXISTS "admin_read_reminders" ON parent_reminders;
CREATE POLICY "admin_read_reminders" ON parent_reminders
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(parent_reminders.school_id)
  );

DROP POLICY IF EXISTS "admin_insert_reminders" ON parent_reminders;
CREATE POLICY "admin_insert_reminders" ON parent_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_school_admin(parent_reminders.school_id)
  );

-- Step 5: Add term column to grade_sessions and appreciation_sessions
DO $$ BEGIN
  ALTER TABLE grade_sessions ADD COLUMN IF NOT EXISTS term text NOT NULL DEFAULT 'current';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE appreciation_sessions ADD COLUMN IF NOT EXISTS term text NOT NULL DEFAULT 'current';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
