/*
# Fix infinite recursion in user_profiles RLS policies

## Problem
Several RLS policies on user_profiles (and other tables) contain subqueries like:
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin_ecole' ...)
When PostgreSQL evaluates a SELECT policy on user_profiles, it runs that subquery on user_profiles,
which triggers the SELECT policy again, which runs the subquery again → infinite recursion.

The existing is_super_admin() function is SECURITY DEFINER and bypasses RLS, so it doesn't
recurse. We need the same pattern for school-admin checks.

## Solution
1. Create `is_school_admin(school_uuid)` — a SECURITY DEFINER STABLE function that checks
   whether the current user has role = 'admin_ecole' AND belongs to the given school.
   Because it is SECURITY DEFINER, it runs with the owner's privileges and bypasses RLS,
   so it never recurses.

2. Replace ALL inline `EXISTS (SELECT 1 FROM user_profiles ... role = 'admin_ecole' ...)`
   patterns in policies across every table with a call to `is_school_admin(table.school_id)`.

3. Drop and recreate the affected policies on:
   - user_profiles (school_admin_read_school_profiles, school_admin_update_teacher_active)
   - classes (read_own_school_classes)
   - students (read_own_school_students, teacher_read_class_students)
   - teacher_classes (school_admin_* policies, teacher_read_own_class_assignments)
   - teacher_subjects (school_admin_* policies, teacher_read_own_subject_assignments)
   - grade_sessions (teacher_select_own_sessions, teacher_update_own_sessions)
   - grade_scores (teacher_select_own_scores)
   - appreciation_sessions (teacher_select_own_appreciation_sessions, teacher_update_own_appreciation_sessions)
   - appreciation_entries (teacher_select_own_appreciation_entries)

## Notes
- is_super_admin() already exists and is SECURITY DEFINER — no change needed.
- is_school_admin() follows the same pattern: SECURITY DEFINER, STABLE, fixed search_path.
- All policies that previously queried user_profiles inline now call is_school_admin() instead.
- The read_own_profile policy (auth.uid() = id) is not recursive and stays unchanged.
*/

-- Step 1: Create is_school_admin() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_school_admin(school_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE id = auth.uid()
    AND role = 'admin_ecole'
    AND school_id = school_uuid
);
$$;

-- Step 2: Fix user_profiles policies
DROP POLICY IF EXISTS "school_admin_read_school_profiles" ON user_profiles;
CREATE POLICY "school_admin_read_school_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(user_profiles.school_id)
  );

DROP POLICY IF EXISTS "school_admin_update_teacher_active" ON user_profiles;
CREATE POLICY "school_admin_update_teacher_active" ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_school_admin(user_profiles.school_id) AND user_profiles.role = 'enseignant')
  )
  WITH CHECK (
    is_super_admin()
    OR (is_school_admin(user_profiles.school_id) AND user_profiles.role = 'enseignant')
  );

-- Step 3: Fix classes policies
DROP POLICY IF EXISTS "read_own_school_classes" ON classes;
CREATE POLICY "read_own_school_classes" ON classes
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(classes.school_id)
    OR (
      EXISTS (
        SELECT 1 FROM teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
        AND tc.class_id = classes.id
      )
    )
  );

-- Step 4: Fix students policies
DROP POLICY IF EXISTS "read_own_school_students" ON students;
CREATE POLICY "read_own_school_students" ON students
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(students.school_id)
    OR (
      EXISTS (
        SELECT 1 FROM teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
        AND tc.class_id = students.class_id
      )
    )
  );

-- Step 5: Fix teacher_classes policies
DROP POLICY IF EXISTS "school_admin_read_teacher_classes" ON teacher_classes;
CREATE POLICY "school_admin_read_teacher_classes" ON teacher_classes
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(teacher_classes.school_id)
    OR teacher_classes.teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "school_admin_insert_teacher_classes" ON teacher_classes;
CREATE POLICY "school_admin_insert_teacher_classes" ON teacher_classes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_school_admin(teacher_classes.school_id)
  );

