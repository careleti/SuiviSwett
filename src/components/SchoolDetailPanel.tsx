import { Building2, Users, GraduationCap, School, MapPin, Calendar, Mail, User, ArrowLeft } from 'lucide-react';
import { SealBadge } from '@/components/SealBadge';
import type { SchoolWithStats } from '@/lib/supabase';

interface SchoolDetailPanelProps {
  school: SchoolWithStats;
  onBack: () => void;
}

export function SchoolDetailPanel({ school, onBack }: SchoolDetailPanelProps) {
  const isActive = school.subscription_status === 'active';
  const renewalDate = school.renewal_date
    ? new Date(school.renewal_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const createdDate = new Date(school.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-navy-300 hover:text-navy-500 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux écoles
      </button>

      {/* School header */}
      <div className="bg-navy-500 rounded-2xl p-6 lg:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gold-400 flex items-center justify-center shadow-md flex-shrink-0">
              <Building2 size={28} className="text-navy-800" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl text-white">{school.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isActive ? 'bg-success-400/20 text-success-300' : 'bg-coral-400/20 text-coral-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success-400' : 'bg-coral-400'}`} />
                  {isActive ? 'Actif' : 'Suspendu'}
                </span>
                {school.city && (
                  <span className="flex items-center gap-1 text-navy-200 text-sm">
                    <MapPin size={14} />
                    {school.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <SealBadge value={school.student_count > 0 ? (school.student_count / 10) : null} size="md" />
              <p className="text-navy-200 text-xs mt-2">Ratio élèves</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-base p-6 flex items-start gap-4 animate-slide-up">
          <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <School size={24} className="text-navy-300" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Classes</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{school.class_count}</p>
          </div>
        </div>
        <div className="card-base p-6 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={24} className="text-success-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Élèves</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{school.student_count}</p>
          </div>
        </div>
        <div className="card-base p-6 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
            <Users size={24} className="text-gold-400" />
          </div>
          <div>
            <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Enseignants</p>
            <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{school.teacher_count}</p>
          </div>
        </div>
      </div>

      {/* School info */}
      <div className="card-base p-6">
        <h3 className="font-heading font-bold text-lg text-navy-500 mb-5">Informations de l'établissement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={MapPin} label="Adresse" value={school.address || '—'} />
          <InfoRow icon={Mail} label="Email de contact" value={school.contact_email || '—'} />
          <InfoRow icon={User} label="Contact administrateur" value={school.contact_name || '—'} />
          <InfoRow icon={Calendar} label="Date de renouvellement" value={renewalDate} />
          <InfoRow icon={Calendar} label="Inscrite le" value={createdDate} />
          <InfoRow icon={Building2} label="Statut" value={isActive ? 'Abonnement actif' : 'Suspendu'} />
        </div>
      </div>

      {/* Revenue estimate */}
      <div className="card-base p-6">
        <h3 className="font-heading font-bold text-lg text-navy-500 mb-4">Revenu estimé (cette école)</h3>
        <div className="flex items-baseline gap-2">
          <span className="font-heading font-bold text-4xl text-gold-400">
            {(school.student_count * 1000).toLocaleString('fr-FR')}
          </span>
          <span className="text-navy-300 text-lg font-medium">FCFA / an</span>
        </div>
        <p className="text-sm text-navy-200 mt-2">
          Calcul: {school.student_count} élève{school.student_count !== 1 ? 's' : ''} × 1 000 FCFA
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cream/60">
      <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-navy-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-navy-200 font-medium">{label}</p>
        <p className="text-sm text-navy-500 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
