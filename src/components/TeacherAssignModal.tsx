import { useState, useEffect } from 'react';
import { Check, BookOpen, School } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { SchoolClass } from '@/lib/supabase';
import type { Subject } from '@/hooks/useTeachers';

interface TeacherAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classIds: string[], subjectIds: string[]) => Promise<void>;
  teacherName: string;
  classes: SchoolClass[];
  subjects: Subject[];
  initialClassIds: string[];
  initialSubjectIds: string[];
}

export function TeacherAssignModal({
  isOpen,
  onClose,
  onSave,
  teacherName,
  classes,
  subjects,
  initialClassIds,
  initialSubjectIds,
}: TeacherAssignModalProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedClassIds(new Set(initialClassIds));
      setSelectedSubjectIds(new Set(initialSubjectIds));
      setError(null);
    }
  }, [isOpen, initialClassIds, initialSubjectIds]);

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave([...selectedClassIds], [...selectedSubjectIds]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assignations"
      subtitle={`Classes et matières de ${teacherName}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Classes section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <School size={18} className="text-navy-300" />
            <h3 className="font-heading font-bold text-sm text-navy-500 uppercase tracking-wide">
              Classes assignées
            </h3>
          </div>
          {classes.length === 0 ? (
            <p className="text-sm text-navy-200 italic">
              Aucune classe disponible. Créez d'abord des classes pour votre école.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {classes.map((cls) => {
                const isSelected = selectedClassIds.has(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'border-gold-400 bg-gold-50 text-navy-500'
                        : 'border-navy-50 bg-white text-navy-300 hover:border-navy-200 hover:bg-cream/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-gold-400' : 'bg-navy-50'
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-navy-800" />}
                    </div>
                    <span className="truncate">{cls.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Subjects section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-navy-300" />
            <h3 className="font-heading font-bold text-sm text-navy-500 uppercase tracking-wide">
              Matières enseignées
            </h3>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-navy-200 italic">
              Aucune matière disponible. Les matières sont gérées au niveau global de la plateforme.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subjects.map((subj) => {
                const isSelected = selectedSubjectIds.has(subj.id);
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => toggleSubject(subj.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'border-gold-400 bg-gold-50 text-navy-500'
                        : 'border-navy-50 bg-white text-navy-300 hover:border-navy-200 hover:bg-cream/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-gold-400' : 'bg-navy-50'
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-navy-800" />}
                    </div>
                    <span className="truncate">{subj.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-coral-50 text-coral-500 text-sm rounded-lg px-4 py-3 animate-fade-in">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer les assignations'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
