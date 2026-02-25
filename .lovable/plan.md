

## Informacja kontaktowa do anulowania < 2h przed spotkaniem

### Problem
Gdy do spotkania zostalo mniej niz 2 godziny, przycisk "Anuluj spotkanie" jest ukryty, ale uzytkownik nie wie jak anulowac -- brak informacji kontaktowej do prowadzacego.

### Rozwiazanie

**Plik: `src/components/events/UpcomingMeetings.tsx`**

Po sekcji przycisku anulowania (linia 253-275), dodac warunek `else`: gdy `!canCancel(meeting.start_time)` i uzytkownik nie jest hostem (`!isHost`), wyswietlic komunikat informacyjny z:
- Ikoną Mail
- Tekstem: "Anulowanie mozliwe tylko przez kontakt z prowadzacym"
- Imieniem, nazwiskiem i adresem email prowadzacego (z `meeting.otherParty`) jako klikalny link `mailto:`

Dla hosta (prowadzacego) -- nie wyswietlac tego komunikatu, poniewaz prowadzacy moze anulowac z panelu lidera (tam nie ma ograniczenia 2h).

### Szczegoly techniczne

- Import ikony `Mail` z lucide-react (juz zaimportowane inne ikony)
- Adres email wyswietlony jako `<a href="mailto:...">` z podkresleniem
- Styl: delikatny alert/info box z ikona koperty
- Warunek: `!canCancel(meeting.start_time) && !isHost && meeting.otherParty?.email`

