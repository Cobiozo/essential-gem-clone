

# Plan: Poprawki czasu trwania webinaru i unieważnianie linku

## Problem 1: "Dziękujemy" pojawia się za wcześnie

**Przyczyna** — dla zalogowanych użytkowników (linia 323-347) brakuje stanów `isVideoEnded` / `isRoomClosed`. Gdy `sinceSlot >= duration`, hook ustawia `currentVideo=null` bez żadnej flagi — co powoduje wyświetlenie nieprawidłowego ekranu.

Dodatkowo dla gości — jeśli `bypassLateBlock=true` (rejoin), check `isLinkExpired` na linii 210 nadal może wyrzucić gościa po `linkExpirySec` minut (nawet gdy wideo trwa). Warunek `sinceSlot >= duration` w linii 210 powinien chronić, ale trzeba sprawdzić czy `duration` jest > 0.

**Rozwiązanie** w `useAutoWebinarSync.ts`:
- **Zalogowani użytkownicy (linie 323-347)**: Dodać stany `isVideoEnded` i `isRoomClosed` analogicznie do ścieżki gościa:
  - `sinceSlot >= duration + 60` → `isRoomClosed`
  - `sinceSlot >= duration && < duration + 60` → `isVideoEnded` (podziękowanie)
  - `sinceSlot < duration` → odtwarzanie (bez zmian)
- **Goście (linie 208-219)**: Przenieść check `isLinkExpired` na sam koniec, PO sekcji "Playing". Dzięki temu wideo trwające dłużej niż `linkExpirySec` nigdy nie zostanie przerwane. Link expired zadziała tylko gdy gość wejdzie po zakończeniu wideo.

## Problem 2: Unieważnienie linku po zakończeniu

**Obecnie**: Po `isRoomClosed` wyświetla się "Spotkanie już się odbyło", ale link nadal technicznie istnieje. Gość mógłby w teorii odświeżyć i zobaczyć ekran ponownie.

**Rozwiązanie** w `AutoWebinarEmbed.tsx`:
- Gdy `isRoomClosed=true`, usunąć klucz sesji z localStorage (`aw_session_*`) i oznaczyć rejestrację jako "completed" w DB (update `auto_webinar_views` z `left_at = now()`).
- Dodać efekt: gdy `isRoomClosed` → `localStorage.removeItem(sessionKey)` — to uniemożliwi bypass po zamknięciu.

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `useAutoWebinarSync.ts` | Dodać `isVideoEnded`/`isRoomClosed` dla zalogowanych; przenieść `isLinkExpired` po sekcji Playing dla gości |
| `AutoWebinarEmbed.tsx` | Usunąć sesję z localStorage gdy `isRoomClosed`; update DB |

