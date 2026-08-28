import { useState } from 'react';
import {
  ClipboardCheck, AlertCircle, Check, X, ChevronRight, ChevronDown,
  BookOpen, MessageSquareText, ArrowLeft, Send, RotateCcw, Clock,
  CheckCircle2, History, FileText,
} from 'lucide-react';
import {
  useBulletinValidation,
  type PendingSession,
  type SessionDetail,
} from '@/hooks/useBulletinValidation';
import { SealBadge } from '@/components/SealBadge';

type ViewMode = 'list' | 'detail' | 'history';

export function BulletinValidationView() {
  const {
    pendingSessions,
    historySessions,
    loading,
    error,
    actionLoading,
    loadSessionDetail,
    validateSession,
    rejectSession,
  } = useBulletinValidation();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSession, setSelectedSession] = useState<PendingSession | null>(null);
  const [detail, setDetail] = useState<SessionDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelectSession = async (session: PendingSession) => {
    setSelectedSession(session);
    setViewMode('detail');
    setShowRejectBox(false);
    setRejectComment('');
    setDetailLoading(true);
    try {
      const d = await loadSessionDetail(session);
      setDetail(d);
    } catch {
      setDetail([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedSession) return;
    try {
      await validateSession(selectedSession);
      setSuccessMsg(`Bulletin validé et publié pour ${selectedSession.class_name} — ${selectedSession.subject_name}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setViewMode('list');
      setSelectedSession(null);
    } catch {
      // error handled in hook
    }
  };

  const handleReject = async () => {
    if (!selectedSession) return;
    try {
      await rejectSession(selectedSession, rejectComment);
      setSuccessMsg(`Bulletin renvoyé à l'enseignant pour ${selectedSession.class_name} — ${selectedSession.subject_name}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setViewMode('list');
      setSelectedSession(null);
      setRejectComment('');
      setShowRejectBox(false);
    } catch {
      // error handled in hook
    }
  };

  // ===== DETAIL VIEW =====
  if (viewMode === 'detail' && selectedSession) {
    const session = selectedSession;
    const generalAverage = session.kind === 'grade'
      ? detail.filter((d) => d.score !== null).length > 0
        ? detail.filter((d) => d.score !== null).reduce((acc, d) => acc + (d.score! / session.max_score) * 20, 0) / detail.filter((d) => d.score !== null).length
        : null
      : null;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => { setViewMode('list'); setSelectedSession(null); }}
          className="flex items-center gap-2 text-sm font-medium text-navy-300 hover:text-navy-500 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour à la liste
        </button>

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

        {/* Session header */}
        <div className="card-base p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
              {session.kind === 'grade'
                ? <BookOpen size={24} className="text-navy-300" />
                : <MessageSquareText size={24} className="text-navy-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: session.subject_color || '#1B2A4A' }}
                />
                <h2 className="font-heading font-bold text-xl text-navy-500">{session.subject_name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold-50 text-gold-400 text-xs font-semibold">
                  En attente
                </span>
              </div>
              <p className="text-sm text-navy-300">
                {session.class_name} · {session.term_label} · {session.teacher_name}
              </p>
              <p className="text-xs text-navy-200 mt-1">
                Soumis le {new Date(session.submitted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {session.kind === 'grade' && generalAverage !== null && (
              <div className="text-center">
                <SealBadge value={generalAverage} size="md" />
                <p className="text-navy-200 text-xs mt-1.5">Moyenne / 20</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail table */}
        <div className="card-base overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-50 flex items-center gap-2">
            <FileText size={18} className="text-navy-300" />
            <h3 className="font-heading font-bold text-base text-navy-500">
              {session.kind === 'grade' ? 'Notes saisies' : 'Appréciations saisies'}
            </h3>
            <span className="ml-auto text-xs text-navy-200">
              {session.entered_count} / {session.student_count} élèves
            </span>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
            </div>
          ) : detail.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-navy-200">Aucun élève dans cette classe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                    <th className="px-5 py-3 font-medium">Élève</th>
                    <th className="px-5 py-3 font-medium text-center">
                      {session.kind === 'grade' ? 'Note' : 'Appréciation'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.map((d) => (
                    <tr key={d.student_id} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center text-navy-300 font-heading font-bold text-[10px] flex-shrink-0">
                            {d.student_first_name.charAt(0).toUpperCase()}{d.student_last_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-navy-500 text-sm">
                            {d.student_last_name} {d.student_first_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {session.kind === 'grade' ? (
                          d.score !== null ? (
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-heading font-bold text-sm ${
                              d.score >= session.max_score / 2
                                ? 'bg-success-100 text-success-500'
                                : 'bg-coral-100 text-coral-500'
                            }`}>
                              {d.score}
                            </span>
                          ) : (
                            <span className="text-navy-200 text-sm">Non noté</span>
                          )
                        ) : (
                          <span className="text-sm text-navy-300 text-left block max-w-md">
                            {d.comment || <span className="italic text-navy-200">Aucune appréciation</span>}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject comment box */}
        {showRejectBox && (
          <div className="card-base p-5 space-y-4 animate-slide-up">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-coral-400" />
              <h3 className="font-heading font-bold text-base text-navy-500">Renvoyer à l'enseignant</h3>
            </div>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Expliquez pourquoi ce bulletin est renvoyé (optionnel)..."
              rows={3}
              className="input-field resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRejectBox(false)} className="btn-ghost">
                Annuler
              </button>
              <button onClick={handleReject} disabled={actionLoading} className="btn-danger disabled:opacity-50">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RotateCcw size={16} />}
                Confirmer le renvoi
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showRejectBox && (
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowRejectBox(true)}
              disabled={actionLoading}
              className="btn-ghost"
            >
              <RotateCcw size={18} />
              Renvoyer à l'enseignant
            </button>
            <button
              onClick={handleValidate}
              disabled={actionLoading}
              className="btn-primary disabled:opacity-50"
            >
              {actionLoading ? <div className="w-4 h-4 border-2 border-navy-800/30 border-t-navy-800 rounded-full animate-spin" /> : <Send size={18} />}
              Valider et publier
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== HISTORY VIEW =====
  if (viewMode === 'history') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl text-navy-500">Historique des bulletins</h1>
            <p className="text-navy-300 mt-1">Bulletins validés ou renvoyés</p>
          </div>
          <button onClick={() => setViewMode('list')} className="btn-ghost">
            <ArrowLeft size={16} />
            Retour aux en attente
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm rounded-xl px-5 py-4 animate-fade-in">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {historySessions.length === 0 ? (
          <div className="card-base p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
              <History size={32} className="text-navy-200" />
            </div>
            <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucun historique</h3>
            <p className="text-navy-300 text-sm">Les bulletins validés ou renvoyés apparaîtront ici.</p>
          </div>
        ) : (
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                    <th className="px-5 py-3 font-medium">Classe</th>
                    <th className="px-5 py-3 font-medium">Matière</th>
                    <th className="px-5 py-3 font-medium hidden sm:table-cell">Enseignant</th>
                    <th className="px-5 py-3 font-medium hidden md:table-cell">Période</th>
                    <th className="px-5 py-3 font-medium text-center">Statut</th>
                    <th className="px-5 py-3 font-medium text-center hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historySessions.map((s) => (
                    <tr key={`${s.kind}-${s.id}`} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-navy-50 text-navy-400 text-xs font-medium">
                          {s.class_name}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.subject_color || '#1B2A4A' }} />
                          <span className="font-medium text-navy-500 text-sm">{s.subject_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-navy-300 hidden sm:table-cell">{s.teacher_name}</td>
                      <td className="px-5 py-4 text-sm text-navy-300 hidden md:table-cell">{s.term_label}</td>
                      <td className="px-5 py-4 text-center">
                        {s.status === 'validated' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-400 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
                            Publié
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-50 text-coral-400 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-coral-400" />
                            Renvoyé
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-navy-300 hidden lg:table-cell">
                        {new Date(s.submitted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-navy-500">Validation des bulletins</h1>
          <p className="text-navy-300 mt-1">Vérifiez et publiez les bulletins soumis par les enseignants</p>
        </div>
        {historySessions.length > 0 && (
          <button onClick={() => setViewMode('history')} className="btn-ghost">
            <History size={16} />
            Voir l'historique
          </button>
        )}
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

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
        </div>
      ) : pendingSessions.length === 0 ? (
        <div className="card-base p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-success-400" />
          </div>
          <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucune soumission en attente</h3>
          <p className="text-navy-300 text-sm">
            Tous les bulletins soumis ont été traités. Les nouvelles soumissions apparaîtront ici.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="card-base p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-gold-400" />
              </div>
              <div>
                <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">En attente</p>
                <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{pendingSessions.length}</p>
                <p className="text-navy-200 text-xs mt-0.5">bulletins à valider</p>
              </div>
            </div>
            <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
              <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-success-400" />
              </div>
              <div>
                <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Traités</p>
                <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{historySessions.length}</p>
                <p className="text-navy-200 text-xs mt-0.5">validés ou renvoyés</p>
              </div>
            </div>
          </div>

          {/* Pending list */}
          <div className="card-base overflow-hidden">
            <div className="px-5 py-4 border-b border-navy-50 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-navy-300" />
              <h3 className="font-heading font-bold text-base text-navy-500">Soumissions en attente</h3>
            </div>
            <div className="divide-y divide-navy-50/50">
              {pendingSessions.map((session) => (
                <button
                  key={`${session.kind}-${session.id}`}
                  onClick={() => handleSelectSession(session)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-cream/50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                    {session.kind === 'grade'
                      ? <BookOpen size={20} className="text-navy-300" />
                      : <MessageSquareText size={20} className="text-navy-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: session.subject_color || '#1B2A4A' }}
                      />
                      <span className="font-medium text-navy-500 text-sm">{session.subject_name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gold-50 text-gold-400 text-xs font-semibold">
                        En attente
                      </span>
                    </div>
                    <p className="text-xs text-navy-300">
                      {session.class_name} · {session.teacher_name} · {session.term_label}
                    </p>
                    <p className="text-xs text-navy-200 mt-0.5">
                      Soumis le {new Date(session.submitted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{session.entered_count}/{session.student_count} élèves saisis
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-navy-200 group-hover:text-navy-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
