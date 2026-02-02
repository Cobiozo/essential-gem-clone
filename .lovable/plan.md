
# Plan: Dodanie informacji o połączonym koncie Google (email)

## Obecny stan

1. **Tabela `user_google_tokens`** - NIE posiada kolumny z emailem Google
2. **OAuth scopes** - tylko `calendar.events` i `calendar.readonly` (brak `userinfo.email`)
3. **Callback OAuth** - nie pobiera informacji o profilu użytkownika Google
4. **Komponent ustawień** - pokazuje tylko status "Połączono" bez szczegółów konta

## Rozwiązanie

### 1. Migracja bazy danych

Dodać kolumnę `google_email` do tabeli `user_google_tokens`:

```sql
ALTER TABLE public.user_google_tokens
ADD COLUMN google_email TEXT;

COMMENT ON COLUMN public.user_google_tokens.google_email IS 'Email konta Google używanego do synchronizacji kalendarza';
```

### 2. Rozszerzenie OAuth scopes

W `supabase/functions/google-oauth-config/index.ts`:

```typescript
// PRZED
scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',

// PO
scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
```

### 3. Pobieranie emaila w callback OAuth

W `supabase/functions/google-oauth-callback/index.ts`, po otrzymaniu tokenów (linia ~209):

```typescript
// Pobierz informacje o użytkowniku Google
const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`,
  },
});

let googleEmail: string | null = null;
if (userInfoResponse.ok) {
  const userInfo = await userInfoResponse.json();
  googleEmail = userInfo.email || null;
  console.log('[google-oauth-callback] Google email:', googleEmail);
}

// Dodać do upsert:
.upsert({
  // ... istniejące pola ...
  google_email: googleEmail,  // NOWE
})
```

### 4. Aktualizacja hooka `useGoogleCalendar`

W `src/hooks/useGoogleCalendar.ts`:

```typescript
// 1. Rozszerzyć interfejs stanu
interface GoogleCalendarState {
  isConnected: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
  googleEmail: string | null;  // NOWE
}

// 2. Pobierać email w checkConnection
const { data, error } = await supabase
  .from('user_google_tokens')
  .select('expires_at, google_email')  // DODAĆ google_email
  .eq('user_id', user.id)
  .maybeSingle();

// 3. Zapisać w stanie
setState({
  isConnected: true,
  isLoading: false,
  expiresAt,
  googleEmail: data.google_email || null,  // NOWE
});

// 4. Zwrócić z hooka
return {
  // ... istniejące ...
  googleEmail: state.googleEmail,  // NOWE
};
```

### 5. Wyświetlenie emaila w komponencie ustawień

W `src/components/settings/GoogleCalendarConnect.tsx`:

```tsx
// 1. Pobrać googleEmail z hooka
const { 
  isConnected, 
  isLoading, 
  googleEmail,  // NOWE
  // ... reszta
} = useGoogleCalendar();

// 2. Wyświetlić po statusie (gdy połączono)
{isConnected && googleEmail && (
  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
    <span className="text-sm font-medium">Konto Google:</span>
    <span className="text-sm text-muted-foreground">{googleEmail}</span>
  </div>
)}
```

---

## Szczegółowe zmiany w plikach

| Plik | Zmiana |
|------|--------|
| **Migracja SQL** | Dodać kolumnę `google_email TEXT` |
| `supabase/functions/google-oauth-config/index.ts` | Dodać scope `userinfo.email` |
| `supabase/functions/google-oauth-callback/index.ts` | Pobierać email z Google API i zapisywać do DB |
| `src/hooks/useGoogleCalendar.ts` | Dodać `googleEmail` do stanu i zwracanych wartości |
| `src/components/settings/GoogleCalendarConnect.tsx` | Wyświetlić email połączonego konta |

---

## Uwagi

- **Istniejące połączenia**: Użytkownicy już połączeni nie będą mieli emaila - pojawi się dopiero po ponownym połączeniu (rozłącz → połącz)
- **Wymagane ponowne zalogowanie**: Po zmianie scope, użytkownicy muszą ponownie autoryzować aplikację aby przyznać dostęp do emaila
- **Prywatność**: Email jest widoczny tylko dla właściciela konta w panelu ustawień

---

## Rezultat

Po wdrożeniu, w panelu Google Calendar (Ustawienia → Moje konto) lider zobaczy:

```
Status:            [Połączono ✓]
Konto Google:      dorota.hamerska@gmail.com
```

Dzięki temu łatwo zweryfikować, czy użyte jest właściwe konto Google.
