

# Reczne wywolanie banera instalacji PWA

## Problem

Po kliknieciu "Nie teraz" baner znika na 14 dni. Uzytkownik nie ma mozliwosci ponownego wywolania go wczesniej.

## Rozwiazanie

Dodanie linku **"Zainstaluj aplikacje"** w stopce dashboardu (`DashboardFooterSection.tsx`), analogicznie do istniejacego linku "Ustawienia cookie" ktory korzysta z CustomEvent.

### Mechanizm

1. Stopka wysyla `CustomEvent('resetPWAInstallBanner')` po kliknieciu
2. `PWAInstallBanner.tsx` nasluchuje tego zdarzenia, czysci klucz `pwa_install_banner_dismissed` z localStorage i ustawia `dismissed = false`
3. Baner pojawia sie ponownie

Ten wzorzec jest juz uzyty w projekcie - dokladnie tak samo dziala link "Ustawienia cookie" (zdarzenie `openCookieSettings`).

### Dodatkowy warunek

Link "Zainstaluj aplikacje" bedzie widoczny tylko gdy aplikacja NIE jest juz zainstalowana (`display-mode: standalone`).

## Pliki do edycji

- **`src/components/pwa/PWAInstallBanner.tsx`** - dodanie listenera na `resetPWAInstallBanner` event
- **`src/components/dashboard/DashboardFooterSection.tsx`** - dodanie linku "Zainstaluj aplikacje" obok "Ustawienia cookie"

