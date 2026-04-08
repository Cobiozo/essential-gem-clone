

# Diagnoza: Nieuzasadnione automatyczne wylogowanie mimo aktywnosci

## Przyczyna

Logi Supabase Auth jednoznacznie wskazuja przyczyne:

```
error: "400: Invalid Refresh Token: Refresh Token Not Found"
path: "/token"
status: 400
```

**Scenariusz awarii:**
1. Supabase JWT wygasa (domyslnie co 1h) i klient automatycznie probuje odswiezyc token (`autoRefreshToken: true`)
2. Refresh token zostal juz uzyty (np. przez druga karte przegladarki) lub zostal uniewazniony po stronie serwera
3. Supabase-js otrzymuje blad 400 i emituje zdarzenie `SIGNED_OUT`
4. AuthContext probuje recovery przez `getSession()` — ale sesja lokalna jest juz wyczyszczona przez supabase-js
5. Recovery nie znajduje sesji → wylogowanie z komunikatem "Sesja wygasla"

**Kluczowy problem:** Brak ochrony przed wielokrotnym uzyciem refresh tokena (multi-tab) oraz brak retrya z opoznieniem w recovery.

## Rozwiazanie — 2 zmiany

### 1. Wlaczenie `detectSessionInUrl` i detekcji wielu kart w kliencie Supabase

**Plik: `src/integrations/supabase/client.ts`**

Dodac `storageKey` oraz `flowType: 'pkce'` — bez tego supabase-js nie koordynuje refreshy miedzy kartami poprawnie. Kluczowa zmiana: dodanie obslugi `lock` (Web Locks API) aby zapobiec rownoczesnym refresh requestom z wielu kart:

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    lock: 'advisory',        // <-- koordynacja refreshy miedzy kartami
    detectSessionInUrl: true,
  }
});
```

Opcja `lock: 'advisory'` korzysta z Web Locks API (wspierana w nowoczesnych przegladarkach) — tylko jedna karta na raz moze wykonac refresh tokena. Pozostale karty czekaja i pobieraja odswiezony token z localStorage.

### 2. Ulepszenie recovery w AuthContext po nieudanym refreshu

**Plik: `src/contexts/AuthContext.tsx`** — blok `SIGNED_OUT` (linie 304-334)

Zamiast jednorazowego `getSession()` ktory natychmiast zwraca null (bo supabase-js juz wyczyscil sesje lokalna), dodac:

1. **Opoznienie 2s przed recovery** — daje czas drugiej karcie na zakonczenie refresha i zapisanie nowej sesji w localStorage
2. **Ponowne odczytanie tokena z localStorage** — jesli inna karta zdazyla odswiezyc sesje
3. **Retry `getSession()` po odczekaniu** — z pelnym przywroceniem stanu jesli sesja znaleziona

```typescript
// Zamiast natychmiastowego setTimeout(..., 0):
setTimeout(async () => {
  // Poczekaj 2s — inna karta mogla odswiezyc token
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.log('[Auth] Session recovered after delay');
      setSession(data.session);
      setUser(data.session.user);
      return; // Sesja odzyskana — nie wylogowuj
    }
  } catch (e) {
    console.error('[Auth] Recovery failed:', e);
  }
  
  // Dopiero teraz — prawdziwe wylogowanie
  toast({ title: 'Sesja wygasla', ... });
  // ... clear state
}, 100);
```

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/integrations/supabase/client.ts` | Dodanie `lock: 'advisory'` do konfiguracji auth |
| `src/contexts/AuthContext.tsx` | Recovery z 2s opoznieniem przed wylogowaniem (linie 304-334) |

## Dlaczego to pomoze

- **`lock: 'advisory'`** — eliminuje glowna przyczyne: dwie karty rywalizujace o refresh token. Tylko jedna karta refreshuje, reszta czeka i pobiera wynik z localStorage.
- **Opozniona recovery** — nawet jesli lock nie zadziala (starsza przegladarka), system poczeka 2s i sprawdzi czy inna karta odswiezyla sesje zanim wyloguje uzytkownika.

