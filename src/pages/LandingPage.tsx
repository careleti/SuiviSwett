import { GraduationCap, ArrowRight, Shield, Building2, Users, Award, TrendingUp, Bell } from 'lucide-react';
import type { Page } from '@/lib/roles';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-navy-500 text-white">
      {/* Header */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400 flex items-center justify-center shadow-lg">
            <GraduationCap size={22} className="text-navy-800" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl leading-none text-white">SuiviSweet</h1>
            <p className="text-navy-200 text-[11px] mt-0.5">Gestion des résultats scolaires</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-all duration-200 border border-white/10"
        >
          Se connecter
          <ArrowRight size={16} />
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 lg:px-12 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-400/10 border border-gold-400/30 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse-soft" />
            <span className="text-gold-300 text-sm font-medium">Plateforme SaaS pour les écoles du Bénin</span>
          </div>

          <h2 className="font-heading font-bold text-5xl lg:text-7xl leading-[1.05] mb-6 animate-slide-up">
            La gestion des résultats
            <span className="block text-gold-400 mt-2">simplifiée et élégante</span>
          </h2>

          <p className="text-navy-100 text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            SuiviSweet accompagne directions, enseignants et parents dans la saisie, la publication et le suivi des résultats scolaires — du contrôle continu au bulletin officiel.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gold-400 text-navy-800 font-semibold text-base hover:bg-gold-300 hover:shadow-xl transition-all duration-200 active:scale-95"
            >
              Accéder à la plateforme
              <ArrowRight size={18} />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 text-white font-semibold text-base hover:bg-white/10 border border-white/10 transition-all duration-200"
            >
              Découvrir les fonctionnalités
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 lg:px-12 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Shield, title: 'Super-admin', desc: 'Pilotez l\'ensemble des écoles partenaires et les abonnements depuis un tableau de bord unique.' },
            { icon: Building2, title: 'Admin école', desc: 'Gérez classes, enseignants et élèves. Publiez les résultats officiels en quelques clics.' },
            { icon: Users, title: 'Enseignant', desc: 'Saisissez vos notes, suivez les moyennes de vos classes et anticipez les difficultés.' },
            { icon: Award, title: 'Parent', desc: 'Consultez les résultats et bulletins de vos enfants, recevez des alertes en temps réel.' },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-navy-600/50 rounded-2xl p-6 border border-white/5 hover:border-gold-400/20 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gold-400/10 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-gold-400" />
                </div>
                <h3 className="font-heading font-bold text-lg text-white mb-2">{feature.title}</h3>
        <p className="text-navy-200 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Highlights */}
      <section className="px-6 lg:px-12 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Award, title: 'Badges-sceaux', desc: 'Chaque moyenne s\'affiche comme un sceau officiel — un élément signature reconnaissable entre toutes.' },
            { icon: TrendingUp, title: 'Suivi des tendances', desc: 'Visualisez l\'évolution des résultats et détectez les baisses avant qu\'elles ne deviennent problématiques.' },
            { icon: Bell, title: 'Alertes automatiques', desc: 'Les parents sont notifiés dès qu\'un bulletin est publié ou qu\'une baisse significative est détectée.' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-4 bg-navy-600/30 rounded-2xl p-5 animate-fade-in"
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-gold-400" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-white text-base mb-1">{item.title}</h3>
                  <p className="text-navy-200 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-400 flex items-center justify-center">
              <GraduationCap size={18} className="text-navy-800" />
            </div>
            <span className="font-heading font-bold text-white">SuiviSweet</span>
          </div>
          <p className="text-navy-200 text-sm">© 2026 SuiviSweet — Plateforme de gestion des résultats scolaires · Bénin</p>
        </div>
      </footer>
    </div>
  );
}
