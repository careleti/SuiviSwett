import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'super_admin' | 'admin_ecole' | 'enseignant' | 'parent';

export interface School {
  id: string;
  name: string;
  city: string | null;
  country: string;
  subscription_status: string;
  address: string | null;
  renewal_date: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface SchoolWithStats extends School {
  student_count: number;
  teacher_count: number;
  class_count: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  school_id: string | null;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
  level: string | null;
  school_year: string | null;
  teacher_id: string | null;
  created_at: string;
}

export interface ClassWithStats extends SchoolClass {
  student_count: number;
  teacher_name: string | null;
}

export interface Teacher {
  id: string;
  email: string;
  full_name: string | null;
}

export interface Student {
  id: string;
  school_id: string;
  class_id: string | null;
  first_name: string;
  last_name: string;
  matricule: string | null;
  date_of_birth: string | null;
  parent_access_code: string | null;
  created_at: string;
}

export interface StudentWithClass extends Student {
  class_name: string | null;
}

export interface AuthState {
  profile: UserProfile | null;
  school: School | null;
}
