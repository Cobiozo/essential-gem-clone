

# Bulk selection and deletion for auto-webinar guest list

## Changes to `src/components/admin/AutoWebinarGuestStats.tsx`

### New state
- `selectedIds: Set<string>` — tracks checked guest IDs
- `showBulkDeleteDialog: boolean` — controls bulk delete confirmation

### UI additions

1. **Checkbox column** — new first column in table header with "select all" checkbox (toggles all visible filtered guests), and per-row checkboxes
2. **Bulk action bar** — appears above table when `selectedIds.size > 0`, showing count of selected items and a "Usuń zaznaczonych" (Delete selected) button with Trash2 icon
3. **Bulk delete dialog** — AlertDialog confirming deletion of N selected guests

### Logic
- `handleBulkDelete()` — loops through `selectedIds`, updates each to `status: 'cancelled'` via single Supabase `.in('id', [...selectedIds])` update call, then refreshes and clears selection
- "Select all" checkbox selects/deselects only currently filtered non-cancelled guests
- Selection clears when filters change (via useEffect on filtered)
- ColSpan values updated from 8 to 9 for empty/loading states

### File changes
| File | Change |
|------|--------|
| `src/components/admin/AutoWebinarGuestStats.tsx` | Add selection state, checkbox column, bulk action bar, bulk delete dialog |

