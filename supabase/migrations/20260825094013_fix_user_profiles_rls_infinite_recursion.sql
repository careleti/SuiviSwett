/*
# Fix infinite recursion in user_profiles RLS policies

## Problem
The `super_admin_read_all_profiles` policy queries `user_profiles` inside a
policy ON `user_profiles`, causing infinite recursion. This means ALL profile
reads fail (including the `read_own_profile` policy), which breaks login:
signInWithPassword succeeds, but the subsequent profile fetch fails silently,
leaving the user stuck on the login screen.

## Fix
1. Drop the recursive `super_admin_read_all_profiles` policy.
2. Replace it with a policy that uses a SECURITY DEFINER function to check
   the user's role WITHOUT querying user_profiles directly (avoiding recursion).
3. Keep `read_own_profile` as-is (it uses auth.uid() = id, no recursion).
4. Also fix the `super_admin_insert_profiles` policy which has the same recursion issue.

## Approach
Create a SECURITY DEFINER function `is_super_admin()` that checks if the
current user has role 'super_admin'. This function runs with elevated
privileges and bypasses RLS, so it doesn't trigger recursion.
*/

-- Step 1: Create a SECURITY DEFINER function to check super_admin role
-- This avoids querying user_profiles inside an RLS policy on user_profiles
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Step 2: Drop the recursive policies
DROP POLICY IF EXISTS "super_admin_read_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "super_admin_insert_profiles" ON user_profiles;

-- Step 3: Recreate policies using the non-recursive function
-- Super-admin can read all profiles
CREATE POLICY "super_admin_read_all_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Super-admin can insert profiles (for creating school admins)
CREATE POLICY "super_admin_insert_profiles" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- Step 4: Also fix schools and classes tables that have the same recursion pattern
-- schools: super_admin_all_schools uses user_profiles query
DROP POLICY IF EXISTS "super_admin_all_schools" ON schools;
CREATE POLICY "super_admin_all_schools" ON schools
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- classes: super_admin_all_classes uses user_profiles query
DROP POLICY IF EXISTS "super_admin_all_classes" ON classes;
CREATE POLICY "super_admin_all_classes" ON classes
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- students: super_admin_all_students uses user_profiles query
DROP POLICY IF EXISTS "super_admin_all_students" ON students;
CREATE POLICY "super_admin_all_students" ON students
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Grant execute on the function to authenticated role
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
