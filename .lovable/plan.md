

## Wyswietlanie statusu zgod (Regulamin, Polityka Prywatnosci, RODO) w panelu CMS Uzytkownicy

### Cel
Administrator w rozwinietych szczegolach karty uzytkownika (`CompactUserCard`) widzi informacje czy uzytkownik zaakceptowal Regulamin, Polityke Prywatnosci i RODO, oraz date akceptacji.

---

### Krok 1: Aktualizacja funkcji RPC `get_user_profiles_with_confirmation`

Funkcja RPC zwracajaca dane uzytkownikow musi zostac rozszerzona o nowe kolumny:

```text
p.accepted_terms
p.accepted_privacy
p.accepted_rodo
p.accepted_terms_at
```

Dodanie tych 4 pol do instrukcji SELECT i RETURN TABLE w definicji funkcji (migracja SQL: `CREATE OR REPLACE FUNCTION`).

### Krok 2: Rozszerzenie interfejsu `UserProfile`

Pliki: `src/pages/Admin.tsx` (linie 89-123) i `src/components/admin/CompactUserCard.tsx` (linie 39-73)

Dodanie do interfejsu:

```text
accepted_terms?: boolean;
accepted_privacy?: boolean;
accepted_rodo?: boolean;
accepted_terms_at?: string | null;
```

### Krok 3: Mapowanie danych RPC

Plik: `src/pages/Admin.tsx` (linie 484-517, funkcja `fetchUsers`)

Dodanie mapowania nowych pol z odpowiedzi RPC:

```text
accepted_terms: row.accepted_terms,
accepted_privacy: row.accepted_privacy,
accepted_rodo: row.accepted_rodo,
accepted_terms_at: row.accepted_terms_at,
```

### Krok 4: Wyswietlanie zgod w rozwijanej karcie uzytkownika

Plik: `src/components/admin/CompactUserCard.tsx`

W sekcji "Aktywnosc konta" (linie 559-593) dodanie nowej podsekcji "Zgody i regulaminy" z 3 pozycjami:

```text
Regulamin:          [zielony checkmark] Zaakceptowany  /  [czerwony X] Brak
Polityka Prywatnosci: [zielony checkmark] Zaakceptowana  /  [czerwony X] Brak
RODO:               [zielony checkmark] Wyrażona       /  [czerwony X] Brak
Data akceptacji:     DD.MM.YYYY HH:MM (jesli accepted_terms_at istnieje)
```

Wizualnie: ikona `ShieldCheck` z lucide-react jako naglowek sekcji, kolorowe znaczniki (zielony/czerwony) przy kazdej zgodzie.

Dodatkowo: na glownej linii karty (obok badzy Email, roli) dodanie malego badze "Zgody" -- zielone jesli wszystkie 3 true, czerwone jesli brakuje ktorejkolwiek. Pozwoli to adminom na szybka identyfikacje bez rozwijania karty.

---

### Pliki do zmian

| Plik | Typ zmiany |
|------|------------|
| Migracja SQL | `CREATE OR REPLACE FUNCTION get_user_profiles_with_confirmation` -- dodanie 4 nowych kolumn |
| `src/pages/Admin.tsx` | Rozszerzenie interfejsu `UserProfile` + mapowanie w `fetchUsers` |
| `src/components/admin/CompactUserCard.tsx` | Rozszerzenie interfejsu + sekcja "Zgody" w rozwijanej czesci + badge na glownej linii |

