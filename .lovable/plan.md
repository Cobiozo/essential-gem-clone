
# Plan: Dostosowanie wyglądu czatu do referencji

## Różnice między obecnym wyglądem a referencją

| Element | Obecne | Referencja |
|---------|--------|------------|
| **Sidebar - nagłówek** | Brak nagłówka "Konwersacje" | Wyraźny nagłówek "Konwersacje" na górze |
| **Sidebar - elementy listy** | Z ikonami w kółkach | Proste tekstowe linki bez ikon |
| **Sidebar - zaznaczenie** | Primary color fill | Subtelne niebieskie tło z linią po lewej |
| **Sidebar - sekcje** | "Wyślij do" / "Odebrane od" z uppercase | Proste rozdzielenie bez nagłówków sekcji |
| **Header czatu** | Z ikoną w kółku i podtytułem | Prosty tekst nazwy kanału |
| **MessageBubble** | Avatar z boku wiadomości | Avatar obok nazwy nadawcy nad bańką |
| **Message input** | Przyciski w rzędzie obok textarea | Ikony (spinacz, emoji, mikrofon) na początku, turkusowy przycisk wysłania |
| **Background** | Solidne tło | Lekko przezroczyste/białe tło |

---

## Zmiany do wprowadzenia

### 1. `ConversationsSidebar.tsx` - Uproszczony wygląd

**Zmiany:**
- Dodanie nagłówka "Konwersacje" na górze
- Usunięcie ikon w kółkach - tylko tekst
- Zmiana stylowania zaznaczonego elementu (lekkie niebieskie tło + linia po lewej zamiast fill)
- Usunięcie uppercase nagłówków sekcji "Wyślij do" / "Odebrane od"
- Prostsze, bardziej minimalistyczne elementy listy

```typescript
// Nowy nagłówek
<div className="p-4 pb-2">
  <h2 className="text-lg font-semibold text-foreground">Konwersacje</h2>
</div>

// Uproszczony ChannelItem
<button
  className={cn(
    'w-full text-left px-3 py-2 transition-colors text-sm',
    isSelected
      ? 'bg-primary/10 text-primary border-l-2 border-primary'
      : 'hover:bg-muted text-foreground'
  )}
>
  {channel.name}
</button>
```

### 2. `ChatHeader.tsx` - Uproszczony header

**Zmiany:**
- Usunięcie ikony w kółku
- Tylko nazwa kanału jako tekst + ikona search po prawej

```typescript
<div className="h-14 px-4 border-b border-border flex items-center justify-between bg-background/80">
  <h3 className="font-semibold text-foreground">{channel.name}</h3>
  <Button variant="ghost" size="icon">
    <Search className="h-4 w-4" />
  </Button>
</div>
```

### 3. `MessageBubble.tsx` - Layout zgodny z referencją

**Zmiany:**
- Avatar obok nazwy nadawcy (nad bańką), nie z boku bańki
- Zmiana układu: avatar | nazwa | godzina w jednym wierszu
- Bańka wiadomości pod spodem (ciemno-szara jak na screenie)

```typescript
<div className="flex items-start gap-3">
  <Avatar className="h-9 w-9 bg-primary text-primary-foreground">
    <AvatarFallback>{message.senderInitials}</AvatarFallback>
  </Avatar>
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="font-medium">{message.senderName}</span>
      <span className="text-xs text-muted-foreground">{formatTime(...)}</span>
    </div>
    <div className="bg-muted px-4 py-2 rounded-lg inline-block">
      <p>{message.content}</p>
    </div>
  </div>
</div>
```

### 4. `MessageInput.tsx` - Wygląd zgodny z referencją

**Zmiany:**
- Ikony (spinacz, emoji, mikrofon) po lewej stronie inputa
- Input jako jednoliniowy z placeholder
- Turkusowy okrągły przycisk wysyłania po prawej

```typescript
<div className="p-4 border-t border-border bg-background/80">
  <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2">
    {/* Icons */}
    <Paperclip className="h-5 w-5 text-muted-foreground cursor-pointer" />
    <Smile className="h-5 w-5 text-muted-foreground cursor-pointer" />
    <Mic className="h-5 w-5 text-muted-foreground cursor-pointer" />
    
    {/* Input */}
    <Input 
      placeholder="Wpisz wiadomość..."
      className="flex-1 bg-transparent border-none shadow-none"
    />
    
    {/* Send button - turkusowy okrągły */}
    <Button 
      size="icon" 
      className="h-10 w-10 rounded-full bg-cyan-500 hover:bg-cyan-600"
    >
      <Send className="h-4 w-4 text-white" />
    </Button>
  </div>
</div>
```

### 5. `UnifiedChatWidget.tsx` - Tło i obramowanie

**Zmiany:**
- Lekko przezroczyste białe tło
- Subtelniejsze obramowanie

```typescript
<div className="flex h-[600px] bg-background/90 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm">
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `ConversationsSidebar.tsx` | Dodanie nagłówka "Konwersacje", usunięcie ikon, prostsze zaznaczenie |
| `ChatHeader.tsx` | Usunięcie ikony, prostszy layout |
| `MessageBubble.tsx` | Avatar nad bańką, nie z boku |
| `MessageInput.tsx` | Ikony po lewej, turkusowy przycisk wysyłania |
| `UnifiedChatWidget.tsx` | Przezroczyste tło, delikatniejsze style |

---

## Zachowana funkcjonalność

Wszystkie zmiany są czysto wizualne:
- Logika kanałów role-based pozostaje bez zmian
- Wysyłanie i odbieranie wiadomości działa identycznie
- Real-time i powiadomienia działają bez zmian
- Hierarchia ról i uprawnienia pozostają takie same
