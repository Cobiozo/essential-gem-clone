

# Plan: Naprawa obsługi funkcji RPC dla PureLinków

## Zdiagnozowany problem

Problem polegał na **niepoprawnym użyciu `.maybeSingle()` na funkcji RPC zwracającej `RETURNS TABLE`**.

### Jak to działa:

1. Funkcja `get_reflink_with_creator` jest zdefiniowana jako:
   ```sql
   RETURNS TABLE(
     id uuid,
     target_role text,
     click_count integer,
     ...
   )
   ```

2. Funkcja RPC zwracająca TABLE **zawsze zwraca tablicę**, nawet jeśli ma tylko 1 wiersz

3. Wywołanie `.maybeSingle()` lub `.single()` na takiej funkcji **może powodować nieoczekiwane zachowanie** - próbuje przekonwertować tablicę na pojedynczy obiekt, co może skutkować:
   - Błędem gdy zwracana jest tablica
   - Pustym `data` (null) mimo że funkcja zwróciła dane

### Dowód:
```sql
SELECT data_type FROM information_schema.routines 
WHERE routine_name = 'get_reflink_with_creator';
-- Wynik: "record" (RETURNS TABLE = zbiór rekordów)
```

## Rozwiązanie

Usunąć `.maybeSingle()` i obsłużyć dane jako tablicę:

**Zmiana w `src/pages/Auth.tsx` (linie 187-195):**

```typescript
// PRZED (niepoprawne):
supabase
  .rpc('get_reflink_with_creator', { reflink_code_param: ref })
  .maybeSingle()
  .then(async ({ data, error }) => {
    if (error) {
      console.error('Error fetching reflink:', error);
      return;
    }
    if (data) {
      // ...

// PO (poprawne):
supabase
  .rpc('get_reflink_with_creator', { reflink_code_param: ref })
  .then(async ({ data, error }) => {
    if (error) {
      console.error('Error fetching reflink:', error);
      return;
    }
    // Funkcja RPC z RETURNS TABLE zwraca tablicę
    const reflink = Array.isArray(data) ? data[0] : data;
    if (reflink) {
      // Reszta kodu używa "reflink" zamiast "data"
      setActiveTab('signup');
      
      if (reflink.target_role) {
        setReflinkRole(reflink.target_role);
        setRole(reflink.target_role);
      }
      
      if (reflink.creator_user_id) {
        setSelectedGuardian({
          user_id: reflink.creator_user_id,
          first_name: reflink.creator_first_name,
          last_name: reflink.creator_last_name,
          eq_id: reflink.creator_eq_id,
          email: reflink.creator_email
        });
      }
      
      // Increment click count via RPC
      supabase.rpc('increment_reflink_click', { 
        reflink_id_param: reflink.id 
      }).then(/* ... */);
      
      // Log click event
      supabase.from('reflink_events').insert({
        reflink_id: reflink.id,
        event_type: 'click',
        target_role: reflink.target_role
      } as any).then(/* ... */);
    }
  });
```

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/pages/Auth.tsx` | Usunięcie `.maybeSingle()` + obsługa danych jako tablicy |

## Dlaczego to zadziała

1. **Funkcja RPC zawsze zwraca tablicę** - nawet z `LIMIT 1` w SQL, klient JavaScript otrzymuje `[]` lub `[{...}]`
2. **Sprawdzamy czy data jest tablicą** - `Array.isArray(data) ? data[0] : data` bezpiecznie obsługuje oba przypadki
3. **Logika flow pozostaje taka sama** - tylko źródło danych zmienia się z `data` na `reflink`

## Weryfikacja po wdrożeniu

1. Otwórz nowe okno incognito (niezalogowany)
2. Wklej dowolny link:
   - Dla klienta: `https://purelife.info.pl/auth?ref=u-bwvtp5-121142263`
   - Dla partnera: `https://purelife.info.pl/auth?ref=u-6poiga-12458557556`
   - Dla specjalisty: `https://purelife.info.pl/auth?ref=u-j8czca-12458557556`
3. Sprawdź czy:
   - Formularz przełącza się na zakładkę rejestracji
   - Rola jest ustawiona poprawnie (Klient/Partner/Specjalista)
   - Opiekun jest automatycznie wypełniony

## Bezpieczeństwo

- Bez zmian w bazie danych
- Tylko poprawka obsługi danych po stronie klienta
- Funkcja `increment_reflink_click` pozostaje bez zmian

