import { useCallback, useEffect, useState } from 'react';
import { supabase, type School, type SchoolWithStats } from '@/lib/supabase';

export function useSchools() {
  const [schools, setSchools] = useState<SchoolWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolsError) throw schoolsError;

      const typedSchools = (schoolsData as School[]) || [];

      // Fetch counts for each school in parallel
      const schoolsWithStats = await Promise.all(
        typedSchools.map(async (school) => {
          const [studentsRes, teachersRes, classesRes] = await Promise.all([
            supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
            supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('school_id', school.id).eq('role', 'enseignant'),
            supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
          ]);

          return {
            ...school,
            student_count: studentsRes.count || 0,
            teacher_count: teachersRes.count || 0,
            class_count: classesRes.count || 0,
          };
        })
      );

      setSchools(schoolsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const toggleSubscription = useCallback(
    async (schoolId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const { error: updateError } = await supabase
        .from('schools')
        .update({ subscription_status: newStatus })
        .eq('id', schoolId);
      if (updateError) throw updateError;
      await loadSchools();
    },
    [loadSchools],
  );

  const createSchool = useCallback(
    async (data: {
      schoolName: string;
      city: string;
      address: string;
      contactName: string;
      contactEmail: string;
      adminPassword: string;
    }) => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-school-admin`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      await loadSchools();
      return result;
    },
    [loadSchools],
  );

  return {
    schools,
    loading,
    error,
    loadSchools,
    toggleSubscription,
    createSchool,
  };
}
