

# Dodanie drugiego logo do pokoju webinarowego

## Zakres zmian

Dodanie pola `room_logo_url_2` obok istniejącego `room_logo_url`, aby admin mógł ustawić dwa logo wyświetlane w nagłówku pokoju webinarowego.

## Zmiany

### 1. Migracja bazy danych
Dodać kolumnę `room_logo_url_2` do `auto_webinar_config`:
```sql
ALTER TABLE public.auto_webinar_config
ADD COLUMN room_logo_url_2 text;
```

### 2. Typy
- `src/types/autoWebinar.ts` — dodać `room_logo_url_2: string | null`
- `src/integrations/supabase/types.ts` — zaktualizuje się automatycznie po migracji

### 3. Admin panel (`AutoWebinarManagement.tsx`)
- Dodać `room_logo_url_2` do `roomForm` (domyślnie `''`)
- Dodać drugie pole uploadu logo pod istniejącym (identyczna mechanika: wybór z biblioteki / upload z komputera / usuwanie)
- Zapisywać `room_logo_url_2` przy save
- Wyświetlać oba loga w podglądzie pokoju

### 4. Pokój publiczny (`AutoWebinarEmbed.tsx`)
- W nagłówku pokoju: renderować oba loga obok siebie (jeśli ustawione)
- W ekranach oczekiwania/zakończenia: wyświetlać oba loga

### Pliki do edycji
| Plik | Zmiana |
|---|---|
| Nowa migracja SQL | `room_logo_url_2` |
| `src/types/autoWebinar.ts` | Dodać pole |
| `src/components/admin/AutoWebinarManagement.tsx` | Drugie pole logo + podgląd |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Renderowanie dwóch logo |

