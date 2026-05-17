## Plan: 5 cech kandydata — każda z własnym ratingiem 0–5

Zamiast jednego paska gwiazdek pokażę 5 osobnych ratingów, po jednym dla każdej cechy:

1. Sukces (Successful) — 0–5 gwiazdek
2. Towarzyski (Outgoing) — 0–5 gwiazdek
3. Pozytywny (Positive) — 0–5 gwiazdek
4. Przedsiębiorczy (Entrepreneurial) — 0–5 gwiazdek
5. Reputacja (Reputation) — 0–5 gwiazdek

Pod spodem wyświetlę **sumę** (0–25) jako „Ogólna ocena kontaktu", aktualizowaną na żywo.

### Zapis i wyświetlanie

- Suma trafia do istniejącej kolumny `priority_level` jako wartość 0–25 (poszerzymy zakres z 0–5 do 0–25).
- Pięć cząstkowych wartości zapiszę w nowej kolumnie JSONB `priority_traits` w `team_contacts`, np.:
  ```json
  { "success": 4, "outgoing": 3, "positive": 5, "entrepreneurial": 2, "reputation": 4 }
  ```
- W liście kontaktów (`TeamContactsTable`) i tooltipach pokazuję tylko sumę (np. „18/25"); szczegóły cech widoczne w edycji.

## Szczegóły techniczne

### Migracja
- `ALTER TABLE public.team_contacts ADD COLUMN IF NOT EXISTS priority_traits jsonb DEFAULT '{}'::jsonb;`
- Bez zmiany typu `priority_level` (pozostaje integer); usuwam ewentualny CHECK ograniczający do 0–5, jeśli istnieje.

### Frontend
- `src/components/team-contacts/PrivateContactForm.tsx` (sekcja „Klasyfikacja"):
  - Usuwam pojedynczy `RatingElement` z etykietą „Poziom zainteresowania".
  - Dodaję komponent listy 5 wierszy: etykieta cechy + `RatingElement` (max=5, edytowalny).
  - Stan: `priority_traits: { success, outgoing, positive, entrepreneurial, reputation }`.
  - `priority_level` = suma pięciu wartości (read-only, wyświetlana jako „Ogólna ocena: X/25").
  - Przy zapisie wysyłam oba pola.
- `src/components/team-contacts/types.ts`: dodaję `priority_traits?: { success: number; outgoing: number; positive: number; entrepreneurial: number; reputation: number; }`.
- Miejsca, które renderowały gwiazdki `priority_level` (np. tabela), zostawiam tak jak są — pokazują sumę jako liczbę (lub wycinam render gwiazdek skoro skala to teraz 0–25). Do potwierdzenia w trakcie implementacji.

### Bez zmian
- RLS, edge functions, logika filtrów.
