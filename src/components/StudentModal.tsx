import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import type { SchoolClass } from '@/lib/supabase';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (firstName: string, lastName: string, classId: string, dateOfBirth: string) => Promise<void>;
  classes: SchoolClass[];
}

export function StudentModal({ isOpen, onClose, onSave, classes }: StudentModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classId, setClassId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setClassId('');
      setDateOfBirth('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis');
      return;
    }
    if (!classId) {
      setError('Veuillez sélectionner une classe');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(firstName.trim(), lastName.trim(), classId, dateOfBirth);
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
      title="Ajouter un élève"
      subtitle="Créez une fiche élève manuellement"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Prénom *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex: Jean"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="label-field">Nom *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex: Adjovi"
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="label-field">Classe *</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="input-field"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}{cls.level ? ` — ${cls.level}` : ''}
              </option>
            ))}
          </select>
          {classes.length === 0 && (
            <p className="text-xs text-coral-400 mt-1.5">
              Aucune classe disponible. Créez d'abord une classe.
            </p>
          )}
        </div>
        <div>
          <label className="label-field">Date de naissance</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="input-field"
          />
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
          <button type="submit" disabled={saving || classes.length === 0} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
