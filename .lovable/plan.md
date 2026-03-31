

# Naprawa paska górnego (topbar) na mobile (390px)

## Problem
Na ekranie 390px pasek górny jest przepełniony — 7+ ikon/przycisków ściska się w jednym rzędzie obok logo. Elementy nachodzą na siebie, tekst "Akademia" z sidebaru się wycina. Sidebar w trybie `collapsible="icon"` ukrywa napisy "Strona główna" i "Wyloguj się".

## Rozwiązanie

### 1. `DashboardTopbar.tsx` — ukrycie zbędnych ikon na mobile

Na ekranach < 640px (sm breakpoint) ukryć mniej istotne przyciski:
- **LanguageSelector** — `hidden sm:block` (rzadko zmieniane)
- **ThemeSelector** — `hidden sm:block` (rzadko zmieniane)  
- **HelpCircle (tutorial)** — `hidden sm:block`
- **LayoutGrid (classic view)** — `hidden sm:block` (admin only, rzadko używane)

Na mobile zostanie: SidebarTrigger + NotificationBell + SessionTimer + Avatar (dropdown).

Przeniesione elementy (Language, Theme, Tutorial) dodać do **dropdown menu usera** — tak żeby były dostępne z poziomu avatara na mobile.

### 2. `DashboardTopbar.tsx` — dropdown menu rozszerzony o mobile items

Dodać do DropdownMenuContent:
- Pozycja "Strona główna" → `navigate('/dashboard')` (widoczna zawsze)
- Separator
- Na mobile: Language selector, Theme selector, Tutorial — widoczne tylko `sm:hidden`

### 3. Dropdown menu — dodanie "Strona główna"

Dodać `DropdownMenuItem` z ikoną `Home` i tekstem "Strona główna" / `t('nav.home')` na górze menu (po profilu), linkujący do `/dashboard`.

## Plik do edycji

**`src/components/dashboard/DashboardTopbar.tsx`:**
- Linie 84-127: Owinąć LanguageSelector, ThemeSelector, HelpCircle, LayoutGrid w `div` z `hidden sm:flex`
- Linie 140-185: Rozszerzyć dropdown o "Strona główna" + mobilne warianty Language/Theme/Tutorial

## Efekt

Na 390px topbar: logo + sidebar trigger + bell + avatar = 4 elementy (czytelne)
Reszta dostępna z dropdown menu avatara

