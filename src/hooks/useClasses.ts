import { useCallback, useEffect, useState } from 'react';
import { supabase, type ClassWithStats, type Teacher } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useClasses() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;

  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });

      if (classesError) throw classesError;

      const typedClasses = classesData || [];

      const classesWithStats = await Promise.all(
        typedClasses.map(async (cls) => {
          const [studentsRes, teacherRes] = await Promise.all([
            supabase.from('students').select('id', { count: 'exact', head: true }).eq('class_id', cls.id),
            cls.teacher_id
              ? supabase.from('user_profiles').select('full_name').eq('id', cls.teacher_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...cls,
            student_count: studentsRes.count || 0,
            teacher_name: (teacherRes.data as { full_name: string | null } | null)?.full_name ?? null,
          };
        }),
      );

      setClasses(classesWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const loadTeachers = useCallback(async () => {
    if (!schoolId) return;
    const { data, error: teacherError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('school_id', schoolId)
      .eq('role', 'enseignant')
      .order('full_name', { ascending: true });

    if (teacherError) {
      return;
    }
    setTeachers((data as Teacher[]) || []);
  }, [schoolId]);

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, [loadClasses, loadTeachers]);

  const createClass = useCallback(
    async (name: string, level: string, schoolYear: string) => {
      if (!schoolId) throw new Error('Aucune école associée à votre compte');
      const { error: insertError } = await supabase
        .from('classes')
        .insert({
          school_id: schoolId,
          name: name.trim(),
          level: level.trim() || null,
          school_year: schoolYear.trim() || null,
        });
      if (insertError) throw insertError;
      await loadClasses();
    },
    [schoolId, loadClasses],
  );

  const renameClass = useCallback(
    async (classId: string, newName: string) => {
      const { error: updateError } = await supabase
        .from('classes')
        .update({ name: newName.trim() })
        .eq('id', classId);
      if (updateError) throw updateError;
      await loadClasses();
    },
    [loadClasses],
  );

  const deleteClass = useCallback(
    async (classId: string) => {
      const { error: deleteError } = await supabase.from('classes').delete().eq('id', classId);
      if (deleteError) throw deleteError;
      await loadClasses();
    },
    [loadClasses],
  );

  const assignTeacher = useCallback(
    async (classId: string, teacherId: string | null) => {
      const { error: updateError } = await supabase
        .from('classes')
        .update({ teacher_id: teacherId })
        .eq('id', classId);
      if (updateError) throw updateError;
      await loadClasses();
    },
    [loadClasses],
  );

  return {
    classes,
    teachers,
    loading,
    error,
    loadClasses,
    createClass,
    renameClass,
    deleteClass,
    assignTeacher,
  };
}
