import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
}

export function TeacherModal({ isOpen, onClose, onSave }: TeacherModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis');
      return;
    }
    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(firstName.trim(), lastName.trim(), email.trim(), password);
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
      title="Ajouter un enseignant"
      subtitle="Crée un compte enseignant rattaché à votre école"
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
          <label className="label-field">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prof@ecole.bj"
            className="input-field"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label-field">Mot de passe *</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe initial"
            className="input-field"
            autoComplete="new-password"
          />
          <p className="text-xs text-navy-200 mt-1.5">
            L'enseignant pourra se connecter avec cet email et ce mot de passe.
          </p>
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
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Création...' : 'Créer l\'enseignant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
