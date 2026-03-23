

# Naprawa paska informacyjnego (News Ticker)

## Zidentyfikowany problem

Po analizie kodu, ustawień admina i polityk RLS, problem jest jasny:

**Pasek informacyjny próbuje pobierać dane o aktywności WSZYSTKICH użytkowników** (ukończenia modułów, certyfikaty, rejestracje) bezpośrednio z tabel `training_assignments`, `certificates`, `training_progress`. Jednak **polityki RLS (Row Level Security) pozwalają zwykłym użytkownikom (partner, specjalista) widzieć TYLKO WŁASNE rekordy**.

Oznacza to, że:
- Admin widzi dane (ma politykę `is_admin()`) — ale nawet wtedy mogą być problemy z widocznością tekstu
- Partner/specjalista widzi TYLKO swoje ukończenia — pasek jest prawie pusty
- Na screenie widać puste kropki separatorów `•` — elementy albo się nie załadowały, albo tekst jest niewidoczny

### Ustawienia admina (potwierdzone w bazie):
- `source_live_activity: true`
- Typy: `training_module_complete`, `certificate_generated`, `new_partner_joined`, `new_user_welcome`
- Dane: 11 ukończeń modułów, 4 certyfikaty w ostatnich 24h
- `source_webinars: true` — 1 przyszły webinar (25 marca)

## Rozwiązanie

### 1. Nowa funkcja RPC `get_ticker_live_activity` (SECURITY DEFINER)

Funkcja bazodanowa uruchamiana z uprawnieniami właściciela — omija RLS, zwraca zagregowane, zanonimizowane dane o aktywności dla WSZYSTKICH użytkowników.

```sql
CREATE FUNCTION get_ticker_live_activity(
  p_types text[],
  p_hours int DEFAULT 24,
  p_max_items int DEFAULT 20
) RETURNS json
SECURITY DEFINER
```

Zwraca gotowe do wyświetlenia elementy (typ, ikona, treść, priorytet) — bez potrzeby dodatkowych zapytań po stronie klienta.

### 2. Aktualizacja `useNewsTickerData.ts`

Zastąpienie 6 osobnych zapytań do tabel (linie 260-496) jednym wywołaniem RPC. To eliminuje:
- Problem z RLS — funkcja SECURITY DEFINER omija polityki
- N+1 zapytania (profiles, lessons, modules osobno)
- ~230 linii kodu zastąpionych ~15 liniami

### 3. Poprawa widoczności tekstu

Dodanie jawnego koloru tekstu `text-foreground` do komponentu `TickerItem` dla elementów bez `customColor`, aby tekst był zawsze widoczny niezależnie od tła.

## Co do testów na iPhone PWA (punkt 1)

Zmiany wdrożone w poprzednich sesjach (przycisk "Zalicz lekcję", 80% próg, usunięcie auto-save, 8s timeout wideo) powinny rozwiązać problemy z resetowaniem postępu i ładowaniem wideo. **Nie mogę przetestować tego zdalnie** — wymaga to ręcznego testu na fizycznym urządzeniu iOS w trybie PWA (dodaj stronę do ekranu głównego → otwórz → obejrzyj lekcję → zamknij → otwórz ponownie → sprawdź czy postęp się zachował).

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| SQL Migration | Nowa funkcja RPC `get_ticker_live_activity` (SECURITY DEFINER) |
| `src/components/news-ticker/useNewsTickerData.ts` | Zastąpienie zapytań live activity jednym wywołaniem RPC |
| `src/components/news-ticker/TickerItem.tsx` | Dodanie `text-foreground` jako domyślnego koloru tekstu |

