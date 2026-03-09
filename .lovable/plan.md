

# Rozszerzenie konfiguracji Auto-Webinarów

## Zakres

Dodanie nowych sekcji w panelu admina do pełnej personalizacji auto-webinaru: treść zaproszenia, wygląd pokoju, podgląd obu widoków.

## 1. Nowe kolumny w `auto_webinar_config`

Migracja SQL dodająca:

| Kolumna | Typ | Default | Opis |
|---------|-----|---------|------|
| `room_title` | text | 'Webinar NA ŻYWO' | Tytuł wyświetlany w pokoju |
| `room_subtitle` | text | null | Podtytuł/opis pod tytułem |
| `room_background_color` | text | '#000000' | Kolor tła pokoju wideo |
| `room_show_live_badge` | boolean | true | Czy pokazywać badge "NA ŻYWO" |
| `room_show_schedule_info` | boolean | true | Czy pokazywać sekcję harmonogramu |
| `room_logo_url` | text | null | Logo wyświetlane w pokoju |
| `invitation_title` | text | null | Tytuł wydarzenia (nadpisuje domyślny) |
| `invitation_description` | text | null | Opis zaproszenia |
| `invitation_image_url` | text | null | Obraz/baner zaproszenia |
| `countdown_label` | text | 'Następny webinar za' | Etykieta odliczania |

## 2. Aktualizacja typu TypeScript

Rozszerzenie `AutoWebinarConfig` w `src/types/autoWebinar.ts` o nowe pola.

## 3. Nowe sekcje w `AutoWebinarManagement.tsx`

### Sekcja "Treść zaproszenia"
- Pola: tytuł zaproszenia, opis, URL obrazu/banera
- Przycisk "Zapisz" aktualizujący zarówno `auto_webinar_config` jak i powiązane `events.title` / `events.description`
- **Podgląd zaproszenia** — karta z podglądem jak wygląda zaproszenie (tytuł, opis, obraz, godziny)

### Sekcja "Wygląd pokoju"
- Pola: tytuł pokoju, podtytuł, kolor tła, URL logo, etykieta odliczania
- Switche: badge "NA ŻYWO", sekcja harmonogramu
- **Podgląd pokoju** — miniaturowa symulacja pokoju z zastosowanymi ustawieniami (aspect-video z tytułem, badge, overlay)

## 4. Aktualizacja `AutoWebinarRoom.tsx`

Zamiast hardkodowanych tekstów, czytanie z config:
- `config.room_title` zamiast "Auto-Webinar"
- `config.room_subtitle` zamiast opisu godzin
- `config.room_background_color` jako tło video
- `config.room_show_live_badge` warunkowe renderowanie badge
- `config.room_show_schedule_info` warunkowe renderowanie karty harmonogramu
- `config.room_logo_url` wyświetlane w pokoju
- `config.countdown_label` przekazywane do `AutoWebinarCountdown`

## 5. Synchronizacja z wydarzeniem

Gdy admin zmienia `invitation_title` lub `invitation_description`, automatycznie aktualizować `events.title` i `events.description` powiązanego wydarzenia — aby zaproszenia widziane przez partnerów odzwierciedlały zmiany.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowe kolumny w `auto_webinar_config` |
| `src/types/autoWebinar.ts` | Nowe pola w interfejsie |
| `src/components/admin/AutoWebinarManagement.tsx` | 2 nowe sekcje Card + podglądy |
| `src/components/auto-webinar/AutoWebinarRoom.tsx` | Użycie config zamiast hardkodowanych tekstów |
| `src/components/auto-webinar/AutoWebinarCountdown.tsx` | Bez zmian (już przyjmuje `label` prop) |

