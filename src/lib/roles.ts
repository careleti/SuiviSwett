export type Role = 'super-admin' | 'school-admin' | 'teacher' | 'parent';
export type Page = 'landing' | 'login' | 'dashboard';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface RoleConfig {
  id: Role;
  label: string;
  description: string;
  navItems: NavItem[];
}

export const roleConfigs: Record<Role, RoleConfig> = {
  'super-admin': {
    id: 'super-admin',
    label: 'Super-admin',
    description: 'Gestion de la plateforme et des écoles partenaires',
    navItems: [
      { id: 'overview', label: 'Vue d\'ensemble', icon: 'LayoutDashboard' },
      { id: 'schools', label: 'Écoles', icon: 'Building2' },
      { id: 'subscriptions', label: 'Abonnements', icon: 'CreditCard' },
      { id: 'settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
  'school-admin': {
    id: 'school-admin',
    label: 'Admin école',
    description: 'Direction et secrétariat de l\'établissement',
    navItems: [
      { id: 'overview', label: 'Vue d\'ensemble', icon: 'LayoutDashboard' },
      { id: 'classes', label: 'Classes', icon: 'School' },
      { id: 'teachers', label: 'Enseignants', icon: 'Users' },
      { id: 'students', label: 'Élèves', icon: 'GraduationCap' },
      { id: 'results', label: 'Résultats', icon: 'Award' },
      { id: 'publish', label: 'Publication', icon: 'Send' },
      { id: 'consultations', label: 'Consultations', icon: 'Eye' },
    ],
  },
  'teacher': {
    id: 'teacher',
    label: 'Enseignant',
    description: 'Saisie des notes et suivi des élèves',
    navItems: [
      { id: 'overview', label: 'Mes classes', icon: 'LayoutDashboard' },
      { id: 'grades', label: 'Saisie des notes', icon: 'ClipboardEdit' },
      { id: 'students', label: 'Élèves', icon: 'GraduationCap' },
      { id: 'results', label: 'Mes résultats', icon: 'Award' },
    ],
  },
  'parent': {
    id: 'parent',
    label: 'Parent',
    description: 'Suivi des résultats de vos enfants',
    navItems: [
      { id: 'overview', label: 'Accueil', icon: 'LayoutDashboard' },
      { id: 'children', label: 'Mes enfants', icon: 'Users' },
      { id: 'results', label: 'Résultats', icon: 'Award' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell' },
    ],
  },
};

export const roleOrder: Role[] = ['super-admin', 'school-admin', 'teacher', 'parent'];
