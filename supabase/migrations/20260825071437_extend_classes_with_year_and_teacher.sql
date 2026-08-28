/*
# Extend classes table with school_year and teacher_id

1. Modified Tables
- `classes` — add two columns:
  - `school_year` (text, nullable) — e.g. "2025-2026"
  - `teacher_id` (uuid, nullable, FK to user_profiles ON DELETE SET NULL) —
    the main teacher assigned to this class. Must be a user with role 'enseignant'
    in the same school.

2. Security
- No new policies needed; existing RLS policies on classes already scope by school.
- The teacher_id FK references user_profiles(id), which is already RLS-protected.

3. Notes
- teacher_id is nullable because a class may not have an assigned teacher yet.
- The FK uses ON DELETE SET NULL so removing a teacher account doesn't delete classes.
- An index on teacher_id is added for efficient lookup.
*/

DO $$ BEGIN
  ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_year text;
  ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
