

# Plan: 4 poprawki Auto-Webinar

## 1. Ciemne tło — logo Eqology niewidoczne

**Problem**: Tło pokoju (`room_background_color`) jest czarne (#000000), logo Eqology ma ciemne elementy i jest niewidoczne.

**Rozwiązanie**: Na ekranach poczekalni, countdown i informacyjnych (nie na samym wideo) zmienić tło z czystego czarnego na ciemny gradient/jaśniejszy odcień. Dodać `bg-slate-900` lub `bg-[#1a1f2e]` na elementach poczekalni zamiast czystego `bgColor`. Alternatywnie, dodać jasne podświetlenie/tło za logotypami (np. `bg-white/10 rounded-lg p-2` wokół kontenerów z logo).

**Plik**: `src/components/auto-webinar/AutoWebinarEmbed.tsx` — wszystkie sekcje z `style={{ backgroundColor: bgColor }}` w ekranach informacyjnych dostaną jaśniejsze tło `#1a1f2e` zamiast czystego czarnego.

## 2. Fikcyjni uczestnicy — skoki zbyt duże + brak opisu

**Problem**: Licznik losuje wartość z pełnego zakresu min-max (np. 45-120), co daje skoki typu 61→122→45. Brak etykiety.

**Rozwiązanie** w `AutoWebinarParticipantCount.tsx`:
- Zmienić algorytm: zamiast pełnego losowania, robić **małe skoki** od aktualnej wartości (±1 do ±5 osób na tick)
- Startowa wartość losowa z zakresu, ale potem delta ±1..5 z clamp do min/max
- Dodać tekst "oczekujących na rozpoczęcie spotkania:" przed licznikiem (jako prop warunkowy — wyświetlać tylko w fazie countdown, nie podczas odtwarzania)
- Dodać prop `showLabel?: boolean` sterowany z `AutoWebinarEmbed`

**Plik**: `src/components/auto-webinar/AutoWebinarParticipantCount.tsx`

## 3. Wyrzucanie po 5 minutach (KRYTYCZNY BUG)

**Problem**: W `useAutoWebinarSync.ts` linia 205 — check `sinceSlot > linkExpirySec` (domyślnie 600s = 10 min) wykonuje się PRZED checkiem odtwarzania (linia 253). Jeśli wideo trwa dłużej niż `linkExpirySec`, po tym czasie system traktuje sesję jako "link wygasł" i wyrzuca użytkownika.

Dodatkowo `lateJoinMaxSec` domyślnie 300s (5 min) — jeśli `bypassLateBlock` nie jest true, to po 5 min hook zinterpretuje to jako spóźnienie.

**Rozwiązanie** w `useAutoWebinarSync.ts`:
- **Zmienić kolejność checków**: "link expired" powinien sprawdzać się TYLKO gdy `sinceSlot > linkExpirySec` **ORAZ** `sinceSlot` nie mieści się w czasie trwania wideo (tzn. `sinceSlot >= duration` lub `duration <= 0`)
- Konkretnie: przenieść check "link expired" PO sprawdzeniu czy wideo jeszcze trwa, lub dodać warunek `&& (duration <= 0 || sinceSlot >= duration + roomCloseAfterEndSec)` do warunku link expired
- Prościej: zmienić warunek na linii 205 na: `if (sinceSlot > linkExpirySec && (duration <= 0 || sinceSlot >= duration))` — ale room closed/video ended checki to już łapią. Więc wystarczy dodać: `if (sinceSlot > linkExpirySec && sinceSlot < duration)` → to oznacza "wideo trwa, ale link wygasł" — w tym przypadku NIE wyrzucać, tylko kontynuować do sekcji Playing.
- **Najczystsze rozwiązanie**: przenieść check "link expired" po checku "playing". Jeśli wideo jeszcze trwa (`sinceSlot < duration`), zawsze odtwarzaj. Link expired ma sens tylko gdy wideo się skończyło i minął czas zamknięcia.

**Plik**: `src/hooks/useAutoWebinarSync.ts`

## 4. Odświeżenie strony nie wraca do odtwarzania

**Problem**: `hasExistingSession` jest inicjalizowane z `localStorage` synchronicznie, ale klucz sesji (`aw_session_{email}_{date}`) musi być wcześniej zapisany. Trzeba sprawdzić czy i gdzie ten klucz jest ustawiany.

**Rozwiązanie**:
- Upewnić się, że klucz `aw_session_{email}_{date}` jest zapisywany do localStorage w momencie rozpoczęcia odtwarzania (gdy wideo startuje)
- Sprawdzić w `AutoWebinarEmbed` czy zapis do localStorage istnieje — jeśli nie, dodać go w efekcie śledzącym `hasStarted`
- W `useAutoWebinarSync`: upewnić się że `bypassLateBlock=true` powoduje pominięcie ZARÓWNO `isTooLate` JAK I `isLinkExpired` gdy wideo jeszcze trwa

**Plik**: `src/components/auto-webinar/AutoWebinarEmbed.tsx` — dodać zapis do localStorage gdy wideo się rozpoczyna.

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `AutoWebinarParticipantCount.tsx` | Małe skoki (±1-5), prop `showLabel` |
| `AutoWebinarEmbed.tsx` | Jaśniejsze tło ekranów info, `showLabel` na countdown, zapis sesji do localStorage |
| `useAutoWebinarSync.ts` | Przenieść "link expired" po "playing", dodać bypass linkExpired przy bypassLateBlock |

