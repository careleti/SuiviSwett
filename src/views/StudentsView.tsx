import { useState } from 'react';
import {
  Plus, Upload, GraduationCap, Users, KeyRound, Search, AlertCircle,
  Copy, RefreshCw, Trash2, Check, X,
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useAuth } from '@/hooks/useAuth';
import { StudentModal } from '@/components/StudentModal';
import { ImportModal } from '@/components/ImportModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { StudentWithClass } from '@/lib/supabase';

export function StudentsView() {
  const { school } = useAuth();
  const { students, classes, loading, error, createStudent, importStudents, generateAccessCode, deleteStudent } = useStudents();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentWithClass | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [codeOverlay, setCodeOverlay] = useState<{ student: StudentWithClass; code: string } | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.matricule || '').toLowerCase().includes(q) ||
      (s.class_name || '').toLowerCase().includes(q)
    );
  });

  const totalWithCode = students.filter((s) => s.parent_access_code).length;

  const handleGenerateCode = async (student: StudentWithClass) => {
    setGeneratingId(student.id);
    setActionError(null);
    try {
      const code = await generateAccessCode(student.id);
      setCodeOverlay({ student, code });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la génération du code');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('Impossible de copier le code');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudent(deleteTarget.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-navy-500">Élèves</h1>
          <p className="text-navy-300 mt-1">
            Gérez les élèves de votre établissement{school ? ` — ${school.name}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setImportModalOpen(true)} className="btn-ghost">
            <Upload size={18} />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <button onClick={() => setAddModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            Ajouter un élève
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-base p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} className="text-navy-300" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total élèves</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{students.length}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-success-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Classes</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{classes.length}</p>
          </div>
        </div>
        <div className="card-base p-5 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
            <KeyRound size={20} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Codes parent générés</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{totalWithCode}</p>
            <p className="text-navy-200 text-xs mt-0.5">sur {students.length}</p>
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
              placeholder="Rechercher par nom, prénom, matricule ou classe..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
              <GraduationCap size={32} className="text-navy-200" />
            </div>
            <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">
              {searchQuery ? 'Aucun élève trouvé' : 'Aucun élève inscrit'}
            </h3>
            <p className="text-navy-300 text-sm mb-4">
              {searchQuery ? 'Essayez une autre recherche' : 'Ajoutez des élèves manuellement ou par import'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3">
                <button onClick={() => setImportModalOpen(true)} className="btn-ghost">
                  <Upload size={18} />
                  Importer
                </button>
                <button onClick={() => setAddModalOpen(true)} className="btn-primary">
                  <Plus size={18} />
                  Ajouter un élève
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                  <th className="px-5 py-3 font-medium">Élève</th>
                  <th className="px-5 py-3 font-medium text-center hidden sm:table-cell">Matricule</th>
                  <th className="px-5 py-3 font-medium text-center">Classe</th>
                  <th className="px-5 py-3 font-medium text-center hidden md:table-cell">Naissance</th>
                  <th className="px-5 py-3 font-medium text-center">Code parent</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-navy-50 flex items-center justify-center text-navy-300 font-heading font-bold text-xs flex-shrink-0">
                          {student.first_name.charAt(0).toUpperCase()}{student.last_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-navy-500 text-sm">
                            {student.last_name} {student.first_name}
                          </p>
                          <p className="text-xs text-navy-200 sm:hidden">{student.matricule || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-navy-300 hidden sm:table-cell">
                      {student.matricule || '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-navy-50 text-navy-400 text-xs font-medium">
                        {student.class_name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-navy-300 hidden md:table-cell">
                      {student.date_of_birth
                        ? new Date(student.date_of_birth).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {student.parent_access_code ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
                          Généré
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream text-navy-200 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-navy-200" />
                          Non généré
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleGenerateCode(student)}
                          disabled={generatingId === student.id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            student.parent_access_code
                              ? 'text-navy-200 hover:bg-navy-50 hover:text-navy-400'
                              : 'text-gold-400 hover:bg-gold-50'
                          }`}
                          title={student.parent_access_code ? 'Régénérer le code' : 'Générer le code parent'}
                        >
                          {generatingId === student.id ? (
                            <div className="w-4 h-4 border-2 border-navy-200 border-t-gold-400 rounded-full animate-spin" />
                          ) : student.parent_access_code ? (
                            <RefreshCw size={16} />
                          ) : (
                            <KeyRound size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(student)}
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

      {/* Modals */}
      <StudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={createStudent}
        classes={classes}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={importStudents}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l'élève"
        message={`Voulez-vous vraiment supprimer « ${deleteTarget?.first_name} ${deleteTarget?.last_name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger={true}
      />

      {/* Access code overlay */}
      {codeOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={() => setCodeOverlay(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8 animate-slide-up">
            <button
              onClick={() => setCodeOverlay(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-navy-200 hover:bg-navy-50 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-4">
                <KeyRound size={32} className="text-gold-400" />
              </div>
              <h3 className="font-heading font-bold text-xl text-navy-500 mb-1">Code d'accès parent</h3>
              <p className="text-sm text-navy-300 mb-6">
                Pour <span className="font-medium text-navy-400">{codeOverlay.student.first_name} {codeOverlay.student.last_name}</span>
              </p>

              {/* Code display */}
              <div className="bg-navy-500 rounded-xl py-6 px-4 mb-6">
                <p className="font-heading font-bold text-4xl text-gold-400 tracking-[0.3em]">
                  {codeOverlay.code}
                </p>
              </div>

              <p className="text-xs text-navy-200 mb-6">
                Partagez ce code avec le parent. Il lui permettra d'accéder aux résultats de son enfant.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleGenerateCode(codeOverlay.student)}
                  className="btn-ghost flex-1"
                >
                  <RefreshCw size={16} />
                  Régénérer
                </button>
                <button
                  onClick={() => handleCopyCode(codeOverlay.code)}
                  className="btn-primary flex-1"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copier le code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
