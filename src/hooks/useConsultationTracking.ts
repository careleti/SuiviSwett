import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getTermLabel } from '@/hooks/useParentData';

export interface PublicationInfo {
  id: string;
  class_id: string;
  class_name: string;
  term: string;
  term_label: string;
  published_at: string;
}

export interface ConsultationRecord {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  class_id: string;
  class_name: string;
  term: string;
  term_label: string;
  published_at: string;
  viewed: boolean;
  viewed_at: string | null;
  days_since_publication: number;
  parent_name: string | null;
  parent_email: string | null;
}

export function useConsultationTracking() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;

  const [publications, setPublications] = useState<PublicationInfo[]>([]);
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Load all publications for this school
      const { data: pubData, error: pubError } = await supabase
        .from('result_publications')
        .select(`
          id,
          class_id,
          term,
          published_at,
          classes!inner (id, name)
        `)
        .eq('school_id', schoolId)
        .order('published_at', { ascending: false });

      if (pubError) throw pubError;

      const pubs = (pubData || []) as unknown as Array<{
        id: string;
        class_id: string;
        term: string;
        published_at: string;
        classes: { id: string; name: string };
      }>;

      const pubInfos: PublicationInfo[] = pubs.map((p) => ({
        id: p.id,
        class_id: p.class_id,
        class_name: p.classes.name,
        term: p.term,
        term_label: getTermLabel(p.term),
        published_at: p.published_at,
      }));

      setPublications(pubInfos);

      if (pubs.length === 0) {
        setRecords([]);
        return;
      }

      // Load all students in this school
      const classIds = [...new Set(pubs.map((p) => p.class_id))];
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id')
        .in('class_id', classIds)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });

      if (studentsError) throw studentsError;

      const students = (studentsData || []) as Array<{
        id: string;
        first_name: string;
        last_name: string;
        class_id: string | null;
      }>;

      // Load all view logs for this school
      const { data: viewLogsData } = await supabase
        .from('result_view_log')
        .select('student_id, term, viewed_at')
        .eq('school_id', schoolId);

      const viewLogMap = new Map<string, string>();
      for (const row of (viewLogsData || []) as { student_id: string; term: string; viewed_at: string }[]) {
        const key = `${row.student_id}|${row.term}`;
        if (!viewLogMap.has(key)) {
          viewLogMap.set(key, row.viewed_at);
        }
      }

      // Load parent links for parent info
      const { data: linksData } = await supabase
        .from('parent_student_links')
        .select('student_id, parent_id')
        .eq('school_id', schoolId);

      const studentParentMap = new Map<string, string>();
      for (const row of (linksData || []) as { student_id: string; parent_id: string }[]) {
        studentParentMap.set(row.student_id, row.parent_id);
      }

      // Load parent profiles
      const parentIds = [...new Set([...studentParentMap.values()])];
      let parentMap = new Map<string, { full_name: string | null; email: string }>();
      if (parentIds.length > 0) {
        const { data: parentsData } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', parentIds);
        parentMap = new Map(((parentsData || []) as { id: string; full_name: string | null; email: string }[]).map((p) => [p.id, p]));
      }

      // Load class names
      const classNameMap = new Map(pubInfos.map((p) => [p.class_id, p.class_name]));

      // Build consultation records: for each publication (class+term), list all students in that class
      const recs: ConsultationRecord[] = [];
      const now = new Date();

      for (const pub of pubs) {
        const classStudents = students.filter((s) => s.class_id === pub.class_id);
        for (const student of classStudents) {
          const viewKey = `${student.id}|${pub.term}`;
          const viewedAt = viewLogMap.get(viewKey);
          const parentId = studentParentMap.get(student.id);
          const parentInfo = parentId ? parentMap.get(parentId) : null;

          const pubDate = new Date(pub.published_at);
          const daysSince = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));

          recs.push({
            student_id: student.id,
            student_first_name: student.first_name,
            student_last_name: student.last_name,
            class_id: pub.class_id,
            class_name: classNameMap.get(pub.class_id) || '',
            term: pub.term,
            term_label: getTermLabel(pub.term),
            published_at: pub.published_at,
            viewed: !!viewedAt,
            viewed_at: viewedAt || null,
            days_since_publication: daysSince,
            parent_name: parentInfo?.full_name || null,
            parent_email: parentInfo?.email || null,
          });
        }
      }

      setRecords(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sendReminder = useCallback(async (studentId: string, term: string): Promise<void> => {
    if (!schoolId || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('parent_reminders')
        .insert({
          student_id: studentId,
          school_id: schoolId,
          term,
          sent_by: profile.id,
          reminder_type: 'manual',
        });
      if (insertError) throw insertError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la relance');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [schoolId, profile]);

  const sendBulkReminders = useCallback(async (studentIds: string[], term: string): Promise<void> => {
    if (!schoolId || !profile?.id) return;
    setActionLoading(true);
    try {
      const rows = studentIds.map((student_id) => ({
        student_id,
        school_id: schoolId,
        term,
        sent_by: profile.id,
        reminder_type: 'bulk' as const,
      }));
      const { error: insertError } = await supabase
        .from('parent_reminders')
        .insert(rows);
      if (insertError) throw insertError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors des relances');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [schoolId, profile]);

  return {
    publications,
    records,
    loading,
    error,
    actionLoading,
    loadData,
    sendReminder,
    sendBulkReminders,
  };
}
