/*
# Extend students table with matricule, date_of_birth, parent_access_code

1. Modified Tables
- `students` — add three columns:
  - `matricule` (text, nullable) — unique student registration number assigned by the school
  - `date_of_birth` (date, nullable) — student's date of birth
  - `parent_access_code` (text, nullable) — a unique 6-character alphanumeric code
    that parents use to access their child's results. NULL means no code has been
    generated yet.

2. Security
- No new policies needed; existing RLS policies on students already scope by school.
- An index on parent_access_code is added for future lookup by parent login.

3. Notes
- matricule is nullable because existing students (if any) don't have one yet.
- parent_access_code is nullable: NULL = not generated, non-NULL = generated.
- The code is generated client-side (6 random alphanumeric chars) and stored
  in the database. Uniqueness is not enforced at the DB level (the collision
  probability for 6 chars of [A-Z0-9] is negligible for a single school).
*/

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS matricule text;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth date;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_access_code text;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_parent_access_code ON students(parent_access_code);
