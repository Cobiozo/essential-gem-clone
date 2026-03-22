

# Fix: Mobile layout issues in Team Contacts accordion cards

## Problem

On iPhone (narrow screens ~375px), the contact card header row overflows because:

1. **Action buttons row doesn't collapse** — Up to 6 icon buttons (Invite, EventInfo, History, Edit, Delete, Chevron) sit in a non-wrapping `flex` row alongside the contact info, squeezing the text area to near-zero width
2. **EQID text breaks vertically** — With almost no horizontal space left, "EQID: ..." wraps character-by-character
3. **Badges overflow** — Role badge + Status badge + EQID line all compete for the tiny remaining space

## Solution

### File: `src/components/team-contacts/TeamContactAccordion.tsx`

**1. Restructure collapsed header for mobile** (lines 182-291):
- Change the main layout from horizontal `flex justify-between` to a stacked layout on mobile
- Top row: Avatar + Name + Badges + Chevron toggle (essential info)
- Bottom row (mobile only): Action buttons in a scrollable/wrapping row
- Use responsive classes: `flex-col sm:flex-row`

**2. Move action buttons below on mobile** (lines 231-290):
- Wrap action buttons in a container that shows as inline on desktop but as a separate row on mobile
- Add `flex-wrap` and `gap-1` for mobile
- Hide less critical buttons behind a "more" menu on very small screens, OR simply allow wrapping

**3. EQID line — add `whitespace-nowrap` and `truncate`** (lines 223-227):
- Prevent character-level breaking with `whitespace-nowrap truncate`

**4. Expanded details grid** (line 296):
- Already uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — OK

### Specific changes:

**Header restructure:**
```tsx
// Outer container: stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 cursor-pointer gap-2" ...>
  {/* Top: avatar + name + chevron */}
  <div className="flex items-center gap-3 flex-1 min-w-0">
    {/* avatar */}
    <div className="flex-1 min-w-0">
      {/* name, badges, EQID with truncation */}
    </div>
    {/* Chevron always visible, right-aligned */}
    <Button variant="ghost" size="icon" className="flex-shrink-0">...</Button>
  </div>
  {/* Action buttons: wrap on mobile */}
  <div className="flex items-center gap-1 flex-wrap pl-14 sm:pl-0">
    {/* buttons */}
  </div>
</div>
```

**EQID fix:**
```tsx
<p className="text-sm text-muted-foreground whitespace-nowrap truncate">
  EQID: <span className="font-mono">{contact.eq_id || '-'}</span>
</p>
```

**Event badges — limit display on mobile:**
- Add `max-w-full overflow-hidden` to the event badges container

### Files to change

| File | Change |
|------|--------|
| `src/components/team-contacts/TeamContactAccordion.tsx` | Restructure card header for mobile: stack layout, wrap action buttons, truncate EQID |

