import { useState } from 'react';
import { Plus, Building2, Users, TrendingUp, Eye, Power, Search, AlertCircle } from 'lucide-react';
import { useSchools } from '@/hooks/useSchools';
import { SchoolModal } from '@/components/SchoolModal';
import { SchoolDetailPanel } from '@/components/SchoolDetailPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { SchoolWithStats } from '@/lib/supabase';

export function SchoolsView() {
  const { schools, loading, error, toggleSubscription, createSchool } = useSchools();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithStats | null>(null);
  const [toggleTarget, setToggleTarget] = useState<SchoolWithStats | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.city || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalStudents = schools.reduce((sum, s) => sum + s.student_count, 0);
  const totalRevenue = totalStudents * 1000;
  const activeSchools = schools.filter((s) => s.subscription_status === 'active').length;

  const handleToggle = async () => {
    if (!toggleTarget) return;
    try {
      await toggleSubscription(toggleTarget.id, toggleTarget.subscription_status);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    }
  };

  if (selectedSchool) {
    return <SchoolDetailPanel school={selectedSchool} onBack={() => setSelectedSchool(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-navy-500">Écoles partenaires</h1>
          <p className="text-navy-300 mt-1">Gérez les établissements inscrits sur la plateforme</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          Ajouter une école
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-navy-500 rounded-2xl p-5 flex items-start gap-4 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
          <div className="w-11 h-11 rounded-xl bg-gold-400/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total écoles</p>
            <p className="font-heading font-bold text-3xl text-white mt-1">{schools.length}</p>
            <p className="text-navy-200 text-xs mt-0.5">{activeSchools} actives</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-success-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total élèves</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">
              {totalStudents.toLocaleString('fr-FR')}
            </p>
            <p className="text-navy-200 text-xs mt-0.5">Toutes écoles confondues</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Revenu annuel estimé</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">
              {totalRevenue.toLocaleString('fr-FR')}
            </p>
            <p className="text-navy-200 text-xs mt-0.5">FCFA · {totalStudents} × 1 000</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {(error || actionError) && (
        <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm rounded-xl px-5 py-4 animate-fade-in">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{actionError || error}</span>
          {actionError && (
            <button onClick={() => setActionError(null)} className="ml-auto text-coral-400 font-bold">✕</button>
          )}
        </div>
      )}

      {/* Search + Table */}
      <div className="card-base overflow-hidden">
        {/* Search bar */}
        <div className="px-5 py-4 border-b border-navy-50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou ville..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
              <Building2 size={32} className="text-navy-200" />
            </div>
            <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">
              {searchQuery ? 'Aucune école trouvée' : 'Aucune école inscrite'}
            </h3>
            <p className="text-navy-300 text-sm mb-4">
              {searchQuery ? 'Essayez une autre recherche' : 'Ajoutez votre première école partenaire'}
            </p>
            {!searchQuery && (
              <button onClick={() => setModalOpen(true)} className="btn-primary">
                <Plus size={18} />
                Ajouter une école
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                  <th className="px-5 py-3 font-medium">École</th>
                  <th className="px-5 py-3 font-medium text-center hidden sm:table-cell">Ville</th>
                  <th className="px-5 py-3 font-medium text-center">Élèves</th>
                  <th className="px-5 py-3 font-medium text-center hidden md:table-cell">Enseignants</th>
                  <th className="px-5 py-3 font-medium text-center">Statut</th>
                  <th className="px-5 py-3 font-medium text-center hidden lg:table-cell">Renouvellement</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => {
                  const isActive = school.subscription_status === 'active';
                  const renewal = school.renewal_date
                    ? new Date(school.renewal_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  return (
                    <tr
                      key={school.id}
                      className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedSchool(school)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0"
                            style={{ backgroundColor: '#1B2A4A' }}
                          >
                            {school.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-navy-500 text-sm truncate">{school.name}</p>
                            <p className="text-xs text-navy-200 truncate sm:hidden">{school.city || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-navy-300 hidden sm:table-cell">
                        {school.city || '—'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-heading font-bold text-navy-500">{school.student_count}</span>
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-navy-300 hidden md:table-cell">
                        {school.teacher_count}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isActive ? 'bg-success-50 text-success-400' : 'bg-coral-50 text-coral-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success-400' : 'bg-coral-400'}`} />
                          {isActive ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-navy-300 hidden lg:table-cell">
                        {renewal}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedSchool(school)}
                            className="p-2 rounded-lg text-navy-200 hover:bg-navy-50 hover:text-navy-400 transition-colors"
                            title="Voir le détail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setToggleTarget(school)}
                            className={`p-2 rounded-lg transition-colors ${
                              isActive
                                ? 'text-navy-200 hover:bg-coral-50 hover:text-coral-400'
                                : 'text-navy-200 hover:bg-success-50 hover:text-success-400'
                            }`}
                            title={isActive ? 'Suspendre' : 'Activer'}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SchoolModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createSchool}
      />

      <ConfirmDialog
        isOpen={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.subscription_status === 'active' ? 'Suspendre l\'école' : 'Activer l\'école'}
        message={
          toggleTarget?.subscription_status === 'active'
            ? `Voulez-vous vraiment suspendre « ${toggleTarget?.name} » ? L'école et ses utilisateurs n'auront plus accès à la plateforme.`
            : `Voulez-vous réactiver « ${toggleTarget?.name} » ? L'école et ses utilisateurs retrouveront l'accès à la plateforme.`
        }
        confirmLabel={toggleTarget?.subscription_status === 'active' ? 'Suspendre' : 'Activer'}
        danger={toggleTarget?.subscription_status === 'active'}
      />
    </div>
  );
}
