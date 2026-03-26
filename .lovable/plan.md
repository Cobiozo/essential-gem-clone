
Plan: poprawa mobilnego auto-webinaru + naprawa zbyt wczesnego końca odtwarzania

1. Uporządkować layout mobilny auto-webinaru
- Przejrzeć `src/components/auto-webinar/AutoWebinarEmbed.tsx` i zmienić układ sekcji pod mobile:
  - ciaśniejsze odstępy, mniejsze marginesy i lepsze skalowanie tekstów,
  - bardziej czytelny nagłówek z logo i badge “NA ŻYWO”,
  - lepsze pozycjonowanie licznika uczestników i fake chatu, żeby nie zasłaniały obrazu,
  - poprawić ekrany: countdown, welcome, thank-you i room-closed pod małe ekrany.
- Dostosować też `src/pages/AutoWebinarPublicPage.tsx`, żeby kontener mobilny miał lepsze paddingi i proporcje.

2. Zmienić kontrolki odtwarzacza na prostsze dla mobile
- W `src/components/auto-webinar/AutoWebinarPlayerControls.tsx` usunąć cały suwak głośności.
- Zostawić tylko fullscreen i ewentualnie prosty toggle mute/unmute, jeśli będzie nadal potrzebny.
- Powiększyć hit area przycisków na telefonie i poprawić ich widoczność na ciemnym tle.
- Dodać/utrzymać pełny ekran jako łatwo dostępny przycisk bez zasłaniania treści.

3. Start wideo z dźwiękiem
- W `src/components/auto-webinar/AutoWebinarEmbed.tsx` usunąć obecną logikę startu “muted + overlay Włącz dźwięk”.
- Przestawić start odtwarzania na próbę uruchomienia z dźwiękiem od razu.
- Jeśli przeglądarka mobilna zablokuje autoplay z audio, zastosować bezpieczny fallback UX:
  - nie uruchamiać od razu w ciszy z suwakiem,
  - tylko pokazać prosty pełnoekranowy przycisk “Odtwórz z dźwiękiem”, który po tapnięciu uruchomi dźwięk.
- Dzięki temu domyślny scenariusz będzie “od razu głos”, ale bez łamania ograniczeń iOS/Safari.

4. Naprawić przedwczesne ucinanie wideo
- Główna przyczyna jest w `src/hooks/useAutoWebinarSync.ts`: logika slotu i końca sesji nadal opiera się częściowo na oknie slotu, a nie wyłącznie na czasie konkretnego filmu przypisanego do slotu.
- Zmienić logikę tak, aby dla gościa i zalogowanego użytkownika obowiązywała jedna zasada:
  - od `sinceSlot = 0` do `sinceSlot < duration` → trwa odtwarzanie,
  - od `sinceSlot >= duration` do `< duration + 60` → baner “Dziękujemy”,
  - od `sinceSlot >= duration + 60` → webinar zamknięty i link nieważny.
- `findCurrentSlot()` ma tylko wskazać aktywny slot, ale nie może kończyć webinaru wcześniej niż wynika to z `duration_seconds` przypisanego materiału.
- Trzeba też uszczelnić przypadek graniczny dla filmu np. 18:03, żeby nie przechodził do thank-you przy 17:xx / 18:00 przez opóźnienie odświeżania lub błędne wyliczenie okna.

5. Doprecyzować aktualizację timera i stanów końcowych
- W `useAutoWebinarSync.ts` zwiększyć precyzję odświeżania podczas końcówki filmu i w oknie thank-you, tak aby przejście następowało dokładniej.
- Upewnić się, że `currentVideo`, `startOffset`, `isVideoEnded` i `isRoomClosed` są ustawiane spójnie w każdej ścieżce:
  - guest with slot,
  - logged-in user,
  - preview mode.
- Zachować obecne kasowanie sesji z localStorage dopiero po `isRoomClosed`.

6. Zachować zgodność z obecną specyfikacją
- Nie przywracać regulacji głośności.
- Fullscreen ma być dostępny także na mobile.
- Baner z podziękowaniem ma pojawić się dopiero po pełnym odtworzeniu materiału wideo i trwać 60 sekund.
- Dopiero po tej minucie link ma zostać unieważniony i webinar zamknięty.

Sekcje do zmiany
- `src/components/auto-webinar/AutoWebinarEmbed.tsx`
- `src/components/auto-webinar/AutoWebinarPlayerControls.tsx`
- `src/hooks/useAutoWebinarSync.ts`
- `src/pages/AutoWebinarPublicPage.tsx`

Uwagi techniczne
- “Autoplay z dźwiękiem od razu” nie jest w 100% gwarantowany na iPhone/Safari bez interakcji użytkownika. Dlatego wdrożenie powinno najpierw próbować startu z audio, a jeśli przeglądarka go zablokuje, pokazać pojedynczy przycisk startu z dźwiękiem zamiast obecnego workflow mute/unmute.
- Najważniejsza poprawka biznesowa: koniec webinaru ma być liczony od realnego `duration_seconds` bieżącego filmu, nie od ogólnego okna slotu ani limitu link expiry.
