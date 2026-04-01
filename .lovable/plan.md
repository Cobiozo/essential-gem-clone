

# Precyzyjne ustawianie czasu fikcyjnych komentarzy (minuta + sekunda)

## Obecny stan
Pole `appear_at_minute` (integer) określa minutę pojawienia się komentarza. W hooku `useAutoWebinarFakeChat` porównanie: `msg.appear_at_minute <= currentMinute`.

## Podejście
Dodać kolumnę `appear_at_second` (integer, domyślnie 0) do tabeli `auto_webinar_fake_messages`. Dzięki temu admin ustala precyzyjnie minutę i sekundę. W logice wyświetlania porównanie zmieni się na sekundy.

## Zmiany

### 1. Migracja bazy danych
Dodać kolumnę `appear_at_second` (integer, default 0) do `auto_webinar_fake_messages`.

### 2. Typ `AutoWebinarFakeMessage` (`src/types/autoWebinar.ts`)
Dodać pole `appear_at_second: number`.

### 3. Admin UI (`src/components/admin/AutoWebinarManagement.tsx`)
- Dodać pole "Sek." (input number 0-59) obok pola "Min." w formularzu dodawania/edycji
- W state `fakeMessageForm` dodać `appear_at_second: 0`
- W tabeli wyświetlać czas jako `min:sek` (np. `5:30`) zamiast samej minuty
- Przy zapisie/edycji wysyłać `appear_at_second`
- Domyślne wiadomości: dodać losowe sekundy dla naturalności

### 4. Hook `useAutoWebinarFakeChat` (`src/hooks/useAutoWebinarFakeChat.ts`)
Zmienić porównanie z:
```typescript
msg.appear_at_minute <= currentMinute
```
na:
```typescript
(msg.appear_at_minute * 60 + (msg.appear_at_second || 0)) <= startOffset
```

### 5. Typy Supabase (`src/integrations/supabase/types.ts`)
Dodać `appear_at_second` do Row/Insert/Update typów tabeli `auto_webinar_fake_messages`.

### Pliki do edycji
| Plik | Zmiana |
|------|--------|
| Migracja SQL | Dodanie kolumny `appear_at_second` |
| `src/types/autoWebinar.ts` | Dodanie pola do interfejsu |
| `src/integrations/supabase/types.ts` | Aktualizacja typów |
| `src/components/admin/AutoWebinarManagement.tsx` | Pole "Sek." w formularzu, wyświetlanie min:sek |
| `src/hooks/useAutoWebinarFakeChat.ts` | Porównanie na sekundy |

