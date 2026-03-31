

# Center BO and HC category triggers

## Change

In `src/components/dashboard/widgets/WebinarInviteWidget.tsx`, update the `CollapsibleTrigger` layout from `justify-between` with left-aligned content to centered content.

**Line 188** — Change the trigger to center its content:
```tsx
<CollapsibleTrigger className="flex items-center justify-center w-full p-3 rounded-lg hover:bg-accent/50 transition-colors">
```

**Lines 189-201** — Restructure the inner content to be centered with the chevron inline (not pushed to the right):
```tsx
<div className="flex items-center gap-2">
  {hasLiveSlot && (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  )}
  <span className="font-semibold text-sm">{CATEGORY_LABELS[category]}</span>
  {hasLiveSlot && (
    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">LIVE</Badge>
  )}
  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
</div>
```

Single file edit: `src/components/dashboard/widgets/WebinarInviteWidget.tsx`

