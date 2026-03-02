
# Strona subdomenowa lidera — edytor blokowy DnD dla niezalogowanych

## Koncept

Kazdy lider/administrator tworzy wlasna **strone landingowa** dostepna pod subdomena `EQID.purelife.info.pl`. Strona jest przeznaczona dla **niezalogowanych odwiedzajacych** i prowadzi ich przez pytania/quizy do konkretnych produktow, szkolen, rejestracji itp. Lider buduje strone w **edytorze blokowym DnD** (drag-and-drop) w Panelu Lidera.

## Architektura

```text
Przeplyw:
  1. Odwiedzajacy wchodzi na ABC123.purelife.info.pl
  2. App wykrywa subdomen -> wyciaga EQID z hostname
  3. Pobiera strone lidera z tabeli leader_landing_pages (po eq_id)
  4. Renderuje bloki strony (hero, tekst, pytania, produkty, CTA, formularz)
  5. Odwiedzajacy odpowiada na pytania -> system pokazuje dopasowane wyniki
  6. Klikniecia/konwersje sa rejestrowane w statystykach lidera
```

## Istniejaca infrastruktura do wykorzystania

Projekt juz posiada:
- **PartnerPage** (`src/pages/PartnerPage.tsx`) — strona partnerska z alias w URL, szablon + produkty. Bedzie sluzyla jako punkt wyjscia, ale nowa strona bedzie znacznie bardziej rozbudowana.
- **SupportSettingsManagement** — edytor blokowy DnD z `custom_blocks` (JSONB), drag-and-drop, block editors. Ten wzorzec zostanie zaadaptowany do edytora stron liderow.
- **LivePreviewEditor** — zaawansowany edytor CMS. Zbyt skomplikowany na ten cel, ale mozna czerpac inspiracje z UX.
- **Detekcja aliasow** w `ProfileCompletionGuard.tsx` i routing `/:alias` w `App.tsx`.

## Faza 1: Baza danych

### Nowa tabela: `leader_landing_pages`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | - |
| user_id | uuid FK profiles (unique) | Wlasciciel strony (lider/admin) |
| eq_id | text | EQ ID lidera (do detekcji subdomeny) |
| blocks | jsonb | Tablica blokow strony |
| page_title | text | Tytul strony (SEO) |
| page_description | text | Opis meta (SEO) |
| theme_color | text | Kolor akcentowy strony |
| logo_url | text | Opcjonalne logo lidera |
| is_active | boolean default false | Czy strona jest opublikowana |
| created_at / updated_at | timestamptz | - |

**RLS**: Lider moze czytac/edytowac tylko swoja strone. Anonimowi moga czytac aktywne strony (is_active = true).

### Nowa tabela: `leader_landing_analytics`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | - |
| page_id | uuid FK leader_landing_pages | - |
| event_type | text | 'view', 'quiz_answer', 'cta_click', 'form_submit' |
| event_data | jsonb | Szczegoly (ktory blok, ktora odpowiedz) |
| visitor_id | text | Anonimowy identyfikator (fingerprint/session) |
| created_at | timestamptz | - |

**RLS**: INSERT dla anonimowych, SELECT tylko dla wlasciciela strony.

### Aktualizacja `leader_permissions`

Dodanie flagi: `can_customize_landing_page` (boolean default false).

## Faza 2: Typy blokow

Edytor bedzie obslugiwac nastepujace typy blokow:

| Typ bloku | Opis | Przeznaczenie |
|-----------|------|---------------|
| `hero` | Banner z tytulem, podtytulem, CTA, tlem | Pierwsze wrazenie |
| `text` | Tekst z formatowaniem (markdown) | Opisy, informacje |
| `image` | Obrazek z opcjonalnym podpisem | Wizualne elementy |
| `quiz` | Pytanie + odpowiedzi prowadzace do blokow/linkow | Interaktywny funnel |
| `products` | Siatka produktow z linkami | Katalog produktow |
| `cta_button` | Przycisk z linkiem (rejestracja, kontakt) | Konwersja |
| `testimonial` | Cytat/opinia z imieniem i zdjeciem | Social proof |
| `video` | Osadzony film (YouTube/Vimeo) | Prezentacja |
| `form` | Formularz kontaktowy (imie, email, telefon) | Lead generation |
| `divider` | Separator wizualny | Struktura strony |

### Struktura bloku (JSON):

```text
{
  id: "block_abc123",
  type: "quiz",
  position: 3,
  visible: true,
  data: {
    question: "Czym jesteś zainteresowany?",
    answers: [
      { label: "Zdrowie", action_type: "scroll_to_block", action_target: "block_products1" },
      { label: "Biznes", action_type: "link", action_target: "/auth?ref=EQID" },
      { label: "Szkolenia", action_type: "scroll_to_block", action_target: "block_training" }
    ]
  }
}
```

