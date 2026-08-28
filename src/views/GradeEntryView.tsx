import { useState, useMemo } from 'react';
import {
  Save, Send, AlertCircle, School, Check,
} from 'lucide-react';
import { useGradeEntry } from '@/hooks/useGradeEntry';

interface GradeEntryViewProps {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  onBack?: () => void;
}

function ScoreBadge({ score, maxScore }: { score: number | null; maxScore: number }) {
  if (score === null) {
    return (
      <div className="w-9 h-9 rounded-full border-2 border-dashed border-navy-100 flex items-center justify-center text-navy-200 text-xs">
        —
      </div>
    );
  }
  const isPassing = score >= maxScore / 2;
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center font-heading font-bold text-sm ${
        isPassing
          ? 'bg-success-100 text-success-500'
          : 'bg-coral-100 text-coral-500'
      }`}
    >
      {score}
    </div>
  );
}

export function GradeEntryView({ classId, className, subjectId, subjectName }: GradeEntryViewProps) {
  const {
    session,
    students,
    scores,
    loading,
    error,
    saving,
    updateScore,
    saveDraft,
    submitForValidation,
  } = useGradeEntry(classId, subjectId);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live average calculation
  const { average, enteredCount, totalStudents } = useMemo(() => {
    const entered: number[] = [];
    for (const student of students) {
      const score = scores.get(student.id);
      if (score !== null && score !== undefined) {
        entered.push(score);
      }
    }
    const avg = entered.length > 0
      ? entered.reduce((sum, s) => sum + s, 0) / entered.length
      : 0;
    return {
      average: avg,
      enteredCount: entered.length,
      totalStudents: students.length,
    };
  }, [students, scores]);

  const maxScore = session?.max_score ?? 20;

  const handleScoreChange = (studentId: string, value: string) => {
    if (value === '') {
      updateScore(studentId, null);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) return;
    if (num < 0 || num > maxScore) return;
    updateScore(studentId, num);
  };

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
      setSuccessMsg('Notes soumises pour validation');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error already set in hook
    }
  };

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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <School size={20} className="text-navy-300" />
          </div>
          <div>
            <p className="font-heading font-bold text-base text-navy-500">Saisie des notes /{maxScore}</p>
            <p className="text-xs text-navy-200">
              {enteredCount} sur {totalStudents} notes saisies
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
            <School size={32} className="text-navy-200" />
          </div>
          <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucun élève dans cette classe</h3>
          <p className="text-navy-300 text-sm">
            Ajoutez d'abord des élèves à cette classe pour pouvoir saisir des notes.
          </p>
        </div>
      ) : (
        <>
          {/* Grade table */}
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                    <th className="px-5 py-3 font-medium w-12">#</th>
                    <th className="px-5 py-3 font-medium">Élève</th>
                    <th className="px-5 py-3 font-medium text-center">Note /{maxScore}</th>
                    <th className="px-5 py-3 font-medium text-center hidden sm:table-cell">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const score = scores.get(student.id) ?? null;
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm text-navy-200 font-medium">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center text-navy-300 font-heading font-bold text-[10px] flex-shrink-0">
                              {student.first_name.charAt(0).toUpperCase()}{student.last_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-navy-500 text-sm">
                              {student.last_name} {student.first_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-3">
                            <input
                              type="number"
                              min={0}
                              max={maxScore}
                              step="0.25"
                              value={score !== null ? score : ''}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              disabled={isReadOnly}
                              placeholder="—"
                              className="w-20 px-3 py-2 rounded-lg border border-navy-100 bg-white text-center text-navy-500 text-sm font-medium focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 disabled:bg-cream disabled:text-navy-300 transition-all"
                            />
                            <ScoreBadge score={score} maxScore={maxScore} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                          {score === null ? (
                            <span className="text-xs text-navy-200">Non noté</span>
                          ) : score >= maxScore / 2 ? (
                            <span className="text-xs font-medium text-success-400">Réussi</span>
                          ) : (
                            <span className="text-xs font-medium text-coral-400">Insuffisant</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy-100 bg-cream/40">
                    <td colSpan={2} className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-navy-200 font-medium uppercase tracking-wide">Moyenne de classe</p>
                          <p className="font-heading font-bold text-2xl text-navy-500 mt-0.5">
                            {enteredCount > 0 ? average.toFixed(2) : '—'}
                            {enteredCount > 0 && <span className="text-sm text-navy-200 font-normal"> /{maxScore}</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div>
                        <p className="text-xs text-navy-200 font-medium uppercase tracking-wide">Saisies</p>
                        <p className="font-heading font-bold text-lg text-navy-400 mt-0.5">
                          {enteredCount}<span className="text-sm text-navy-200 font-normal"> / {totalStudents}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-center">
                      {enteredCount > 0 && (
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            average >= maxScore / 2
                              ? 'bg-success-50 text-success-400'
                              : 'bg-coral-50 text-coral-400'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{
                            backgroundColor: average >= maxScore / 2 ? '#3B9B6E' : '#E76F51'
                          }} />
                          {average >= maxScore / 2 ? 'Classe réussie' : 'Classe en difficulté'}
                        </div>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
                disabled={saving || enteredCount === 0}
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
                  ? 'Ces notes ont été soumises et sont en attente de validation par l\'administrateur de l\'école. Vous ne pouvez plus les modifier.'
                  : 'Ces notes ont été validées et sont désormais visibles par les élèves et parents.'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
