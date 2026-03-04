

# Plan: Fix contact save reliability and error feedback

## Root cause analysis

From the network logs, the most recent save attempt actually **succeeded** (PATCH returned 200). However, there are several fragility issues that can cause intermittent failures:

1. **History insert can cause false failure**: In `updateContact`, the history insert (line 187-193) is inside the same try/catch as the update itself. If the history insert fails, the catch block shows "Nie udalo sie zaktualizowac kontaktu" even though the contact WAS saved successfully.

2. **Generic error message**: `updateContact` shows `'Nie udalo sie zaktualizowac kontaktu'` without `error.message` - impossible to diagnose.

3. **Form sends unnecessary fields on edit**: The form always sends `is_active: true`, `contact_type: 'private'`, `eq_id: null`, `linked_user_id: null`, `role: 'client'`, `reminder_sent: false` - this overwrites values that shouldn't change during edit (especially `reminder_sent: false` resets already-sent reminders).

4. **No error state in form**: If save fails, the user only sees a toast (easily missed). The form should show inline error feedback.

## Changes

### `src/hooks/useTeamContacts.ts`
- Make history insert **non-blocking** (wrap in separate try/catch) so it can't cause false "update failed" errors
- Show `error.message` in the error toast (like already done for `addContact`)

### `src/components/team-contacts/PrivateContactForm.tsx`
- **On edit**: only send changed/editable fields, do NOT send `is_active`, `contact_type`, `eq_id`, `linked_user_id`, `role`, `reminder_sent`
- Add `error` state to display inline error message in the form when save fails
- Make `onSubmit` return a boolean so the form can react to success/failure

### `src/components/team-contacts/TeamContactsTab.tsx`
- Update `handleEditContact` to propagate success/failure back to the form

