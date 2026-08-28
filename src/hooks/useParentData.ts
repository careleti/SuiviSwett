import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface LinkedStudent {
  student_id: string;
  first_name: string;
  last_name: string;
  class_id: string | null;
  class_name: string | null;
  school_id: string;
  access_code: string;
}

export interface StudentGrade {
  subject_name: string;
  subject_color: string;
  score: number | null;
  max_score: number;
  session_title: string;
  teacher_name: string | null;
}

export interface StudentAppreciation {
  subject_name: string;
  subject_color: string;
  comment: string | null;
}

export interface TermInfo {
  term: string;
  label: string;
}

const TERM_LABELS: Record<string, string> = {
  T1: '1er Trimestre',
  T2: '2ème Trimestre',
  T3: '3ème Trimestre',
  current: 'Trimestre en cours',
};

export function getTermLabel(term: string): string {
  return TERM_LABELS[term] || term;
}

export function useParentData() {
  const { profile } = useAuth();
  const parentId = profile?.id;

  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [terms, setTerms] = useState<TermInfo[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [appreciations, setAppreciations] = useState<StudentAppreciation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLinkedStudents = useCallback(async () => {
    if (!parentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: linkError } = await supabase
        .from('parent_student_links')
        .select(`
          student_id,
          access_code,
          school_id,
          students!inner (
            id,
            first_name,
            last_name,
            class_id,
            class_id
          )
        `)
        .eq('parent_id', parentId);

      if (linkError) throw linkError;

      const links = (data || []) as unknown as Array<{
        student_id: string;
        access_code: string;
        school_id: string;
        students: {
          id: string;
          first_name: string;
          last_name: string;
          class_id: string | null;
        };
      }>;

      if (links.length === 0) {
        setLinkedStudents([]);
        return;
      }

      const classIds = links
        .map((l) => l.students.class_id)
        .filter((id): id is string => !!id);

      let classMap = new Map<string, string>();
      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds);
        classMap = new Map(((classesData || []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
      }

      const students: LinkedStudent[] = links.map((l) => ({
        student_id: l.student_id,
        first_name: l.students.first_name,
        last_name: l.students.last_name,
        class_id: l.students.class_id,
        class_name: l.students.class_id ? classMap.get(l.students.class_id) || null : null,
        school_id: l.school_id,
        access_code: l.access_code,
      }));

      setLinkedStudents(students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    loadLinkedStudents();
  }, [loadLinkedStudents]);

  const loadResults = useCallback(async (studentId: string, term: string) => {
    setGrades([]);
    setAppreciations([]);
    setError(null);

    try {
      // Load validated grade sessions for this student's class + term
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', studentId)
        .maybeSingle();

      if (!studentData) return;
      const classId = (studentData as { class_id: string | null }).class_id;
      if (!classId) return;

      // Load validated grade sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('grade_sessions')
        .select(`
          id,
          title,
          max_score,
          teacher_id,
          term,
          subjects!inner (id, name, color)
        `)
        .eq('class_id', classId)
        .eq('term', term)
        .eq('status', 'validated');

      if (sessionsError) throw sessionsError;

      const sessions = (sessionsData || []) as unknown as Array<{
        id: string;
        title: string;
        max_score: number;
        teacher_id: string;
        subjects: { id: string; name: string; color: string };
      }>;

      if (sessions.length === 0) {
        setGrades([]);
      } else {
        const sessionIds = sessions.map((s) => s.id);
        const { data: scoresData, error: scoresError } = await supabase
          .from('grade_scores')
          .select('session_id, score')
          .eq('student_id', studentId)
          .in('session_id', sessionIds);

        if (scoresError) throw scoresError;

        const scoreMap = new Map<string, number | null>();
        for (const row of (scoresData || []) as { session_id: string; score: number | null }[]) {
          scoreMap.set(row.session_id, row.score);
        }

        // Load teacher names
        const teacherIds = [...new Set(sessions.map((s) => s.teacher_id))];
        let teacherMap = new Map<string, string>();
        if (teacherIds.length > 0) {
          const { data: teachersData } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', teacherIds);
          teacherMap = new Map(((teachersData || []) as { id: string; full_name: string | null }[]).map((t) => [t.id, t.full_name || '']));
        }

        const gradeList: StudentGrade[] = sessions.map((s) => ({
          subject_name: (s.subjects as unknown as { id: string; name: string; color: string }).name,
          subject_color: (s.subjects as unknown as { id: string; name: string; color: string }).color,
          score: scoreMap.get(s.id) ?? null,
          max_score: s.max_score,
          session_title: s.title,
          teacher_name: teacherMap.get(s.teacher_id) || null,
        }));

        setGrades(gradeList);
      }

      // Load validated appreciation sessions
      const { data: apprSessionsData, error: apprSessionsError } = await supabase
        .from('appreciation_sessions')
        .select(`
          id,
          term,
          subjects!inner (id, name, color)
        `)
        .eq('class_id', classId)
        .eq('term', term)
        .eq('status', 'validated');

      if (apprSessionsError) throw apprSessionsError;

      const apprSessions = (apprSessionsData || []) as unknown as Array<{
        id: string;
        subjects: { id: string; name: string; color: string };
      }>;

      if (apprSessions.length === 0) {
        setAppreciations([]);
      } else {
        const apprSessionIds = apprSessions.map((s) => s.id);
        const { data: entriesData, error: entriesError } = await supabase
          .from('appreciation_entries')
          .select('session_id, comment')
          .eq('student_id', studentId)
          .in('session_id', apprSessionIds);

        if (entriesError) throw entriesError;

        const commentMap = new Map<string, string | null>();
        for (const row of (entriesData || []) as { session_id: string; comment: string | null }[]) {
          commentMap.set(row.session_id, row.comment);
        }

        const apprList: StudentAppreciation[] = apprSessions.map((s) => ({
          subject_name: (s.subjects as unknown as { id: string; name: string; color: string }).name,
          subject_color: (s.subjects as unknown as { id: string; name: string; color: string }).color,
          comment: commentMap.get(s.id) ?? null,
        }));

        setAppreciations(apprList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  }, []);

  const loadTerms = useCallback(async (studentId: string) => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', studentId)
        .maybeSingle();

      if (!studentData) return;
      const classId = (studentData as { class_id: string | null }).class_id;
      if (!classId) return;

      // Get terms from publications
      const { data: pubData } = await supabase
        .from('result_publications')
        .select('term')
        .eq('class_id', classId)
        .order('published_at', { ascending: false });

      const pubTerms = ((pubData || []) as { term: string }[]).map((p) => p.term);
      const uniqueTerms = [...new Set(pubTerms)];

      const termInfos: TermInfo[] = uniqueTerms.map((t) => ({
        term: t,
        label: getTermLabel(t),
      }));

      setTerms(termInfos);
    } catch {
      setTerms([]);
    }
  }, []);

  const recordView = useCallback(async (studentId: string, term: string, accessCode: string) => {
    if (!parentId) return;
    try {
      await supabase
        .from('result_view_log')
        .insert({
          student_id: studentId,
          parent_id: parentId,
          school_id: linkedStudents.find((s) => s.student_id === studentId)?.school_id || '',
          term,
          access_code: accessCode,
        });
    } catch {
      // UNIQUE constraint violation = already viewed, which is fine
    }
  }, [parentId, linkedStudents]);

  return {
    linkedStudents,
    terms,
    grades,
    appreciations,
    loading,
    error,
    loadLinkedStudents,
    loadTerms,
    loadResults,
    recordView,
  };
}
