

# Separacja wideo i konfiguracji BO / HC w Auto-Webinar

## Problem
Obecnie filmy (`auto_webinar_videos`) nie mają powiązania z konkretną konfiguracją BO lub HC — są ładowane globalnie. Hooki frontowe (`useAutoWebinarConfig`, `useAutoWebinarVideos`) pobierają dane bez filtra `category`. W efekcie BO i HC współdzielą te same wideo i konfigurację, zamiast działać niezależnie.

## Rozwiązanie

### 1. Migracja bazy danych
Dodać kolumnę `config_id` do tabeli `auto_webinar_videos`:
```sql
ALTER TABLE public.auto_webinar_videos
ADD COLUMN config_id uuid REFERENCES public.auto_webinar_config(id) ON DELETE SET NULL;
```
Następnie przypisać istniejące wideo do konfiguracji BO (aby obecne dane nie zostały utracone):
```sql
UPDATE public.auto_webinar_videos
SET config_id = (SELECT id FROM public.auto_webinar_config WHERE category = 'business_opportunity' LIMIT 1)
WHERE config_id IS NULL;
```

### 2. Typ `AutoWebinarVideo` — dodać `config_id`
Plik: `src/types/autoWebinar.ts`
- Dodać `config_id: string | null` do interfejsu

### 3. Hooki — dodać filtr `category`
Plik: `src/hooks/useAutoWebinar.ts`
- `useAutoWebinarConfig(category)` — dodać parametr `category: 'business_opportunity' | 'health_conversation'`, filtrować `.eq('category', category)`
- `useAutoWebinarVideos(configId)` — dodać parametr `configId: string | null`, filtrować `.eq('config_id', configId)` gdy podany

### 4. Admin panel — filtrować wideo po `config_id`
Plik: `src/components/admin/AutoWebinarManagement.tsx`
- W `loadData`: filtrować wideo `.eq('config_id', cfg.id)` zamiast ładować wszystkie
- W `handleSaveVideo` (insert): dodać `config_id: config.id` do insertu nowego wideo

### 5. `AutoWebinarEmbed` — przyjąć prop `category`
Plik: `src/components/auto-webinar/AutoWebinarEmbed.tsx`
- Dodać prop `category` (domyślnie `'business_opportunity'`)
- Przekazać `category` do `useAutoWebinarConfig(category)`
- Przekazać `config?.id` do `useAutoWebinarVideos(config?.id)`

### 6. `AutoWebinarRoom` — przekazać `category` do obu zakładek
Plik: `src/components/auto-webinar/AutoWebinarRoom.tsx`
- Zakładka BO: `<AutoWebinarEmbed category="business_opportunity" />`
- Zakładka HC: `<AutoWebinarEmbed category="health_conversation" />` (zamiast placeholder)

### 7. Strona publiczna i inne konsumenty — dopasować
- `AutoWebinarPublicPage` — ustalić kategorię na podstawie slugu (query param `?cat=` lub lookup z `events` → `auto_webinar_config.event_id`)
- `AutoWebinarEventView`, `WebinarsPage` — przekazać odpowiednią kategorię

## Pliki do modyfikacji
| Plik | Zmiana |
|---|---|
| Nowa migracja SQL | `config_id` na `auto_webinar_videos` + update istniejących |
| `src/types/autoWebinar.ts` | Dodać `config_id` |
| `src/hooks/useAutoWebinar.ts` | Parametry `category` i `configId` |
| `src/components/admin/AutoWebinarManagement.tsx` | Filtr wideo po `config_id`, insert z `config_id` |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Prop `category` |
| `src/components/auto-webinar/AutoWebinarRoom.tsx` | Przekazanie `category` do obu zakładek |
| `src/pages/AutoWebinarPublicPage.tsx` | Ustalenie kategorii z kontekstu eventu |

