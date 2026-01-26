
# Plan: Naprawa synchronizacji Google Calendar - obsługa nieważnego refresh tokena

## Zidentyfikowany problem

Logi serwera pokazują błąd:
```
"error": "invalid_grant",
"error_description": "Token has been expired or revoked."
```

To oznacza, że **refresh token został unieważniony przez Google**. Może to się zdarzyć gdy:
- Użytkownik odwołał dostęp aplikacji w ustawieniach Google
- Token nie był używany przez 6 miesięcy
- Hasło Google zostało zmienione

**Aktualny problem**: Aplikacja pokazuje "Połączono" i "Token wygasa wkrótce", ale w rzeczywistości token jest całkowicie nieważny i trzeba połączyć się od nowa.

---

## Plan naprawy

### Zmiana 1: Wykrywanie błędu `invalid_grant` w edge function

**Plik:** `supabase/functions/sync-google-calendar/index.ts`

Funkcja `refreshAccessToken` powinna wykrywać błąd `invalid_grant` i zwracać specjalny status:

```typescript
// Linie 52-84 - zmiana funkcji refreshAccessToken
async function refreshAccessToken(refreshToken: string): Promise<{ 
  access_token?: string; 
  expires_in?: number; 
  error?: string;
  token_revoked?: boolean;
} | null> {
  // ... istniejąca logika ...
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('[sync-google-calendar] Token refresh failed:', errorData);
    
    // Wykryj invalid_grant - token jest trwale unieważniony
    if (errorData.error === 'invalid_grant') {
      return { error: 'invalid_grant', token_revoked: true };
    }
    
    return null;
  }
  // ...
}
```

### Zmiana 2: Automatyczne usuwanie nieważnych tokenów

**Plik:** `supabase/functions/sync-google-calendar/index.ts`

W funkcji `getValidAccessToken` - gdy wykryty zostanie `invalid_grant`, automatycznie usuń token z bazy:

```typescript
// Linie 86-126 - zmiana funkcji getValidAccessToken
async function getValidAccessToken(supabase: any, userId: string): Promise<{
  access_token?: string;
  token_revoked?: boolean;
} | null> {
  // ... pobierz token ...
  
  // Jeśli token wygasa, spróbuj odświeżyć
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshResult = await refreshAccessToken(tokenData.refresh_token);
    
    // Token został unieważniony - usuń z bazy
    if (refreshResult?.token_revoked) {
      console.log('[sync-google-calendar] Token revoked, removing from database');
      await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', userId);
      
      return { token_revoked: true };
    }
    
    if (!refreshResult?.access_token) {
      return null;
    }
    
    // ... zapisz nowy token ...
  }
  
  return { access_token: tokenData.access_token };
}
```

### Zmiana 3: Obsługa błędu w odpowiedzi edge function

**Plik:** `supabase/functions/sync-google-calendar/index.ts`

Dla akcji `test` - zwracaj jasny komunikat o konieczności ponownego połączenia:

```typescript
// Linie 434-447 - zmiana obsługi test action
const tokenResult = await getValidAccessToken(supabaseAdmin, testUserId);

if (tokenResult?.token_revoked) {
  return new Response(JSON.stringify({ 
    success: false, 
    token_revoked: true,
    message: 'Token został unieważniony. Rozłącz i połącz ponownie z Google Calendar.' 
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Zmiana 4: Obsługa w hooku useGoogleCalendar

**Plik:** `src/hooks/useGoogleCalendar.ts`

W `refreshTokenIfNeeded` - sprawdź czy token został unieważniony i zaktualizuj stan:

```typescript
// Linie 256-276 - zmiana refreshTokenIfNeeded
const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
  body: {
    user_id: user.id,
    action: 'test',
  },
});

if (data?.token_revoked) {
  console.log('[useGoogleCalendar] Token was revoked, updating state');
  setState({ isConnected: false, isLoading: false, expiresAt: null });
  toast({
    title: 'Połączenie wygasło',
    description: 'Token Google Calendar został unieważniony. Połącz się ponownie.',
    variant: 'destructive',
  });
  return;
}
```

### Zmiana 5: Obsługa w syncAllEvents

**Plik:** `src/hooks/useGoogleCalendar.ts`

W `syncAllEvents` - przed próbą synchronizacji, sprawdź czy token jest ważny:

```typescript
// Linie 278-350 - dodanie wstępnego sprawdzenia tokena
const syncAllEvents = useCallback(async () => {
  // ... istniejące sprawdzenia ...
  
  setIsSyncing(true);

  try {
    // Najpierw sprawdź czy token jest ważny
    const testResult = await supabase.functions.invoke('sync-google-calendar', {
      body: { user_id: user.id, action: 'test' },
    });
    
    if (testResult.data?.token_revoked || !testResult.data?.success) {
      setState({ isConnected: false, isLoading: false, expiresAt: null });
      toast({
        title: 'Połączenie wygasło',
        description: testResult.data?.message || 'Połącz się ponownie z Google Calendar.',
        variant: 'destructive',
      });
      setIsSyncing(false);
      return;
    }
    
    // ... kontynuuj z synchronizacją ...
  }
});
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `sync-google-calendar/index.ts` | Wykrywanie `invalid_grant` w refreshAccessToken | Identyfikacja nieważnych tokenów |
| `sync-google-calendar/index.ts` | Auto-usuwanie tokenów w getValidAccessToken | Oczyszczenie bazy |
| `sync-google-calendar/index.ts` | Zwracanie `token_revoked` w odpowiedzi | Informacja dla frontendu |
| `useGoogleCalendar.ts` | Obsługa `token_revoked` w refreshTokenIfNeeded | Aktualizacja stanu UI |
| `useGoogleCalendar.ts` | Wstępne sprawdzenie tokena w syncAllEvents | Zapobieganie 12 błędom |

