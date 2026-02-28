
Cel: jednocześnie naprawić 2 problemy zgłoszone przez Ciebie:
1) nadal przebija stare tło (szczególnie po prawej stronie sylwetki),
2) po uploadzie dostajesz komunikat sukcesu, ale własne tła nie są widoczne.

Co ustaliłem po analizie kodu i danych:
- Obiekty w bucket `meeting-backgrounds` faktycznie istnieją (widziałem wiele plików dla user-id w Storage).
- UI może pokazywać sukces uploadu nawet gdy odświeżenie listy teł się nie powiedzie, bo `listBackgrounds()` łapie błąd i go nie propaguje.
- W `useCustomBackgrounds.ts` listowanie używa `sortBy: { column: 'created_at' }`, co jest potencjalnie nieobsługiwane przez Storage list API i może powodować cichy fail.
- W pipeline maski obecny profil jest “płynny”, ale za miękki dla trybu `image`, przez co zostają “wyspy” starego tła przy krawędzi osoby (to widać na Twoich screenshotach przy prawym barku/meblach).

Zakres wdrożenia (konkretnie po plikach):

1) `src/hooks/useCustomBackgrounds.ts` — twarda naprawa widoczności własnych teł
- Zmienić listowanie na bezpieczne sortowanie wspierane przez API (np. `name`) albo bez `sortBy`, a kolejność zrobić po stronie klienta.
- Przerobić `listBackgrounds()` tak, aby:
  - zwracało listę URL-i,
  - na błędzie rzucało wyjątek (nie tylko `console.error`),
  - czyściło `customImages` gdy `user` jest `null` (żeby nie było fałszywego stanu).
- W `uploadImage()`:
  - przed uploadem wykonać realny odczyt z serwera i walidować limit na podstawie danych serwerowych (nie tylko lokalnego stanu),
  - po uploadzie wywołać `listBackgrounds()` i jeśli odświeżenie listy padnie — propagować błąd (żeby nie było toastu “sukces”, gdy lista nie odświeżona).
- Dodać bardziej czytelne komunikaty dla błędów listowania (RLS/bucket/API).

2) `src/components/meeting/BackgroundSelector.tsx` + `MeetingControls.tsx` + `VideoRoom.tsx` — pewne odświeżanie UI
- Utrzymać `onOpenChange` i odświeżanie przy otwarciu menu, ale:
  - obsłużyć callback jako async (`Promise<void> | void`),
  - dodać bezpieczne `catch` (brak “silent fail”),
  - pokazać użytkownikowi komunikat o błędzie odświeżenia.
- Dzięki temu po każdym otwarciu dropdownu lista będzie spójna ze Storage.

3) `src/components/meeting/VideoBackgroundProcessor.ts` — uszczelnienie krawędzi bez utraty płynności
- Zostawić profil wydajnościowy (640 px, 80 ms, smoothing 0.30/0.70), żeby nie wróciły przycięcia.
- Wprowadzić rozdzielenie jakości per tryb:
  - dla `blur-light` / `blur-heavy` zostawić miększy kontur (naturalny wygląd),
  - dla `image` zaostrzyć compositing (wyższe progi i mocniejszy bias na podmianę tła w strefie przejściowej).
- Dodać lekkie “edge tighten” tylko dla trybu `image` (jedna dodatkowa, tania operacja erozji na masce w cyklu segmentacji, nie na każdej klatce renderu), aby wycinać meble “przyklejone” do barku.
- Ustawić osobny blur maski dla `image` (mniejszy niż dla blur), żeby ograniczyć przenikanie starego tła.
- Efekt: mniej przebijania mebli po prawej stronie, bez ponownego zabicia FPS.

4) Walidacja po wdrożeniu (obowiązkowa)
- Test E2E uploadu:
  - dodać nowe tło,
  - zamknąć/otworzyć menu tła,
  - potwierdzić, że miniatura jest widoczna i da się ją wybrać.
- Test E2E segmentacji:
  - włączyć tryb `image`,
  - poruszać barkiem i głową przy krawędzi kadru,
  - sprawdzić czy meble po prawej przestały przebijać.
- Test płynności:
  - szybki ruch ręką/głową przez 20–30 s,
  - brak zacięć i brak “ciągnięcia” konturu.
- Kontrola konsoli/network:
  - brak błędów listowania Storage,
  - brak cichych błędów przy refetch.

Ryzyka i zabezpieczenia:
- „Idealna” maska piksel-w-piksel nie istnieje przy modelu 256x256, ale tym planem maksymalizujemy efekt praktyczny: brak widocznego przebijania mebli + utrzymana płynność.
- Jeżeli po uszczelnieniu konturu znikną cienkie detale (np. skraj włosów), dostroimy tylko parametry trybu `image`, bez ruszania wydajności globalnej.

Kolejność wdrożenia:
1. Najpierw naprawa listowania i propagacji błędów (żeby własne tła były niezawodnie widoczne).
2. Potem tuning maski wyłącznie dla `image` (żeby usunąć przebijanie po prawej).
3. Na końcu testy E2E i finalny fine-tuning progów.
