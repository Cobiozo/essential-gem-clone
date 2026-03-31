

# Naprawa widoczności "Strona główna" i "Wyloguj się" na mobile

## Analiza problemu

Na screenshocie widać, że pasek górny na 390px jest przepełniony — avatar (z dropdownem zawierającym "Strona główna" i "Wyloguj się") jest ucięty na prawej krawędzi ekranu. Sidebar na mobile jest Sheet (overlay), więc gdy jest zamknięty, pozycje "Strona główna" i "Wyloguj się" z sidebar footer są niedostępne.

Nasz poprzedni fix (`hidden sm:flex`) powinien ukrywać LanguageSelector, ThemeSelector i HelpCircle na mobile, ale wygląda na to, że pasek nadal się przepełnia — prawdopodobnie SessionTimer, NotificationBell i inne elementy zajmują za dużo miejsca, obcinając avatar.

## Rozwiązanie

### Plik: `src/components/dashboard/DashboardTopbar.tsx`

1. **Ograniczyć overflow topbara** — dodać `overflow-hidden` i `min-w-0` do kontenera prawej strony, aby elementy nie wychodziły poza ekran.

2. **Zmniejszyć gap i padding na mobile** — zmienić `gap-4` na `gap-2 sm:gap-4` w headerze i `px-2 sm:px-4 lg:px-6` zamiast `px-4 lg:px-6`.

3. **SessionTimer — ukryć na mobile lub zmniejszyć** — SessionTimer zajmuje dużo miejsca. Dodać `hidden sm:block` wrapper, aby na mobile nie zabierał przestrzeni.

4. **Upewnić się, że avatar (z dropdownem) jest zawsze widoczny** — dodać `flex-shrink-0` na przycisku avatara, żeby nigdy nie był ściśnięty.

5. **Dodać "Wyloguj się" do widocznych elementów na mobile** — w dropdownie avatara "Strona główna" i "Wyloguj się" już istnieją (linie 144-147 i 189-192). Wystarczy upewnić się, że dropdown się otwiera poprawnie.

## Efekt

Na 390px topbar: SidebarTrigger + NotificationBell + Avatar = 3 elementy. Dropdown z avatara daje dostęp do "Strona główna" i "Wyloguj się". Sidebar (Sheet) po otwarciu też pokazuje pełne menu z tekstami.

