

# Ukrycie informacji o auto-webinarze + zarządzanie wydarzeniami

## Wymagania

1. **Tylko admin wie, że to "auto-webinar"** — dla użytkowników wyświetla się jako zwykły "Webinar"
2. **Przyciski włącz/wyłącz/usuń** w sekcji "Wydarzenie i zaproszenia" w panelu admina
3. **System wyłączony = zero widoczności** auto-webinarowych wydarzeń

## Zmiany

### 1. Ukrycie typu `auto_webinar` przed użytkownikami

W komponentach wyświetlających typ wydarzenia, `auto_webinar` powinien być traktowany identycznie jak `webinar`:

| Plik | Zmiana |
|------|--------|
| `CalendarWidget.tsx` (getEventColor) | `case 'auto_webinar':` → zwraca ten sam kolor co `webinar` |
| `CalendarWidget.tsx` (legendItems) | Bez zmian — `auto_webinar` nie ma osobnej pozycji w legendzie |
| `MyMeetingsWidget.tsx` (getEventIcon, getEventTypeName) | `case 'auto_webinar':` → ten sam icon i label co `webinar` |
| `EventDetailsDialog.tsx` (getEventTypeBadge) | `case 'auto_webinar':` → badge "Webinar" (nie "Auto-Webinar") |

### 2. Przyciski zarządzania w sekcji "Wydarzenie i zaproszenia"

W `AutoWebinarManagement.tsx`, w bloku `linkedEvent`, dodać:
- **Switch włącz/wyłącz** — toggle `events.is_active` dla powiązanego wydarzenia (niezależnie od głównego systemu)
- **Przycisk Usuń** — usunięcie powiązanego wydarzenia (`events.is_active = false` + `auto_webinar_config.event_id = null`) z potwierdzeniem AlertDialog

### 3. System wyłączony = brak widoczności

To już częściowo działa (wcześniejsza poprawka synchronizuje `events.is_active` z `is_enabled`). Dodatkowo:

- W `useEvents.ts` → `fetchEvents`: filtrować `auto_webinar` eventy sprawdzając `is_active` (już jest `.eq('is_active', true)`) — OK
- Upewnić się, że przy wyłączeniu systemu, `is_active` powiązanych eventów jest ustawiane na `false` — już zaimplementowane

Jedyny brakujący element: jeśli admin wyłączy system, a powiązane wydarzenie jest nadal `is_active = true` z powodu legacy danych. Rozwiązanie: przy ładowaniu panelu admina (`loadData`), sprawdzić spójność i naprawić automatycznie.

### Pliki do edycji

1. **`src/components/admin/AutoWebinarManagement.tsx`** — dodać przyciski toggle/delete dla linked event
2. **`src/components/dashboard/widgets/CalendarWidget.tsx`** — dodać `auto_webinar` do case `webinar` w getEventColor
3. **`src/components/dashboard/widgets/MyMeetingsWidget.tsx`** — dodać `auto_webinar` do case `webinar` w getEventIcon i getEventTypeName
4. **`src/components/events/EventDetailsDialog.tsx`** — dodać `auto_webinar` do case `webinar` w getEventTypeBadge

