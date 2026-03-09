

# Auto-webinar: powiadomienia, odliczanie 5 min, wzbogacona playlista

## 1. Migracja bazy danych — `auto_webinar_videos`

Dodanie nowych kolumn:
- `host_name TEXT` — prowadzący
- `cover_image_url TEXT` — okładka/baner webinaru

Te dane będą wyświetlane w playliście admina, formularzu rejestracji i emailach.

## 2. Powiadomienia jak dla zwykłych webinarów

### Problem
CRON `process-pending-notifications` filtruje po `event_type = 'webinar'` — auto-webinary (`event_type = 'auto_webinar'`) są pomijane. Auto-webinary nie mają stałego `start_time`, więc standardowy flow 24h/1h/15min nie pasuje.

### Rozwiązanie
- W `send-webinar-confirmation` (edge function): po rejestracji na auto-webinar, oblicz najbliższy slot. Jeśli slot startuje za **≤15 minut**, natychmiast wyślij email z linkiem do dołączenia (zamiast standardowego potwierdzenia).
- Dla slotów >15 min: wyślij standardowe potwierdzenie rejestracji (bez przypomnienia CRON — auto-webinary mają ciągłe sloty).
- Na froncie (`EventGuestRegistration.tsx`): przekaż do edge function informację o `isAutoWebinar`, `nextSlotTime`, i `roomLink`.

### Zmiany w plikach
- **`supabase/functions/send-webinar-confirmation/index.ts`**: dodać logikę rozpoznania auto-webinara, obliczenie slotu, natychmiastowy email z linkiem jeśli ≤15 min.
- **`src/pages/EventGuestRegistration.tsx`**: przekazać `isAutoWebinar`, `nextSlotTime`, `eventSlug` do edge function.

## 3. Odliczanie 5 minut przed rozpoczęciem

### Problem
Odliczanie pokazuje się dopiero po zakończeniu wideo lub poza godzinami aktywnymi. Powinno pojawić się 5 minut przed każdym slotem.

### Rozwiązanie
W `useAutoWebinarSync`:
- Gdy `secondsIntoSlot` jest ujemne (tzn. jesteśmy w oknie 5 min przed slotem ale po poprzednim), wyświetl countdown.
- Zmiana logiki: pokój otwiera się 5 min wcześniej — tzn. `startOffset` = -1 gdy slot nie rozpoczął się, ale `secondsToNext` = czas do startu slotu.

W `AutoWebinarEmbed`:
- Gdy `secondsToNext > 0` i `secondsToNext <= 300` (5 min), pokaż countdown z etykietą.

## 4. Wzbogacona playlista wideo

### Admin (`AutoWebinarManagement.tsx`)
- Tabela playlisty: dodać kolumnę miniaturki (obraz z `thumbnail_url`), prowadzącego (`host_name`)
- Dialog dodawania/edycji: dodać pole "Prowadzący" i "Okładka webinaru" (MediaUpload/URL)
- Formularz wideo: dodać `host_name`, `cover_image_url`

### Formularz rejestracji (`EventGuestRegistration.tsx`)
- Pobrać aktywne wideo z playlisty auto-webinara (pierwsze wideo lub losowe)
- Wyświetlić: okładkę/miniaturkę, tytuł, opis, prowadzącego — tak jak dla zwykłych webinarów

### Email (`send-webinar-confirmation`)
- Dodać do emaila: okładkę, opis wideo, prowadzącego

## 5. Typ TypeScript

Aktualizacja `src/types/autoWebinar.ts`:
```typescript
export interface AutoWebinarVideo {
  // ...existing...
  host_name: string | null;
  cover_image_url: string | null;
}
```

## Pliki do zmiany

| Plik | Zakres zmian |
|---|---|
| **Migracja SQL** | Dodanie `host_name`, `cover_image_url` do `auto_webinar_videos` |
| `src/types/autoWebinar.ts` | Nowe pola w interfejsie |
| `src/components/admin/AutoWebinarManagement.tsx` | Formularz wideo + tabela z miniaturką i prowadzącym |
| `src/hooks/useAutoWebinar.ts` | Logika countdown 5 min przed slotem |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Wyświetlanie countdown 5 min przed |
| `src/pages/EventGuestRegistration.tsx` | Dane wideo w formularzu + przekazanie danych do edge function |
| `supabase/functions/send-webinar-confirmation/index.ts` | Natychmiastowy email ≤15 min, dane wideo w treści |

