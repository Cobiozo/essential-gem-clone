## Cel

W zakładce admina **Użytkownicy → „Statystyki użytkowników"** dołożyć równolegle przełącznik (Tabs) z dwiema sekcjami:
1. „Statystyki użytkowników" (obecny komponent `UserStatistics`)
2. **„Struktura całej platformy"** — nowa kompaktowa lista rozwijana całej organizacji z wyszukiwaniem, wyróżnieniem adminów, oznaczeniem ról i eksportem do Excel / Word / HTML.

## Architektura danych

- Źródło: `profiles` + `user_roles` (jeden user może mieć wiele ról; w UI pokazujemy wszystkie jako badge'y, kolejność: `admin → moderator → leader → guardian → specjalista → partner → klient → guest_plc`).
- Drzewo budowane po stronie klienta: relacja `upline_eq_id → eq_id`. Użytkownicy bez uplinu lub z uplinem spoza platformy stają się korzeniami sekcji „Bez uplinu / korzenie".
- Jedno zapytanie dla wszystkich profili (lekkie kolumny: `user_id, first_name, last_name, email, eq_id, upline_eq_id, phone_number, country, city, role, is_active, blocked_at, created_at, avatar_url`) + jedno do `user_roles`. Bez paginacji — wszyscy on-demand, lazy expand.

## Komponent: `PlatformStructureView`

Plik: `src/components/admin/PlatformStructureView.tsx`

UI:
- Pasek nad listą: **wyszukiwarka** (debounce 200 ms, dopasowanie po `user_id`, `eq_id`, `first_name`, `last_name`, `email`, `phone_number`) + przyciski **„Odśwież"**, **„Excel"**, **„Word"**, **„HTML"** oraz **„Rozwiń wszystko"/„Zwiń"**.
- Pasek podsumowania (chipsy): łączna liczba użytkowników + breakdown per rola, liczba korzeni, liczba z uplinem, liczba adminów (zawsze widoczna podpowiedź `Admin: N`).
- Lista: rekurencyjne, akordeonowe wiersze (custom, bez Radix Accordion żeby trzymać kompakt). Każdy wiersz:
  - lewa strona: chevron, awatar 24 px, **imię nazwisko**, badge'y ról (admin = `bg-destructive`, moderator = `bg-amber-500`, leader = `bg-primary`, reszta `secondary`), `eq_id` jako mono chip
  - prawa strona: liczba bezpośrednich (`(N)`), liczba pełnego downline (`Σ N`), kropka aktywności
  - rozwinięcie: krótki popover/inline z e-mailem, telefonem, miastem/krajem, datą rejestracji, statusem (aktywny / zablokowany), uplinem (klik → przewija do uplina w drzewie)
- Wysokość linii ~32 px (text-xs), gęste padding, ikony 14 px — żeby pomieścić setki/tysiące pozycji. Wirtualizacja drzewa za pomocą `@tanstack/react-virtual` przy >300 widocznych elementów (lib już w projekcie? jeśli nie — dodać).
- **Wyszukiwanie**: filtruje drzewo zachowując ścieżki przodków pasującego węzła (auto-expand do dopasowania). Liczniki pod paskiem aktualizują się do widocznego zbioru.
- **Wyróżnienie adminów**: stała ikona `ShieldAlert` + obwódka `border-destructive/40` + jasne tło `bg-destructive/5`.
- **Realtime**: subskrypcja `profiles` + `user_roles` (debounce 1.5 s, identyczna do `UserStatistics`).

## Eksport — `src/components/admin/exports/platformStructureExport.ts`

Wspólny builder modelu drzewa + 3 wyjścia:

1. **Excel (`xlsx`)** — biblioteka `xlsx` (jeśli brak: `bun add xlsx`).
   - Arkusz „Podsumowanie": tabela ról z liczbami + sumy korzenie/uplink, data eksportu, nazwa platformy.
   - Arkusz „Użytkownicy (płaska lista)": kolumny: EQ ID, Upline EQ ID, Pełna ścieżka uplinów, Imię, Nazwisko, Email, Telefon, Kraj, Miasto, Role, Status, Rejestracja, Liczba bezpośrednich, Liczba w downline. Nagłówek bold, freeze panes, autoszerokości, filtry.
   - Arkusz „Struktura (drzewo)": jedna kolumna „Imię i nazwisko" z wcięciem przez `'  '.repeat(depth)` + obok role i licznik downline.

2. **Word (`.docx`)** — `docx` (już używany w projekcie do innych eksportów, jeśli nie: `bun add docx`).
   - Strona tytułowa: logo platformy (opcjonalnie), „Struktura platformy — stan na {data}", podsumowanie ról jako tabela.
   - Sekcja „Drzewo": rekurencyjna lista wcięta, pogrubione imię, mniejszą czcionką role + eq_id, separator między korzeniami.

3. **HTML (`.html`, samodzielny plik do pobrania)**:
   - Inline CSS (Inter, kolory semantyczne zdublowane z motywu, tryb druku), nagłówek z podsumowaniem (grid kart), drzewo jako zagnieżdżone `<details>` (rozwijane natywnie), badge'y ról jak w UI, link `mailto:` dla emaili.
   - Stopka: data wygenerowania + nazwa admina.

Wszystkie 3 eksporty współdzielą funkcje `buildTree(profiles, roles)` i `summarize(tree)`, więc liczby per rola/upline są spójne.

## Integracja z `Admin.tsx`

W `<TabsContent value="user-stats">` (linia 4636) zamiast bezpośredniego `<UserStatistics />` wstawić wewnętrzny przełącznik:

```tsx
<Tabs defaultValue="stats">
  <TabsList>
    <TabsTrigger value="stats">Statystyki użytkowników</TabsTrigger>
    <TabsTrigger value="structure">Struktura całej platformy</TabsTrigger>
  </TabsList>
  <TabsContent value="stats"><UserStatistics /></TabsContent>
  <TabsContent value="structure"><PlatformStructureView /></TabsContent>
</Tabs>
```

Zachowanie URL: stan wewnętrznej zakładki w `useSearchParams` jako `userTab=stats|structure`, aby admin mógł podlinkować widok struktury.

## Zakres uprawnień

- Widoczne tylko dla `admin` i moderatorów z uprawnieniem `user-stats:view`/`user-stats:export` (analogicznie jak obecny `UserStatistics`). Eksport gated przez `user-stats:export` — przyciski ukryte gdy moderator nie ma akcji `export`.

## Pliki

Nowe:
- `src/components/admin/PlatformStructureView.tsx`
- `src/components/admin/exports/platformStructureExport.ts`

Edytowane:
- `src/pages/Admin.tsx` — opakowanie `TabsContent value="user-stats"` w wewnętrzne `Tabs`.

Brak zmian w bazie i edge functions (RLS na `profiles`/`user_roles` już pozwala adminowi czytać wszystko).

## Zależności

- Sprawdzić obecność `xlsx`, `docx`, `@tanstack/react-virtual`. Jeśli brakuje — dodać przez `bun add`. (Według mojej wiedzy `docx` jest już używany; `xlsx` prawdopodobnie nie.)
