import { useCallback, useEffect, useState } from 'react';
import { supabase, type SchoolClass } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface TeacherSubject {
  id: string;
  name: string;
  color: string;
}

export interface TeacherAssignment {
  class: SchoolClass;
  subjects: TeacherSubject[];
  studentCount: number;
}

export function useTeacherData() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [allSubjects, setAllSubjects] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get teacher's class assignments
      const { data: tcData, error: tcError } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacherId);

      if (tcError) throw tcError;

      const classIds = ((tcData || []) as { class_id: string }[]).map((r) => r.class_id);

      // Get teacher's subject assignments
      const { data: tsData, error: tsError } = await supabase
        .from('teacher_subjects')
        .select('subject_id')
        .eq('teacher_id', teacherId);

      if (tsError) throw tsError;

      const subjectIds = ((tsData || []) as { subject_id: string }[]).map((r) => r.subject_id);

      if (classIds.length === 0) {
        setAssignments([]);
        setAllSubjects([]);
        return;
      }

      // Load class details and student counts
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('name', { ascending: true });

      if (classesError) throw classesError;

      const classList = (classesData || []) as SchoolClass[];

      // Load student counts per class
      const studentCountPromises = classList.map(async (cls) => {
        const { count, error: countError } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id);
        if (countError) return { classId: cls.id, count: 0 };
        return { classId: cls.id, count: count || 0 };
      });

      const studentCounts = await Promise.all(studentCountPromises);
      const countMap = new Map(studentCounts.map((sc) => [sc.classId, sc.count]));

      // Load subject details
      let subjectList: TeacherSubject[] = [];
      if (subjectIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, color')
          .in('id', subjectIds)
          .order('name', { ascending: true });

        if (subjectsError) throw subjectsError;
        subjectList = (subjectsData || []) as TeacherSubject[];
      }

      setAllSubjects(subjectList);

      // Build assignments: each class gets ALL subjects the teacher is assigned to
      const assignmentList: TeacherAssignment[] = classList.map((cls) => ({
        class: cls,
        subjects: subjectList,
        studentCount: countMap.get(cls.id) || 0,
      }));

      setAssignments(assignmentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    assignments,
    allSubjects,
    loading,
    error,
    loadData,
  };
}
