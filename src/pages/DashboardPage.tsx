import { SealBadge } from '@/components/SealBadge';
import { roleConfigs, type Role } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import { useSchools } from '@/hooks/useSchools';
import {
  Building2, Users, Award, School, GraduationCap, ClipboardEdit,
  Bell, TrendingUp, FileText, Send, CreditCard, Shield,
} from 'lucide-react';

interface DashboardPageProps {
  role: Role;
}

const dashboardContent: Record<Role, {
  greeting: string;
  subtitle: string;
  sections: { icon: typeof Building2; title: string; description: string; items: string[] }[];
}> = {
  'super-admin': {
    greeting: 'Bienvenue',
    subtitle: 'Vue d\'ensemble de la plateforme SuiviSweet et des écoles partenaires',
    sections: [
      { icon: Building2, title: 'Écoles partenaires', description: 'Gérez les établissements inscrits sur la plateforme', items: ['Ajouter une école', 'Consulter les abonnements', 'Statistiques par école'] },
      { icon: Shield, title: 'Sécurité & accès', description: 'Contrôlez les permissions et les comptes administrateurs', items: ['Comptes super-admin', 'Journaux d\'activité', 'Paramètres de sécurité'] },
    ],
  },
  'school-admin': {
    greeting: 'Bienvenue',
    subtitle: 'Gérez votre établissement, vos classes et publiez les résultats officiels',
    sections: [
      { icon: School, title: 'Classes & niveaux', description: 'Organisez vos classes et affectez les enseignants', items: ['Créer une classe', 'Affecter un enseignant', 'Liste des élèves'] },
      { icon: Send, title: 'Publication des résultats', description: 'Validez et publiez les bulletins officiels', items: ['Prévisualiser les bulletins', 'Publier aux parents', 'Historique des publications'] },
    ],
  },
  'teacher': {
    greeting: 'Bienvenue',
    subtitle: 'Saisissez vos notes et suivez les performances de vos classes',
    sections: [
      { icon: ClipboardEdit, title: 'Saisie des notes', description: 'Entrez les notes de vos évaluations par classe', items: ['Nouvelle évaluation', 'Saisie par classe', 'Import de notes'] },
      { icon: Award, title: 'Résultats de mes classes', description: 'Consultez les moyennes et classements', items: ['Classement par matière', 'Élèves en difficulté', 'Évolution des moyennes'] },
    ],
  },
  'parent': {
    greeting: 'Bienvenue',
    subtitle: 'Suivez les résultats et le parcours scolaire de vos enfants',
    sections: [
      { icon: Award, title: 'Derniers résultats', description: 'Consultez les bulletins et notes récentes', items: ['Bulletin en cours', 'Notes par matière', 'Mentions obtenues'] },
      { icon: Bell, title: 'Notifications', description: 'Restez informé des publications et alertes', items: ['Bulletins publiés', 'Alertes de baisse', 'Communications de l\'école'] },
    ],
  },
};

