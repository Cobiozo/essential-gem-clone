

# Naprawa wyświetlania stanu po zakończeniu wideo auto-webinaru

## Problem
Po zakończeniu odtwarzania wideo (webinar2 = 215s), zamiast ekranu "Spotkanie już się odbyło" lub "Dziękujemy za uczestnictwo!", wyświetla się domyślny ekran "Oczekiwanie na transmisję..." — stan domyślny, który pojawia się gdy żaden warunek renderowania nie został spełniony.

## Diagnoza
Webinar **był odtworzony** (rekord w `auto_webinar_views` potwierdza 239s oglądania od 01:00:30). Problem polega na tym, że po zakończeniu wideo komponent nie przechodzi poprawnie do stanu końcowego.

Potencjalne przyczyny:
1. **Batching stanów React** — resetFlags() + setIsRoomClosed(true) mogą nie batować się poprawnie w setInterval callback
2. **Tab w tle** — przeglądarka throttluje setInterval, przez co calculate() nie uruchamia się w odpowiednim momencie
3. **Brak stanu fallback** — domyślny "Oczekiwanie" nie powinien nigdy pojawić się dla gościa z parametrem slot

## Zmiany

### 1. `src/hooks/useAutoWebinarSync.ts` — dodanie console.log diagnostycznych
- Dodać logi stanu przy każdej kalkulacji (sinceSlot, duration, wybrany branch)
- To pozwoli debugować następne wystąpienie

### 2. `src/hooks/useAutoWebinarSync.ts` — naprawa potencjalnego bugu stanów
- Zamiast wywoływać resetFlags() + setFlag(true) osobno, użyć jednego bloku setState lub upewnić się, że stany są ustawiane atomowo
- Dodać fallback: jeśli isGuest=true && guestSlotTime istnieje && sinceSlot > duration + 60s → zawsze ustawiać isRoomClosed=true (nawet jeśli resetFlags zawiodło)

### 3. `src/components/auto-webinar/AutoWebinarEmbed.tsx` — fallback "Oczekiwanie" z info diagnostycznym
- W trybie guest z parametrem slot, "Oczekiwanie na transmisję..." nie powinno się NIGDY wyświetlić — zamienić na odpowiedni komunikat (np. "Spotkanie niedostępne" z sugestią kontaktu)
- Dodać warunek: jeśli isGuest && guestSlotTime && !isInActiveHours && secondsToNext === 0 && żaden flag nie jest aktywny → pokazać "Spotkanie już się odbyło" zamiast pustego "Oczekiwania"

### Pliki do modyfikacji
| Plik | Zmiana |
|---|---|
| `src/hooks/useAutoWebinarSync.ts` | Console.log diagnostyczne + naprawa atomowości stanów |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Inteligentny fallback zamiast pustego "Oczekiwania" dla gości |

