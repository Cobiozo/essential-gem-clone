
# Audyt „ostatniego webinaru” i plan naprawy (mobile/PWA audio+video)

## Co potwierdziłem w danych z projektu

1. Ostatni webinar wewnętrzny:
- `event_id`: `0fb56a2d-8b88-4346-9f91-59ba04132261`
- `meeting_room_id`: `0d71dcc1-a333-4127-bde6-2c8a69c65d56`
- Host: `629a2d9a-994a-4e6a-a9c4-8ae0b07e3770`
- Uczestnik: `8b7ef46c-7647-412f-8626-4876081a38a1`

2. W tym pokoju uczestnik był zapisany jako `is_active=true` nawet po zakończeniu spotkania (to sygnał, że mobile/PWA lifecycle nadal bywa niestabilny przy zamykaniu/powrocie aplikacji).

3. Poprzednia poprawka PWA była niepełna:
- nadal są wejścia do `/meeting-room/...` przez `_blank` / `window.open` w:
  - `src/components/events/EventCard.tsx`
  - `src/components/events/EventDetailsDialog.tsx`
To nadal może wyrywać użytkownika z kontekstu PWA/sesji.

4. W `VideoRoom.tsx` są obecnie **dwa** różne listenery `visibilitychange` (jeden duży async + drugi dodany później). To zwiększa ryzyko równoległych reacquire i niestabilnych stanów strumienia.

5. `MeetingRoom.tsx` ma auto-rejoin (sessionStorage), który może omijać lobby i user-gesture na mobile/PWA. To jest krytyczne dla iOS/Android polityk media.

---

## Najbardziej prawdopodobna przyczyna „uczestnik dołączył, ale go nie widać i nie słychać”

To kombinacja 3 problemów:
1. Nie wszystkie ścieżki wejścia do webinaru zostały przerobione na nawigację wewnętrzną (część nadal otwiera nową kartę/okno).
2. Auto-rejoin potrafi wejść prosto do VideoRoom bez świeżego gestu użytkownika.
3. Podwójna obsługa `visibilitychange` może powodować wyścigi przy odzyskiwaniu strumieni po background/foreground.

Efekt końcowy na mobile/PWA: uczestnik formalnie „jest w pokoju”, ale media nie są stabilnie publikowane/odtwarzane.

---

## Plan wdrożenia poprawek

## 1) Domknięcie wszystkich wejść do meeting-room (PWA-safe)
### Pliki:
- `src/components/events/EventCard.tsx`
- `src/components/events/EventDetailsDialog.tsx`

### Zmiany:
- Zamienić `window.open('/meeting-room/...', '_blank')` i linki `target="_blank"` dla **wewnętrznych** meetingów na:
  - `useNavigate()` + `navigate('/meeting-room/...')` lub
  - `<Link to="/meeting-room/...">`
- Zostawić `_blank` tylko dla linków zewnętrznych (Zoom, YouTube, itp.).

Cel: każdy join do internal webinaru zostaje w tym samym kontekście aplikacji (PWA/session/auth).

---

## 2) Stabilny i przewidywalny join flow na mobile/PWA
### Plik:
- `src/pages/MeetingRoom.tsx`

### Zmiany:
- Ograniczyć auto-rejoin dla mobile/PWA:
  - gdy wykryte mobile/standalone PWA i brak świeżego streamu z lobby, wymusić status `lobby` zamiast bezpośredniego `joined`.
- Auto-rejoin zostawić dla desktop (i ewentualnie dla mobile tylko po bardzo krótkim czasie i z potwierdzonym streamem).

Cel: `getUserMedia` ma być po realnym geście użytkownika w lobby, co poprawia skuteczność na iPhone/Android/PWA.

---

## 3) Ujednolicenie lifecycle media w VideoRoom (usunąć duplikację)
### Plik:
- `src/components/meeting/VideoRoom.tsx`

### Zmiany:
- Zostawić **jeden** listener `visibilitychange` (ten bardziej kompletny), usunąć drugi duplikat.
- Wspólny handler powinien:
  - po `visible`: sprawdzać live tracks + ewentualnie `reacquireLocalStream()`,
  - po `visible`: próbować `play()` na video elementach remote,
  - mieć debounce i guard, żeby nie uruchamiać równoległych reacquire.

Cel: brak race condition po przejściu app w tło i z powrotem.

---

## 4) Twardsze zasady publikacji mediów przy starcie połączenia
### Plik:
- `src/components/meeting/VideoRoom.tsx`

### Zmiany:
- Przed rozpoczęciem calli i broadcastu peer-joined sprawdzić, czy lokalny stream ma co najmniej 1 żywy track.
- Jeśli nie ma: pokazać jasny stan „wymagane uprawnienia do mediów” + przycisk retry (zamiast przechodzić dalej do „cichego” joinu bez mediów).

Cel: uniknąć sytuacji „uczestnik dołączył logicznie, ale bez audio/video”.

---

## 5) Domknięcie cleanup na mobile (mniej ghost active participants)
### Plik:
- `src/components/meeting/VideoRoom.tsx`

### Zmiany:
- Oprócz `beforeunload`, dołożyć `pagehide`/`visibilitychange`-aware cleanup (best-effort keepalive PATCH) dla iOS/Android.
- Utrzymać heartbeat, ale ograniczyć przypadki pozostawania `is_active=true` po wyjściu.

Cel: lepsza spójność stanu uczestników i mniej fałszywych „aktywnych” po stronie webinaru.

---

## Kolejność wdrożenia

1. Naprawa wszystkich linków wejścia do meeting-room (`EventCard`, `EventDetailsDialog`).
2. Korekta auto-rejoin (`MeetingRoom.tsx`).
3. Refaktor listenerów `visibilitychange` (`VideoRoom.tsx`).
4. Walidacja lokalnego streamu przed callami (`VideoRoom.tsx`).
5. Usprawnienie cleanup dla mobile (`VideoRoom.tsx`).

---

## Kryteria akceptacji po wdrożeniu

1. Internal webinar uruchamiany z każdej karty/dialogu otwiera się w tej samej aplikacji (bez nowej karty/bez wyjścia z PWA).
2. Na iPhone/Android/PWA uczestnik po dołączeniu jest widoczny i słyszalny bez ręcznego „ratowania” sesji.
3. Powrót z tła (powiadomienie, przełączenie aplikacji) nie zabija trwale audio/video.
4. Brak podwójnych reakcji na `visibilitychange`.
5. Po wyjściu z webinaru uczestnik nie zostaje długo jako fałszywie aktywny.

---

## Sekcja techniczna (skrót zmian kodowych)

- `EventCard.tsx`: `window.open('/meeting-room/...', '_blank')` -> `navigate('/meeting-room/...')`.
- `EventDetailsDialog.tsx`: wewnętrzne `<a href="/meeting-room/..." target="_blank">` -> router navigation bez `_blank`.
- `MeetingRoom.tsx`: warunkowy auto-rejoin (desktop-first), mobile/PWA kierowane przez lobby.
- `VideoRoom.tsx`:
  - usunięcie zduplikowanego `visibilitychange`,
  - jeden guarded handler od reacquire + `video.play()`,
  - gate „no live local track => nie publikuj peer-joined/calli”.
