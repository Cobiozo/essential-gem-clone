

# Plan: Blokada odpowiedzi po zamknięciu konwersacji przez admina (realtime)

## Problem

Gdy admin zamyka konwersację, użytkownik B nadal widzi pole do pisania — `currentConvStatus` aktualizuje się **tylko** przy zmianie `selectedDirectUserId`, nie reaguje na realtime zmiany w `admin_conversations`. Użytkownik B musi odświeżyć stronę, żeby zobaczyć blokadę.

## Rozwiązanie

Dodać `adminConversations` do dependency useEffect, który pobiera `currentConvStatus`. Dzięki temu, gdy realtime subscription zaktualizuje listę konwersacji (np. admin zamknął rozmowę), status zostanie natychmiast odświeżony i pole wysyłania zniknie.

## Zmiany

### 1. `src/pages/MessagesPage.tsx` — linia ~97

Dodać `adminConversations` do tablicy zależności:

```typescript
useEffect(() => {
  if (selectedDirectUserId) {
    getConversationStatus(selectedDirectUserId).then(setCurrentConvStatus);
  } else {
    setCurrentConvStatus(null);
  }
}, [selectedDirectUserId, getConversationStatus, adminConversations]);
```

### 2. `src/components/chat-sidebar/ChatPanelContent.tsx` — linia ~45

Ta sama zmiana — dodać `adminConversations` do zależności:

```typescript
useEffect(() => {
  if (selectedDirectUserId) {
    getConversationStatus(selectedDirectUserId).then(setCurrentConvStatus);
  } else {
    setCurrentConvStatus(null);
  }
}, [selectedDirectUserId, getConversationStatus, adminConversations]);
```

## Efekt

- Admin zamyka konwersację → realtime aktualizuje `adminConversations` u użytkownika B → useEffect odpala ponownie → `currentConvStatus` zmienia się na `'closed'` → pole wiadomości zmienia się na `🔒 Konwersacja została zamknięta przez administratora`
- Gdy admin ponownie otworzy konwersację → status zmieni się na `'open'` → pole do pisania wróci

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/pages/MessagesPage.tsx` | Dodać `adminConversations` do useEffect dependency |
| `src/components/chat-sidebar/ChatPanelContent.tsx` | Dodać `adminConversations` do useEffect dependency |

