import { useState } from 'react';
import { Plus, School, Users, Pencil, Trash2, UserCheck, AlertCircle, ChevronDown } from 'lucide-react';
import { useClasses } from '@/hooks/useClasses';
import { useAuth } from '@/hooks/useAuth';
import { ClassModal } from '@/components/ClassModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ClassWithStats } from '@/lib/supabase';

export function ClassesView() {
  const { school } = useAuth();
  const { classes, teachers, loading, error, createClass, renameClass, deleteClass, assignTeacher } = useClasses();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ClassWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassWithStats | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClass(deleteTarget.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleAssignTeacher = async (classId: string, teacherId: string) => {
    setOpenMenuId(null);
    try {
      await assignTeacher(classId, teacherId || null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur lors de l'assignation");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-navy-500">Classes</h1>
          <p className="text-navy-300 mt-1">
            Gérez les classes de votre établissement{school ? ` — ${school.name}` : ''}
          </p>
        </div>
        <button onClick={() => setCreateModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          Créer une classe
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-base p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <School size={20} className="text-navy-300" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total classes</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{classes.length}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-success-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total élèves</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">
              {classes.reduce((sum, c) => sum + c.student_count, 0).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
            <UserCheck size={20} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Enseignants disponibles</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{teachers.length}</p>
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

      {/* Classes list */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
              <School size={32} className="text-navy-200" />
            </div>
            <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucune classe créée</h3>
            <p className="text-navy-300 text-sm mb-4">Commencez par créer votre première classe</p>
            <button onClick={() => setCreateModalOpen(true)} className="btn-primary">
              <Plus size={18} />
              Créer une classe
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                  <th className="px-5 py-3 font-medium">Classe</th>
                  <th className="px-5 py-3 font-medium text-center hidden sm:table-cell">Niveau</th>
                  <th className="px-5 py-3 font-medium text-center hidden md:table-cell">Année scolaire</th>
                  <th className="px-5 py-3 font-medium text-center">Élèves</th>
                  <th className="px-5 py-3 font-medium">Enseignant principal</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                          <School size={16} className="text-navy-300" />
                        </div>
                        <p className="font-medium text-navy-500 text-sm">{cls.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-navy-300 hidden sm:table-cell">
                      {cls.level || '—'}
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-navy-300 hidden md:table-cell">
                      {cls.school_year || '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-heading font-bold text-navy-500">{cls.student_count}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === cls.id ? null : cls.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream/60 hover:bg-cream transition-colors text-sm text-navy-400 font-medium"
                        >
                          {cls.teacher_name || 'Non assigné'}
                          <ChevronDown size={14} className="text-navy-200" />
                        </button>
                        {openMenuId === cls.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute z-20 mt-1 left-0 w-56 bg-white rounded-xl shadow-lg border border-navy-50 py-1.5 animate-fade-in max-h-60 overflow-y-auto">
                              <button
                                onClick={() => handleAssignTeacher(cls.id, '')}
                                className="w-full text-left px-4 py-2 text-sm text-navy-300 hover:bg-cream transition-colors"
                              >
                                Aucun enseignant
                              </button>
                              {teachers.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-navy-200 italic">
                                  Aucun enseignant créé. Ajoutez des enseignants à votre école pour les assigner.
                                </div>
                              ) : (
                                teachers.map((teacher) => (
                                  <button
                                    key={teacher.id}
                                    onClick={() => handleAssignTeacher(cls.id, teacher.id)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-cream transition-colors ${
                                      cls.teacher_id === teacher.id ? 'text-gold-400 font-medium' : 'text-navy-400'
                                    }`}
                                  >
                                    {teacher.full_name || teacher.email}
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setRenameTarget(cls)}
                          className="p-2 rounded-lg text-navy-200 hover:bg-navy-50 hover:text-navy-400 transition-colors"
                          title="Renommer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cls)}
                          className="p-2 rounded-lg text-navy-200 hover:bg-coral-50 hover:text-coral-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClassModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={createClass}
        mode="create"
      />

      {renameTarget && (
        <ClassModal
          isOpen={renameTarget !== null}
          onClose={() => setRenameTarget(null)}
          onSave={(name, level, schoolYear) => {
            if (schoolYear) {
              return renameClass(renameTarget.id, name);
            }
            return renameClass(renameTarget.id, name);
          }}
          initialName={renameTarget.name}
          initialLevel={renameTarget.level || ''}
          initialYear={renameTarget.school_year || ''}
          mode="rename"
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la classe"
        message={`Voulez-vous vraiment supprimer « ${deleteTarget?.name} » ? Les élèves rattachés à cette classe seront détachés mais ne seront pas supprimés.`}
        confirmLabel="Supprimer"
        danger={true}
      />
    </div>
  );
}
