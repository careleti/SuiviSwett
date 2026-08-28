import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, level: string, schoolYear: string) => Promise<void>;
  initialName?: string;
  initialLevel?: string;
  initialYear?: string;
  mode: 'create' | 'rename';
}

const LEVELS = ['Maternelle', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale', 'Autre'];

export function ClassModal({ isOpen, onClose, onSave, initialName, initialLevel, initialYear, mode }: ClassModalProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setLevel(initialLevel || '');
      setSchoolYear(initialYear || '');
      setError(null);
    }
  }, [isOpen, initialName, initialLevel, initialYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom de la classe est requis');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), level.trim(), schoolYear.trim());
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
      title={mode === 'create' ? 'Créer une classe' : 'Renommer la classe'}
      subtitle={mode === 'create' ? 'Ajoutez une nouvelle classe à votre établissement' : 'Modifiez le nom et les informations de la classe'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-field">Nom de la classe *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: 6ème A"
            className="input-field"
            autoFocus
          />
        </div>
        <div>
          <label className="label-field">Niveau</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="input-field"
          >
            <option value="">Sélectionner un niveau</option>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
        {mode === 'create' && (
          <div>
            <label className="label-field">Année scolaire</label>
            <input
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="Ex: 2025-2026"
              className="input-field"
            />
          </div>
        )}

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
            {saving ? 'Enregistrement...' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
