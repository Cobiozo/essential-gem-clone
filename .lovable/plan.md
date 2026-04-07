

# Fix: `useChatSidebar must be used within ChatSidebarProvider`

## Problem
`MedicalChatWidget` calls `useChatSidebar()` but is rendered in `App.tsx` outside the `ChatSidebarProvider` (which only wraps `DashboardLayout`). This crashes the entire app.

## Solution
Make `MedicalChatWidget` safe to use outside the provider by using `useContext` directly with a null check instead of the throwing `useChatSidebar` hook.

### File: `src/components/MedicalChatWidget.tsx`
- Replace `useChatSidebar()` import with a direct `useContext` call on `ChatSidebarContext`
- If context is `null` (outside provider), default `isOpen` to `false` — widget stays visible as normal
- If context exists (inside dashboard), hide widget when chat is open

This is a one-line-level fix — no architectural changes needed.

