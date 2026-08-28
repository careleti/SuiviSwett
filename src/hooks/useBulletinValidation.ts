import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getTermLabel } from '@/hooks/useParentData';

export type SessionKind = 'grade' | 'appreciation';
export type SessionStatus = 'submitted' | 'validated' | 'rejected';

export interface PendingSession {
  id: string;
  kind: SessionKind;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  teacher_id: string;
  teacher_name: string;
  term: string;
  term_label: string;
  title: string;
  max_score: number;
  status: SessionStatus;
  submitted_at: string;
  validated_at: string | null;
  student_count: number;
  entered_count: number;
  admin_comment: string | null;
}

export interface SessionDetail {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  score: number | null;
  comment: string | null;
}

export function useBulletinValidation() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;

  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [historySessions, setHistorySessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [gradeData, apprData] = await Promise.all([
        supabase
          .from('grade_sessions')
          .select(`
            id, class_id, subject_id, teacher_id, title, max_score,
            status, term, created_at, updated_at,
            classes!inner (id, name),
            subjects!inner (id, name, color)
          `)
          .eq('school_id', schoolId)
          .in('status', ['submitted', 'validated', 'rejected'])
          .order('updated_at', { ascending: false }),
        supabase
          .from('appreciation_sessions')
          .select(`
            id, class_id, subject_id, teacher_id, term,
            status, created_at, updated_at,
            classes!inner (id, name),
            subjects!inner (id, name, color)
          `)
          .eq('school_id', schoolId)
          .in('status', ['submitted', 'validated', 'rejected'])
          .order('updated_at', { ascending: false }),
      ]);

      if (gradeData.error) throw gradeData.error;
      if (apprData.error) throw apprData.error;

      const gradeSessions = (gradeData.data || []) as unknown as Array<{
        id: string;
        class_id: string;
        subject_id: string;
        teacher_id: string;
        title: string;
        max_score: number;
        status: string;
        term: string;
        updated_at: string;
        classes: { id: string; name: string };
        subjects: { id: string; name: string; color: string };
      }>;

      const apprSessions = (apprData.data || []) as unknown as Array<{
        id: string;
        class_id: string;
        subject_id: string;
        teacher_id: string;
        term: string;
        status: string;
        updated_at: string;
        classes: { id: string; name: string };
        subjects: { id: string; name: string; color: string };
      }>;

      // Collect all teacher IDs
      const teacherIds = [...new Set([
        ...gradeSessions.map((s) => s.teacher_id),
        ...apprSessions.map((s) => s.teacher_id),
      ])];

      let teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: teachersData } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', teacherIds);
        teacherMap = new Map(
          ((teachersData || []) as { id: string; full_name: string | null }[]).map((t) => [t.id, t.full_name || ''])
        );
      }

      // Get student counts per class
      const classIds = [...new Set([
        ...gradeSessions.map((s) => s.class_id),
        ...apprSessions.map((s) => s.class_id),
      ])];

      let classStudentCount = new Map<string, number>();
      if (classIds.length > 0) {
        const { data: countData } = await supabase
          .from('students')
          .select('class_id')
          .in('class_id', classIds);
        for (const row of (countData || []) as { class_id: string }[]) {
          classStudentCount.set(row.class_id, (classStudentCount.get(row.class_id) || 0) + 1);
        }
      }

      // Get entered counts for grade sessions
      const gradeSessionIds = gradeSessions.map((s) => s.id);
      let gradeEnteredCount = new Map<string, number>();
      if (gradeSessionIds.length > 0) {
        const { data: scoreData } = await supabase
          .from('grade_scores')
          .select('session_id, score')
          .in('session_id', gradeSessionIds)
          .not('score', 'is', null);
        for (const row of (scoreData || []) as { session_id: string; score: number | null }[]) {
          gradeEnteredCount.set(row.session_id, (gradeEnteredCount.get(row.session_id) || 0) + 1);
        }
      }

      // Get entered counts for appreciation sessions
      const apprSessionIds = apprSessions.map((s) => s.id);
      let apprEnteredCount = new Map<string, number>();
      if (apprSessionIds.length > 0) {
        const { data: entryData } = await supabase
          .from('appreciation_entries')
          .select('session_id, comment')
          .in('session_id', apprSessionIds)
          .not('comment', 'is', null);
        for (const row of (entryData || []) as { session_id: string; comment: string | null }[]) {
          apprEnteredCount.set(row.session_id, (apprEnteredCount.get(row.session_id) || 0) + 1);
        }
      }

      const buildSession = (
        id: string,
        kind: SessionKind,
        classId: string,
        subjectId: string,
        teacherId: string,
        status: string,
        term: string,
        updatedAt: string,
        className: string,
        subjectName: string,
        subjectColor: string,
        title: string,
        maxScore: number,
      ): PendingSession => ({
        id,
        kind,
        class_id: classId,
        class_name: className,
        subject_id: subjectId,
        subject_name: subjectName,
        subject_color: subjectColor,
        teacher_id: teacherId,
        teacher_name: teacherMap.get(teacherId) || '—',
        term,
        term_label: getTermLabel(term),
        title,
        max_score: maxScore,
        status: status as SessionStatus,
        submitted_at: updatedAt,
        validated_at: status === 'validated' ? updatedAt : null,
        student_count: classStudentCount.get(classId) || 0,
        entered_count: kind === 'grade'
          ? gradeEnteredCount.get(id) || 0
          : apprEnteredCount.get(id) || 0,
        admin_comment: null,
      });

      const allSessions: PendingSession[] = [
        ...gradeSessions.map((s) => buildSession(
          s.id, 'grade', s.class_id, s.subject_id, s.teacher_id,
          s.status, s.term, s.updated_at,
          (s.classes as unknown as { id: string; name: string }).name, (s.subjects as unknown as { id: string; name: string; color: string }).name, (s.subjects as unknown as { id: string; name: string; color: string }).color,
          s.title, s.max_score,
        )),
        ...apprSessions.map((s) => buildSession(
          s.id, 'appreciation', s.class_id, s.subject_id, s.teacher_id,
          s.status, s.term, s.updated_at,
          (s.classes as unknown as { id: string; name: string }).name, (s.subjects as unknown as { id: string; name: string; color: string }).name, (s.subjects as unknown as { id: string; name: string; color: string }).color,
          'Appréciations', 0,
        )),
      ];

      // Sort: submitted first (newest first), then validated/rejected
      allSessions.sort((a, b) => {
        if (a.status === 'submitted' && b.status !== 'submitted') return -1;
        if (a.status !== 'submitted' && b.status === 'submitted') return 1;
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });

      setPendingSessions(allSessions.filter((s) => s.status === 'submitted'));
      setHistorySessions(allSessions.filter((s) => s.status !== 'submitted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadSessionDetail = useCallback(async (session: PendingSession): Promise<SessionDetail[]> => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('class_id', session.class_id)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    const students = (studentsData || []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>;

    if (students.length === 0) return [];

    if (session.kind === 'grade') {
      const { data: scoresData } = await supabase
        .from('grade_scores')
        .select('student_id, score')
        .eq('session_id', session.id);

      const scoreMap = new Map<string, number | null>();
      for (const row of (scoresData || []) as { student_id: string; score: number | null }[]) {
        scoreMap.set(row.student_id, row.score);
      }

      return students.map((s) => ({
        student_id: s.id,
        student_first_name: s.first_name,
        student_last_name: s.last_name,
        score: scoreMap.get(s.id) ?? null,
        comment: null,
      }));
    } else {
      const { data: entriesData } = await supabase
        .from('appreciation_entries')
        .select('student_id, comment')
        .eq('session_id', session.id);

      const commentMap = new Map<string, string | null>();
      for (const row of (entriesData || []) as { student_id: string; comment: string | null }[]) {
        commentMap.set(row.student_id, row.comment);
      }

      return students.map((s) => ({
        student_id: s.id,
        student_first_name: s.first_name,
        student_last_name: s.last_name,
        score: null,
        comment: commentMap.get(s.id) ?? null,
      }));
    }
  }, []);

  const validateSession = useCallback(async (session: PendingSession): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      const table = session.kind === 'grade' ? 'grade_sessions' : 'appreciation_sessions';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: 'validated', updated_at: new Date().toISOString() })
        .eq('id', session.id);
      if (updateError) throw updateError;

      // Create a publication record if it doesn't exist yet
      const { error: pubError } = await supabase
        .from('result_publications')
        .upsert({
          school_id: schoolId!,
          class_id: session.class_id,
          term: session.term,
          published_by: profile?.id,
        }, { onConflict: 'class_id,term' });
      if (pubError) throw pubError;

      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [schoolId, profile, loadSessions]);

  const rejectSession = useCallback(async (session: PendingSession, comment: string): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      const table = session.kind === 'grade' ? 'grade_sessions' : 'appreciation_sessions';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', session.id);
      if (updateError) throw updateError;
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du renvoi');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [loadSessions]);

  return {
    pendingSessions,
    historySessions,
    loading,
    error,
    actionLoading,
    loadSessions,
    loadSessionDetail,
    validateSession,
    rejectSession,
  };
}