export function DashboardPage({ role }: DashboardPageProps) {
  const config = roleConfigs[role];
  const content = dashboardContent[role];
  const { profile, school } = useAuth();
  const { schools } = useSchools();
  const userName = profile?.full_name?.split(' ')[0] || 'cher utilisateur';

  // Compute real stats for super-admin
  const totalStudents = schools.reduce((sum, s) => sum + s.student_count, 0);
  const totalRevenue = totalStudents * 1000;
  const activeSchools = schools.filter((s) => s.subscription_status === 'active').length;

  const superAdminCards = [
    { icon: Building2, label: 'Écoles partenaires', value: String(schools.length), sub: `${activeSchools} actives` },
    { icon: Users, label: 'Total élèves', value: totalStudents.toLocaleString('fr-FR'), sub: 'Toutes écoles' },
    { icon: CreditCard, label: 'Abonnements actifs', value: String(activeSchools), sub: `${schools.length - activeSchools} suspendus` },
    { icon: TrendingUp, label: 'Revenu annuel estimé', value: totalRevenue.toLocaleString('fr-FR'), sub: 'FCFA', accent: 'gold' as const },
  ];

  const placeholderCards = [
    { icon: School, label: 'Classes', value: '—', sub: 'Tous niveaux' },
    { icon: Users, label: 'Enseignants', value: '—', sub: 'Actifs' },
    { icon: GraduationCap, label: 'Élèves inscrits', value: '—', sub: 'Toutes classes' },
    { icon: FileText, label: 'Bulletins publiés', value: '—', sub: 'Ce trimestre', accent: 'gold' as const },
  ];

  const cards = role === 'super-admin' ? superAdminCards : role === 'school-admin' ? placeholderCards : role === 'teacher' ? [
    { icon: School, label: 'Mes classes', value: '—', sub: 'Cette année' },
    { icon: ClipboardEdit, label: 'Notes à saisir', value: '—', sub: 'Évaluations en attente' },
    { icon: GraduationCap, label: 'Mes élèves', value: '—', sub: 'Total' },
    { icon: Award, label: 'Moyenne générale', value: '—', sub: 'Toutes classes', accent: 'gold' as const },
  ] : [
    { icon: Users, label: 'Mes enfants', value: '—', sub: 'Inscrits' },
    { icon: Award, label: 'Moyenne générale', value: '—', sub: 'Tous enfants', accent: 'gold' as const },
    { icon: Bell, label: 'Notifications', value: '—', sub: 'Non lues', accent: 'coral' as const },
    { icon: TrendingUp, label: 'Tendance', value: '—', sub: 'Ce trimestre' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">{config.label}</span>
        </div>
        <h1 className="font-heading font-bold text-3xl text-navy-500">{content.greeting}, {userName}</h1>
        <p className="text-navy-300 mt-1">
          {school && role !== 'super-admin' ? `${content.subtitle} — ${school.name}` : content.subtitle}
        </p>
      </div>

      {/* Seal Badge Showcase */}
      <div className="bg-navy-500 rounded-2xl p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-navy-200 text-sm font-medium uppercase tracking-wide mb-1">Aperçu</p>
          <h2 className="font-heading font-bold text-2xl text-white mb-1">Moyenne du trimestre</h2>
          <p className="text-navy-200 text-sm">Les moyennes s'affichent en badges-sceaux — la signature visuelle de SuiviSweet</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <SealBadge value={null} size="md" />
            <p className="text-navy-200 text-xs mt-2">En attente</p>
          </div>
          <div className="text-center">
            <SealBadge value={14.5} size="md" />
            <p className="text-success-300 text-xs mt-2 font-medium">Bien</p>
          </div>
          <div className="text-center hidden sm:block">
            <SealBadge value={8.5} size="md" />
            <p className="text-coral-300 text-xs mt-2 font-medium">Insuffisant</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const accentClass =
            card.accent === 'coral' ? 'text-coral-400 bg-coral-50'
            : card.accent === 'gold' ? 'text-gold-400 bg-gold-50'
            : 'text-navy-300 bg-navy-50';
          return (
            <div
              key={index}
              className="card-base p-5 flex items-start gap-4 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">{card.label}</p>
                <p className="font-heading font-bold text-2xl text-navy-500 mt-0.5">{card.value}</p>
                <p className="text-xs text-navy-200 mt-0.5">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {content.sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div
              key={index}
              className="card-base p-6 animate-slide-up"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={24} className="text-navy-300" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-navy-500">{section.title}</h3>
                  <p className="text-sm text-navy-300 mt-0.5">{section.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cream/60 hover:bg-cream transition-colors cursor-pointer group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-400 group-hover:scale-150 transition-transform" />
                    <span className="text-sm font-medium text-navy-400 group-hover:text-navy-500 transition-colors">{item}</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-navy-200">Bientôt →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder Notice */}
      <div className="text-center py-8">
        <p className="text-sm text-navy-200">
          Contenu en attente — les fonctionnalités seront ajoutées dans les prochaines étapes
        </p>
      </div>
    </div>
  );
}
