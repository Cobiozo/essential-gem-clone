

# Fix: Textarea not using full width

## Problem
The current layout places 3 icon buttons (attachment, emoji, mic) on the **left side** of the textarea in a single flex row. This steals ~120px of horizontal space from the text input, leaving much of the input bar unused — especially visible on mobile/PiP.

## Fix
**File: `src/components/unified-chat/MessageInput.tsx`**

Restructure the input container from a single row to a **stacked layout**:

```text
┌─────────────────────────────────┐
│  textarea (full width)          │
│                                 │
│  📎  😊  🎤          [Send ➤]  │
└─────────────────────────────────┘
```

- Textarea spans the full width on top
- Bottom row: icons on the left (`flex`), send button on the right (`ml-auto`)
- Keep `rounded-2xl` container, `bg-muted/50` styling

### Key changes
1. Wrap in a vertical flex (`flex-col`) container
2. Textarea as the first child — full width, no icons beside it
3. Second child: horizontal flex row with icons left + send button right
4. Icons use `gap-1` for compact spacing, send button uses `ml-auto`

Single file edit. Textarea gets 100% of container width.