---

## Efekt po wdrożeniu

**Przed:**
- UI pokazuje "Połączono" + "Token wygasa wkrótce"
- Synchronizacja próbuje 12 razy i 12 razy się nie udaje
- Użytkownik nie wie co robić

**Po:**
- UI automatycznie wykryje że token jest unieważniony
- Pokaże komunikat "Token został unieważniony. Połącz się ponownie"
- Status zmieni się na "Niepołączono"
- Użytkownik będzie mógł kliknąć "Połącz z Google" aby ponownie autoryzować

---

## Sekcja techniczna

### `supabase/functions/sync-google-calendar/index.ts` - refreshAccessToken (linie 52-84):

```typescript
async function refreshAccessToken(refreshToken: string): Promise<{ 
  access_token?: string; 
  expires_in?: number; 
  error?: string;
  token_revoked?: boolean;
} | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[sync-google-calendar] Missing Google credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'unknown' }));
      console.error('[sync-google-calendar] Token refresh failed:', errorData);
      
      // Wykryj invalid_grant - token jest trwale unieważniony
      if (errorData.error === 'invalid_grant') {
        return { error: 'invalid_grant', token_revoked: true };
      }
      
      return null;
    }

    const tokenData = await response.json();
    return { 
      access_token: tokenData.access_token, 
      expires_in: tokenData.expires_in 
    };
  } catch (error) {
    console.error('[sync-google-calendar] Token refresh error:', error);
    return null;
  }
}
```

### `supabase/functions/sync-google-calendar/index.ts` - getValidAccessToken (linie 86-126):

```typescript
async function getValidAccessToken(supabase: any, userId: string): Promise<{
  access_token?: string;
  token_revoked?: boolean;
} | null> {
  const { data: tokenData, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) {
    console.log('[sync-google-calendar] No Google token found for user:', userId);
    return null;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('[sync-google-calendar] Token expired or expiring soon, refreshing...');
    
    const refreshResult = await refreshAccessToken(tokenData.refresh_token);
    
    // Token został unieważniony - usuń z bazy
    if (refreshResult?.token_revoked) {
      console.log('[sync-google-calendar] Token revoked by user, removing from database for user:', userId);
      await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', userId);
      
      // Also clean up sync records
      await supabase
        .from('event_google_sync')
        .delete()
        .eq('user_id', userId);
      
      return { token_revoked: true };
    }
    
    if (!refreshResult?.access_token) {
      return null;
    }

    const newExpiresAt = new Date(Date.now() + (refreshResult.expires_in! * 1000)).toISOString();

    await supabase
      .from('user_google_tokens')
      .update({
        access_token: refreshResult.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { access_token: refreshResult.access_token };
  }

  return { access_token: tokenData.access_token };
}
```

### `src/hooks/useGoogleCalendar.ts` - syncAllEvents (linie 278-350):

```typescript
const syncAllEvents = useCallback(async () => {
  if (!user || !state.isConnected) {
    toast({
      title: 'Brak połączenia',
      description: 'Najpierw połącz się z Google Calendar.',
      variant: 'destructive',
    });
    return;
  }

  // Debounce - prevent rapid syncs
  const now = Date.now();
  if (now - lastSyncTime < SYNC_COOLDOWN) {
    toast({
      title: 'Poczekaj',
      description: 'Odczekaj 30 sekund przed kolejną synchronizacją.',
      variant: 'destructive',
    });
    return;
  }
  setLastSyncTime(now);

  setIsSyncing(true);

  try {
    // Najpierw sprawdź czy token jest ważny
    const testResult = await supabase.functions.invoke('sync-google-calendar', {
      body: { user_id: user.id, action: 'test' },
    });
    
    if (testResult.data?.token_revoked) {
      setState({ isConnected: false, isLoading: false, expiresAt: null });
      toast({
        title: 'Połączenie wygasło',
        description: 'Token Google Calendar został unieważniony. Połącz się ponownie.',
        variant: 'destructive',
      });
      setIsSyncing(false);
      return;
    }
    
    if (!testResult.data?.success) {
      toast({
        title: 'Błąd połączenia',
        description: testResult.data?.message || 'Nie można połączyć się z Google Calendar.',
        variant: 'destructive',
      });
      setIsSyncing(false);
      return;
    }

    // Kontynuuj z synchronizacją...
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'registered');
    
    // ... reszta logiki synchronizacji ...
  } catch (error) {
    // ... obsługa błędów ...
  } finally {
    setIsSyncing(false);
  }
}, [user, state.isConnected, lastSyncTime, toast]);
```
