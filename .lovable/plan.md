

# Strona demonstracyjna ze wszystkimi elementami Layout Editora

## Cel
Utworzenie w pełni funkcjonalnej podstrony "Katalog Elementów" zawierającej wszystkie dostępne typy elementów z Layout Editora. Strona zostanie dodana do systemu stron (tabela `pages`) i będzie edytowalna w Layout Editorze z poziomu panelu admina (zakładka "Strony").

## Struktura strony (wzorowana na screenshotach)

Strona będzie zorganizowana w sekcje (rows), każda prezentująca grupę elementów:

### Sekcja 1: Hero / Baner
- **Obrazek** (image) — miejsce na baner graficzny (placeholder)
- **Nagłówek** (heading) — "ZMIENIAMY ZDROWIE I ŻYCIE LUDZI NA LEPSZE"
- **Tekst** (text) — podpis "Eqology Independent Business Partner | Pure Life"

### Sekcja 2: Treść tekstowa
- **Nagłówek** (heading) — "Witaj w swojej podróży po zdrowie!"
- **Tekst** (text) — 3 akapity treści (jak na screenshotach)

### Sekcja 3: Wideo + opis
- **Nagłówek** (heading) — "Dlaczego omega-3?"
- **Wideo** (video) — placeholder na wstawienie wideo
- **Tekst** (text) — opis pod wideo
- **Wideo** (video) — drugie miejsce na wideo (Karolina Kowalczyk)

### Sekcja 4: Zwijane sekcje (Accordion / Collapsible)
- **Collapsible Section** — "Zamówienie" (zwijana sekcja z treścią)
- **Collapsible Section** — "Bądź z nami w kontakcie!" (zwijana sekcja)

### Sekcja 5: Elementy interaktywne
- **Przycisk** (button) — CTA "Zamów teraz"
- **Przycisk kopiowania** (copy-to-clipboard) — "Kopiuj link"
- **Pobieranie pliku** (file-download) — placeholder
- **Ikony społecznościowe** (social-icons) — FB, Instagram, LinkedIn

### Sekcja 6: Elementy wizualne
- **Galeria** (gallery) — placeholder na 4 obrazki
- **Karuzela** (carousel) — placeholder
- **Ikona z tekstem** (info-text)
- **Separator** (divider)
- **Odstęp** (spacer)

### Sekcja 7: Elementy zaawansowane
- **Licznik** (counter) — np. "500+ zadowolonych klientów"
- **Pasek postępu** (progress-bar)
- **Ocena** (rating) — gwiazdki
- **Referencja** (testimonial) — cytat
- **Alert** (alert) — informacja

### Sekcja 8: Stopka
- **Obrazek** (image) — logo Pure Life
- **Tekst** (text) — "Pozdrawiamy, zespół Pure Life"

## Implementacja techniczna

### Krok 1: Skrypt SQL seed
Utworzenie pliku `scripts/seed-demo-elements-page.sql` który:
1. Wstawi nowy rekord do tabeli `pages` z tytułem "Katalog Elementów", slugiem `katalog-elementow`
2. Wstawi sekcje (`cms_sections`) z `section_type = 'row'` i odpowiednimi tytułami
3. Wstawi elementy (`cms_items`) z odpowiednimi typami (`heading`, `text`, `video`, `button`, `image`, `divider`, `spacer`, `collapsible-section`, `gallery`, `carousel`, `counter`, `progress-bar`, `rating`, `testimonial`, `alert`, `social-icons`, `copy-to-clipboard`, `file-download`, `info_text`, `icon`)
4. Treści tekstowe będą zgodne ze screenshotami (tam gdzie jest tekst — prawdziwa treść, tam gdzie wideo — placeholder URL)

### Krok 2: Wykonanie seeda
Uruchomienie SQL w bazie, co natychmiast utworzy stronę widoczną w panelu admina.

### Zakres zmian
- 1 nowy plik: `scripts/seed-demo-elements-page.sql`
- 0 zmian w kodzie aplikacji — strona korzysta z istniejącego systemu CMS (pages + cms_sections + cms_items) i Layout Editora

### Uwaga
Po utworzeniu strony będzie można ją edytować w Layout Editorze (przycisk "Otwórz Layout Editor" w zakładce CMS po kliknięciu na stronę). Wszystkie elementy będą w pełni funkcjonalne i edytowalne.

