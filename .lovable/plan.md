

# Fix: User cannot see admin messages

## Root Cause

Two issues found:

### 1. Deep-link from notification never fires (PRIMARY BUG)
In `MessagesPage.tsx` line 59-63, the `?user=` URL parameter handler has this condition:
```ts
if (userId && teamMembers.length > 0) {
```
If the user has **zero team members** (e.g., a client with no downline), this condition never becomes true, so clicking the notification link does nothing. Even for users with team members, the admin is not in `teamMembers`, but the effect still needs them loaded as a "ready" signal — this is fragile.

### 2. Deep-link uses wrong handler
`handleSelectDirectMember` is used for the `?user=` param, but it doesn't fetch admin conversation status. The user ends up with no `currentConvStatus`, so the closed/open state of the conversation isn't tracked.

## Fix — `src/pages/MessagesPage.tsx`

### Change 1: Fix the `?user=` URL handler
Replace the `teamMembers.length > 0` guard with a more reliable readiness check, and use `handleAdminSelectUser` when the target is an admin conversation:

```tsx
useEffect(() => {
    const userId = searchParams.get('user');
    if (!userId || !user) return;
    
    // Check if this user has an admin conversation with us
    const adminConv = adminConversations.find(c => c.userId === userId);
    if (adminConv) {
      handleAdminSelectUser(userId);
    } else if (teamMembers.length > 0) {
      handleSelectDirectMember(userId);
    } else {
      // Fallback: select even without team members loaded
      selectDirectMember(userId);
      setMobileView('chat');
    }
    setSearchParams({}, { replace: true });
}, [searchParams, user, teamMembers, adminConversations]);
```

### Change 2: Fix `effectiveDirectMember` for non-admin users
Remove the `isAdmin` guard on the `adminConversations` fallback so non-admin users also get the member info from admin conversations:

```tsx
const effectiveDirectMember = useMemo(() => {
    if (!selectedDirectUserId) return null;
    if (selectedDirectMember) return selectedDirectMember;
    // Check admin conversations for profile info (works for both admin and user side)
    const conv = adminConversations.find(c => c.userId === selectedDirectUserId);
    if (conv) {
      return {
        userId: conv.userId,
        firstName: conv.firstName,
        lastName: conv.lastName,
        role: conv.role,
        eqId: null,
        avatarUrl: conv.avatarUrl,
        isUpline: false,
        level: 0,
      };
    }
    return null;
}, [selectedDirectUserId, selectedDirectMember, adminConversations]);
```

## Summary
Two targeted changes in `src/pages/MessagesPage.tsx`:
1. Fix URL deep-link handler to work without team members and route admin conversations correctly
2. Remove `isAdmin` guard from `effectiveDirectMember` so both sides can resolve the conversation partner

