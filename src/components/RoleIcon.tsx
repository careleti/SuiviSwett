import { Shield, Building2, GraduationCap, Users } from 'lucide-react';
import type { Role } from '@/lib/roles';

interface RoleIconProps {
  role: Role;
  size?: number;
  className?: string;
}

const iconMap = {
  'super-admin': Shield,
  'school-admin': Building2,
  'teacher': GraduationCap,
  'parent': Users,
};

export function RoleIcon({ role, size = 20, className = '' }: RoleIconProps) {
  const Icon = iconMap[role];
  return <Icon size={size} className={className} />;
}

export function getRoleIcon(role: Role) {
  return iconMap[role];
}
