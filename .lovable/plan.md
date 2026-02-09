
# Implementacja promptu instalacji PWA

## Podsumowanie

Dodanie systemu zachecajacego uzytkownikow do instalacji aplikacji PWA. Baner pojawi sie po zalogowaniu na kazdej stronie (jesli aplikacja nie jest jeszcze zainstalowana). Dla iOS - specjalna instrukcja krok po kroku.

## Co zostanie utworzone

### 1. Hook `src/hooks/usePWAInstall.ts`

Nowy hook obslugujacy caly cykl zycia instalacji PWA:
- Przechwytuje zdarzenie `beforeinstallprompt` (Chrome/Edge/Opera/Samsung Internet)
- Wykrywa czy aplikacja jest juz zainstalowana (`display-mode: standalone` lub `navigator.standalone` dla iOS)
- Wykrywa platforme: iOS, Android, Desktop
- Eksportuje: `canInstall`, `isInstalled`, `isIOS`, `promptInstall()`
- Sledzi zdarzenie `appinstalled` i automatycznie ukrywa baner

### 2. Komponent `src/components/pwa/PWAInstallBanner.tsx`

Baner instalacji wzorowany na istniejacym `NotificationPermissionBanner`:
- Wyswietla sie automatycznie gdy: uzytkownik zalogowany + aplikacja nie zainstalowana + baner nie odrzucony
- Przycisk **"Zainstaluj"** - wywoluje natywny prompt przegladarki (Android/Desktop)
- Przycisk **"Nie teraz"** - ukrywa baner na 14 dni (localStorage, klucz `pwa_install_banner_dismissed`)
- Na **iOS**: zamiast przycisku instalacji, wyswietla krotka instrukcje: "Kliknij Udostepnij > Dodaj do ekranu glownego" z ikonami
- Styl: `Alert` z ikona `Download`, kolor primary, analogicznie do NotificationPermissionBanner
- NIE wyswietla sie na stronach publicznych (InfoLink, rejestracja gosci)

### 3. Strona `src/pages/InstallPage.tsx` + trasa `/install`

Dedykowana strona z pelna instrukcja instalacji:
- Sekcja dla Android/Chrome: przycisk wywolujacy prompt + instrukcja reczna
- Sekcja dla iOS/Safari: krok po kroku ze zrzutami (ikona Share > "Dodaj do ekranu glownego")
- Sekcja dla Desktop: instrukcja dla Chrome/Edge
- Automatyczne wykrywanie platformy i podswietlenie odpowiedniej sekcji
- Dostepna bez logowania (publiczna)

### 4. Integracja w `src/App.tsx`

- Import `PWAInstallBanner` i dodanie go w glownym ukladzie (obok `CookieConsentBanner`), widoczny tylko dla zalogowanych
- Dodanie trasy `/install` do routera

## Logika wyswietlania banera

```text
Uzytkownik zalogowany?
  |-- NIE --> nic nie pokazuj
  |-- TAK --> Aplikacja juz zainstalowana (standalone)?
                |-- TAK --> nic nie pokazuj
                |-- NIE --> Baner odrzucony < 14 dni temu?
                              |-- TAK --> nic nie pokazuj
                              |-- NIE --> POKAZ BANER
                                           |-- iOS? --> instrukcja reczna
                                           |-- Inne? --> przycisk "Zainstaluj"
```

## Kompatybilnosc z platformami

| Platforma | Automatyczny prompt | Rozwiazanie |
|-----------|-------------------|-------------|
| Android Chrome/Edge | TAK | Przycisk wywoluje natywny dialog |
| Android Firefox | NIE | Instrukcja reczna (menu > Zainstaluj) |
| iOS Safari 16.4+ | NIE | Instrukcja: Udostepnij > Dodaj do ekranu |
| iOS < 16.4 | NIE | Instrukcja j.w. (bez push notifications) |
| Desktop Chrome/Edge | TAK | Przycisk wywoluje natywny dialog |
| Desktop Firefox | NIE | Instrukcja reczna |
| Desktop Safari | NIE | Nie wspiera PWA install - baner ukryty |

## Fetch handler w Service Worker

Dodanie minimalnego fetch handlera do `public/sw-push.js` (cache-first dla statycznych zasobow, network-first dla API). Nie jest to wymagane do instalacji, ale poprawia dzialanie zainstalowanej aplikacji - ikony i manifest beda ladowane z cache.

## Pliki do utworzenia/edycji

- **Nowy:** `src/hooks/usePWAInstall.ts`
- **Nowy:** `src/components/pwa/PWAInstallBanner.tsx`
- **Nowy:** `src/pages/InstallPage.tsx`
- **Edycja:** `src/App.tsx` (dodanie banera + trasa `/install`)
- **Edycja:** `public/sw-push.js` (dodanie fetch handlera)
