
# Plan: Naprawa PureLinków dla Specjalistów

## Zdiagnozowany problem

Niezalogowani użytkownicy wchodzący na link `/auth?ref=xxx` nie mogą ukończyć procesu rejestracji ponieważ:

1. **Funkcja RPC działa poprawnie** - `get_reflink_with_creator` zwraca dane dla wszystkich ról (partner, specjalista, client)
2. **Błąd UPDATE** - Po pobraniu danych, kod próbuje wykonać:
   ```javascript
   await supabase
     .from('user_reflinks')
     .update({ click_count: (data.click_count || 0) + 1 })
     .eq('id', data.id);
   ```
3. **Brak polityki RLS** - Tabela `user_reflinks` nie ma polityki UPDATE dla roli `public` (niezalogowanych), tylko dla `authenticated`
4. **Efekt** - Błąd UPDATE przerywa łańcuch `.then()` i nie ustawia poprawnie `selectedGuardian` ani `role` w formularzu

## Dowody

Polityki RLS dla `user_reflinks`:
- ✅ SELECT dla `public`: `"Anyone can read valid reflinks" WHERE is_active AND expires_at > now()`
- ❌ **Brak UPDATE dla `public`** - tylko dla `authenticated` (właściciel lub admin)

## Rozwiązanie

### Krok 1: Nowa funkcja RPC `increment_reflink_click`

Utworzenie funkcji SECURITY DEFINER która bezpiecznie inkrementuje licznik kliknięć:

```sql
CREATE OR REPLACE FUNCTION public.increment_reflink_click(reflink_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_reflinks
  SET 
    click_count = click_count + 1,
    updated_at = now()
  WHERE id = reflink_id_param
    AND is_active = true
    AND expires_at > now();
END;
$$;

-- Pozwól wszystkim (w tym anonimowym) wywoływać tę funkcję
GRANT EXECUTE ON FUNCTION public.increment_reflink_click(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_reflink_click(uuid) TO authenticated;
```

### Krok 2: Poprawka w Auth.tsx

Zmiana bezpośredniego UPDATE na wywołanie RPC:

**Przed:**
```javascript
// Increment click count - BŁĄD dla niezalogowanych!
await supabase
  .from('user_reflinks')
  .update({ click_count: (data.click_count || 0) + 1 } as any)
  .eq('id', data.id);
```

**Po:**
```javascript
// Increment click count via RPC (bezpieczne dla niezalogowanych)
await supabase.rpc('increment_reflink_click', { 
  reflink_id_param: data.id 
});
```

### Krok 3: Poprawka obsługi błędów

Dodanie lepszej obsługi błędów aby UPDATE nie przerywał głównego flow:

```javascript
// Increment click count via RPC (nie blokuje flow przy błędzie)
supabase.rpc('increment_reflink_click', { 
  reflink_id_param: data.id 
}).catch(err => {
  console.warn('Could not increment click count:', err);
});

// Log click event - kontynuuj nawet przy błędzie
supabase.from('reflink_events').insert({
  reflink_id: data.id,
  event_type: 'click',
  target_role: data.target_role
} as any).catch(err => {
  console.warn('Could not log click event:', err);
});
```

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa funkcja `increment_reflink_click` + GRANT |
| `src/pages/Auth.tsx` | Zamiana UPDATE na RPC + lepsza obsługa błędów |
| `src/integrations/supabase/types.ts` | Automatycznie zaktualizowane typy |

## Weryfikacja po wdrożeniu

1. Otwórz nowe okno incognito (niezalogowany)
2. Wklej link specjalisty np. `https://purelife.info.pl/auth?ref=u-j8czca-12458557556`
3. Sprawdź czy:
   - Formularz przełącza się na zakładkę rejestracji
   - Rola jest ustawiona na "Specjalista"  
   - Opiekun jest automatycznie wypełniony
4. Sprawdź czy click_count wzrósł w bazie danych

## Bezpieczeństwo

- Funkcja `increment_reflink_click` tylko zwiększa licznik - nie może zmieniać innych danych
- Walidacja `is_active` i `expires_at` wewnątrz funkcji
- Brak możliwości nadużycia - funkcja nie zwraca żadnych danych
