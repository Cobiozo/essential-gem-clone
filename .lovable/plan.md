

# Plan: Hero sekcji „Pure Life Classic" — identyczny z obrazem

## Analiza obrazu
Zrzut ekranu pokazuje hero typu split z:
- Ciemne tło (#0a1628) z gradientem
- Nagłówek: „TESTUJ, NIE ZGADUJ.\nTwoje zdrowie zasługuje\nna twarde dane."
- Opis o Omega-3
- **Kafelek partnera** z avatarem i tekstem: „Twój Przewodnik Zdrowia: [Partner] - Jesteśmy tu dla Ciebie." — tego elementu brakuje w obecnym komponencie
- Dwa CTA: zielony „KUP TERAZ I DOŁĄCZ DO NAS" + jasny „Wypełnij ankietę i dobierz opcję" (z ikoną ✔️)
- Prawa strona: zdjęcie rodziny z efektem złotego płynu

## Zmiany

### 1. Dodanie elementu „partner badge" do `HeroSection.tsx`
Nowy blok renderowany między opisem a przyciskami CTA (w layout split). Konfiguracja:
- `partner_badge.text` — tekst (np. „Twój Przewodnik Zdrowia:")
- `partner_badge.subtitle` — np. „[Partner] - Jesteśmy tu dla Ciebie."
- `partner_badge.avatar_url` — avatar (opcjonalny)

Rendering: zaokrąglona karta z awatarem po lewej i tekstem, styl jak na zrzucie (bg-white/90, shadow, rounded-full avatar).

### 2. Dodanie pól edycji w `HeroSectionEditor.tsx`
Nowa sekcja „Kafelek partnera" z polami: text, subtitle, avatar_url (ImageUploadInput). Pola oznaczone jako edytowalne, żeby partner mógł wstawić swoje imię i zdjęcie.

### 3. Aktualizacja danych szablonu „Pure Life Classic" w bazie
Zmiana konfiguracji hero (id `9abb203f-...`) na:
- `layout: 'split'`, `bg_color: '#0a1628'`, `text_color: biały`
- Nowy headline, description, CTA texts zgodne z obrazem
- `partner_badge` z domyślnymi placeholderami
- Zachowanie hero_image_url (admin wgra zdjęcie rodziny)

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `HeroSection.tsx` | Dodać rendering `partner_badge` w layout split (i centered) |
| `HeroSectionEditor.tsx` | Dodać fieldset „Kafelek partnera" z 3 polami |
| Migracja SQL | UPDATE template_data szablonu Pure Life Classic |

