

# Zakładka "Webinary Biznesowe 24h/live" w widoku Webinary

## Cel
Dodać do strony `/events/webinars` (WebinarsPage) zakładkę z Tabs, która pozwala przełączać się między:
- **Webinary** — obecna lista nadchodzących/zakończonych webinarów
- **Webinary Biznesowe 24h/live** — osadzony pokój auto-webinarowy (treść z `AutoWebinarRoom`, ale bez duplikowania `DashboardLayout`)

## Zmiany

### `src/pages/WebinarsPage.tsx`
- Dodać `Tabs` / `TabsList` / `TabsContent` z dwoma zakładkami
- Tab 1 ("Webinary"): obecna zawartość strony (lista wydarzeń)
- Tab 2 ("Webinary Biznesowe 24h/live"): nowy komponent `AutoWebinarEmbed` — pokój auto-webinaru bez otoczki `DashboardLayout`

### Nowy: `src/components/auto-webinar/AutoWebinarEmbed.tsx`
- Wyciągnięcie zawartości z `AutoWebinarRoom` (logika odtwarzania, countdown, sekcja własna) do komponentu **bez** `DashboardLayout`
- Komponent renderuje: header z logo/tytułem, odtwarzacz wideo lub countdown, sekcję własną
- `AutoWebinarRoom.tsx` importuje `AutoWebinarEmbed` i opakowuje go w `DashboardLayout` (zachowanie route `/auto-webinar`)

### `src/components/auto-webinar/AutoWebinarRoom.tsx`
- Refaktor: delegacja do `AutoWebinarEmbed` wewnątrz `DashboardLayout`

Zakładka "Webinary Biznesowe 24h/live" będzie widoczna tylko gdy system auto-webinarów jest włączony (`config.is_enabled`). Gdy wyłączony — zakładka się nie pojawia i strona działa jak dotychczas.

