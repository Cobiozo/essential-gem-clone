
Cel: naprawić 2 realne problemy w czacie:
1. widżet PLC OMEGA BASE nadal pokazuje się przy otwartym sidebar/PiP,
2. długie wiadomości nie zawijają się do szerokości okna w sidebar i PiP.

1. Naprawa widoczności lupy PLC OMEGA BASE

Problem:
`MedicalChatWidget` sprawdza `ChatSidebarContext`, ale jest renderowany w `App.tsx` poza `ChatSidebarProvider`. Efekt: `chatSidebar` jest `null`, więc warunek ukrywania nigdy nie działa.

Co zmienię:
- przeniosę `ChatSidebarProvider` wyżej, tak aby obejmował jednocześnie:
  - `DashboardLayout`,
  - `ChatWidgetsWrapper`,
  - `ChatFloatingWindow` / `ChatDockedPanel`.
- usunę lokalne owinięcie `ChatSidebarProvider` z `DashboardLayout`, żeby nie było dwóch niezależnych kontekstów.
- zostawię w `MedicalChatWidget` prostą logikę ukrywania opartą o wspólny stan:
  - ukryj widżet, gdy `mode !== 'closed'` albo `isOpen === true`.

Pliki:
- `src/App.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- ewentualnie lekka korekta w `src/components/MedicalChatWidget.tsx`

2. Naprawa zawijania treści wiadomości

Problem:
w `MessageBubble.tsx` tekst ma `whitespace-pre-wrap break-words`, ale dla bardzo długich ciągów bez spacji to nie wystarcza. Dodatkowo sama bańka wiadomości nie ma twardego ograniczenia do szerokości rodzica.

Co zmienię:
- ograniczę szerokość samej bańki do kontenera:
  - dodać `max-w-full` i `min-w-0` na wrapperze bańki,
  - dopilnować, by `inline-block` nie rozszerzał się ponad dostępne miejsce.
- wymuszę łamanie bardzo długich ciągów:
  - na treści wiadomości dodać klasę typu `break-all` albo `[overflow-wrap:anywhere]` obok `whitespace-pre-wrap`.
- jeśli trzeba, dodam `overflow-hidden` na bubble wrapperze, aby nic nie wychodziło poza okno.

Plik:
- `src/components/unified-chat/MessageBubble.tsx`

3. Spójność w sidebar i PiP

Dlaczego to naprawi oba tryby naraz:
- zarówno sidebar, jak i PiP używają wspólnego `ChatPanelContent`,
- obie wersje czatu renderują `FullChatWindow`,
- `FullChatWindow` używa tego samego `MessageBubble`.

To znaczy:
- jedna poprawka kontekstu naprawi ukrywanie lupy globalnie,
- jedna poprawka `MessageBubble` naprawi zawijanie treści w obu widokach.

4. Dodatkowa korekta układu PiP/sidebar

Przy okazji dopnę ograniczenia kontenera listy/okna, żeby nic nie rozpychało układu:
- w `ChatPanelContent` przekażę do `MessagesSidebar` pełną wysokość i ukrycie overflow (`h-full overflow-hidden`),
- w razie potrzeby dopnę `min-w-0` / `overflow-hidden` na kontenerach pośrednich, żeby szerokie bubble nie psuły layoutu.

Plik:
- `src/components/chat-sidebar/ChatPanelContent.tsx`

5. Efekt końcowy

Po wdrożeniu:
- ikona lupy PLC OMEGA BASE zniknie zawsze, gdy otwarty jest czat w sidebar albo PiP,
- długie wiadomości będą łamane do szerokości okienka,
- to będzie działać identycznie w zadokowanym sidebarze i w oknie PiP,
- układ nie będzie się rozjeżdżał przez ciągi bez spacji.

Skrót techniczny:
```text
App-level ChatSidebarProvider
├── DashboardLayout
│   ├── Dashboard content
│   ├── ChatDockedPanel
│   └── ChatFloatingWindow
└── ChatWidgetsWrapper
    └── MedicalChatWidget (widzi ten sam stan czatu)
```
