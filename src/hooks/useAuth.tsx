import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type UserProfile, type School, type UserRole } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  school: School | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setSchool(null);
        setLoading(false);
      }
    });

    async function loadProfile(userId: string) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profileData) {
        if (mounted) {
          setProfile(null);
          setSchool(null);
          setLoading(false);
        }
        return;
      }

      const typedProfile = profileData as UserProfile;
      if (mounted) setProfile(typedProfile);

      if (typedProfile.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', typedProfile.school_id)
          .maybeSingle();
        if (mounted) setSchool(schoolData as School | null);
      } else {
        if (mounted) setSchool(null);
      }

      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    if (!data.user) {
      return { error: 'Aucun utilisateur retourné par le serveur d\'authentification' };
    }

    // Load profile directly so we can surface a clear error if it fails
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      return { error: `Erreur lors du chargement du profil: ${profileError.message}` };
    }
    if (!profileData) {
      return { error: 'Aucun profil trouvé pour ce compte. Contactez un administrateur.' };
    }

    // Manually update state so the UI transitions immediately
    const typedProfile = profileData as UserProfile;
    setProfile(typedProfile);
    setSession(data.session);

    if (typedProfile.school_id) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', typedProfile.school_id)
        .maybeSingle();
      setSchool(schoolData as School | null);
    } else {
      setSchool(null);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSchool(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, school, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function roleToRouteRole(role: UserRole): 'super-admin' | 'school-admin' | 'teacher' | 'parent' {
  switch (role) {
    case 'super_admin': return 'super-admin';
    case 'admin_ecole': return 'school-admin';
    case 'enseignant': return 'teacher';
    case 'parent': return 'parent';
  }
}
