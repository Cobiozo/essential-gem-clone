

# Unikalne kody śledzenia + upload okładki z dysku

## 1. Tabela `auto_webinar_invitation_clicks` (nowa)

Nowa tabela do logowania kliknięć w linki zaproszeniowe:

```sql
CREATE TABLE public.auto_webinar_invitation_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  ref_code TEXT NOT NULL,        -- np. "abc123" (EQID partnera)
  tracking_code TEXT NOT NULL,   -- unikalny kod śledzenia, np. "abc123-EQID"
  visitor_ip TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: INSERT dla anon (logowanie kliknięć bez auth), SELECT dla authenticated.

## 2. Logowanie kliknięć — `EventRegistrationBySlug.tsx`

Aktualnie `/e/:slug?ref=EQID` rozwiązuje slug i ref, potem redirectuje. Zmiany:
- Po rozwiązaniu `ref` → zapisz kliknięcie do `auto_webinar_invitation_clicks` (jeśli event_type = auto_webinar)
- Tracking code = `ref` value (EQID partnera) — każdy partner ma unikalny EQID

## 3. Panel admina — statystyki kliknięć

W sekcji "Link zaproszeniowy" w `AutoWebinarManagement.tsx`:
- Wyświetl łączną liczbę kliknięć
- Info: "Każde kliknięcie z parametrem `?ref=EQID` jest logowane"

## 4. Okładka webinaru — upload z dysku

W `AutoWebinarManagement.tsx`, w dialogu edycji wideo (linia ~1172-1182):
- Zamienić `<Input>` z URL na komponent `<MediaUpload>` z `allowedTypes={['image']}`
- Zachować podgląd obrazka
- `onMediaUploaded` → `setVideoForm(prev => ({ ...prev, cover_image_url: url }))`

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| Migracja SQL | Tabela `auto_webinar_invitation_clicks` |
| `src/pages/EventRegistrationBySlug.tsx` | Logowanie kliknięcia przy ref |
| `src/components/admin/AutoWebinarManagement.tsx` | MediaUpload dla okładki + statystyki kliknięć |

