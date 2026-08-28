import { useCallback, useEffect, useState } from 'react';
import { supabase, type UserProfile, type SchoolClass, type UserRole } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface TeacherWithDetails extends UserProfile {
  is_active: boolean;
  class_names: string[];
  subject_names: string[];
  class_ids: string[];
  subject_ids: string[];
}

export function useTeachers() {
  const { profile, session } = useAuth();
  const schoolId = profile?.school_id;

  const [teachers, setTeachers] = useState<TeacherWithDetails[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Load teachers, classes, and subjects in parallel
      const [teachersRes, classesRes, subjectsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('school_id', schoolId)
          .eq('role', 'enseignant')
          .order('full_name', { ascending: true }),
        supabase
          .from('classes')
          .select('*')
          .eq('school_id', schoolId)
          .order('name', { ascending: true }),
        supabase
          .from('subjects')
          .select('id, name, color')
          .order('name', { ascending: true }),
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const teacherList = (teachersRes.data || []) as UserProfile[];
      const classList = (classesRes.data || []) as SchoolClass[];
      const subjectList = (subjectsRes.data || []) as Subject[];

      setClasses(classList);
      setSubjects(subjectList);

      if (teacherList.length === 0) {
        setTeachers([]);
        return;
      }

      const teacherIds = teacherList.map((t) => t.id);

      // Load assignments in parallel
      const [tcRes, tsRes] = await Promise.all([
        supabase
          .from('teacher_classes')
          .select('teacher_id, class_id')
          .in('teacher_id', teacherIds),
        supabase
          .from('teacher_subjects')
          .select('teacher_id, subject_id')
          .in('teacher_id', teacherIds),
      ]);

      if (tcRes.error) throw tcRes.error;
      if (tsRes.error) throw tsRes.error;

      const tcRows = (tcRes.data || []) as { teacher_id: string; class_id: string }[];
      const tsRows = (tsRes.data || []) as { teacher_id: string; subject_id: string }[];

      const classMap = new Map(classList.map((c) => [c.id, c.name]));
      const subjectMap = new Map(subjectList.map((s) => [s.id, s.name]));

      const teachersWithDetails: TeacherWithDetails[] = teacherList.map((t) => {
        const classAssignments = tcRows.filter((r) => r.teacher_id === t.id);
        const subjectAssignments = tsRows.filter((r) => r.teacher_id === t.id);
        const classIds = classAssignments.map((r) => r.class_id);
        const subjectIds = subjectAssignments.map((r) => r.subject_id);
        return {
          ...t,
          is_active: (t as UserProfile & { is_active?: boolean }).is_active ?? true,
          class_ids: classIds,
          subject_ids: subjectIds,
          class_names: classIds.map((id) => classMap.get(id)).filter((n): n is string => !!n),
          subject_names: subjectIds.map((id) => subjectMap.get(id)).filter((n): n is string => !!n),
        };
      });

      setTeachers(teachersWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTeacher = useCallback(
    async (firstName: string, lastName: string, email: string, password: string): Promise<void> => {
      if (!schoolId) throw new Error('Aucune école associée à votre compte');
      if (!session?.access_token) throw new Error('Session expirée, veuillez vous reconnecter');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          schoolId,
          createdByUserId: profile?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Erreur (${response.status})`);
      }

      await loadData();
    },
    [schoolId, session, profile, loadData],
  );

  const toggleTeacherActive = useCallback(
    async (teacherId: string, active: boolean) => {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ is_active: active })
        .eq('id', teacherId);
      if (updateError) throw updateError;
      await loadData();
    },
    [loadData],
  );

  const updateAssignments = useCallback(
    async (teacherId: string, classIds: string[], subjectIds: string[]) => {
      if (!schoolId) throw new Error('Aucune école associée à votre compte');

      // Get current assignments
      const [currentTc, currentTs] = await Promise.all([
        supabase.from('teacher_classes').select('class_id').eq('teacher_id', teacherId),
        supabase.from('teacher_subjects').select('subject_id').eq('teacher_id', teacherId),
      ]);

      if (currentTc.error) throw currentTc.error;
      if (currentTs.error) throw currentTs.error;

      const currentClassIds = new Set(((currentTc.data || []) as { class_id: string }[]).map((r) => r.class_id));
      const currentSubjectIds = new Set(((currentTs.data || []) as { subject_id: string }[]).map((r) => r.subject_id));
      const newClassIds = new Set(classIds);
      const newSubjectIds = new Set(subjectIds);

      // Compute diffs
      const classesToAdd = classIds.filter((id) => !currentClassIds.has(id));
      const classesToRemove = [...currentClassIds].filter((id) => !newClassIds.has(id));
      const subjectsToAdd = subjectIds.filter((id) => !currentSubjectIds.has(id));
      const subjectsToRemove = [...currentSubjectIds].filter((id) => !newSubjectIds.has(id));

      const ops: Array<() => Promise<{ error: { message: string } | null }>> = [];

      if (classesToAdd.length > 0) {
        ops.push(async () => {
          const res = await supabase
            .from('teacher_classes')
            .insert(classesToAdd.map((class_id) => ({ teacher_id: teacherId, class_id, school_id: schoolId })));
          return { error: res.error };
        });
      }
      if (classesToRemove.length > 0) {
        ops.push(async () => {
          const res = await supabase
            .from('teacher_classes')
            .delete()
            .eq('teacher_id', teacherId)
            .in('class_id', classesToRemove);
          return { error: res.error };
        });
      }
      if (subjectsToAdd.length > 0) {
        ops.push(async () => {
          const res = await supabase
            .from('teacher_subjects')
            .insert(subjectsToAdd.map((subject_id) => ({ teacher_id: teacherId, subject_id, school_id: schoolId })));
          return { error: res.error };
        });
      }
      if (subjectsToRemove.length > 0) {
        ops.push(async () => {
          const res = await supabase
            .from('teacher_subjects')
            .delete()
            .eq('teacher_id', teacherId)
            .in('subject_id', subjectsToRemove);
          return { error: res.error };
        });
      }

      const results = await Promise.all(ops.map((fn) => fn()));
      for (const result of results) {
        if (result.error) throw new Error(result.error.message);
      }

      await loadData();
    },
    [schoolId, loadData],
  );

  return {
    teachers,
    classes,
    subjects,
    loading,
    error,
    loadData,
    createTeacher,
    toggleTeacherActive,
    updateAssignments,
  };
}
