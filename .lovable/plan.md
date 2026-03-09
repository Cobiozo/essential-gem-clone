

# Rozszerzenie Auto-Webinarów — 5 zmian

## 1. Usunięcie tytułu filmu z pokoju wideo
**Plik:** `AutoWebinarRoom.tsx`
- Usunięcie overlay z `currentVideo.title` (linie 127-131)
- Usunięcie analogicznego elementu z podglądu w `AutoWebinarManagement.tsx` (linie 725-729 — badge "Tytuł filmu")

## 2. Sekcja własna pod harmonogramem — admin definiuje tytuł i treść
**Migracja SQL:** Dodanie 2 kolumn do `auto_webinar_config`:
- `room_custom_section_title TEXT` — tytuł sekcji
- `room_custom_section_content TEXT` — treść sekcji

**Plik:** `autoWebinar.ts` — nowe pola w interfejsie
**Plik:** `AutoWebinarManagement.tsx` — nowa sekcja formularza w "Wygląd pokoju" z polami tytuł + textarea
**Plik:** `AutoWebinarRoom.tsx` — wyświetlanie sekcji pod harmonogramem (warunkowo, gdy oba pola wypełnione)

## 3. Logo z biblioteki grafik lub z komputera
**Plik:** `AutoWebinarManagement.tsx`
- Zamiana pola Input URL na dwa przyciski: "Wybierz z biblioteki" i "Prześlij z komputera"
- "Wybierz z biblioteki" → otwiera `AdminMediaLibrary` w `mode='picker'` + `allowedTypes={['image']}`
- "Prześlij z komputera" → input file + upload do `cms-images` bucket + wstawienie publicUrl
- Podgląd aktualnego logo z możliwością usunięcia

## 4. Strona zaproszenia na auto-webinar
Istniejąca strona `EventGuestRegistration` już obsługuje zaproszenia. Trzeba ją dostosować do specyfiki auto-webinaru:

**Plik:** `EventGuestRegistration.tsx`
- Dodanie sprawdzenia `event_type` (fetch dodatkowej kolumny `event_type`)
- Dla `auto_webinar`: zamiast wyświetlania konkretnej daty/godziny → "Webinary codziennie od X:00 do Y:00"
- Zamiast sprawdzania `isPast`/`isAfterCutoff` (bo auto-webinar nie ma końca) → formularz zawsze dostępny
- Badge "Webinar" (nie "Auto-Webinar")

Dotychczasowy flow `?ref=EQID` → `invited_by` → `guest_event_registrations` → `send-webinar-confirmation` + dodanie do kontaktów prywatnych partnera — już działa poprawnie.

## 5. Slug z tytułem pokoju
**Plik:** `AutoWebinarManagement.tsx` → `handleCreateLinkedEvent`
- Generowanie slug na podstawie `room_title` lub `invitation_title` zamiast `auto-webinar-{timestamp}`
- Np. "Twoja szansa biznesowa" → `twoja-szansa-biznesowa-{random4}`
- Przy zmianie `invitation_title` w `handleSaveInvitation` → aktualizacja `events.slug` (slugify tytułu)
- Link zaproszeniowy w sekcji "Wydarzenie i zaproszenia" wyświetla czytelny URL

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | 2 kolumny: `room_custom_section_title`, `room_custom_section_content` |
| `src/types/autoWebinar.ts` | 2 nowe pola |
| `src/components/admin/AutoWebinarManagement.tsx` | Logo picker, sekcja własna, slug z tytułem, usunięcie badge tytułu z podglądu |
| `src/components/auto-webinar/AutoWebinarRoom.tsx` | Usunięcie tytułu filmu, dodanie sekcji własnej |
| `src/pages/EventGuestRegistration.tsx` | Obsługa `auto_webinar` event type |

