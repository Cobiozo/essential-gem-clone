

# Czat jako wysuwalny sidebar po prawej stronie pulpitu

## Koncepcja

Przycisk (ikona czatu) w topbarze lub jako floating button uruchamia panel czatu, który wysuwa się z prawej strony ekranu jako osobna kolumna obok głównej treści. Nie jest to modal ani overlay — główny pulpit pozostaje w pełni interaktywny (można klikać, scrollować, nawigować), a czat działa równocześnie jako osobna sekcja.

```text
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │   Main Content         │  Chat Panel  │
│ (nav)    │   (fully interactive)  │  (messages)  │
│          │                        │  ← resizable │
└──────────┴────────────────────────┴──────────────┘
```

## Jak to zadziała

1. **Przycisk toggle** w `DashboardTopbar` (ikona MessageSquare) — włącza/wyłącza panel czatu
2. **Stan globalny** — React Context (`ChatSidebarContext`) z `isOpen` / `toggle()` / `close()`, dostępny w całej aplikacji
3. **Panel czatu** renderowany w `DashboardLayout` obok `<main>` — nie nakłada się na treść, a treść główna kurczy się, robiąc miejsce (flex layout)
4. **Wewnątrz panelu** — pełna funkcjonalność MessagesPage: lista konwersacji + okno czatu (reużycie `MessagesSidebar` + `FullChatWindow`)
5. **Resizable** — opcjonalnie panel można rozciągać za pomocą `ResizableHandle` (komponent już istnieje w projekcie)

## Zmiany w plikach

| Plik | Co |
|------|----|
| **Nowy: `src/contexts/ChatSidebarContext.tsx`** | Context z `isOpen`, `toggle()`, `close()`, `openWithUser(userId)` |
| **Nowy: `src/components/chat-sidebar/ChatSidebarPanel.tsx`** | Panel czatu (350-400px szerokości) z nagłówkiem, listą konwersacji i oknem czatu. Reużywa `useUnifiedChat`, `MessagesSidebar`, `FullChatWindow` |
| **`src/components/dashboard/DashboardLayout.tsx`** | Dodanie `ChatSidebarProvider` wrappera + render `ChatSidebarPanel` obok `<main>` w flex layout |
| **`src/components/dashboard/DashboardTopbar.tsx`** | Dodanie przycisku toggle czatu (ikona MessageSquare z badge nieprzeczytanych) |
| **`src/pages/MessagesPage.tsx`** | Bez zmian — pełna strona /messages nadal działa niezależnie |

## Szczegóły techniczne

- Panel czatu używa `transition-all duration-300` dla animacji wysuwania
- Gdy `isOpen=false`, panel ma `w-0 overflow-hidden`; gdy `true` — `w-[380px]`
- Główna treść (`<main>`) automatycznie kurczy się dzięki flexbox
- Na mobile (<768px) panel może działać jako overlay (pełna szerokość) z przyciskiem zamknięcia
- `openWithUser(userId)` pozwala otworzyć czat z konkretnym użytkownikiem z dowolnego miejsca w aplikacji

