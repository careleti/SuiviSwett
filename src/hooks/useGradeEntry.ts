import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface GradeSession {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  school_id: string;
  title: string;
  max_score: number;
  status: 'draft' | 'submitted' | 'validated';
  created_at: string;
  updated_at: string;
}

export interface GradeScore {
  id: string;
  session_id: string;
  student_id: string;
  score: number | null;
}

export interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
}

export type GradeStatus = 'draft' | 'submitted' | 'validated';

export function useGradeEntry(classId: string, subjectId: string) {
  const { profile } = useAuth();
  const teacherId = profile?.id;
  const schoolId = profile?.school_id;

  const [session, setSession] = useState<GradeSession | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [scores, setScores] = useState<Map<string, number | null>>(new Map());
  const [scoreIds, setScoreIds] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!teacherId || !schoolId || !classId || !subjectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Load students in this class, ordered alphabetically
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });

      if (studentsError) throw studentsError;
      setStudents((studentsData || []) as StudentInfo[]);

      // Check for an existing draft or submitted session for this class+subject+teacher
      const { data: sessionData, error: sessionError } = await supabase
        .from('grade_sessions')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (sessionData) {
        const existingSession = sessionData as GradeSession;
        setSession(existingSession);

        // Load existing scores
        const { data: scoresData, error: scoresError } = await supabase
          .from('grade_scores')
          .select('id, student_id, score')
          .eq('session_id', existingSession.id);

        if (scoresError) throw scoresError;

        const scoreMap = new Map<string, number | null>();
        const idMap = new Map<string, string>();
        for (const row of (scoresData || []) as GradeScore[]) {
          scoreMap.set(row.student_id, row.score);
          idMap.set(row.student_id, row.id);
        }
        setScores(scoreMap);
        setScoreIds(idMap);
      } else {
        setSession(null);
        setScores(new Map());
        setScoreIds(new Map());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [teacherId, schoolId, classId, subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateScore = useCallback((studentId: string, score: number | null) => {
    setScores((prev) => {
      const next = new Map(prev);
      next.set(studentId, score);
      return next;
    });
  }, []);

  const saveDraft = useCallback(async (): Promise<GradeSession | null> => {
    if (!teacherId || !schoolId) throw new Error('Session expirée');
    setSaving(true);
    setError(null);
    try {
      let workingSession = session;

      // Create session if it doesn't exist
      if (!workingSession) {
        const { data: newSession, error: createError } = await supabase
          .from('grade_sessions')
          .insert({
            teacher_id: teacherId,
            class_id: classId,
            subject_id: subjectId,
            school_id: schoolId,
            title: 'Évaluation',
            max_score: 20,
            status: 'draft' as GradeStatus,
          })
          .select('*')
          .single();

        if (createError) throw createError;
        workingSession = newSession as GradeSession;
        setSession(workingSession);
      }

      // Upsert all scores
      const upsertPromises: Array<() => Promise<{ error: { message: string } | null }>> = [];

      for (const student of students) {
        const score = scores.get(student.id) ?? null;
        const existingId = scoreIds.get(student.id);

        if (existingId) {
          // Update existing score
          upsertPromises.push(async () => {
            const res = await supabase
              .from('grade_scores')
              .update({ score, updated_at: new Date().toISOString() })
              .eq('id', existingId);
            return { error: res.error };
          });
        } else {
          // Insert new score
          upsertPromises.push(async () => {
            const res = await supabase
              .from('grade_scores')
              .insert({
                session_id: workingSession!.id,
                student_id: student.id,
                score,
              })
              .select('id')
              .single();
            if (res.data) {
              setScoreIds((prev) => {
                const next = new Map(prev);
                next.set(student.id, (res.data as { id: string }).id);
                return next;
              });
            }
            return { error: res.error };
          });
        }
      }

      const results = await Promise.all(upsertPromises.map((fn) => fn()));
      for (const result of results) {
        if (result.error) throw new Error(result.error.message);
      }

      await loadData();
      return workingSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [teacherId, schoolId, session, classId, subjectId, students, scores, scoreIds, loadData]);

  const submitForValidation = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      // First save the draft (creates session + saves scores)
      const workingSession = await saveDraft();
      if (!workingSession) throw new Error('Impossible de créer la session');

      // Then update status to 'submitted'
      const { error: statusError } = await supabase
        .from('grade_sessions')
        .update({ status: 'submitted' as GradeStatus, updated_at: new Date().toISOString() })
        .eq('id', workingSession.id);

      if (statusError) throw statusError;
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [saveDraft, loadData]);

  return {
    session,
    students,
    scores,
    scoreIds,
    loading,
    error,
    saving,
    updateScore,
    saveDraft,
    submitForValidation,
    loadData,
  };
}
