

# Usunięcie czatu z paska bocznego + badge nieprzeczytanych na ikonie w topbarze

## Zmiany

### 1. Usunięcie modułu "Chat" z paska bocznego
**Plik: `src/components/dashboard/DashboardSidebar.tsx`**
- Usunąć pozycję `{ id: 'chat', icon: MessageSquare, labelKey: 'dashboard.menu.chat', path: '/messages' }` z listy elementów menu
- Można też usunąć powiązany import `useUnifiedChat` i zmienną `totalUnread` z sidebara (przeniesiona do topbara)

### 2. Dodanie badge nieprzeczytanych wiadomości na ikonie czatu w topbarze
**Plik: `src/components/dashboard/DashboardTopbar.tsx`**
- Zaimportować `useUnifiedChat` i pobrać `totalUnread`
- Na przycisku czatu (MessageSquare) dodać czerwone kółko z liczbą nieprzeczytanych wiadomości — wzorzec identyczny jak badge w sidebarze:
  ```text
  ┌──────────┐
  │ 💬  ● 3  │  ← czerwony badge gdy totalUnread > 0
  └──────────┘
  ```
- Badge będzie pozycjonowany absolutnie w rogu ikony (`absolute -top-1 -right-1`)
- Format: `99+` gdy > 99

### 3. Kliknięcie ikony czatu
- Zachować obecne zachowanie — `chatSidebar.toggleDocked` otwiera panel czatu (docked/PiP)
- Alternatywnie: `navigate('/messages')` jeśli preferowane przejście do pełnej strony wiadomości

### Pliki do edycji
- `src/components/dashboard/DashboardSidebar.tsx` — usunięcie pozycji chat z menu
- `src/components/dashboard/DashboardTopbar.tsx` — dodanie badge z liczbą nieprzeczytanych

