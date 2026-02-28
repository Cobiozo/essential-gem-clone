

## Dodanie odznaki nieprzeczytanych wiadomości przy ikonce Czatu w sidebarze

### Problem

Pozycja "Czat" w menu bocznym (sidebar) nie wyświetla liczby nieprzeczytanych wiadomości. Użytkownik nie wie, że ma nowe wiadomości, dopóki nie wejdzie na stronę czatu.

### Rozwiązanie

Dodanie Badge z liczbą nieprzeczytanych wiadomości obok tekstu "Czat" w sidebarze. Badge będzie widoczny tylko gdy są nieprzeczytane wiadomości (analogicznie do NotificationBell).

### Plik do zmiany

**`src/components/dashboard/DashboardSidebar.tsx`**:

1. Zaimportować `useUnifiedChat` z `@/hooks/useUnifiedChat`
2. Zaimportować `Badge` z `@/components/ui/badge`
3. Wywołać `useUnifiedChat({ enableRealtime: false })` w komponencie, aby pobrać `totalUnread`
4. W renderowaniu menu items -- dla pozycji z `item.id === 'chat'`, dodać Badge z liczbą nieprzeczytanych obok tekstu:

```text
<item.icon className="h-4 w-4" />
<span>{getLabel(item.labelKey)}</span>
{item.id === 'chat' && totalUnread > 0 && (
  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs ml-auto">
    {totalUnread > 99 ? '99+' : totalUnread}
  </Badge>
)}
```

Badge zostanie dodany w trzech miejscach renderowania SidebarMenuButton (submenu parent, mobile, desktop) aby działał niezależnie od trybu widoku.

### Szczegóły

- `enableRealtime: false` -- unread counts odświeżają się przy nawigacji, bez ciągłej subskrypcji (oszczędność zasobów)
- Badge używa `variant="destructive"` (czerwony) -- spójne z innymi odznaczeniami w aplikacji
- Limit "99+" zapobiega rozciąganiu layoutu przy dużej liczbie wiadomości
