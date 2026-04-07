

# Ukrywanie ikony czatu w topbarze gdy brak uprawnień

## Problem
Ikona czatu (MessageSquare) w `DashboardTopbar` jest zawsze widoczna, nawet gdy administrator wyłączył dostęp do czatu dla danej roli użytkownika poprzez ustawienia widoczności (`chat_sidebar_visibility`).

## Rozwiązanie

**Plik: `src/components/dashboard/DashboardTopbar.tsx`**

1. Zaimportować `useChatSidebarVisibility` i `isRoleVisibleForChat` z `@/hooks/useChatSidebarVisibility`
2. Zaimportować `useAuth` (już jest) — użyć `userRole` do pobrania roli
3. Wywołać hook `useChatSidebarVisibility()` i sprawdzić `isRoleVisibleForChat(chatVisibility, role)`
4. Warunkowo renderować przycisk czatu (linie 129-138) — wyświetlać go tylko gdy `isRoleVisibleForChat` zwraca `true`

### Szczegóły techniczne

```tsx
// Dodać importy
import { useChatSidebarVisibility, isRoleVisibleForChat } from '@/hooks/useChatSidebarVisibility';

// W komponencie - użyć istniejącego useAuth + dodać hook
const { profile, signOut, isAdmin, userRole } = useAuth();
const { data: chatVisibility } = useChatSidebarVisibility();
const isChatVisible = isRoleVisibleForChat(chatVisibility, userRole?.role);

// Warunkowo renderować przycisk czatu
{isChatVisible && (
  <Button variant={...} onClick={chatSidebar.toggleDocked}>
    <MessageSquare />
  </Button>
)}
```

Jeden plik do edycji. Reużycie istniejącego hooka i funkcji helper — ten sam mechanizm co w sidebarze.

