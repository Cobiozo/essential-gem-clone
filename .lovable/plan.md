

# Naprawa flow gościa auto-webinaru — brakujące elementy

## Analiza obecnego stanu vs oczekiwany flow

Po przeanalizowaniu kodu (`useAutoWebinarSync.ts`, `AutoWebinarEmbed.tsx`, `process-pending-notifications`) zidentyfikowałem **5 brakujących elementów**:

| # | Oczekiwane zachowanie | Status |
|---|---|---|
| 1 | Rejestracja → email z linkiem | ✅ Działa |
| 2 | Pokój otwiera się 5 min przed, widać liczbę oczekujących | ⚠️ Pokój się otwiera, ale **brak liczby uczestników** podczas odliczania |
| 3 | Nagranie startuje, fikcyjny czat działa | ✅ Działa |
| 4 | Po 5 min od startu — blokada dołączenia ("szanujemy punktualność") | ❌ **Brak** — `late_join_max_seconds` działa TYLKO w trybie legacy, w explicit slots nigdy nie ustawia `isTooLate=true` |
| 5 | Po zakończeniu nagrania — baner z podziękowaniem i prośbą o kontakt z zapraszającym | ❌ **Brak** — po końcu wideo ekran pokazuje "Oczekiwanie na transmisję..." |
| 6 | Po 1 min od zakończenia — zamknięcie pokoju, link dezaktywowany z info "spotkanie się odbyło" | ❌ **Brak** — nie ma tego stanu |
| 7 | Email z podziękowaniem po spotkaniu | ⚠️ Działa dla eventów z `end_time`, ale auto-webinary nie mają tradycyjnego `end_time` per slot |

## Plan zmian

### 1. `src/hooks/useAutoWebinarSync.ts` — dodanie brakujących stanów

**a) Late join blocking w explicit slots (linia ~169-196):**
Dodać sprawdzenie `late_join_max_seconds` w sekcji "Playing" dla gościa. Jeśli `sinceSlot > lateJoinMaxSeconds` i `sinceSlot < video.duration_seconds` → `isTooLate = true`.

**b) Nowy stan `isVideoEnded` + `isRoomClosed`:**
Dodać do interfejsu `AutoWebinarSyncResult`:
- `isVideoEnded: boolean` — nagranie się skończyło (baner "dziękujemy")
- `isRoomClosed: boolean` — 60s po zakończeniu nagrania (link dezaktywowany)

Logika w `calculateExplicitSlots` dla gościa:
- Gdy `sinceSlot >= video.duration_seconds` i `sinceSlot < video.duration_seconds + 60` → `isVideoEnded = true`
- Gdy `sinceSlot >= video.duration_seconds + 60` → `isRoomClosed = true`

### 2. `src/components/auto-webinar/AutoWebinarEmbed.tsx` — nowe ekrany UI

**a) Ekran "Dziękujemy za uczestnictwo" (isVideoEnded):**
Baner z podziękowaniem i prośbą o kontakt z osobą zapraszającą. Styl spójny z resztą (czarne tło, białe napisy).

**b) Ekran "Spotkanie się odbyło" (isRoomClosed):**
Informacja: "Ten link jest nieważny, ponieważ spotkanie już się odbyło. Skontaktuj się z osobą, która Cię zaprosiła."

**c) Liczba uczestników podczas odliczania:**
Dodać `AutoWebinarParticipantCount` do ekranu countdown (przed startem nagrania), aby gość widział "ilu ludzi czeka".

### 3. Zmiana w `AutoWebinarCountdown` lub w embed

Podczas fazy odliczania (sekundy do startu, pokój otwarty) wyświetlać fake participant count obok odliczania.

### Pliki do modyfikacji
1. `src/hooks/useAutoWebinarSync.ts` — nowe stany + logika late join + video ended + room closed
2. `src/components/auto-webinar/AutoWebinarEmbed.tsx` — nowe ekrany UI + participant count w countdown

### Co NIE wymaga zmian
- Email z podziękowaniem — obsługiwany przez `process-pending-notifications` (step 9), działa dla eventów z `end_time`. Auto-webinary powiązane z eventem (`event_id` w config) będą obsłużone automatycznie.
- Rejestracja — działa poprawnie.
- Fikcyjny czat — działa poprawnie.

