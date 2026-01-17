import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarState {
  isConnected: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
  isConfigured: boolean | null;
}

interface TestResult {
  success: boolean;
  step: 'config' | 'token' | 'api' | 'ready';
  message: string;
}

export const useGoogleCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<GoogleCalendarState>({
    isConnected: false,
    isLoading: true,
    expiresAt: null,
    isConfigured: null,
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Check if system is configured (admin has set up secrets)
  const checkConfiguration = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-config');
      if (error) {
        console.error('[useGoogleCalendar] Error checking config:', error);
        return false;
      }
      return data?.configured ?? false;
    } catch (error) {
      console.error('[useGoogleCalendar] Config check error:', error);
      return false;
    }
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!user) {
      setState({ isConnected: false, isLoading: false, expiresAt: null, isConfigured: null });
      return;
    }

    try {
      // Check configuration first
      const isConfigured = await checkConfiguration();

      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useGoogleCalendar] Error checking connection:', error);
        setState({ isConnected: false, isLoading: false, expiresAt: null, isConfigured });
        return;
      }

      if (data) {
        const expiresAt = new Date(data.expires_at);
        setState({
          isConnected: true,
          isLoading: false,
          expiresAt,
          isConfigured,
        });
      } else {
        setState({ isConnected: false, isLoading: false, expiresAt: null, isConfigured });
      }
    } catch (error) {
      console.error('[useGoogleCalendar] Unexpected error:', error);
      setState({ isConnected: false, isLoading: false, expiresAt: null, isConfigured: null });
    }
  }, [user, checkConfiguration]);

  // Initialize OAuth flow
  const connect = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany, aby połączyć kalendarz.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get Google OAuth config from edge function
      const { data: config, error: configError } = await supabase.functions.invoke('google-oauth-config');

      if (configError || !config?.configured) {
        toast({
          title: 'Konfiguracja wymagana',
          description: 'Administrator musi skonfigurować integrację z Google Calendar (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).',
          variant: 'destructive',
        });
        return;
      }

      const { client_id, redirect_uri, scope } = config;

      // Build OAuth URL
      const state = btoa(JSON.stringify({
        user_id: user.id,
        redirect_url: window.location.origin + '/my-account',
      }));

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', client_id);
      authUrl.searchParams.set('redirect_uri', redirect_uri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('[useGoogleCalendar] Connect error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się rozpocząć procesu autoryzacji.',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Disconnect Google Calendar
  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Delete token from database
      const { error } = await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Also delete all sync records for this user
      await supabase
        .from('event_google_sync')
        .delete()
        .eq('user_id', user.id);

      setState({ isConnected: false, isLoading: false, expiresAt: null, isConfigured: state.isConfigured });

      toast({
        title: 'Rozłączono',
        description: 'Twój kalendarz Google został rozłączony.',
      });
    } catch (error) {
      console.error('[useGoogleCalendar] Disconnect error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Błąd',
        description: 'Nie udało się rozłączyć kalendarza.',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Sync a single event to Google Calendar
  const syncEvent = useCallback(async (eventId: string, action: 'create' | 'update' | 'delete') => {
    if (!user || !state.isConnected) {
      return { success: false, reason: 'not_connected' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: {
          user_id: user.id,
          event_id: eventId,
          action,
        },
      });

      if (error) {
        console.error('[useGoogleCalendar] Sync error:', error);
        return { success: false, reason: 'sync_failed' };
      }

      return data;
    } catch (error) {
      console.error('[useGoogleCalendar] Sync error:', error);
      return { success: false, reason: 'sync_failed' };
    }
  }, [user, state.isConnected]);

  // Check for OAuth callback parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const googleError = params.get('google_error');

    if (googleConnected === 'true') {
      toast({
        title: 'Połączono!',
        description: 'Twój kalendarz Google został pomyślnie połączony.',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    } else if (googleError) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'Odmówiono dostępu do kalendarza.',
        'missing_credentials': 'Brak konfiguracji Google OAuth.',
        'token_exchange_failed': 'Nie udało się uzyskać tokenu.',
        'save_failed': 'Nie udało się zapisać połączenia.',
      };
      toast({
        title: 'Błąd połączenia',
        description: errorMessages[googleError] || 'Wystąpił nieznany błąd.',
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast, checkConnection]);

  // Initial check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Test connection
  const testConnection = useCallback(async (): Promise<TestResult> => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Step 1: Check configuration
      const isConfigured = await checkConfiguration();
      if (!isConfigured) {
        const result: TestResult = {
          success: false,
          step: 'config',
          message: 'Administrator musi skonfigurować sekrety GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET w Supabase.',
        };
        setTestResult(result);
        setIsTesting(false);
        return result;
      }

      // Step 2: If not connected, we're ready to connect
      if (!state.isConnected || !user) {
        const result: TestResult = {
          success: true,
          step: 'ready',
          message: 'Konfiguracja systemu poprawna. Możesz połączyć swoje konto Google.',
        };
        setTestResult(result);
        setIsTesting(false);
        return result;
      }

      // Step 3: Test token validity by calling sync function with test action
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: {
          user_id: user.id,
          action: 'test',
        },
      });

      if (error) {
        const result: TestResult = {
          success: false,
          step: 'api',
          message: 'Błąd połączenia z API synchronizacji.',
        };
        setTestResult(result);
        setIsTesting(false);
        return result;
      }

      const result: TestResult = {
        success: data?.success ?? false,
        step: data?.success ? 'api' : 'token',
        message: data?.message ?? (data?.success ? 'Połączenie działa poprawnie!' : 'Token wygasł lub jest nieprawidłowy.'),
      };
      setTestResult(result);
      setIsTesting(false);
      return result;
    } catch (error) {
      console.error('[useGoogleCalendar] Test error:', error);
      const result: TestResult = {
        success: false,
        step: 'api',
        message: 'Wystąpił nieoczekiwany błąd podczas testu.',
      };
      setTestResult(result);
      setIsTesting(false);
      return result;
    }
  }, [checkConfiguration, state.isConnected, user]);

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    expiresAt: state.expiresAt,
    isConfigured: state.isConfigured,
    testResult,
    isTesting,
    connect,
    disconnect,
    syncEvent,
    checkConnection,
    testConnection,
  };
};