## Faza 3: Detekcja subdomeny

### Nowy hook: `useSubdomainDetection`

```text
Logika:
  1. Odczytaj window.location.hostname
  2. Sprawdz czy hostname pasuje do wzorca *.purelife.info.pl
  3. Wyciagnij EQID (pierwsza czesc przed pierwsza kropka)
  4. Odfiltruj "www", "app", "admin" jako zarezerwowane
  5. Jesli prawidlowy EQID -> zwroc { eqId, isSubdomain: true }
  6. Na preview (lovable.app) -> fallback na query param ?eqid=ABC123
```

## Faza 4: Strona publiczna (renderer)

### Nowy komponent: `LeaderLandingPage`

Strona renderowana dla niezalogowanych odwiedzajacych:
- Pelnoekranowa strona bez naglowka/sidebar aplikacji
- Kazdy blok renderowany przez dedykowany komponent (`HeroBlock`, `QuizBlock`, `ProductsBlock` itp.)
- Blok `quiz` obsluguje logike nawigacji: po wybraniu odpowiedzi przewija do wskazanego bloku lub otwiera link
- Formularz kontaktowy wysyla dane do `leader_landing_analytics` + opcjonalnie email do lidera
- Statystyki: kazde wyswietlenie strony, klikniecie CTA i odpowiedz na quiz sa rejestrowane

### Routing

W `App.tsx` lub w logice subdomeny: jesli wykryto subdomen z EQID, renderuj `LeaderLandingPage` zamiast normalnej aplikacji. Jesli strona nie istnieje lub nieaktywna -> przekierowanie na glowna strone aplikacji.

## Faza 5: Edytor blokowy w Panelu Lidera

### Nowa zakladka: "Moja strona" w LeaderPanel

Interfejs wzorowany na `SupportSettingsManagement`:
- **Paleta blokow**: Przyciski do dodawania nowych blokow (hero, tekst, quiz, produkty...)
- **Lista blokow DnD**: Sortowalna lista z @dnd-kit, kazdy blok z:
  - Uchwyt do przeciagania (GripVertical)
  - Przelacznik widocznosci (Eye/EyeOff)
  - Przycisk edycji (otwiera edytor bloku w Popover)
  - Przycisk usuwania
- **Edytory blokow**: Dedykowany formularz dla kazdego typu (np. QuizBlockEditor z dynamicznymi odpowiedziami)
- **Podglad na zywo**: Przycisk "Podglad" otwiera strone w nowej karcie
- **Ustawienia strony**: Tytul, opis SEO, kolor, logo, wlaczenie/wylaczenie
- **Statystyki**: Podstawowe metryki (wyswietlenia, klikniecia CTA, odpowiedzi na quiz)

## Faza 6: Konfiguracja infrastruktury

Na serwerze produkcyjnym (Cyberfolks):
1. **Wildcard DNS**: Rekord A `*.purelife.info.pl -> IP serwera`
2. **Wildcard SSL**: Let's Encrypt z DNS-01 challenge
3. **Express (server.js)**: Obsluga wszystkich subdomen — serwuje ta sama aplikacje SPA

To jest konfiguracja manualna poza Lovable.

## Kolejnosc implementacji

1. Migracja bazy danych (tabele + RLS + nowe uprawnienie)
2. Hook `useSubdomainDetection`
3. Typy TypeScript dla blokow
4. Renderer strony publicznej (`LeaderLandingPage` + komponenty blokow)
5. Routing subdomeny w App.tsx
6. Edytor blokowy DnD w Panelu Lidera (paleta, lista, edytory blokow)
7. Statystyki i analityka
8. Konfiguracja DNS/SSL na Cyberfolks (manualna)

## Wazne uwagi

- **Strona publiczna**: Strona jest calkowicie publiczna, nie wymaga logowania. RLS pozwala anonimowym na odczyt aktywnych stron.
- **Preview Lovable**: Na lovable.app subdomena nie dziala — testowanie przez `?eqid=ABC123` w URL.
- **Wzorzec blokowy**: Adaptacja sprawdzonego wzorca z SupportSettingsManagement (JSONB blocks, DnD, Popover edytory).
- **Quiz jako funnel**: Blok quiz to kluczowy element — odpowiedzi prowadza do konkretnych sekcji strony lub linkow zewnetrznych (produkty, rejestracja, szkolenia).
- **Statystyki**: Kazda interakcja odwiedzajacego jest rejestrowana, lider widzi metryki w Panelu Lidera.
