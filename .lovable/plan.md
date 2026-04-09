

# Plan: Korekta systemu blokad za nieaktywność (3 kroki)

## Obecny stan (BUG)

System ma 2 kroki: ostrzeżenie po 14 dniach → blokada po 30 dniach. Problem: RPC `get_inactive_users_for_blocking` nie sprawdza, czy ostrzeżenie było wysłane wcześniej — w efekcie ostrzeżenie i blokada mogą nastąpić w tej samej sekundzie (co się stało 9 kwietnia — 52 użytkowników zablokowanych bez szansy na reakcję).

## Docelowy przepływ (3 kroki)

| Krok | Kiedy | Akcja |
|------|-------|-------|
| 1. Pierwsze ostrzeżenie | 14 dni bez logowania | Email: "Twoje konto nie jest aktywne od 14 dni" |
| 2. Drugie ostrzeżenie (24h przed blokadą) | 29 dni bez logowania | Email: "Za 24h Twoje konto zostanie zablokowane" |
| 3. Blokada | 30 dni bez logowania | Blokada konta. Odblokowanie tylko przez admina na wniosek przez support@purelife.info.pl lub kontakt z Liderem |

**WAŻNE**: Nikogo na razie nie odblokowujemy — 52 zablokowanych użytkowników pozostaje zablokowanych.

---

## Zmiany do wdrożenia

### 1. Nowa RPC: `get_inactive_users_for_final_warning` (migracja SQL)

Nowa funkcja znajdująca użytkowników nieaktywnych od 29 dni, którzy:
- dostali już pierwsze ostrzeżenie (`inactivity_warning_sent_at IS NOT NULL`)
- NIE dostali jeszcze drugiego ostrzeżenia (nowa kolumna `inactivity_final_warning_sent_at IS NULL`)
- są nadal aktywni (`is_active = true`)

```sql
-- Dodanie kolumny na drugie ostrzeżenie
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inactivity_final_warning_sent_at timestamptz;
```

### 2. Poprawka RPC `get_inactive_users_for_blocking`

Dodanie warunku: blokada możliwa TYLKO jeśli:
- drugie ostrzeżenie (`inactivity_final_warning_sent_at`) zostało wysłane co najmniej 24h temu

```sql
AND p.inactivity_final_warning_sent_at IS NOT NULL
AND p.inactivity_final_warning_sent_at < now() - INTERVAL '24 hours'
```

### 3. Nowy Edge Function: `send-inactivity-final-warning`

Email z treścią: "Za 24 godziny Twoje konto zostanie zablokowane z powodu braku aktywności. Zaloguj się teraz, aby zapobiec blokadzie."

Po wysłaniu ustawia `inactivity_final_warning_sent_at = now()`.

### 4. Aktualizacja `process-pending-notifications/index.ts`

Dodanie nowego kroku **7b2** między krokiem 7b (ostrzeżenie 14-dniowe) a 7c (blokada):

- **7b**: Pierwsze ostrzeżenie (14 dni) — bez zmian
- **7b2 (NOWY)**: Drugie ostrzeżenie (29 dni) — wywołuje `send-inactivity-final-warning`
- **7c**: Blokada (30 dni) — poprawiony warunek (wymaga `final_warning_sent_at` sprzed 24h+)

### 5. Aktualizacja treści emaila blokady (krok 7c)

Zmiana notyfikacji przy blokadzie — jasna informacja:
> "Twoje konto zostało zablokowane z powodu 30 dni braku aktywności. Aby odblokować konto, napisz na support@purelife.info.pl lub skontaktuj się ze swoim Liderem."

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa kolumna `inactivity_final_warning_sent_at`, nowa RPC `get_inactive_users_for_final_warning`, poprawka RPC `get_inactive_users_for_blocking` |
| `supabase/functions/send-inactivity-final-warning/index.ts` | Nowy Edge Function — email "za 24h blokada" |
| `supabase/functions/process-pending-notifications/index.ts` | Dodanie kroku 7b2 (drugie ostrzeżenie 29 dni) |

## Czego NIE robimy

- **Nie odblokowujemy** 52 zablokowanych użytkowników — pozostają zablokowani zgodnie z poleceniem

