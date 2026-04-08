

# System statystyk Auto-Webinarów dla admina

## Dane dostępne w bazie (bez migracji)

Wszystkie potrzebne dane już istnieją:
- **Kliknięcia**: `auto_webinar_invitation_clicks` (ref_code, event_id, clicked_at)
- **Rejestracje gości**: `guest_event_registrations` (invited_by_user_id, event_id, slot_time, status)
- **Obecność/czas oglądania**: `auto_webinar_views` (guest_registration_id, watch_duration_seconds, joined_at)
- **Profile partnerów**: `profiles` (first_name, last_name, eq_id)
- **Powiązanie z kategorią**: `auto_webinar_config` (event_id, category)

Relacja kluczowa: `guest_event_registrations.invited_by_user_id` -> `profiles.user_id` pozwala powiązać gościa z partnerem zapraszającym.

## Plan implementacji

### Nowy komponent: `AutoWebinarPartnerStats.tsx`

Osobna zakładka "Statystyki partnerów" wewnątrz każdej kategorii (BO / HC), renderowana w `AutoWebinarManagement.tsx` jako dodatkowy tab obok istniejącej zawartości.

### Zawartość zakładki

**1. Karty podsumowujące (top summary)**
- Łączna liczba kliknięć w linki zaproszeniowe
- Łączna liczba zarejestrowanych gości
- Łączna liczba gości, którzy dołączyli (mają wpis w `auto_webinar_views`)
- Średni czas oglądania (avg `watch_duration_seconds`)
- Współczynnik konwersji: rejestracja -> dołączenie (%)

**2. Ranking TOP 20 partnerów** (tabela sortowalna)

Kolumny:
| # | Partner (imię, nazwisko, EQID) | Zaproszenia (kliknięcia) | Rejestracje | Dołączyli | % konwersji | Łączny czas oglądania | Śr. czas/gość |
|---|---|---|---|---|---|---|---|

Dane agregowane po `invited_by_user_id`. Sortowanie domyślne po liczbie rejestracji. Możliwość przełączania sortowania klikając nagłówki kolumn.

**3. Filtr czasowy**
- Dropdown: Ostatnie 7 dni / 30 dni / 90 dni / Wszystko
- Filtr wpływa na wszystkie dane jednocześnie

### Integracja w panelu admina

W `AutoWebinarManagement.tsx` dodam wewnętrzny system zakładek:
- **Ustawienia** (obecna zawartość)
- **Statystyki partnerów** (nowy komponent)

### Pobieranie danych (client-side)

Trzy zapytania równoległe po załadowaniu:
1. `auto_webinar_invitation_clicks` WHERE event_id = config.event_id -> grupowanie po ref_code -> mapowanie ref_code na user_id
2. `guest_event_registrations` WHERE event_id = config.event_id AND status != 'cancelled' -> grupowanie po invited_by_user_id
3. `auto_webinar_views` JOIN z guest_event_registrations -> grupowanie po invited_by_user_id z sumą watch_duration_seconds

Połączenie w jedną tabelę rankingową po user_id partnera.

### Pliki do edycji/utworzenia
- **Nowy**: `src/components/admin/AutoWebinarPartnerStats.tsx`
- **Edycja**: `src/components/admin/AutoWebinarManagement.tsx` (dodanie zakładek wewnętrznych)

Bez migracji bazy danych - wszystkie dane już istnieją.

---

## Dodatkowe sugestie do rozważenia

1. **Eksport CSV** - przycisk eksportujący ranking do pliku CSV (imię, nazwisko, EQID, liczby)
2. **Wykres trendu** - mały wykres liniowy pokazujący liczbę rejestracji/dołączeń w czasie (dzień po dniu)
3. **Porównanie BO vs HC** - osobna zakładka z zestawieniem obu kategorii obok siebie (która kategoria lepiej konwertuje)
4. **Statystyki per slot** - która godzina slotu przyciąga najwięcej gości (heatmapa godzinowa)
5. **Powiadomienie o nowej rejestracji** - push/notyfikacja do partnera gdy jego gość dołączy do webinaru

Które z tych dodatkowych opcji chcesz wdrożyć razem z rankingiem?

