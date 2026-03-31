

# Changes to WebinarInviteWidget

## 1. Header — centered, new text
Replace the current left-aligned header with:
- **Main title** (centered, larger/bold): `Zaproś Swojego Gościa na Live Webinar`
- **Subtitle** (centered, small, muted): `kliknij, wybierz webinar, dobierz termin i skopiuj zaproszenie`
- Keep the Radio icon + LIVE indicator

## 2. Accordion behavior — only one open at a time
Currently each `CategoryColumn` manages its own `isOpen` state independently. Change to:
- Lift state up: add `openCategory: AutoWebinarCategory | null` state in `WebinarInviteWidget`
- Pass `isOpen` and `onToggle` props to each `CategoryColumn`
- When one opens, the other closes automatically

## File: `src/components/dashboard/widgets/WebinarInviteWidget.tsx`

### Header change (lines 298-302)
```tsx
<div className="flex flex-col items-center gap-1 py-1">
  <div className="flex items-center gap-2">
    <Radio className="h-5 w-5 text-red-500" />
    <h2 className="text-base font-bold text-foreground">Zaproś Swojego Gościa na Live Webinar</h2>
  </div>
  <p className="text-xs text-muted-foreground">kliknij, wybierz webinar, dobierz termin i skopiuj zaproszenie</p>
</div>
```

### Accordion logic
- Add `openCategory` state + handler in `WebinarInviteWidget`
- Remove internal `isOpen` state from `CategoryColumn`, accept `isOpen` + `onOpenChange` as props
- `onOpenChange` toggles: if opening this category → set it; if closing → set null

