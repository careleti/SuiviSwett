import { useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Page } from '@/lib/roles';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Veuillez saisir votre email et votre mot de passe');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-navy-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <GraduationCap size={22} className="text-gold-400" />
          </div>
          <span className="font-heading font-bold text-xl text-navy-500">SuiviSweet</span>
        </button>
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy-300 hover:text-navy-500 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="font-heading font-bold text-3xl text-navy-500 mb-2">Connexion</h1>
            <p className="text-navy-300 text-sm">Accédez à votre espace SuiviSweet</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="card-base p-6 space-y-4 animate-slide-up">
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.bj"
                className="input-field"
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label-field">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-200 hover:text-navy-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm rounded-lg px-4 py-3 animate-fade-in">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-navy-100" />
              <span className="text-xs text-navy-200 font-medium">Comptes de démonstration</span>
              <div className="flex-1 h-px bg-navy-100" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { email: 'admin@suivisweet.bj', label: 'Super-admin' },
                { email: 'direction@ecolepilote.bj', label: 'Admin école' },
                { email: 'prof@ecolepilote.bj', label: 'Enseignant' },
                { email: 'parent@ecolepilote.bj', label: 'Parent' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => fillDemo(demo.email)}
                  className="px-3 py-2.5 rounded-lg bg-white border border-navy-100 text-xs font-medium text-navy-400 hover:border-gold-400 hover:bg-gold-50 transition-all duration-200"
                >
                  {demo.label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-navy-200 mt-3">
              Mot de passe pour tous les comptes : demo1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
