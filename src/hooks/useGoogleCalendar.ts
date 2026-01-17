import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarState {
  isConnected: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
}

// Error messages mapping for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  // Google OAuth errors
  'access_denied': 'Odmówiono dostępu. Upewnij się, że jesteś dodany jako użytkownik testowy w Google Cloud Console lub aplikacja jest opublikowana.',
  'invalid_client': 'Nieprawidłowa konfiguracja OAuth. Skontaktuj się z administratorem.',
  'invalid_grant': 'Kod autoryzacji wygasł lub został już użyty. Spróbuj ponownie.',
  'redirect_uri_mismatch': 'Błąd konfiguracji: redirect URI nie pasuje. Skontaktuj się z administratorem.',
  
  // Server-side errors
  'missing_client_id': 'Brak konfiguracji GOOGLE_CLIENT_ID. Skontaktuj się z administratorem.',
  'missing_client_secret': 'Brak konfiguracji GOOGLE_CLIENT_SECRET. Skontaktuj się z administratorem.',
  'missing_credentials': 'Brak danych uwierzytelniających Google OAuth. Skontaktuj się z administratorem.',
  'missing_code': 'Nie otrzymano kodu autoryzacji od Google.',
  'missing_state': 'Brak parametru state w odpowiedzi OAuth.',
  'missing_user_id': 'Nie znaleziono ID użytkownika.',
  'invalid_state': 'Nieprawidłowy parametr state.',
  'token_exchange_failed': 'Wymiana kodu na tokeny nie powiodła się. Spróbuj ponownie.',
  'no_access_token': 'Google nie zwrócił tokenu dostępu.',
  'database_error': 'Błąd zapisu do bazy danych. Spróbuj ponownie.',
  'unexpected_error': 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
  
  // Legacy/generic errors
  'save_failed': 'Nie udało się zapisać tokenów. Spróbuj ponownie.',
  'not_configured': 'Integracja z Google Calendar nie jest skonfigurowana.',
};

export const useGoogleCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<GoogleCalendarState>({
    isConnected: false,
    isLoading: true,
    expiresAt: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!user) {
      setState({ isConnected: false, isLoading: false, expiresAt: null });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useGoogleCalendar] Error checking connection:', error);
        setState({ isConnected: false, isLoading: false, expiresAt: null });
        return;
      }

      if (data) {
        const expiresAt = new Date(data.expires_at);
        setState({
          isConnected: true,
          isLoading: false,
          expiresAt,
        });
      } else {
        setState({ isConnected: false, isLoading: false, expiresAt: null });
      }
    } catch (error) {
      console.error('[useGoogleCalendar] Unexpected error:', error);
      setState({ isConnected: false, isLoading: false, expiresAt: null });
    }
  }, [user]);

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

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('[useGoogleCalendar] Fetching OAuth config...');
      
      // Get Google OAuth config from edge function
      const { data: config, error: configError } = await supabase.functions.invoke('google-oauth-config');

      console.log('[useGoogleCalendar] OAuth config response:', {
        configured: config?.configured,
        hasClientId: !!config?.client_id,
        error: config?.error,
        configError,
      });

      if (configError) {
        console.error('[useGoogleCalendar] Config fetch error:', configError);
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać konfiguracji OAuth. Spróbuj ponownie.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (!config?.configured) {
        const errorMessage = ERROR_MESSAGES[config?.error] || config?.message || 'Integracja z Google Calendar nie jest skonfigurowana. Skontaktuj się z administratorem.';
        console.error('[useGoogleCalendar] OAuth not configured:', config?.error);
        toast({
          title: 'Konfiguracja wymagana',
          description: errorMessage,
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const { client_id, redirect_uri, scope } = config;

      // Build OAuth URL
      const stateData = btoa(JSON.stringify({
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
      authUrl.searchParams.set('state', stateData);

      // Detailed logging before redirect for debugging
      console.log('[useGoogleCalendar] ========== OAuth Redirect Debug ==========');
      console.log('[useGoogleCalendar] Current origin:', window.location.origin);
      console.log('[useGoogleCalendar] Redirect URI (from config):', redirect_uri);
      console.log('[useGoogleCalendar] State redirect_url:', window.location.origin + '/my-account');
      console.log('[useGoogleCalendar] Full OAuth URL:', authUrl.toString());
      console.log('[useGoogleCalendar] ===========================================');
      
      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('[useGoogleCalendar] Connect error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się rozpocząć procesu autoryzacji.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isLoading: false }));
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

      setState({ isConnected: false, isLoading: false, expiresAt: null });

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

  // Sync all user's registered events
  const syncAllEvents = useCallback(async () => {
    if (!user || !state.isConnected) {
      toast({
        title: 'Brak połączenia',
        description: 'Najpierw połącz się z Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Get all user's registered events
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'registered');

      if (regError) throw regError;

      if (!registrations || registrations.length === 0) {
        toast({
          title: 'Brak wydarzeń',
          description: 'Nie masz żadnych zapisanych wydarzeń do synchronizacji.',
        });
        setIsSyncing(false);
        return;
      }

      // Sync each event
      let successCount = 0;
      let errorCount = 0;
      
      for (const reg of registrations) {
        try {
          const result = await supabase.functions.invoke('sync-google-calendar', {
            body: {
              user_id: user.id,
              event_id: reg.event_id,
              action: 'create',
            },
          });
          if (result.data?.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error('[useGoogleCalendar] Failed to sync event:', reg.event_id, err);
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast({
          title: 'Synchronizacja częściowa',
          description: `Zsynchronizowano ${successCount} z ${registrations.length} wydarzeń. ${errorCount} błędów.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Synchronizacja zakończona',
          description: `Zsynchronizowano ${successCount} z ${registrations.length} wydarzeń.`,
        });
      }
    } catch (error) {
      console.error('[useGoogleCalendar] Sync all error:', error);
      toast({
        title: 'Błąd synchronizacji',
        description: 'Nie udało się zsynchronizować wszystkich wydarzeń.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, state.isConnected, toast]);

  // Check for OAuth callback parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const googleError = params.get('google_error');
    const googleErrorDesc = params.get('google_error_desc');

    if (googleConnected === 'true') {
      console.log('[useGoogleCalendar] OAuth callback: success');
      toast({
        title: 'Połączono!',
        description: 'Twój kalendarz Google został pomyślnie połączony.',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    } else if (googleError) {
      console.error('[useGoogleCalendar] OAuth callback error:', googleError, googleErrorDesc);
      
      // Get user-friendly error message
      const errorMessage = ERROR_MESSAGES[googleError] || googleErrorDesc || `Błąd połączenia: ${googleError}`;
      
      toast({
        title: 'Błąd połączenia z Google',
        description: errorMessage,
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

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    expiresAt: state.expiresAt,
    isSyncing,
    connect,
    disconnect,
    syncEvent,
    syncAllEvents,
    checkConnection,
  };
};
