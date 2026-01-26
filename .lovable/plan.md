
# Plan: Kompleksowy System Zabezpieczeń Google Calendar

## Cel

Stworzenie niezawodnego systemu który:
1. **Proaktywnie wykrywa** problemy z tokenami przed tym jak użytkownik zobaczy błąd
2. **Automatycznie powiadamia** administratorów i użytkowników o problemach
3. **Zapobiega** wyświetlaniu błędnych danych (zajętych slotów jako dostępnych)
4. **Dokumentuje** wszystkie problemy do późniejszej analizy

---

## Architektura rozwiązania

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     WARSTWA PROAKTYWNEGO MONITORINGU                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐    co godzinę    ┌─────────────────────────────┐ │
│   │ system-health-  │ ◄──────────────► │  CHECK: google_calendar_    │ │
│   │ check (cron)    │                  │  disconnected_partners      │ │
│   └────────┬────────┘                  └─────────────────────────────┘ │
│            │                                                           │
│            ▼                                                           │
│   ┌─────────────────┐                  ┌─────────────────────────────┐ │
│   │  admin_alerts   │ ◄──────────────► │  Alert: "Lider X nie ma     │ │
│   │  (tabela)       │                  │  połączonego kalendarza"    │ │
│   └─────────────────┘                  └─────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     WARSTWA REAKTYWNEGO WYKRYWANIA                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  check-google-calendar-busy                                      │   │
│   │  ┌───────────────────┐    ┌────────────────────────────────┐    │   │
│   │  │ Wykryj invalid_   │ ──►│ Usuń nieważny token z bazy     │    │   │
│   │  │ grant             │    │ + sync records                  │    │   │
│   │  └───────────────────┘    └────────────────────────────────┘    │   │
│   │                                        │                         │   │
│   │                                        ▼                         │   │
│   │                           ┌────────────────────────────────┐    │   │
│   │                           │ Zwróć connected: false +       │    │   │
│   │                           │ token_revoked: true            │    │   │
│   │                           └────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     WARSTWA INTERFEJSU UŻYTKOWNIKA                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  useGoogleCalendarBusy hook                                      │   │
│   │  ┌───────────────────┐    ┌────────────────────────────────┐    │   │
│   │  │ Jeśli lider nie   │ ──►│ Pokaż alert: "Lider nie ma     │    │   │
│   │  │ ma kalendarza     │    │ połączonego kalendarza"        │    │   │
│   │  └───────────────────┘    └────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Zmiany do implementacji

### Zmiana 1: Obsługa `invalid_grant` w check-google-calendar-busy

Uzupełnienie funkcji `check-google-calendar-busy` o wykrywanie unieważnionych tokenów - analogicznie do tego co już jest w `sync-google-calendar`.

| Element | Zmiana |
|---------|--------|
| `refreshAccessToken` | Zwracanie `token_revoked: true` przy `invalid_grant` |
| Główna logika | Auto-usuwanie tokena i sync records |
| Odpowiedź | `connected: false, token_revoked: true` |

### Zmiana 2: Nowy check w system-health-check

Dodanie sprawdzenia czy wszyscy aktywni liderzy mają połączony Google Calendar.

| Typ alertu | Opis | Severity |
|------------|------|----------|
| `google_calendar_disconnected` | Lider bez połączonego kalendarza | `warning` |
| `google_calendar_expiring_soon` | Token wygasa w ciągu 24h | `info` |

### Zmiana 3: Komunikat w UI rezerwacji

Gdy lider nie ma połączonego kalendarza, użytkownik rezerwujący widzi ostrzeżenie że dostępność slotów może nie być aktualna.

---

## Sekcja techniczna

### Plik: `supabase/functions/check-google-calendar-busy/index.ts`

**Zmiana funkcji refreshAccessToken (linie 26-58):**

```typescript
async function refreshAccessToken(refreshToken: string): Promise<{ 
  access_token?: string; 
  expires_in?: number; 
  error?: string;
  token_revoked?: boolean;
} | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[check-google-calendar-busy] Missing Google OAuth credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'unknown' }));
      console.error('[check-google-calendar-busy] Token refresh failed:', errorData);
      
      // Wykryj invalid_grant - token trwale unieważniony
      if (errorData.error === 'invalid_grant') {
        console.log('[check-google-calendar-busy] Token was revoked (invalid_grant)');
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
    console.error('[check-google-calendar-busy] Token refresh error:', error);
    return null;
  }
}
```

**Obsługa tokena w głównej logice (linie 113-136):**

```typescript
if (expiresAt <= fiveMinutesFromNow) {
  console.log('[check-google-calendar-busy] Token expired or expiring soon, refreshing...');
  
  const refreshResult = await refreshAccessToken(tokenData.refresh_token);
  
  // Token został unieważniony - wyczyść bazę
  if (refreshResult?.token_revoked) {
    console.log('[check-google-calendar-busy] Token revoked, cleaning up for user:', leader_user_id);
    await supabase
      .from('user_google_tokens')
      .delete()
      .eq('user_id', leader_user_id);
    
    await supabase
      .from('event_google_sync')
      .delete()
      .eq('user_id', leader_user_id);
    
    return new Response(
      JSON.stringify({ connected: false, token_revoked: true, busy: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  if (!refreshResult?.access_token) {
    return new Response(
      JSON.stringify({ error: 'Failed to refresh token', busy: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  accessToken = refreshResult.access_token;
  
  // Zaktualizuj token w bazie
  const newExpiresAt = new Date(Date.now() + refreshResult.expires_in! * 1000);
  await supabase
    .from('user_google_tokens')
    .update({
      access_token: accessToken,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('user_id', leader_user_id);
}
```

