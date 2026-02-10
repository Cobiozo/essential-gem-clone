

# Poprawki PWA banera, powiadomien mobilnych i strzalki iOS

## Trzy problemy do naprawienia

### 1. Baner instalacji na srodku zamiast po prawej (desktop)
Na zrzucie ekranu widac, ze baner z instrukcja jest wycentrowany (`max-w-md mx-auto`), podczas gdy ikona instalacji w przegladarce jest w prawym gornym rogu paska adresu. Baner powinien byc wyrownany do prawej, aby wizualnie wskazywac na ikone instalacji.

### 2. Klikniecie powiadomienia na mobilce nie przenosi do rozmowy
Powiadomienia typu "Wiadomosc od Sebastian Snopek" maja `link: '/messages'`, ale nie zawieraja informacji o nadawcy. Po kliknieciu uzytkownik trafia na strone wiadomosci, ale nie otwiera sie konkretna rozmowa. Trzeba dodac `sender_id` do linku i obsluge w `MessagesPage`.

### 3. Strzalka iOS wskazuje na dol, a przycisk Udostepnij jest na gorze
Na iPhonie w Safari strzalka "Kliknij Udostepnij" wskazuje na dol ekranu, ale ikona udostepniania jest w prawym gornym rogu paska adresu (widoczne na zrzucie - ikona Share jest na gorze obok paska adresu).

## Zmiany techniczne

### Plik 1: `src/components/pwa/PWAInstallBanner.tsx`

**Problem 1 - pozycja banera na desktopie:**
- Dla wariantow desktop (Chrome/Edge/Opera z `canInstall`, oraz Safari macOS): zmiana kontenera z `mx-auto max-w-md` na wyrownanie do prawej: `ml-auto mr-4 max-w-sm`
- Na mobilce (iOS, Android) baner pozostaje wycentrowany
- Logika: `const bannerAlign = (isIOS || isAndroid) ? 'mx-auto max-w-md' : 'ml-auto max-w-sm'`

**Problem 3 - strzalka iOS:**
- Zmiana pozycji strzalki z `fixed bottom-12 left-1/2` na `fixed top-1 right-2`
- Zmiana ikony z `ArrowDown` na `ArrowUp`
- Tekst: "Kliknij Udostepnij" ze strzalka w gore wskazujaca na ikone Share w prawym gornym rogu paska adresu Safari

### Plik 2: `src/hooks/useUnifiedChat.ts`

**Problem 2 - link w powiadomieniu:**
- Linia 254: zmiana `link: '/messages'` na `link: '/messages?user=${user.id}'` (sender_id)
- Dzieki temu klikniecie powiadomienia przeniesie uzytkownika na strone wiadomosci z parametrem identyfikujacym nadawce

### Plik 3: `src/pages/MessagesPage.tsx`

**Problem 2 - obsluga parametru URL:**
- Dodanie `useSearchParams` z react-router-dom
- Odczyt parametru `user` z URL
- Po zaladowaniu strony: automatyczne wywolanie `handleSelectDirectMember(userId)` jesli parametr jest obecny
- Czyszczenie parametru z URL po otwarciu rozmowy (aby odswiezenie nie powtarzalo operacji)

### Plik 4: `src/hooks/usePrivateChat.ts`

- Sprawdzenie i analogiczna poprawka linku w powiadomieniach (jesli ten hook rowniez tworzy powiadomienia z `link: '/messages'`)

## Pliki do edycji

1. `src/components/pwa/PWAInstallBanner.tsx` - wyrownanie banera do prawej na desktopie, poprawka strzalki iOS
2. `src/hooks/useUnifiedChat.ts` - dodanie sender_id do linku powiadomienia
3. `src/pages/MessagesPage.tsx` - obsluga parametru `?user=` do automatycznego otwarcia rozmowy
4. `src/hooks/usePrivateChat.ts` - analogiczna poprawka linku (jesli dotyczy)
