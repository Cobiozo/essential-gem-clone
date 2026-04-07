

# Fix: Show PLC OMEGA BASE widget in PiP mode

## Problem
The widget hides when the chat is in **any** open mode (docked or floating). User wants it visible during PiP (floating) — only hidden when sidebar (docked) is open.

## Fix
**File: `src/components/MedicalChatWidget.tsx`** — line 66

Change:
```typescript
if (chatSidebar?.isDocked || chatSidebar?.isFloating) return null;
```
To:
```typescript
if (chatSidebar?.isDocked) return null;
```

One-line change. The widget will reappear when switching to PiP mode and only hide when the docked sidebar is active.

