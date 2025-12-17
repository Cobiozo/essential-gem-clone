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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (newSession?.user) {
              // Fetch profile SYNCHRONOUSLY - no setTimeout
              setRolesReady(false);
              await fetchProfile(newSession.user.id);
            } else {
              setProfile(null);
              setUserRole(null);
              setRolesReady(true);
            }
            
            setLoading(false);
            setInitialized(true);
          }
        );

        // Check for existing session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        if (existingSession?.user) {
          await fetchProfile(existingSession.user.id);
        } else {
          setRolesReady(true);
        }
        
        setLoading(false);
        setInitialized(true);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setRolesReady(true);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setRolesReady(false); // Reset roles ready before login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
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
    signIn,
    signUp,
    signOut,
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