DROP POLICY IF EXISTS "school_admin_delete_teacher_classes" ON teacher_classes;
CREATE POLICY "school_admin_delete_teacher_classes" ON teacher_classes
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(teacher_classes.school_id)
  );

DROP POLICY IF EXISTS "teacher_read_own_class_assignments" ON teacher_classes;
CREATE POLICY "teacher_read_own_class_assignments" ON teacher_classes
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(teacher_classes.school_id)
    OR teacher_classes.teacher_id = auth.uid()
  );

-- Step 6: Fix teacher_subjects policies
DROP POLICY IF EXISTS "school_admin_read_teacher_subjects" ON teacher_subjects;
CREATE POLICY "school_admin_read_teacher_subjects" ON teacher_subjects
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(teacher_subjects.school_id)
    OR teacher_subjects.teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "school_admin_insert_teacher_subjects" ON teacher_subjects;
CREATE POLICY "school_admin_insert_teacher_subjects" ON teacher_subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_school_admin(teacher_subjects.school_id)
  );

DROP POLICY IF EXISTS "school_admin_delete_teacher_subjects" ON teacher_subjects;
CREATE POLICY "school_admin_delete_teacher_subjects" ON teacher_subjects
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(teacher_subjects.school_id)
  );

DROP POLICY IF EXISTS "teacher_read_own_subject_assignments" ON teacher_subjects;
CREATE POLICY "teacher_read_own_subject_assignments" ON teacher_subjects
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR is_school_admin(teacher_subjects.school_id)
    OR teacher_subjects.teacher_id = auth.uid()
  );

-- Step 7: Fix grade_sessions policies
DROP POLICY IF EXISTS "teacher_select_own_sessions" ON grade_sessions;
CREATE POLICY "teacher_select_own_sessions" ON grade_sessions
  FOR SELECT TO authenticated
  USING (
    grade_sessions.teacher_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(grade_sessions.school_id)
  );

DROP POLICY IF EXISTS "teacher_update_own_sessions" ON grade_sessions;
CREATE POLICY "teacher_update_own_sessions" ON grade_sessions
  FOR UPDATE TO authenticated
  USING (
    grade_sessions.teacher_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(grade_sessions.school_id)
  )
  WITH CHECK (
    grade_sessions.teacher_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(grade_sessions.school_id)
  );

-- Step 8: Fix grade_scores SELECT policy
DROP POLICY IF EXISTS "teacher_select_own_scores" ON grade_scores;
CREATE POLICY "teacher_select_own_scores" ON grade_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_sessions gs
      WHERE gs.id = grade_scores.session_id
      AND (
        gs.teacher_id = auth.uid()
        OR is_super_admin()
        OR is_school_admin(gs.school_id)
      )
    )
  );

-- Step 9: Fix appreciation_sessions policies
DROP POLICY IF EXISTS "teacher_select_own_appreciation_sessions" ON appreciation_sessions;
CREATE POLICY "teacher_select_own_appreciation_sessions" ON appreciation_sessions
  FOR SELECT TO authenticated
  USING (
    appreciation_sessions.teacher_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(appreciation_sessions.school_id)
  );

DROP POLICY IF EXISTS "teacher_update_own_appreciation_sessions" ON appreciation_sessions;
CREATE POLICY "teacher_update_own_appreciation_sessions" ON appreciation_sessions
  FOR UPDATE TO authenticated
  USING (
    appreciation_sessions.teacher_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(appreciation_sessions.school_id)
  )
  WITH CHECK (
    appreciation_sessions.teacher_id = auth.uid()
    OR is_super_admin()
    OR is_school_admin(appreciation_sessions.school_id)
  );

-- Step 10: Fix appreciation_entries SELECT policy
DROP POLICY IF EXISTS "teacher_select_own_appreciation_entries" ON appreciation_entries;
CREATE POLICY "teacher_select_own_appreciation_entries" ON appreciation_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appreciation_sessions aps
      WHERE aps.id = appreciation_entries.session_id
      AND (
        aps.teacher_id = auth.uid()
        OR is_super_admin()
        OR is_school_admin(aps.school_id)
      )
    )
  );
