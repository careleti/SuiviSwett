import { useCallback, useEffect, useState } from 'react';
import { supabase, type StudentWithClass, type SchoolClass } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

function makeAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface ImportResult {
  imported: number;
  errors: number;
  errorDetails: string[];
}

export function useStudents() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;

  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    if (!schoolId) return;
    const { data, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    if (classError) return;
    setClasses((data as SchoolClass[]) || []);
  }, [schoolId]);

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: studentError } = await supabase
        .from('students')
        .select('*, classes!inner(name)')
        .eq('school_id', schoolId)
        .order('last_name', { ascending: true });

      if (studentError) throw studentError;

      const typed = (data || []) as unknown as Array<StudentWithClass & { classes: { name: string } | null }>;
      const formatted: StudentWithClass[] = typed.map((s) => ({
        ...s,
        class_name: s.classes?.name ?? null,
      }));
      setStudents(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadClasses();
    loadStudents();
  }, [loadClasses, loadStudents]);

  const createStudent = useCallback(
    async (firstName: string, lastName: string, classId: string, dateOfBirth: string) => {
      if (!schoolId) throw new Error('Aucune école associée à votre compte');
      const matricule = `${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { error: insertError } = await supabase.from('students').insert({
        school_id: schoolId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        class_id: classId,
        date_of_birth: dateOfBirth || null,
        matricule,
      });
      if (insertError) throw insertError;
      await loadStudents();
    },
    [schoolId, loadStudents],
  );

  const importStudents = useCallback(
    async (rows: { firstName: string; lastName: string; className: string }[]): Promise<ImportResult> => {
      if (!schoolId) throw new Error('Aucune école associée à votre compte');

      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Build a map of class name -> class id
      const classMap = new Map<string, string>();
      classes.forEach((cls) => {
        classMap.set(cls.name.toLowerCase(), cls.id);
      });

      const toInsert: Array<{
        school_id: string;
        first_name: string;
        last_name: string;
        class_id: string;
        matricule: string;
      }> = [];

      rows.forEach((row, index) => {
        if (!row.firstName.trim() || !row.lastName.trim()) {
          errors++;
          errorDetails.push(`Ligne ${index + 2}: nom ou prénom manquant`);
          return;
        }
        const classId = classMap.get(row.className.trim().toLowerCase());
        if (!classId) {
          errors++;
          errorDetails.push(`Ligne ${index + 2}: classe « ${row.className} » introuvable`);
          return;
        }
        toInsert.push({
          school_id: schoolId,
          first_name: row.firstName.trim(),
          last_name: row.lastName.trim(),
          class_id: classId,
          matricule: `${new Date().getFullYear()}-${String(Date.now() + index).slice(-4)}`,
        });
      });

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('students').insert(toInsert);
        if (insertError) {
          errors += toInsert.length;
          errorDetails.push(`Erreur base de données: ${insertError.message}`);
        } else {
          imported = toInsert.length;
        }
      }

      await loadStudents();
      return { imported, errors, errorDetails };
    },
    [schoolId, classes, loadStudents],
  );

  const generateAccessCode = useCallback(
    async (studentId: string): Promise<string> => {
      const code = makeAccessCode();
      const { error: updateError } = await supabase
        .from('students')
        .update({ parent_access_code: code })
        .eq('id', studentId);
      if (updateError) throw updateError;
      await loadStudents();
      return code;
    },
    [loadStudents],
  );

  const deleteStudent = useCallback(
    async (studentId: string) => {
      const { error: deleteError } = await supabase.from('students').delete().eq('id', studentId);
      if (deleteError) throw deleteError;
      await loadStudents();
    },
    [loadStudents],
  );

  return {
    students,
    classes,
    loading,
    error,
    loadStudents,
    createStudent,
    importStudents,
    generateAccessCode,
    deleteStudent,
  };
}
