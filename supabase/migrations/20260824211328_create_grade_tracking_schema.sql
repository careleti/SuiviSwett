/*
# Create academic grade tracking schema (single-tenant, no auth)

1. New Tables
- `subjects` — academic subjects (e.g. Mathématiques, Histoire)
  - `id` (uuid, primary key)
  - `name` (text, not null) — subject name
  - `color` (text) — hex color for the subject accent
  - `coefficient` (numeric, default 1) — weight of the subject in the overall average
  - `target_grade` (numeric) — the student's goal for this subject
  - `position` (int, default 0) — display order
  - `created_at` (timestamptz)

- `grades` — individual grade entries within a subject
  - `id` (uuid, primary key)
  - `subject_id` (uuid, FK to subjects, cascade delete)
  - `title` (text, not null) — description of the assessment (e.g. "Contrôle continu")
  - `score` (numeric, not null) — the grade value (out of 20)
  - `max_score` (numeric, default 20) — maximum possible score
  - `coefficient` (numeric, default 1) — weight within the subject
  - `grade_date` (date) — when the grade was received
  - `created_at` (timestamptz)

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated full CRUD — this is a single-tenant app with no sign-in screen.
- `USING (true)` is acceptable here because the data is intentionally public/shared.

3. Notes
- All grades are on a 20-point scale (French academic system).
- The overall average is computed as a weighted mean across subjects and grades.
- `subjects.position` allows manual reordering of subjects in the UI.
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#1B2A4A',
  coefficient numeric NOT NULL DEFAULT 1,
  target_grade numeric DEFAULT 10,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
CREATE POLICY "anon_select_subjects" ON subjects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
CREATE POLICY "anon_insert_subjects" ON subjects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
CREATE POLICY "anon_update_subjects" ON subjects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
CREATE POLICY "anon_delete_subjects" ON subjects FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  score numeric NOT NULL,
  max_score numeric NOT NULL DEFAULT 20,
  coefficient numeric NOT NULL DEFAULT 1,
  grade_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_grades" ON grades;
CREATE POLICY "anon_select_grades" ON grades FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_grades" ON grades;
CREATE POLICY "anon_insert_grades" ON grades FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_grades" ON grades;
CREATE POLICY "anon_update_grades" ON grades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_grades" ON grades;
CREATE POLICY "anon_delete_grades" ON grades FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(grade_date);
