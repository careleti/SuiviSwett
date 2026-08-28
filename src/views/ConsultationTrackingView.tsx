import { useState, useMemo } from 'react';
import {
  Eye, EyeOff, Send, AlertCircle, Clock, Check, Bell, Users, Filter, Search,
} from 'lucide-react';
import { useConsultationTracking } from '@/hooks/useConsultationTracking';

type FilterMode = 'all' | 'not_viewed' | 'viewed';

export function ConsultationTrackingView() {
  const {
    records,
    loading,
    error,
    actionLoading,
    sendReminder,
    sendBulkReminders,
  } = useConsultationTracking();

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) map.set(r.class_id, r.class_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  const termOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) map.set(r.term, r.term_label);
    return Array.from(map.entries()).map(([term, label]) => ({ term, label }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterMode === 'not_viewed' && r.viewed) return false;
      if (filterMode === 'viewed' && !r.viewed) return false;
      if (classFilter !== 'all' && r.class_id !== classFilter) return false;
      if (termFilter !== 'all' && r.term !== termFilter) return false;
      const q = searchQuery.toLowerCase();
      if (q && !(`${r.student_last_name} ${r.student_first_name}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [records, filterMode, classFilter, termFilter, searchQuery]);

  const notViewedRecords = useMemo(() => filteredRecords.filter((r) => !r.viewed), [filteredRecords]);

  const stats = useMemo(() => {
    const total = records.length;
    const viewed = records.filter((r) => r.viewed).length;
    const notViewed = total - viewed;
    return { total, viewed, notViewed };
  }, [records]);

  const handleSingleReminder = async (studentId: string, term: string, studentName: string) => {
    try {
      await sendReminder(studentId, term);
      setSuccessMsg(`Relance enregistrée pour ${studentName}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error set in hook
    }
  };

  const handleBulkReminders = async () => {
    if (notViewedRecords.length === 0) return;
    try {
      // Group by term to send reminders
      const byTerm = new Map<string, string[]>();
      for (const r of notViewedRecords) {
        const arr = byTerm.get(r.term) || [];
        arr.push(r.student_id);
        byTerm.set(r.term, arr);
      }
      for (const [term, studentIds] of byTerm) {
        await sendBulkReminders(studentIds, term);
      }
      setSuccessMsg(`${notViewedRecords.length} relance${notViewedRecords.length > 1 ? 's' : ''} enregistrée${notViewedRecords.length > 1 ? 's' : ''}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error set in hook
    }
  };

  const daysBadgeColor = (days: number) => {
    if (days <= 2) return 'bg-success-50 text-success-400';
    if (days <= 7) return 'bg-gold-50 text-gold-400';
    return 'bg-coral-50 text-coral-400';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-navy-500">Suivi des consultations</h1>
        <p className="text-navy-300 mt-1">
          Vérifiez que les parents ont bien consulté les résultats publiés
        </p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-base p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-navy-300" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total bulletins</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{stats.total}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <Eye size={20} className="text-success-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Consultés</p>
            <p className="font-heading font-bold text-3xl text-success-500 mt-1">{stats.viewed}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
            <EyeOff size={20} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Pas encore vus</p>
            <p className="font-heading font-bold text-3xl text-gold-500 mt-1">{stats.notViewed}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="card-base p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
            <Bell size={32} className="text-navy-200" />
          </div>
          <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucune publication</h3>
          <p className="text-navy-300 text-sm">
            Publiez d'abord les bulletins d'une classe pour suivre les consultations des parents.
          </p>
        </div>
      ) : (
        <>
          {/* Filters bar */}
          <div className="card-base p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-navy-200" />
                <span className="text-sm font-medium text-navy-300">Filtres</span>
              </div>
              {/* Quick filter tabs */}
              <div className="flex items-center gap-2">
                {([
                  { mode: 'all' as FilterMode, label: 'Tous', count: stats.total },
                  { mode: 'not_viewed' as FilterMode, label: 'Pas vus', count: stats.notViewed },
                  { mode: 'viewed' as FilterMode, label: 'Vus', count: stats.viewed },
                ]).map((tab) => (
                  <button
                    key={tab.mode}
                    onClick={() => setFilterMode(tab.mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterMode === tab.mode
                        ? 'bg-navy-500 text-white'
                        : 'bg-cream text-navy-300 hover:bg-navy-50'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-200" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un élève..."
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
              {/* Class filter */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="input-field py-2 text-sm w-auto min-w-[140px]"
              >
                <option value="all">Toutes classes</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {/* Term filter */}
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="input-field py-2 text-sm w-auto min-w-[140px]"
              >
                <option value="all">Toutes périodes</option>
                {termOptions.map((t) => (
                  <option key={t.term} value={t.term}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Bulk reminder button */}
            {notViewedRecords.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-navy-50">
                <p className="text-xs text-navy-200">
                  {notViewedRecords.length} élève{notViewedRecords.length > 1 ? 's' : ''} sans consultation
                </p>
                <button
                  onClick={handleBulkReminders}
                  disabled={actionLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {actionLoading ? <div className="w-4 h-4 border-2 border-navy-800/30 border-t-navy-800 rounded-full animate-spin" /> : <Send size={16} />}
                  Relancer tous les parents ({notViewedRecords.length})
                </button>
              </div>
            )}
          </div>

          {/* Tracking table */}
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                    <th className="px-5 py-3 font-medium">Élève</th>
                    <th className="px-5 py-3 font-medium hidden sm:table-cell">Classe</th>
                    <th className="px-5 py-3 font-medium hidden md:table-cell">Période</th>
                    <th className="px-5 py-3 font-medium text-center">Statut</th>
                    <th className="px-5 py-3 font-medium text-center hidden lg:table-cell">Délai</th>
                    <th className="px-5 py-3 font-medium text-center hidden xl:table-cell">Consulté le</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <p className="text-sm text-navy-200">Aucun élève ne correspond à ces filtres.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={`${r.student_id}-${r.term}`} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center text-navy-300 font-heading font-bold text-[10px] flex-shrink-0">
                              {r.student_first_name.charAt(0).toUpperCase()}{r.student_last_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-navy-500 text-sm">
                              {r.student_last_name} {r.student_first_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-navy-50 text-navy-400 text-xs font-medium">
                            {r.class_name}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-navy-300 hidden md:table-cell">
                          {r.term_label}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {r.viewed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-400 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
                              Vu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-50 text-gold-400 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                              Pas vu
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell">
                          {!r.viewed && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${daysBadgeColor(r.days_since_publication)}`}>
                              <Clock size={11} />
                              {r.days_since_publication === 0 ? 'Aujourd\'hui' : `${r.days_since_publication} j`}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center text-sm text-navy-300 hidden xl:table-cell">
                          {r.viewed_at ? new Date(r.viewed_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }) : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!r.viewed ? (
                            <button
                              onClick={() => handleSingleReminder(r.student_id, r.term, `${r.student_first_name} ${r.student_last_name}`)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-50 text-gold-400 text-xs font-semibold hover:bg-gold-100 transition-colors disabled:opacity-50"
                            >
                              <Bell size={13} />
                              Relancer
                            </button>
                          ) : (
                            <span className="text-xs text-navy-200">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
