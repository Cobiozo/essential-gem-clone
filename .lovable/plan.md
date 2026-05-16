# Naprawa banera uzupełnienia profilu

## Problem
1. `ProfileFieldsBanner` jest renderowany w `App.tsx` na samym topie (linia 385), POZA `DashboardLayout`. Sidebar (fixed) i topbar zachodzą na baner — widać tylko fragmenty tekstu wystające zza nich.
2. Po uzupełnieniu brakujących pól w `/my-account` baner znika, ale użytkownik pozostaje na koncie — brak przekierowania do pulpitu.

## Rozwiązanie

### 1) Przeniesienie banera do layoutu (nad treść main)
- Usunąć `<ProfileFieldsBanner />` z `src/App.tsx` (linia 385).
- W `src/components/dashboard/DashboardLayout.tsx` wrenderować `<ProfileFieldsBanner />` wewnątrz `<main>` jako pierwszy element (nad `{children}`). Dzięki temu:
  - Baner jest w obszarze treści, po prawej od sidebaru i pod topbarem — nic go nie zasłania.
  - Pozostaje widoczny na każdej podstronie korzystającej z `DashboardLayout` (Dashboard, MyAccount, Admin itd.), tak samo jak obecnie.

### 2) Auto-redirect po uzupełnieniu danych
W `src/components/profile/ProfileFieldsBanner.tsx`:
- Trzymać `useRef(false)` znacznik `wasIncomplete`.
- W `useEffect([missing.length, location.pathname])`:
  - Jeśli `missing.length > 0` → `wasIncomplete.current = true`.
  - Jeśli `wasIncomplete.current === true && missing.length === 0 && location.pathname.startsWith('/my-account')` → `navigate('/dashboard')` i reset flagi.
- Dzięki temu redirect zachodzi tylko gdy użytkownik faktycznie uzupełnił brakujące dane na stronie konta (a nie np. od razu po otwarciu pulpitu z kompletnym profilem).

## Pliki
- `src/App.tsx` — usunąć render banera
- `src/components/dashboard/DashboardLayout.tsx` — dodać `<ProfileFieldsBanner />` nad `{children}` w `<main>`
- `src/components/profile/ProfileFieldsBanner.tsx` — dodać logikę auto-redirect po uzupełnieniu

## Bez zmian
- Logika wykrywania brakujących pól, konfiguracja banera, RLS, edge functions — bez zmian.
- Mapa świata (poprzednie zadanie) — bez zmian.
