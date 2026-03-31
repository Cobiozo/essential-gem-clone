

# Admin Direct Conversations — Search, Initiate, Close

## Overview
Admin gets a user search in the messages sidebar to find ANY user in the system and start a 1:1 conversation. Users can reply only after admin writes first. Admin can close the conversation via a button, after which the user can no longer write to admin.

## New DB Table: `admin_conversations`

Tracks admin-initiated conversation threads and their open/closed status.

```sql
CREATE TABLE public.admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  UNIQUE(admin_user_id, target_user_id)
);

ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_full_access" ON public.admin_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can see their own conversations (to check status)
CREATE POLICY "user_read_own" ON public.admin_conversations
  FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());
```

## Changes

### 1. `src/components/messages/AdminUserSearch.tsx` (NEW)
- Search input with debounce in the sidebar (visible only for admin)
- Queries `profiles` table by name/email
- Shows results as a dropdown list
- On click: opens DM with that user + creates `admin_conversations` record if none exists

### 2. `src/components/messages/FullChatWindow.tsx` (EDIT)
- For admin viewing a DM: add "Zakończ konwersację" button in the header
- Calls update on `admin_conversations` setting `status = 'closed'`
- For non-admin users: check if conversation is open before showing input; if closed, show "Konwersacja została zamknięta przez administratora"

### 3. `src/hooks/useUnifiedChat.ts` (EDIT)
- **Admin sidebar**: When admin, also fetch users with existing `admin_conversations` and show them in the team members section (or a separate "Konwersacje z użytkownikami" section)
- **sendDirectMessage**: For non-admin users sending to admin — check `admin_conversations` status first; if no record or closed → block send
- **New functions**: `openAdminConversation(targetUserId)`, `closeAdminConversation(targetUserId)`
- Admin's `selectDirectMember` should work for ANY user (not just team members)

### 4. `src/components/messages/MessagesSidebar.tsx` (EDIT)
- For admin role: render `AdminUserSearch` component above the team members section
- Show a separate "Konwersacje admina" section listing active admin conversations

### 5. `src/pages/MessagesPage.tsx` (EDIT)
- Pass `closeConversation` handler to `FullChatWindow`
- Handle admin conversation state (open/closed) for controlling input visibility

## Flow

```text
Admin:
1. Types username in search → sees results
2. Clicks user → opens DM, admin_conversations record created (status: 'open')
3. Sends messages normally
4. Clicks "Zakończ konwersację" → status = 'closed'

User:
1. Sees admin in their conversations (once admin writes first)
2. Can reply while status = 'open'
3. After admin closes → message input replaced with "Konwersacja zamknięta"
4. Cannot initiate new conversation with admin
```

## Files Summary

| File | Action |
|------|--------|
| Migration: `admin_conversations` table | NEW |
| `src/components/messages/AdminUserSearch.tsx` | NEW |
| `src/hooks/useUnifiedChat.ts` | EDIT — admin search, conversation management |
| `src/components/messages/MessagesSidebar.tsx` | EDIT — admin search section |
| `src/components/messages/FullChatWindow.tsx` | EDIT — close button + blocked input |
| `src/pages/MessagesPage.tsx` | EDIT — wire up conversation state |

