

# Fix: Wyświetlanie niewłaściwego prowadzącego na stronie rejestracji gościa

## Problem

W pliku `src/pages/EventGuestRegistration.tsx` (linia 313-319), zapytanie o dane wideo **nie filtruje po `config_id`**:

```typescript
const { data: videoData } = await supabase
  .from('auto_webinar_videos')
  .select('title, description, host_name, cover_image_url, thumbnail_url')
  .eq('is_active', true)                    // ← brak filtra config_id!
  .order('sort_order', { ascending: true })
  .limit(1)
  .maybeSingle();
```

W bazie są dwa filmy:
- sort_order=0 → HC → host_name = "dawid kowalczyk"
- sort_order=1 → BO → host_name = "Mateusz Sumera i Dawid Kowalczyk"

Zapytanie bez filtra zawsze zwraca pierwszy film globalnie (HC), więc strona rejestracji BO pokazuje "dawid kowalczyk" zamiast "Mateusz Sumera i Dawid Kowalczyk".

## Rozwiązanie

Dodać filtr `.eq('config_id', data.id)` do zapytania o wideo, używając `config_id` z wcześniej pobranej konfiguracji auto-webinaru. Dzięki temu każda kategoria pobierze swój właściwy film z poprawnym prowadzącym.

### Zmiana w `src/pages/EventGuestRegistration.tsx`

Przenieść zapytanie o wideo **wewnątrz bloku `if (data)`**, aby mieć dostęp do `data.id` (config_id):

```typescript
if (data) {
  setAutoWebinarConfig(data as AutoWebinarSlotConfig);
  setAutoWebinarCategory((data as any).category || null);

  // Fetch first active video FOR THIS CONFIG
  const { data: videoData } = await supabase
    .from('auto_webinar_videos')
    .select('title, description, host_name, cover_image_url, thumbnail_url')
    .eq('config_id', data.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (videoData) setAutoWebinarVideo(videoData as AutoWebinarVideoData);
}
```

Jeden plik, jedna zmiana — dodanie filtra `config_id`.

