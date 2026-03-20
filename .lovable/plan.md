

# Plan: Nawigacja do sekcji w nagłówku + zmienne dynamiczne profilu partnera

## Problem 1: Przyciski w nagłówku nie scrollują do sekcji
Przyciski używają `<a href>`, ale sekcje na stronie partnera nie mają atrybutów `id` w HTML, więc linki kotwicowe (`#kontakt`, `#produkty`) nie działają. Ponadto brakuje smooth scroll.

## Problem 2: Brak systemu zmiennych dynamicznych
Tekst `{Imię}{Nazwisko}` jest zapisywany dosłownie — nie istnieje mechanizm zastępowania placeholderów danymi z profilu partnera.

---

## Rozwiązanie

### 1. Sekcje z atrybutami `id` + smooth scroll

**PartnerPage.tsx** — w `renderSection()` owinąć każdą sekcję w `<div id={element.id}>`, dzięki czemu linki `#uuid-sekcji` będą działać. Dodać też obsługę czytelnych anchor nazw — w konfiguracji sekcji pole `anchor_id` (np. `kontakt`, `produkty`, `o-mnie`).

**HeaderSection.tsx** — zamienić `<a href>` na handler onClick:
- Jeśli URL zaczyna się od `#` → `document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })`
- Jeśli URL jest zewnętrzny → `window.open(url, '_blank')`
- W innym wypadku → `window.location.href = url`

**Edytory sekcji** — dodać opcjonalne pole `anchor_id` (tekst, np. "kontakt") w każdym edytorze sekcji, żeby admin mógł nadać czytelną kotwicę.

### 2. System zmiennych dynamicznych

Utworzyć **`src/lib/partnerVariables.ts`** z:

```text
Dostępne zmienne:
  {{imie}}              → profile.first_name
  {{nazwisko}}          → profile.last_name
  {{imie_nazwisko}}     → first_name + last_name
  {{email}}             → profile.email
  {{telefon}}           → profile.phone_number
  {{miasto}}            → profile.city
  {{kraj}}              → profile.country
  {{specjalizacja}}     → profile.specialization
  {{opis}}              → profile.profile_description
  {{eq_id}}             → profile.eq_id
  {{avatar_url}}        → profile.avatar_url
```

Funkcja `resolveVariables(text: string, profile: PartnerProfile): string` — zamienia `{{klucz}}` na odpowiednie dane z profilu.

**PartnerPage.tsx** — rozszerzyć `PartnerProfile` o dodatkowe pola (phone_number, city, country, specialization, profile_description, eq_id) i pobrać je w zapytaniu do `profiles`. Przed renderowaniem sekcji przepuścić cały config przez `resolveVariables`.

**TemplatePreviewPage.tsx** — w podglądzie szablonu wyświetlać przykładowe dane (np. `{{imie}}` → "Jan").

**HeaderSectionEditor.tsx** — dodać sekcję informacyjną (legendę) z listą dostępnych zmiennych, żeby admin wiedział jakie skróty wpisać.

### 3. Legenda zmiennych w edytorze

W edytorach (Header, Hero, TextImage, CtaBanner itd.) dodać mały komponent `VariablesLegend` wyświetlający tabelkę:

| Zmienna | Dane |
|---------|------|
| `{{imie}}` | Imię partnera |
| `{{nazwisko}}` | Nazwisko partnera |
| `{{imie_nazwisko}}` | Imię i nazwisko |
| `{{email}}` | Email partnera |
| `{{telefon}}` | Numer telefonu |
| `{{miasto}}` | Miasto |
| `{{kraj}}` | Kraj |
| `{{specjalizacja}}` | Specjalizacja |
| `{{opis}}` | Opis profilu |
| `{{eq_id}}` | ID partnera (EQ) |

---

## Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `src/lib/partnerVariables.ts` | NOWY — resolveVariables + VARIABLES_LEGEND |
| `src/components/admin/template-sections/VariablesLegend.tsx` | NOWY — komponent legendy zmiennych |
| `src/pages/PartnerPage.tsx` | Rozszerzyć PartnerProfile, dodać id/anchor do sekcji, przepuścić config przez resolveVariables |
| `src/pages/TemplatePreviewPage.tsx` | Dodać dummy profile i resolveVariables w podglądzie |
| `src/components/partner-page/sections/HeaderSection.tsx` | onClick handler z smooth scroll dla kotwic |
| Edytory sekcji (Header, Hero, TextImage, CtaBanner, itd.) | Dodać pole `anchor_id` + komponent VariablesLegend |

