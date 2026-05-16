Trzy powiązane zadania: (A) admin-konfigurowalny baner wymuszający uzupełnienie danych, (B) bezwzględne przypisanie kraju do każdego miasta, (C) bezwzględne geokodowanie wszystkich miast na mapie.

---

## A) Baner wymuszający uzupełnienie danych (konfigurowany przez admina)

### Dane

**Nowa tabela** `profile_completion_banner_config` (singleton, jeden rekord):
- `enabled` boolean
- `title` text, `message` text, `button_label` text
- `required_fields` text[] — np. `['street_address','postal_code','city','country','phone_number']`
- `target_path` text — domyślnie `/my-account`
- `severity` text — `info` | `warning` | `destructive`
- `dismissible` boolean — czy użytkownik może schować na sesję
- RLS: SELECT dla authenticated, INSERT/UPDATE wyłącznie admin (`has_role`).

### UI użytkownika

**Nowy komponent** `src/components/profile/ProfileCompletionBanner.tsx`
- Hook na poziomie shella aplikacji (osadzić w `App.tsx`/Dashboard layout — pod topbarem, nad treścią).
- Pobiera config (react-query, staleTime 5 min) + bieżący profil (już wczytywany w aplikacji).
- Wylicza `missing = required_fields ∩ (puste pola profilu)`. Jeśli `enabled && missing.length > 0` → renderuje `Alert` z ikoną wg `severity`, tytułem, treścią i przyciskiem CTA.
- Przycisk: `navigate(target_path + '?highlight=' + missing.join(','))`.
- Dla `dismissible=true`: ikona X chowająca baner w `sessionStorage` (po reloadzie znowu się pokaże).
- Lista brakujących pól renderowana w skrócie pod treścią („Brakuje: Miasto, Kod pocztowy").

### Strona docelowa (MyAccount)

**Edycja** `src/pages/MyAccount.tsx`:
- Odczytuje `?highlight=` z `useSearchParams`.
- Dla każdego pola w liście: dodaje klasę `ring-2 ring-destructive` na inpucie + label „Wymagane" w `text-destructive`.
- Po zamontowaniu: `scrollIntoView({behavior:'smooth'})` na pierwszy podświetlony input + focus.
- Po pomyślnym zapisaniu adresu — czyści `highlight` w URL.

### Panel admina

**Nowy komponent** `src/components/admin/ProfileCompletionBannerSettings.tsx` w istniejącej zakładce „Ustawienia" (sąsiednia karta):
- Switch „Włącz baner".
- Multi-select pól wymaganych (predefiniowana lista z czytelnymi etykietami PL: imię, nazwisko, EQ ID, ulica, kod pocztowy, miasto, kraj, telefon).
- Inputy: tytuł, treść (textarea), etykieta przycisku.
- Select `target_path` (na razie tylko `/my-account` — pole gotowe na rozszerzenia).
- Select `severity`. Switch `dismissible`. Przycisk Zapisz (upsert).
- Podgląd na żywo nad formularzem.

---

## B) Każde miasto MUSI mieć kraj

### Przyczyna

Profile mają `city` bez `country` (puste/`null`) → frontend pokazuje „Nieznane". Naprawiamy w dwóch miejscach:

### B1. Geokodowanie zwraca i zapisuje kraj

**Edycja** `supabase/functions/geocode-cities/index.ts`:
- Nominatim wywoływane z `addressdetails=1`. Z odpowiedzi pobieramy `address.country` (lokalizowane EN) — zapisujemy w nowej kolumnie `display_country` w `city_geocache`.
- Funkcja zwraca też `display_country`, żeby frontend mógł użyć go gdy `profile.country` jest puste.

**Migracja**: `ALTER TABLE city_geocache ADD COLUMN display_country text;`

### B2. Frontend używa `display_country` jako fallback

**Edycja** `src/components/admin/UserStatistics.tsx`:
- Agregacja miast: zamiast `country = normalizeCountry(p.country).label` (która zwraca „Nieznane" dla pustych) — najpierw bierzemy `p.country`, jeśli puste → szukamy w cache geokodowania dla `(city, '')` i bierzemy `display_country`. Jeśli też brak → dopiero wtedy „Nieznane".
- W praktyce: aggregator przyjmuje opcjonalną mapę `cityCountryHints: Map<cityLower, country>` zbudowaną z `city_geocache.display_country`.

### B3. Jednorazowy backfill kraju w profilach

**Nowa edge function** `backfill-profile-countries` (admin-only, ręcznie uruchamiana z panelu):
- Iteruje przez `profiles` gdzie `city IS NOT NULL AND (country IS NULL OR country = '')`.
- Geokoduje miasto przez Nominatim (z cache), wpisuje `address.country` do `profiles.country`.
- Zwraca raport: ile zaktualizowano, ile nie udało się zlokalizować.

**Przycisk** w `ProfileCompletionBannerSettings` (lub w `UserStatistics` nad mapą): „Uzupełnij brakujące kraje w profilach" z progress toastem.

---

## C) WSZYSTKIE miasta na mapie muszą być zlokalizowane

### Przyczyna

W obecnej implementacji widoczne „0 zlokalizowanych · 103 bez lokalizacji" — przyczyny:
1. Limit `MAX_LOOKUPS = 40` na wywołanie → przy 103 miastach większość nie była przetworzona.
2. Do Nominatim wysyłaliśmy `country = "Nieznane"` → endpoint zawsze zwraca 0 wyników.
3. Brak retry przy błędach sieci.
4. Funkcja prawdopodobnie zwróciła błąd auth/cors — brak wpisów w logach.

### Naprawy w `supabase/functions/geocode-cities/index.ts`

- **Sanitizacja**: gdy `country` to puste / „Nieznane" / „Unknown" → nie przekazujemy `country` do Nominatim, zostaje tylko `city`.
- **Fallback**: jeśli zapytanie z `country` zwróciło 0 wyników, drugie wywołanie bez `country` (i ewentualnie z `q=`).
- **Usuwamy limit `MAX_LOOKUPS`** — zamiast tego implementujemy **EdgeRuntime.waitUntil** do dokończenia w tle:
  - Faza 1 (synchroniczna): zwracamy od razu wszystkie zapamiętane wyniki z cache (lat/lng lub null).
  - Faza 2 (`waitUntil`): w tle dogeokoduje brakujące miasta partiami po 1 req/1.1 s i zapisze do cache.
  - Frontend odpytuje co 5 s (polling przez react-query `refetchInterval`), aż `missing == 0` lub minie limit czasu.
- **Logowanie** `console.log` dla każdej operacji (start, cache hit, nominatim hit/miss, zapis), żeby diagnostyka była widoczna.
- **Auth fallback**: jeśli admin check zwróci 403, logujemy konkretny powód.

### Frontend (UserWorldMap.tsx)

- `useQuery` z `refetchInterval` (5 s) dopóki `missing > 0`, wyłączane gdy `missing === 0`.
- Pasek statusu pokazuje progres: „Geokoduję 12/103…".
- Po zakończeniu interval się wyłącza.

---

## Pliki

**Nowe**
- `supabase/migrations/...` — `profile_completion_banner_config` + RLS + `display_country` w `city_geocache`.
- `supabase/functions/backfill-profile-countries/index.ts` — admin-only backfill.
- `src/components/profile/ProfileCompletionBanner.tsx`
- `src/components/admin/ProfileCompletionBannerSettings.tsx`

**Edycje**
- `supabase/functions/geocode-cities/index.ts` — sanitizacja, fallback, waitUntil, display_country.
- `src/components/admin/UserWorldMap.tsx` — polling brakujących, status progresu.
- `src/components/admin/UserStatistics.tsx` — fallback `display_country` z cache w agregacie miast.
- `src/pages/MyAccount.tsx` — odczyt `?highlight=`, czerwone ramki, scroll & focus.
- `src/App.tsx` — montaż `ProfileCompletionBanner` w shellu zalogowanego użytkownika.
- `src/pages/Admin.tsx` (Ustawienia) — dodanie `ProfileCompletionBannerSettings` + przycisku backfill.

## Poza zakresem
- Wymuszanie blokady kont (banner jest ostrzeżeniem + CTA, nie blokerem). Może być rozszerzony później.
- Płatne API geokodujące — Nominatim wystarczy, działa darmowo z waitUntil.
