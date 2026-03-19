

# Plan: Wyciągnięcie "Moja strona" na osobną stronę w sidebarze

## Cel
Przenieść zakładkę "Moja strona" (Partner Page Editor) z `MyAccount` na osobną stronę dostępną z paska bocznego dashboardu pod nazwą **"Moja Strona-Biznes Partner"**. Bez zmian w logice komponentu ani zarządzaniu przez admina.

## Zmiany

### 1. Nowa strona `/moja-strona` (`src/pages/MyPartnerPage.tsx`)
- Wrapper z `DashboardLayout` (jak inne strony dashboardowe)
- Wewnątrz: sprawdzenie dostępu (`usePartnerPageAccess`) + lazy-load `PartnerPageEditor`
- Redirect na `/dashboard` jeśli brak dostępu

### 2. Rejestracja trasy w `src/App.tsx`
- Dodanie `<Route path="/moja-strona" element={<MyPartnerPage />} />`
- Dodanie do `KNOWN_APP_ROUTES` w `ProfileCompletionGuard.tsx`

### 3. Dodanie pozycji w sidebarze (`src/components/dashboard/DashboardSidebar.tsx`)
- Nowy `MenuItem` z `id: 'moja-strona'`, `icon: Globe`, `labelKey: 'Moja Strona-Biznes Partner'`, `path: '/moja-strona'`
- Widoczność warunkowa — tylko gdy `usePartnerPageAccess` zwraca `hasAccess: true`
- Pozycja: po PureLinki (reflinks), przed InfoLinki

### 4. Usunięcie zakładki z `MyAccount.tsx`
- Usunięcie `TabsTrigger` i `TabsContent` dla `partner-page`
- Usunięcie `'partner-page'` z listy dozwolonych tabów URL
- Czyszczenie importu `usePartnerPageAccess` jeśli nieużywany w innym miejscu (jest jeszcze używany do `visibleTabs` — zostanie usunięty)

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/pages/MyPartnerPage.tsx` | **Nowy** — strona z DashboardLayout + PartnerPageEditor |
| `src/App.tsx` | Dodanie Route `/moja-strona` |
| `src/components/dashboard/DashboardSidebar.tsx` | Nowa pozycja menu + warunkowa widoczność |
| `src/pages/MyAccount.tsx` | Usunięcie zakładki partner-page |
| `src/components/profile/ProfileCompletionGuard.tsx` | Dodanie `/moja-strona` do KNOWN_APP_ROUTES |

