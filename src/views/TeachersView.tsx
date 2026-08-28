import { useState } from 'react';
import {
  Plus, Users, UserCheck, UserX, Search, AlertCircle,
  BookOpen, School, Settings2,
} from 'lucide-react';
import { useTeachers, type TeacherWithDetails } from '@/hooks/useTeachers';
import { useAuth } from '@/hooks/useAuth';
import { TeacherModal } from '@/components/TeacherModal';
import { TeacherAssignModal } from '@/components/TeacherAssignModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function TeachersView() {
  const { school } = useAuth();
  const { teachers, classes, subjects, loading, error, createTeacher, toggleTeacherActive, updateAssignments } = useTeachers();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<TeacherWithDetails | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TeacherWithDetails | null>(null);
  const [activateTarget, setActivateTarget] = useState<TeacherWithDetails | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.full_name || '').toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.class_names.some((n) => n.toLowerCase().includes(q)) ||
      t.subject_names.some((n) => n.toLowerCase().includes(q))
    );
  });

  const activeCount = teachers.filter((t) => t.is_active).length;
  const inactiveCount = teachers.length - activeCount;

  const handleAssign = async (classIds: string[], subjectIds: string[]) => {
    if (!assignTarget) return;
    await updateAssignments(assignTarget.id, classIds, subjectIds);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await toggleTeacherActive(deactivateTarget.id, false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la désactivation');
    }
  };

  const handleActivate = async () => {
    if (!activateTarget) return;
    try {
      await toggleTeacherActive(activateTarget.id, true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de l\'activation');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-navy-500">Enseignants</h1>
          <p className="text-navy-300 mt-1">
            Gérez les enseignants de votre établissement{school ? ` — ${school.name}` : ''}
          </p>
        </div>
        <button onClick={() => setAddModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          Ajouter un enseignant
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-base p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-navy-300" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total enseignants</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{teachers.length}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <UserCheck size={20} className="text-success-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Actifs</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="w-11 h-11 rounded-xl bg-coral-50 flex items-center justify-center flex-shrink-0">
            <UserX size={20} className="text-coral-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Inactifs</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{inactiveCount}</p>
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
        <div className="px-5 py-4 border-b border-navy-50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, email, classe ou matière..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
              <Users size={32} className="text-navy-200" />
            </div>
            <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">
              {searchQuery ? 'Aucun enseignant trouvé' : 'Aucun enseignant créé'}
            </h3>
            <p className="text-navy-300 text-sm mb-4">
              {searchQuery ? 'Essayez une autre recherche' : 'Ajoutez votre premier enseignant'}
            </p>
            {!searchQuery && (
              <button onClick={() => setAddModalOpen(true)} className="btn-primary">
                <Plus size={18} />
                Ajouter un enseignant
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                  <th className="px-5 py-3 font-medium">Enseignant</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Matières</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Classes</th>
                  <th className="px-5 py-3 font-medium text-center">Statut</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-navy-50 flex items-center justify-center text-navy-300 font-heading font-bold text-xs flex-shrink-0">
                          {(teacher.full_name || teacher.email)
                            .split(' ')
                            .slice(0, 2)
                            .map((w) => w.charAt(0).toUpperCase())
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-navy-500 text-sm">
                            {teacher.full_name || 'Sans nom'}
                          </p>
                          <p className="text-xs text-navy-200 truncate">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {teacher.subject_names.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.subject_names.slice(0, 3).map((name, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-50 text-navy-400 text-xs font-medium"
                            >
                              <BookOpen size={11} />
                              {name}
                            </span>
                          ))}
                          {teacher.subject_names.length > 3 && (
                            <span className="text-xs text-navy-200 font-medium">
                              +{teacher.subject_names.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-navy-200">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {teacher.class_names.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.class_names.slice(0, 3).map((name, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold-50 text-gold-400 text-xs font-medium"
                            >
                              <School size={11} />
                              {name}
                            </span>
                          ))}
                          {teacher.class_names.length > 3 && (
                            <span className="text-xs text-navy-200 font-medium">
                              +{teacher.class_names.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-navy-200">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {teacher.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-50 text-coral-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-coral-400" />
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAssignTarget(teacher)}
                          className="p-2 rounded-lg text-navy-200 hover:bg-navy-50 hover:text-navy-400 transition-colors"
                          title="Assigner classes et matières"
                        >
                          <Settings2 size={16} />
                        </button>
                        {teacher.is_active ? (
                          <button
                            onClick={() => setDeactivateTarget(teacher)}
                            className="p-2 rounded-lg text-navy-200 hover:bg-coral-50 hover:text-coral-400 transition-colors"
                            title="Désactiver"
                          >
                            <UserX size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActivateTarget(teacher)}
                            className="p-2 rounded-lg text-navy-200 hover:bg-success-50 hover:text-success-400 transition-colors"
                            title="Activer"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <TeacherModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={createTeacher}
      />

      {assignTarget && (
        <TeacherAssignModal
          isOpen={assignTarget !== null}
          onClose={() => setAssignTarget(null)}
          onSave={handleAssign}
          teacherName={assignTarget.full_name || assignTarget.email}
          classes={classes}
          subjects={subjects}
          initialClassIds={assignTarget.class_ids}
          initialSubjectIds={assignTarget.subject_ids}
        />
      )}

      <ConfirmDialog
        isOpen={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Désactiver l'enseignant"
        message={`Voulez-vous vraiment désactiver le compte de « ${deactivateTarget?.full_name || deactivateTarget?.email} » ? L'enseignant ne pourra plus se connecter.`}
        confirmLabel="Désactiver"
        danger={true}
      />

      <ConfirmDialog
        isOpen={activateTarget !== null}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivate}
        title="Activer l'enseignant"
        message={`Réactiver le compte de « ${activateTarget?.full_name || activateTarget?.email} » ? L'enseignant pourra de nouveau se connecter.`}
        confirmLabel="Activer"
        danger={false}
      />
    </div>
  );
}
