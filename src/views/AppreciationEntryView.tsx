import { useState, useMemo } from 'react';
import {
  Save, Send, AlertCircle, Check, MessageSquareText,
} from 'lucide-react';
import { useAppreciationEntry } from '@/hooks/useAppreciationEntry';

interface AppreciationEntryViewProps {
  classId: string;
  subjectId: string;
}

export function AppreciationEntryView({ classId, subjectId }: AppreciationEntryViewProps) {
  const {
    session,
    students,
    comments,
    previousComments,
    loading,
    error,
    saving,
    updateComment,
    saveDraft,
    submitForValidation,
  } = useAppreciationEntry(classId, subjectId);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filledCount = useMemo(() => {
    let count = 0;
    for (const student of students) {
      const c = comments.get(student.id);
      if (c && c.trim()) count++;
    }
    return count;
  }, [students, comments]);

  const statusBadge = session?.status === 'submitted' ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-50 text-gold-400 text-xs font-semibold">
      <Send size={12} />
      Soumis — en attente de validation
    </span>
  ) : session?.status === 'validated' ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-50 text-success-400 text-xs font-semibold">
      <Check size={12} />
      Validé
    </span>
  ) : session ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-50 text-navy-300 text-xs font-semibold">
      Brouillon
    </span>
  ) : null;

  const isReadOnly = session?.status === 'submitted' || session?.status === 'validated';

  const handleSaveDraft = async () => {
    setSuccessMsg(null);
    try {
      await saveDraft();
      setSuccessMsg('Brouillon enregistré');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error already set in hook
    }
  };

  const handleSubmit = async () => {
    setSuccessMsg(null);
    try {
      await submitForValidation();
      setSuccessMsg('Appréciations soumises pour validation');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error already set in hook
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <MessageSquareText size={20} className="text-navy-300" />
          </div>
          <div>
            <p className="font-heading font-bold text-base text-navy-500">Appréciations par élève</p>
            <p className="text-xs text-navy-200">
              {filledCount} sur {students.length} élève{students.length !== 1 ? 's' : ''} avec appréciation
            </p>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm rounded-xl px-5 py-4 animate-fade-in">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-success-50 text-success-500 text-sm rounded-xl px-5 py-4 animate-fade-in">
          <Check size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="card-base p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
            <MessageSquareText size={32} className="text-navy-200" />
          </div>
          <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucun élève dans cette classe</h3>
          <p className="text-navy-300 text-sm">
            Ajoutez d'abord des élèves à cette classe pour pouvoir saisir des appréciations.
          </p>
        </div>
      ) : (
        <>
          {/* Appreciation list */}
          <div className="space-y-3">
            {students.map((student, idx) => {
              const comment = comments.get(student.id) ?? '';
              const prevComment = previousComments.get(student.id);
              return (
                <div key={student.id} className="card-base p-5">
                  <div className="flex items-start gap-4">
                    {/* Student info */}
                    <div className="flex items-center gap-3 flex-shrink-0 w-48">
                      <span className="text-sm text-navy-200 font-medium w-6">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center text-navy-300 font-heading font-bold text-[10px] flex-shrink-0">
                        {student.first_name.charAt(0).toUpperCase()}{student.last_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-navy-500 text-sm truncate">
                          {student.last_name} {student.first_name}
                        </p>
                      </div>
                    </div>

                    {/* Comment input */}
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={comment}
                        onChange={(e) => updateComment(student.id, e.target.value)}
                        disabled={isReadOnly}
                        placeholder="Saisissez votre appréciation…"
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-navy-100 bg-white text-navy-500 text-sm placeholder-navy-200 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 disabled:bg-cream disabled:text-navy-300 transition-all resize-none"
                      />
                      {/* Previous term recall */}
                      {prevComment && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-cream/70 border border-navy-50">
                          <div className="flex-shrink-0 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-navy-200">
                              <MessageSquareText size={10} />
                              Trimestre précédent
                            </span>
                          </div>
                          <p className="text-xs text-navy-200 italic leading-relaxed">
                            {prevComment}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          {!isReadOnly && (
            <div className="flex items-center justify-end gap-3 flex-wrap">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="btn-secondary disabled:opacity-50"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                Enregistrer en brouillon
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? <div className="w-4 h-4 border-2 border-navy-800/30 border-t-navy-800 rounded-full animate-spin" /> : <Send size={18} />}
                Soumettre pour validation
              </button>
            </div>
          )}

          {isReadOnly && (
            <div className="flex items-center gap-2 bg-navy-50 text-navy-300 text-sm rounded-xl px-5 py-4">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>
                {session?.status === 'submitted'
                  ? 'Ces appréciations ont été soumises et sont en attente de validation par l\'administrateur de l\'école. Vous ne pouvez plus les modifier.'
                  : 'Ces appréciations ont été validées et sont désormais visibles par les élèves et parents.'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
