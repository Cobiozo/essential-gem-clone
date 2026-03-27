

# Podział wiadomości czatu fikcyjnego na fazy: Powitalne / W trakcie / Na koniec

## Obecny stan
Wiadomości fikcyjne mają pole `appear_at_minute` i `sort_order`, ale brak kolumny określającej fazę. W admin UI jest jedna płaska lista. Domyślne wiadomości już mają logiczny podział w kodzie (komentarze "Początkowe", "Środkowe", "Końcowe"), ale nie jest on widoczny w UI ani w bazie.

## Plan

### 1. Migracja SQL
Dodać kolumnę `phase` do `auto_webinar_fake_messages`:
```sql
ALTER TABLE auto_webinar_fake_messages 
ADD COLUMN phase TEXT NOT NULL DEFAULT 'during' 
CHECK (phase IN ('welcome', 'during', 'ending'));
```
Aktualizacja istniejących wiadomości na podstawie `appear_at_minute`:
- 0–3 min → `welcome`
- 4–39 min → `during`  
- 40+ min → `ending`

### 2. Aktualizacja typów
- `AutoWebinarFakeMessage` — dodać `phase: 'welcome' | 'during' | 'ending'`
- `supabase/types.ts` — automatycznie po migracji

### 3. Admin UI (`AutoWebinarManagement.tsx`)
- W formularzu dodawania wiadomości: zamienić pole "Minuta" na dwa pola — **select fazy** (`Powitalne` / `W trakcie` / `Na koniec`) + **minuta**
- Wyświetlać wiadomości pogrupowane w 3 sekcjach z nagłówkami:
  - 🟢 **Powitalne** (welcome) — pojawiają się na początku
  - 🔵 **W trakcie** (during) — w środku spotkania
  - 🟠 **Na koniec** (ending) — pod koniec nagrania
- Każda sekcja ma swój licznik wiadomości
- "Załaduj domyślne" — ustawić odpowiednie `phase` w domyślnych wiadomościach

### 4. Hook `useAutoWebinarFakeChat.ts`
- Pobrać `phase` z bazy (już jest `select('*')`)
- Logika wyświetlania bez zmian — `appear_at_minute` nadal steruje momentem pojawienia się
- `phase` służy wyłącznie do organizacji w admin UI

### 5. Domyślne wiadomości
Zaktualizować `handleLoadDefaultMessages`:
- min 0–3: `phase: 'welcome'`
- min 5–35: `phase: 'during'`
- min 40+: `phase: 'ending'`

## Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| Migracja SQL | Kolumna `phase` + backfill |
| `src/types/autoWebinar.ts` | Pole `phase` w typie |
| `src/integrations/supabase/types.ts` | Automatycznie |
| `src/components/admin/AutoWebinarManagement.tsx` | Grupowane UI z 3 sekcjami, select fazy w formularzu |

