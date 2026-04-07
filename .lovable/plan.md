

# Fix: Input text not fully visible before sending

## Problem
The message input uses a single-line `<Input>` (HTML `<input>`) inside a fixed-width container with icons on both sides. Long text gets clipped because:
1. `<input>` is single-line — no wrapping
2. The input shares horizontal space with 4 icon buttons + send button in a `flex` row with `rounded-full` pill shape

## Fix
**File: `src/components/unified-chat/MessageInput.tsx`**

Replace `<Input>` with a `<textarea>` that auto-grows:
- Use a `<textarea>` with `rows={1}` and auto-resize on input (up to ~4 lines max)
- Remove `rounded-full` from the container — switch to `rounded-2xl` to accommodate multi-line
- Keep icons on the left side and send button on the right, but align them to the bottom (`items-end`) so they stay near the text line
- Apply same transparent/borderless styling as current input

### Key changes

```tsx
// Replace <Input> with auto-growing <textarea>
<textarea
  value={message}
  onChange={(e) => {
    setMessage(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }}
  onKeyDown={handleKeyDown}
  placeholder="Wpisz wiadomość..."
  disabled={disabled || sending}
  rows={1}
  className="flex-1 bg-transparent border-0 shadow-none focus:outline-none focus-visible:ring-0 resize-none text-sm px-2 py-2 max-h-[120px]"
/>
```

Container change: `rounded-full` → `rounded-2xl`, `items-center` → `items-end`

Single file edit. Works on both desktop and mobile.

