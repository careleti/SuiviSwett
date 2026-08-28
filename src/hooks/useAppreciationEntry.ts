import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface AppreciationSession {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  school_id: string;
  term: string;
  status: 'draft' | 'submitted' | 'validated';
  created_at: string;
  updated_at: string;
}

export interface AppreciationEntry {
  id: string;
  session_id: string;
  student_id: string;
  comment: string | null;
}

export interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
}

export type AppreciationStatus = 'draft' | 'submitted' | 'validated';

export function useAppreciationEntry(classId: string, subjectId: string) {
  const { profile } = useAuth();
  const teacherId = profile?.id;
  const schoolId = profile?.school_id;

  const [session, setSession] = useState<AppreciationSession | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [comments, setComments] = useState<Map<string, string>>(new Map());
  const [entryIds, setEntryIds] = useState<Map<string, string>>(new Map());
  const [previousComments, setPreviousComments] = useState<Map<string, string>>(new Map());
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

      // Find the current-term session (draft or submitted)
      const { data: currentSessionData, error: currentSessionError } = await supabase
        .from('appreciation_sessions')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('term', 'current')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentSessionError) throw currentSessionError;

      if (currentSessionData) {
        const currentSession = currentSessionData as AppreciationSession;
        setSession(currentSession);

        const { data: entriesData, error: entriesError } = await supabase
          .from('appreciation_entries')
          .select('id, student_id, comment')
          .eq('session_id', currentSession.id);

        if (entriesError) throw entriesError;

        const commentMap = new Map<string, string>();
        const idMap = new Map<string, string>();
        for (const row of (entriesData || []) as AppreciationEntry[]) {
          commentMap.set(row.student_id, row.comment || '');
          idMap.set(row.student_id, row.id);
        }
        setComments(commentMap);
        setEntryIds(idMap);
      } else {
        setSession(null);
        setComments(new Map());
        setEntryIds(new Map());
      }

      // Load previous-term session for recall display
      const { data: prevSessionData, error: prevSessionError } = await supabase
        .from('appreciation_sessions')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('term', 'previous')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevSessionError) throw prevSessionError;

      if (prevSessionData) {
        const prevSessionId = (prevSessionData as { id: string }).id;
        const { data: prevEntriesData, error: prevEntriesError } = await supabase
          .from('appreciation_entries')
          .select('student_id, comment')
          .eq('session_id', prevSessionId);

        if (prevEntriesError) throw prevEntriesError;

        const prevMap = new Map<string, string>();
        for (const row of (prevEntriesData || []) as { student_id: string; comment: string | null }[]) {
          if (row.comment) prevMap.set(row.student_id, row.comment);
        }
        setPreviousComments(prevMap);
      } else {
        setPreviousComments(new Map());
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

  const updateComment = useCallback((studentId: string, comment: string) => {
    setComments((prev) => {
      const next = new Map(prev);
      next.set(studentId, comment);
      return next;
    });
  }, []);

  const saveDraft = useCallback(async (): Promise<AppreciationSession | null> => {
    if (!teacherId || !schoolId) throw new Error('Session expirée');
    setSaving(true);
    setError(null);
    try {
      let workingSession = session;

      if (!workingSession) {
        const { data: newSession, error: createError } = await supabase
          .from('appreciation_sessions')
          .insert({
            teacher_id: teacherId,
            class_id: classId,
            subject_id: subjectId,
            school_id: schoolId,
            term: 'current',
            status: 'draft' as AppreciationStatus,
          })
          .select('*')
          .single();

        if (createError) throw createError;
        workingSession = newSession as AppreciationSession;
        setSession(workingSession);
      }

      const upsertPromises: Array<() => Promise<{ error: { message: string } | null }>> = [];

      for (const student of students) {
        const comment = comments.get(student.id) ?? '';
        const existingId = entryIds.get(student.id);

        if (existingId) {
          upsertPromises.push(async () => {
            const res = await supabase
              .from('appreciation_entries')
              .update({ comment, updated_at: new Date().toISOString() })
              .eq('id', existingId);
            return { error: res.error };
          });
        } else {
          upsertPromises.push(async () => {
            const res = await supabase
              .from('appreciation_entries')
              .insert({
                session_id: workingSession!.id,
                student_id: student.id,
                comment: comment || null,
              })
              .select('id')
              .single();
            if (res.data) {
              setEntryIds((prev) => {
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
  }, [teacherId, schoolId, session, classId, subjectId, students, comments, entryIds, loadData]);

  const submitForValidation = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const workingSession = await saveDraft();
      if (!workingSession) throw new Error('Impossible de créer la session');

      const { error: statusError } = await supabase
        .from('appreciation_sessions')
        .update({ status: 'submitted' as AppreciationStatus, updated_at: new Date().toISOString() })
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
    comments,
    entryIds,
    previousComments,
    loading,
    error,
    saving,
    updateComment,
    saveDraft,
    submitForValidation,
    loadData,
  };
}
