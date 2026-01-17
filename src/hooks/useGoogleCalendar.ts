import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarState {
  isConnected: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
}

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

    try {
      // Get Google OAuth config from edge function
      const { data: config, error: configError } = await supabase.functions.invoke('google-oauth-config');

      if (configError || !config?.configured) {
        toast({
          title: 'Tymczasowo niedostępne',
          description: 'Integracja z Google Calendar jest w trakcie konfiguracji. Spróbuj ponownie później.',
          variant: 'destructive',
        });
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
      for (const reg of registrations) {
        const result = await supabase.functions.invoke('sync-google-calendar', {
          body: {
            user_id: user.id,
            event_id: reg.event_id,
            action: 'create',
          },
        });
        if (result.data?.success) {
          successCount++;
        }
      }

      toast({
        title: 'Synchronizacja zakończona',
        description: `Zsynchronizowano ${successCount} z ${registrations.length} wydarzeń.`,
      });
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
        'missing_credentials': 'Integracja jest w trakcie konfiguracji.',
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
