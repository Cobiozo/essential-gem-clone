

# Fix: Licznik prób rejestracji + komunikat dla powtórnie rejestrujących się gości

## Problem

1. **Trzecia próba rejestracji nie jest widoczna** — partial unique index blokuje INSERT gdy istnieje aktywna rejestracja (status='registered'). Błąd 23505 = brak nowego wiersza = licznik prób nie rośnie powyżej 2.
2. **Komunikat dla gościa jest zbyt ogólny** — brak informacji o sprawdzeniu email/spam i kontakcie z zapraszającym.

## Rozwiązanie

### 1. Kolumna `registration_attempts` w tabeli + RPC (SQL migration)

Dodać kolumnę `registration_attempts INTEGER DEFAULT 1` do `guest_event_registrations`. Utworzyć funkcję SECURITY DEFINER `register_event_guest` która:
- Próbuje INSERT
- Jeśli duplicate (23505), inkrementuje `registration_attempts` na istniejącym aktywnym rekordzie
- Zwraca status: `'registered'` lub `'already_registered'` + aktualną liczbę prób

```sql
CREATE OR REPLACE FUNCTION public.register_event_guest(
  p_event_id UUID, p_email TEXT, p_first_name TEXT,
  p_last_name TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL,
  p_invited_by UUID DEFAULT NULL, p_source TEXT DEFAULT 'webinar_form'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result JSONB; v_attempts INT;
BEGIN
  INSERT INTO guest_event_registrations (event_id, email, first_name, last_name, phone, invited_by_user_id, source)
  VALUES (p_event_id, p_email, p_first_name, p_last_name, p_phone, p_invited_by, p_source);
  RETURN jsonb_build_object('status', 'registered', 'attempts', 1);
EXCEPTION WHEN unique_violation THEN
  UPDATE guest_event_registrations 
  SET registration_attempts = COALESCE(registration_attempts, 1) + 1, updated_at = now()
  WHERE event_id = p_event_id AND lower(email) = lower(p_email) AND status != 'cancelled'
  RETURNING registration_attempts INTO v_attempts;
  RETURN jsonb_build_object('status', 'already_registered', 'attempts', COALESCE(v_attempts, 2));
END;
$$;
```

### 2. Formularz rejestracji (`EventGuestRegistration.tsx`)

Zamienić bezpośredni INSERT na wywołanie RPC `register_event_guest`. Na status `already_registered` wyświetlić szczegółowy komunikat:

> **Jesteś już zarejestrowany/a!**
> Ten adres email widnieje na liście zaproszonych na to wydarzenie.
> Sprawdź swoją skrzynkę email (w tym folder SPAM/Oferty).
> Jeśli nie możesz znaleźć wiadomości, odezwij się niezwłocznie do osoby, która Cię na to wydarzenie zaprosiła.

### 3. Hook `useTeamContacts.ts`

Zamienić ręczne liczenie prób (attemptCounter z wielu wierszy) na odczyt kolumny `registration_attempts` z rekordu. Prostsze i zawsze aktualne.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| SQL migration | Kolumna `registration_attempts`, funkcja RPC `register_event_guest` |
| `EventGuestRegistration.tsx` | Użycie RPC zamiast INSERT, nowy komunikat |
| `useTeamContacts.ts` | Odczyt `registration_attempts` z kolumny zamiast liczenia wierszy |

