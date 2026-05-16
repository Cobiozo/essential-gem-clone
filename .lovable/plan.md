## Cel

Dodać w panelu admina kompleksową zakładkę **"Statystyki użytkowników"** wykorzystującą wszystkie dostępne dane z `profiles`, `user_roles` i powiązanych tabel aktywności. Filtr adresowy dodany wcześniej pozostaje na liście użytkowników; statystyki są oddzielnym widokiem.

## Zakres widoku statystyk

### 1) Karty KPI (góra strony)
- Łączna liczba użytkowników
- Aktywni (`is_active = true`, nie zablokowani)
- Zablokowani / nieaktywni
- Nowi w ostatnich 7 / 30 / 90 dniach (porównanie do poprzedniego okresu, % zmiany)
- Z pełnym profilem (`profile_completed = true`) — liczba i %
- Online teraz (`last_seen_at` < 5 min) i aktywni w 24h
- Zaakceptowane wszystkie zgody (Regulamin + Privacy + RODO)
- Z avatarem / bez avatara

### 2) Geografia — sekcja kluczowa
- **Mapa/lista krajów**: zliczenie po `country` (normalizacja: trim + uppercase, mapowanie pustych jako "Nieznane"), sortowanie malejąco, % udziału, pasek postępu, flaga kraju (emoji z `src/utils/languageFlags.ts` lub mapowanie ISO).
- **Top 20 miast**: zliczenie po `city` (z trim + tytulizacja, "Nieznane" gdy puste), wraz z krajem w nawiasie.
- **Kody pocztowe**: top 10 najczęstszych prefiksów (pierwsze 2 znaki) — przydatne dla regionów.
- Filtr: kraj → dynamicznie filtruje listę miast i pozostałe statystyki.
- Eksport każdej tabeli geo do XLSX (przy użyciu istniejącego wzorca z `LeaderTeamContactsView`).

### 3) Demografia / Konto
- Rozkład **ról** (Admin / Leader / Partner / Klient / Specjalista) — wykres kołowy + liczby.
- Rozkład **rang** (`rank`) — wykres słupkowy.
- **Język szkolenia** (`training_language`) — liczba użytkowników wg języka, z flagami.
- **Specjalizacje** (`specialization`) — top 10.
- **Z upline / bez upline** (czy mają `upline_eq_id`).
- **Zarejestrowani przez reflink** vs bezpośrednio (`registered_via_reflink`).

### 4) Trendy w czasie
- Wykres liniowy rejestracji w czasie (dzienne/tygodniowe/miesięczne, przełącznik) za ostatnie 12 miesięcy — na bazie `created_at`.
- Wykres skumulowany liczby kont.
- Wykres "ostatnia aktywność" (`last_seen_at`) — histogram (dziś, 7d, 30d, 90d, 90+ dni, nigdy).

### 5) Onboarding & Aktywacja (lejek)
- Zarejestrowani → Email aktywowany → Profil ukończony → Zaakceptowane regulaminy → Zatwierdzeni (admin/leader/guardian, w zależności od roli).
- Wartości liczbowe + % drop-off na każdym kroku.
- Lista użytkowników "utkniętych" na każdym kroku (klikalne, prowadzi do zakładki użytkowników z filtrem).

### 6) Tutorial & Tryb użytkownika
- Ukończyli tutorial / pominęli / nie widzieli.
- Pełne dane kontaktowe (telefon + adres) vs braki.

### 7) Bezpieczeństwo / Zgody
- Z MFA włączonym (jeśli dostępne w `user_mfa`).
- Akceptacje: Regulamin, Privacy, RODO — liczby i %.
- Logowania nieudane (`failed_logins` jeśli istnieje) — top 10 użytkowników, suma globalna.

### 8) Zespoły (jeśli `platform_teams` używane)
- Liczba zespołów, średnia wielkość, top 10 zespołów wg liczby członków.

## Architektura techniczna

**Nowy plik:** `src/components/admin/UserStatistics.tsx`
- Komponent jednostronicowy, zorganizowany w sekcje (Card per sekcja).
- Pobranie danych jednorazowo z `profiles` (z paginacją po 1000) + równolegle dodatkowe zapytania (role z `user_roles`, MFA, logowania, zespoły) — całość w `useQuery` (react-query, już używany w projekcie).
- Wszystkie agregacje liczone po stronie klienta z pobranego datasetu (proste `reduce`/`Map`) — wystarczające dla skali projektu; w razie potrzeby później przeniesione do funkcji DB.
- Wykresy: `recharts` (już w projekcie, patrz `src/components/ui/chart.tsx`).
- Eksport: `xlsx` (już używany w `LeaderTeamContactsView`).
- Wzorzec wizualny: te same `Card`, `Badge`, typografia i tokeny co reszta panelu admina.

**Plik:** `src/pages/Admin.tsx`
- Dodać nowy `TabsTrigger value="user-stats"` w menu admina (obok zakładki "users").
- Dodać `<TabsContent value="user-stats"><UserStatistics /></TabsContent>`.
- Brak zmian w istniejącej zakładce "users" (filtr adresowy pozostaje).

**Helpery:**
- `src/lib/countryFlags.ts` (nowy, mały) — mapowanie nazwy kraju / kodu ISO → emoji flagi, fallback `🌐`. Normalizacja stringów (trim, lowercase porównanie).

## Bez zmian
- Schemat bazy (brak migracji — wszystkie dane już istnieją).
- Funkcje edge.
- Logika RLS — admin już ma pełny dostęp do `profiles` przez RPC `get_all_profiles_with_status`/podobne (do potwierdzenia w istniejącym kodzie pobierania userów).
- Pozostałe zakładki panelu admina.

## Pliki do edycji/utworzenia

- **NOWY** `src/components/admin/UserStatistics.tsx` — cały panel statystyk.
- **NOWY** `src/lib/countryFlags.ts` — flagi krajów.
- **EDYCJA** `src/pages/Admin.tsx` — dodać zakładkę i import komponentu.

## Poza zakresem
- Geokodowanie na rzeczywistą mapę świata (można dodać w kolejnej iteracji — np. `react-simple-maps`).
- Statystyki finansowe / płatności (osobny moduł).
- Statystyki szkoleń (osobny istniejący moduł).
