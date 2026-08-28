import { useState } from 'react';
import {
  GraduationCap, LogOut, Menu, X,
  LayoutDashboard, Building2, CreditCard, Settings,
  School, Users, GraduationCap as GradCap, Award, Send,
  ClipboardEdit, Bell, Eye,
} from 'lucide-react';
import { roleConfigs, type Role } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard, Building2, CreditCard, Settings,
  School, Users, GraduationCap: GradCap, Award, Send,
  ClipboardEdit, Bell, Eye,
};

interface DashboardLayoutProps {
  role: Role;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function DashboardLayout({ role, activeSection, onSectionChange, onLogout, children }: DashboardLayoutProps) {
  const config = roleConfigs[role];
  const { profile, school } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = config.navItems.map((item) => ({
    ...item,
    Icon: iconMap[item.icon] || LayoutDashboard,
  }));

  const displayName = profile?.full_name || profile?.email || 'Utilisateur';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-500 fixed left-0 top-0 bottom-0 z-30">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-10 h-10 rounded-xl bg-gold-400 flex items-center justify-center shadow-lg">
            <GraduationCap size={22} className="text-navy-800" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-white text-lg leading-none">SuiviSweet</h1>
            <p className="text-navy-200 text-[11px] mt-0.5">{config.label}</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5 px-3 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <item.Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="p-3 border-t border-navy-600">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center text-gold-400 font-heading font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              {school && (
                <p className="text-navy-200 text-[11px] truncate">{school.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="nav-link nav-link-inactive w-full"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-navy-500 px-5 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold-400 flex items-center justify-center">
            <GraduationCap size={20} className="text-navy-800" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-white text-base leading-none">SuiviSweet</h1>
            <p className="text-navy-200 text-[10px] mt-0.5">{config.label}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-white hover:bg-navy-600 transition-colors"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-navy-500 p-5 overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <span className="font-heading font-bold text-white">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-navy-200 hover:bg-navy-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 px-2 py-3 mb-4 bg-navy-600 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-navy-700 flex items-center justify-center text-gold-400 font-heading font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{displayName}</p>
                {school && (
                  <p className="text-navy-200 text-[11px] truncate">{school.name}</p>
                )}
              </div>
            </div>

            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSectionChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
                  >
                    <item.Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-6 pt-6 border-t border-navy-600">
              <button onClick={onLogout} className="nav-link nav-link-inactive w-full">
                <LogOut size={18} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export { DashboardLayout as default };