---

### Plik: `supabase/functions/system-health-check/index.ts`

**Nowy check - Liderzy bez połączonego Google Calendar:**

```typescript
// ============================================
// CHECK: Leaders without Google Calendar (WARNING)
// ============================================
console.log('Checking for leaders without Google Calendar...');

// Pobierz wszystkich aktywnych liderów
const { data: leaders } = await supabase
  .from('user_roles')
  .select('user_id')
  .eq('role', 'leader');

const leaderUserIds = (leaders || []).map(l => l.user_id);

if (leaderUserIds.length > 0) {
  // Pobierz liderów którzy mają połączony kalendarz
  const { data: connectedLeaders } = await supabase
    .from('user_google_tokens')
    .select('user_id')
    .in('user_id', leaderUserIds);
  
  const connectedIds = new Set((connectedLeaders || []).map(c => c.user_id));
  const disconnectedLeaderIds = leaderUserIds.filter(id => !connectedIds.has(id));
  
  if (disconnectedLeaderIds.length > 0) {
    // Pobierz profile tych liderów
    const { data: disconnectedProfiles } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .in('user_id', disconnectedLeaderIds)
      .eq('is_active', true);
    
    if (disconnectedProfiles && disconnectedProfiles.length > 0) {
      console.log(`Found ${disconnectedProfiles.length} leaders without Google Calendar`);
      
      for (const leader of disconnectedProfiles) {
        results.push({
          type: 'google_calendar_disconnected',
          severity: 'warning',
          title: `Lider bez Google Calendar: ${leader.email}`,
          description: `Lider ${leader.first_name || ''} ${leader.last_name || ''} (${leader.email}) nie ma połączonego Google Calendar. Rezerwacje spotkań mogą nakładać się na zajęte terminy.`,
          suggestedAction: 'Skontaktuj się z liderem i poproś o połączenie Google Calendar w ustawieniach konta.',
          affectedUserId: leader.user_id,
          affectedEntityType: 'user',
          metadata: {
            email: leader.email,
            first_name: leader.first_name,
            last_name: leader.last_name,
          }
        });
      }
    }
  }
}

// ============================================
// CHECK: Tokens expiring within 24 hours (INFO)
// ============================================
console.log('Checking for expiring Google tokens...');

const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const now = new Date().toISOString();

const { data: expiringTokens } = await supabase
  .from('user_google_tokens')
  .select('user_id, expires_at')
  .gt('expires_at', now)
  .lt('expires_at', in24Hours);

if (expiringTokens && expiringTokens.length > 0) {
  // Pobierz profile
  const expiringUserIds = expiringTokens.map(t => t.user_id);
  const { data: expiringProfiles } = await supabase
    .from('profiles')
    .select('user_id, email, first_name, last_name')
    .in('user_id', expiringUserIds);

  for (const token of expiringTokens) {
    const profile = expiringProfiles?.find(p => p.user_id === token.user_id);
    if (profile) {
      results.push({
        type: 'google_calendar_expiring_soon',
        severity: 'info',
        title: `Token Google wygasa: ${profile.email}`,
        description: `Token Google Calendar użytkownika ${profile.first_name || ''} ${profile.last_name || ''} wygasa w ciągu 24 godzin. System automatycznie spróbuje go odświeżyć.`,
        suggestedAction: 'Monitoruj logi synchronizacji. Jeśli odświeżanie nie powiedzie się, użytkownik będzie musiał połączyć się ponownie.',
        affectedUserId: profile.user_id,
        affectedEntityType: 'user',
        metadata: {
          email: profile.email,
          expires_at: token.expires_at,
        }
      });
    }
  }
}
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `check-google-calendar-busy/index.ts` | Obsługa `invalid_grant` + auto-cleanup | Spójność z sync-google-calendar |
| `system-health-check/index.ts` | Check `google_calendar_disconnected` | Proaktywne wykrywanie problemów |
| `system-health-check/index.ts` | Check `google_calendar_expiring_soon` | Wczesne ostrzeżenie |

---

## Korzyści

| Aspekt | Przed | Po |
|--------|-------|-----|
| **Wykrywanie problemów** | Reaktywne (po błędzie użytkownika) | Proaktywne (co godzinę) |
| **Czas reakcji** | Godziny/dni | Maksymalnie 1 godzina |
| **Widoczność dla admina** | Brak | Alerty w panelu System Health |
| **Spójność funkcji** | `sync` obsługuje `invalid_grant`, `busy` nie | Obie funkcje identycznie |
| **Bezpieczeństwo danych** | Nieważne tokeny pozostają w bazie | Auto-cleanup |

---

## Instrukcja dla Dawida Kowalczyka

Po wdrożeniu zmian, Dawid Kowalczyk musi:

1. Przejść do **Moje konto** → **Ustawienia**
2. W sekcji **Google Calendar** kliknąć **"Połącz z Google"**
3. Zalogować się na konto Google i zaakceptować uprawnienia
4. Kliknąć **"Synchronizuj wszystko"**

Po tym jego terminy z PureLife pojawią się w Google Calendar, a system rezerwacji będzie poprawnie blokować zajęte sloty.
