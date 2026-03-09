

# Plan zmian Auto-Webinarów — 4 wymagania

## 1. Widoczność ról w konfiguracji auto-webinarów

Dodać do `auto_webinar_config` flagi widoczności (`visible_to_partners`, `visible_to_specjalista`, `visible_to_clients`) — kontrolujące, które role widzą zakładkę "Webinary Biznesowe 24h/live" na stronie WebinarsPage.

**Migracja SQL:**
```sql
ALTER TABLE auto_webinar_config 
  ADD COLUMN visible_to_partners boolean DEFAULT true,
  ADD COLUMN visible_to_specjalista boolean DEFAULT true,
  ADD COLUMN visible_to_clients boolean DEFAULT true,
  ADD COLUMN show_in_calendar boolean DEFAULT false;
```

**Admin UI** (`AutoWebinarManagement.tsx`): Dodać sekcję z checkboxami widoczności ról + switch "Widoczne w kalendarzu".

**WebinarsPage.tsx**: Zamiast `config?.is_enabled` sprawdzać `config?.is_enabled && userHasAccess(config, userRole)`.

**Typ** (`autoWebinar.ts`): Dodać nowe pola.

## 2. Widoczność w kalendarzu — nowe pole `show_in_calendar`

Dodać `show_in_calendar` do `auto_webinar_config`. Wydarzenie powiązane (`events`) będzie tworzone z `is_published: false` domyślnie. Admin przełącza `show_in_calendar` → aktualizuje `events.is_published` na powiązanym wydarzeniu. Dzięki temu `usePublicEvents` (filtruje `is_published = true`) nie pokaże go w kalendarzu dopóki admin tego nie włączy.

**Logika**: `handleCreateLinkedEvent` → `is_published: false`. Nowy switch "Widoczne w kalendarzu" → toggle `show_in_calendar` + update `events.is_published`.

## 3. Interwał odtwarzania (co 30min / co 1h)

Pole `interval_minutes` już istnieje w DB (default 60). Trzeba:

**Admin UI**: Dodać select z opcjami 30/60 minut.

**Sync logic** (`useAutoWebinar.ts`): Przepisać logikę synchronizacji — zamiast liczyć per godzina, liczyć interwały od `start_hour`:
- Oblicz `secondsSinceStart = (currentHour - start_hour) * 3600 + secondsPastHour`
- `intervalSeconds = interval_minutes * 60`
- `currentSlotIndex = floor(secondsSinceStart / intervalSeconds)`
- `secondsIntoSlot = secondsSinceStart % intervalSeconds`
- `videoIndex = currentSlotIndex % activeVideos.length`
- Jeśli `secondsIntoSlot < video.duration_seconds` → odtwarzaj z offsetem
- Inaczej → countdown do następnego slotu

**Wiadomość powitalna 30s**: Dodać stan `showWelcome` w `AutoWebinarEmbed`. Gdy użytkownik dołącza i `welcome_message` istnieje, pokaż overlay z wiadomością przez 30 sekund, potem auto-ukryj i rozpocznij odtwarzanie.

## 4. Slug i link — tytuł wydarzenia zamiast "auto-webinar"

**`handleCreateLinkedEvent`**: 
- Slug generowany z `invitation_title || room_title` (bez fallbacku "auto-webinar")
- Domyślny tytuł wydarzenia = wartość z pola `invitation_title` (wymagane przed tworzeniem)
- Usunąć hardcoded "Webinar Automatyczny"

**`handleSaveInvitation`**: Przy zmianie tytułu → slug = `slugify(newTitle) + '-' + randomSuffix`. Sync z events.

**UI**: Usunąć placeholder "Webinar Automatyczny" z podglądu. Wymagać wypełnienia tytułu zaproszenia przed tworzeniem wydarzenia.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | 4 nowe kolumny w `auto_webinar_config` |
| `src/types/autoWebinar.ts` | Dodać nowe pola do interfejsu |
| `src/components/admin/AutoWebinarManagement.tsx` | Sekcja widoczności ról, switch kalendarza, select interwału, usunięcie "auto-webinar" z slugów |
| `src/hooks/useAutoWebinar.ts` | Nowa logika sync oparta na `interval_minutes` |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Overlay wiadomości powitalnej 30s |
| `src/pages/WebinarsPage.tsx` | Filtrowanie zakładki po roli użytkownika |

