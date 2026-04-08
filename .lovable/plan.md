

# Fix: Aplikacja nie otwiera sie — crash klienta Supabase

## Przyczyna

Blad `TypeError: this.lock is not a function` w konsoli. Opcja `lock: 'advisory'` dodana w poprzedniej poprawce (zapobieganie wylogowaniom) nie jest wspierana przez zainstalowana wersje `@supabase/supabase-js` (v2.76). Ta opcja jest dostepna dopiero od v2.80+. Crash nastepuje przy inicjalizacji klienta Supabase, co blokuje cala aplikacje.

## Rozwiazanie

**Plik: `src/integrations/supabase/client.ts`** — usunac `lock: 'advisory' as any` z konfiguracji auth.

Zamiast tego, ochrona przed wylogowaniem w scenariuszu multi-tab pozostanie zapewniona przez juz zaimplementowana **opozniona recovery** w `AuthContext.tsx` (2s delay + retry przed wylogowaniem). To wystarczy jako zabezpieczenie bez opcji `lock`.

```typescript
export const supabase = createClient<CompatibleDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
```

Jedna zmiana, jeden plik. Aplikacja natychmiast zacznie dzialac.

