import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  eq_id: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: string;
  guardian_name?: string | null;
  profile_completed?: boolean;
  specialization?: string | null;
  profile_description?: string | null;
  search_keywords?: string[] | null;
  is_searchable?: boolean;
  // Approval fields
  guardian_approved?: boolean;
  guardian_approved_at?: string | null;
  admin_approved?: boolean;
  admin_approved_at?: string | null;
  upline_eq_id?: string | null;
  upline_first_name?: string | null;
  upline_last_name?: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  rolesReady: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isClient: boolean;
  isSpecjalista: boolean;
  loginTrigger: number;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesReady, setRolesReady] = useState(false);
  const [loginTrigger, setLoginTrigger] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      // Fetch profile and role in parallel for speed
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
      } else {
        setProfile(profileResult.data);
      }

      if (roleResult.error) {
        console.error('Error fetching user role:', roleResult.error);
      } else {
        setUserRole(roleResult.data);
      }
      
      // Mark roles as ready immediately after fetch completes
      setRolesReady(true);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setRolesReady(true); // Still mark as ready to prevent infinite loading
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscriptionRef: { unsubscribe: () => void } | null = null;

    // Set up auth state listener FIRST - SYNCHRONOUS callback (no async!)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Increment login trigger on SIGNED_IN to reset banner states
        // Tylko prawdziwe logowanie (przez formularz) - nie refresh/tab switch
        if (event === 'SIGNED_IN') {
          const freshLogin = sessionStorage.getItem('fresh_login');
          if (freshLogin) {
            sessionStorage.removeItem('fresh_login');
            setLoginTrigger(prev => prev + 1);
          }
        }
        
        if (newSession?.user) {
          // CRITICAL: Use setTimeout(0) to defer fetchProfile and prevent deadlock
          setRolesReady(false);
          setTimeout(() => {
            if (mounted) {
              fetchProfile(newSession.user.id).then(() => {
                if (mounted) {
                  setLoading(false);
                  setInitialized(true);
                }
              });
            }
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setRolesReady(true);
          setLoading(false);
          setInitialized(true);
        }
      }
    );
    
    subscriptionRef = subscription;

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      // If no session exists, set initialized immediately
      // If session exists, onAuthStateChange will handle it
      if (!existingSession?.user) {
        setRolesReady(true);
        setLoading(false);
        setInitialized(true);
      }
    }).catch((error) => {
      console.error('Auth initialization error:', error);
      if (mounted) {
        setLoading(false);
        setRolesReady(true);
        setInitialized(true);
      }
    });

    // Proper cleanup
    return () => {
      mounted = false;
      subscriptionRef?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setRolesReady(false);
    // Oznacz prawdziwe logowanie PRZED wywołaniem - zanim Supabase odpali onAuthStateChange
    sessionStorage.setItem('fresh_login', Date.now().toString());
    sessionStorage.setItem('show_banner_after_login', 'true'); // Flaga dla banerów
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      // Jeśli błąd - usuń flagi
      sessionStorage.removeItem('fresh_login');
      sessionStorage.removeItem('show_banner_after_login');
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    // Oznacz prawdziwe logowanie PRZED wywołaniem
    sessionStorage.setItem('fresh_login', Date.now().toString());
    sessionStorage.setItem('show_banner_after_login', 'true'); // Flaga dla banerów
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) {
      // Jeśli błąd - usuń flagi
      sessionStorage.removeItem('fresh_login');
      sessionStorage.removeItem('show_banner_after_login');
    }
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      // Clear banner sessionStorage for clean next login
      sessionStorage.removeItem('show_banner_after_login');
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('info_banner_shown_')) {
          sessionStorage.removeItem(key);
        }
      });
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setRolesReady(true);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state anyway on error
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setRolesReady(true);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isAdmin = userRole?.role === 'admin' || profile?.role === 'admin';
  const isPartner = userRole?.role === 'partner' || profile?.role === 'partner';
  const isClient = userRole?.role === 'client' || profile?.role === 'client';
  const isSpecjalista = userRole?.role === 'specjalista' || profile?.role === 'specjalista';

  const value: AuthContextType = {
    user,
    session,
    profile,
    userRole,
    loading,
    rolesReady,
    isAdmin,
    isPartner,
    isClient,
    isSpecjalista,
    loginTrigger,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  // Don't render children until auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
