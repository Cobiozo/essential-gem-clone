

# Plan naprawy News Ticker

## Zdiagnozowane problemy

### 1. Krytyczny problem: Nie można wybrać wydarzeń do paska informacyjnego

**Przyczyna:** Polityka RLS dla tabeli `news_ticker_selected_events` jest niepoprawna:

```sql
-- Obecna (niepoprawna):
WHERE profiles.id = auth.uid() AND profiles.role = 'admin'

-- Problem:
-- 1. profiles.id to UUID profilu, NIE użytkownika
-- 2. profiles.user_id to pole z ID użytkownika z auth.users
-- 3. Sprawdzanie role w profiles jest niezgodne z architekturą (role są w user_roles)
```

**Rozwiązanie:** Użycie funkcji `is_admin()` która już istnieje i poprawnie sprawdza role przez tabelę `user_roles`.

### 2. Funkcjonalności już zaimplementowane w kodzie

Analiza kodu wykazała, że następujące funkcjonalności **są już gotowe** w komponencie `NewsTickerManagement.tsx`:

| Funkcjonalność | Status | Lokalizacja |
|----------------|--------|-------------|
| Wybór wydarzeń (zakładka Wydarzenia) | Gotowe (linie 608-714) | UI jest, ale RLS blokuje zapis |
| Komunikat dla konkretnego użytkownika | Gotowe (linie 780-891) | Radio button + wyszukiwarka użytkowników |
| Zaawansowane stylowanie ważnych | Gotowe (linie 904-963) | Rozmiar, kolor, efekt, animacja ikony |
| Edycja stylowania istniejących | Gotowe (linie 1119-1165) | W dialogu edycji |

**Kolumny w bazie danych** (`news_ticker_items`):
- `target_user_id` - dla komunikatów do konkretnego użytkownika
- `font_size` - normal/large/xlarge
- `custom_color` - kolor tekstu
- `effect` - none/blink/pulse/glow
- `icon_animation` - none/bounce/spin/shake

---

## Plan naprawy

### Krok 1: Migracja SQL

Usunięcie niepoprawnej polityki RLS i dodanie poprawnej używającej `is_admin()`:

```sql
-- Usuń starą politykę
DROP POLICY IF EXISTS "Admins can manage selected events" 
  ON public.news_ticker_selected_events;

-- Dodaj nową, poprawną politykę
CREATE POLICY "Admins can manage selected events"
ON public.news_ticker_selected_events
FOR ALL
USING (is_admin());
```

### Krok 2: Weryfikacja

Po migracji:
- Zakładka "Wydarzenia" będzie działać - admin może zaznaczać/odznaczać webinary i spotkania
- Wybrane wydarzenia pojawią się w tickerze gdy źródło jest włączone w Ustawieniach

---

## Podsumowanie zmian

### Plik do modyfikacji:
- **Nowa migracja SQL** - naprawa polityki RLS dla `news_ticker_selected_events`

### Nic więcej nie jest potrzebne

Pozostałe funkcjonalności (komunikaty dla użytkowników, stylowanie ważnych komunikatów) są już w pełni zaimplementowane:

1. **Komunikat dla konkretnego użytkownika:**
   - W dialogu "Dodaj komunikat" wybierz "Dla konkretnego użytkownika"
   - Wyszukaj użytkownika po imieniu, nazwisku lub emailu
   - Komunikat będzie widoczny tylko dla tego użytkownika

2. **Zaawansowane stylowanie ważnych komunikatów:**
   - Zaznacz "Oznacz jako ważny"
   - Pojawi się sekcja "Zaawansowane stylowanie"
   - Ustaw: rozmiar czcionki, kolor, efekt (mruganie/pulsowanie/poświata), animację ikony

---

## Przepływ po naprawie

```text
Admin → Pasek informacyjny → Zakładka "Wydarzenia"
│
├─ Widzi listę webinarów i spotkań z checkboxami
├─ Zaznacza wydarzenia do wyświetlenia
├─ Zmiany zapisują się automatycznie (bez błędu RLS)
│
Admin → Zakładka "Ustawienia"
│
├─ Włącza źródło "Webinary" lub "Spotkania zespołowe"
├─ Zapisuje ustawienia
│
Użytkownik → Dashboard
│
└─ Widzi pasek z wybranymi wydarzeniami
```

