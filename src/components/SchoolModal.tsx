import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';

interface SchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    schoolName: string;
    city: string;
    address: string;
    contactName: string;
    contactEmail: string;
    adminPassword: string;
  }) => Promise<void>;
}

export function SchoolModal({ isOpen, onClose, onSave }: SchoolModalProps) {
  const [schoolName, setSchoolName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSchoolName('');
      setCity('');
      setAddress('');
      setContactName('');
      setContactEmail('');
      setAdminPassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !contactName.trim() || !contactEmail.trim() || !adminPassword.trim()) {
      setError("Le nom de l'école, le nom du contact, l'email et le mot de passe sont requis");
      return;
    }
    if (adminPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        schoolName: schoolName.trim(),
        city: city.trim(),
        address: address.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        adminPassword,
      });
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
      title="Ajouter une école"
      subtitle="Crée l'établissement et le compte admin école automatiquement"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="pb-4 border-b border-navy-50">
          <p className="text-xs font-semibold text-navy-300 uppercase tracking-wide mb-4">Informations de l'école</p>
          <div className="space-y-4">
            <div>
              <label className="label-field">Nom de l'école *</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Ex: École Pilote de Cotonou"
                className="input-field"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Ville</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Cotonou"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Adresse</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Quartier Akpakpa"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-navy-300 uppercase tracking-wide mb-4">Compte administrateur de l'école</p>
          <div className="space-y-4">
            <div>
              <label className="label-field">Nom du contact administrateur *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: Jean Adjovi"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Email de l'admin école *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="direction@ecole.bj"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Mot de passe temporaire *</label>
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                className="input-field"
              />
              <p className="text-xs text-navy-200 mt-1.5">
                L'admin école pourra se connecter avec cet email et ce mot de passe.
              </p>
            </div>
          </div>
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
            {saving ? 'Création...' : 'Créer l\'école'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
