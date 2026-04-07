
Obecna implementacja wygląda na niedokończoną względem Twojego celu: jest tylko prosty prawy panel w `DashboardLayout`, ale nie ma prawdziwego, niezależnego trybu PiP/floating. Dodatkowo logika czatu siedzi bezpośrednio w `ChatSidebarPanel`, więc trudno bezpiecznie przełączać ten sam czat między trybem dockowanym i pływającym.

Plan naprawy:

1. Uporządkuję architekturę czatu
- przeniosę wspólną logikę z `ChatSidebarPanel` do jednego hosta/shella czatu
- ten host będzie trzymał:
  - aktywną rozmowę
  - listę rozmów
  - wiadomości
  - stan widoku `list/chat`
  - akcje wysyłki/usuwania/archiwizacji
- dzięki temu docked sidebar i PiP będą korzystały z dokładnie tego samego stanu

2. Rozszerzę `ChatSidebarContext`
- zamiast samego `isOpen` dodam tryby:
  - `closed`
  - `docked`
  - `floating`
- dodam akcje:
  - `openDocked()`
  - `openFloating()`
  - `toggleDocked()`
  - `close()`
  - `openWithUser(userId, mode?)`
- dodam też stan rozmiaru i pozycji dla okna floating

3. Poprawię prawy sidebar na pulpicie
- w `DashboardLayout` zostawię czat jako osobną kolumnę po prawej
- główna zawartość pozostanie aktywna i klikalna
- sidebar będzie działał jako część układu, a nie jako przeszkadzający overlay na desktopie
- dodam opcjonalne zwężanie/rozszerzanie szerokości

4. Dodam prawdziwy tryb PiP-style dla czatu
- zamiast natywnego browser PiP (ma słabe wsparcie dla zwykłego HTML i bywa niestabilny), zrobię aplikacyjne okno PiP:
  - pływające
  - draggable
  - resizable
  - zawsze nad pulpitem
  - możliwe do zminimalizowania i zamknięcia
- to będzie niezależne od docked sidebara

5. Rozdzielę warstwę prezentacji
- `ChatSidebarPanel` przekształcę w wspólną zawartość czatu
- dodam dwa kontenery:
  - docked: prawy panel w dashboardzie
  - floating: okno PiP renderowane jako fixed/portal, żeby nie było obcinane przez `overflow-hidden`

6. Poprawię sterowanie w `DashboardTopbar`
- obecny przycisk czatu zamienię na bardziej czytelne sterowanie:
  - otwórz jako sidebar
  - otwórz jako PiP
  - zamknij
- jeśli ma zostać jeden przycisk, zrobię menu po kliknięciu

7. Dopilnuję zachowania rozmowy przy przełączaniu trybów
- jeśli otworzysz rozmowę w sidebarze i przełączysz na PiP:
  - ta sama rozmowa ma zostać otwarta
  - bez resetu listy i bez utraty kontekstu
- analogicznie przy powrocie z PiP do sidebara

8. Responsywność
- desktop:
  - docked sidebar jako prawa kolumna
  - floating jako niezależne okno
- mobile:
  - sidebar/floating uproszczę do pełnoekranowego widoku lub sheet, żeby nie psuć obsługi

Najważniejsza decyzja techniczna:
- nie opierałbym tego na natywnym browser Picture-in-Picture dla czatu tekstowego
- zrobię stabilny “PiP-style” wewnątrz aplikacji, bo daje pełną kontrolę i działa przewidywalnie

Pliki do przebudowy:
- `src/contexts/ChatSidebarContext.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/components/dashboard/DashboardTopbar.tsx`
- `src/components/chat-sidebar/ChatSidebarPanel.tsx`
- nowy wspólny host/renderery czatu, np.:
  - `src/components/chat-sidebar/ChatPanelContent.tsx`
  - `src/components/chat-sidebar/ChatDockedPanel.tsx`
  - `src/components/chat-sidebar/ChatFloatingWindow.tsx`

Efekt końcowy:
```text
Tryb 1: Docked
[menu] [pulpit główny .........] [czat]

Tryb 2: PiP-style
[menu] [pulpit główny ......................]
                           [pływające okno czatu]
```

To naprawi obecne “nie działa”, a jednocześnie da dokładnie to, o co prosisz: czat jako prawa część pulpitu oraz osobny, włączany przyciskiem tryb PiP.
