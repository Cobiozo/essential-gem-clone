

## Naprawa bledu: brakujace kolumny zgod w tabeli `profiles`

### Problem
Zaktualizowana funkcja RPC `get_user_profiles_with_confirmation` odwoluje sie do kolumn `p.accepted_terms`, `p.accepted_privacy`, `p.accepted_rodo`, `p.accepted_terms_at` w tabeli `profiles`, ale te kolumny nie istnieja w tabeli. Stad blad `column p.accepted_terms does not exist` i brak mozliwosci zaladowania uzytkownikow.

### Rozwiazanie

Jedna migracja SQL dodajaca 4 brakujace kolumny do tabeli `profiles`:

```text
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_privacy BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_rodo BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;
```

### Wplyw
- Istniejacy uzytkownicy otrzymaja domyslne wartosci `false` (brak zaakceptowanych zgod)
- Funkcja RPC przestanie zwracac blad i panel uzytkownikow zacznie dzialac poprawnie
- Zadne zmiany w kodzie frontendowym nie sa wymagane -- interfejsy i mapowanie juz zostaly dodane w poprzednim kroku

### Pliki do zmian

| Plik | Typ zmiany |
|------|------------|
| Migracja SQL | `ALTER TABLE profiles` -- dodanie 4 kolumn |

