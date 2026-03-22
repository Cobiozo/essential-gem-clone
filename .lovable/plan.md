

# Fix: News Ticker mobile display issues (iOS)

## Problem

The screenshot shows the ticker in **scroll (marquee) mode** is garbled on mobile — text with emojis/flags overlaps and becomes unreadable. The ticker sits inside the WelcomeWidget card which already has constrained width on mobile.

Root causes:
1. **No mobile-specific mode**: The marquee scroll animation doesn't work well on narrow screens (~375px) — items with emojis and long text overlap because `translateX(-50%)` assumes enough horizontal space
2. **Missing text size reduction**: `text-sm` is still relatively large when combined with emojis and icons in a narrow container
3. **No mobile fallback**: On small screens, the scroll mode should switch to **rotate** mode (one item at a time) for readability

## Solution

### File: `src/components/news-ticker/NewsTicker.tsx`

1. **Auto-switch to rotate mode on mobile**: Use `useIsMobile()` hook. When on mobile and `animationMode === 'scroll'`, force rotate mode instead — this shows one item at a time with fade transition, which is much more readable on narrow screens

2. **Add `text-xs` on mobile**: Add responsive font size to the ticker container: `text-xs sm:text-sm`

3. **Constrain ticker item content on mobile**: Ensure items in rotate mode truncate if still too long

### File: `src/components/news-ticker/TickerItem.tsx`

4. **Truncate long content on mobile**: Add `max-w-full` and truncation for the content span so text doesn't overflow the container on narrow screens

### Specific changes:

**NewsTicker.tsx** — import `useIsMobile`, determine effective animation mode:
```tsx
const isMobile = useIsMobile();
const effectiveMode = isMobile && settings.animationMode === 'scroll' 
  ? 'rotate' 
  : settings.animationMode;
```
Use `effectiveMode` in the render switch. Add `text-xs sm:text-sm` to container.

**TickerItem.tsx** — add `max-w-full overflow-hidden` to outer span, and `truncate max-w-[70vw]` to content text span for scroll mode (non-wrap).

### Files to change

| File | Change |
|------|--------|
| `src/components/news-ticker/NewsTicker.tsx` | Force rotate mode on mobile, add responsive text sizing |
| `src/components/news-ticker/TickerItem.tsx` | Add truncation/overflow handling for narrow screens |

