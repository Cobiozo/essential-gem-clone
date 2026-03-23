

# Fix: Three issues — ticker scroll on mobile, contacts layout, ticker non-clickable

## Issues

1. **Ticker forced to rotate on mobile** — admin's "scroll" setting is overridden to "rotate" on mobile. User wants scroll mode to work on mobile too.
2. **Private contacts sub-tabs overflow on mobile** — 4 buttons ("Moja lista kontaktów", "Z zaproszeń na wydarzenia", "Z Mojej Strony Partnera", "Usunięte") are in a non-wrapping `flex` row, crushing text on narrow screens (visible in screenshot).
3. **Ticker items are clickable** — `TickerItem.tsx` wraps items with `linkUrl` in an `<a>` tag. All clickability must be removed.

## Solution

### File: `src/components/news-ticker/NewsTicker.tsx`

**Remove mobile scroll→rotate override** (lines 119-122):
- Delete the `isMobile` forced override. Use `settings.animationMode` directly for all devices.
- Keep `useIsMobile` import if needed elsewhere, or remove it.

### File: `src/components/news-ticker/TickerItem.tsx`

**Remove all clickable behavior** (lines 68-79):
- Remove the `<a>` tag wrapper for items with `linkUrl`. Always render `{content}` directly without any link wrapping.
- Remove `hover:underline hover:opacity-80` styles.

### File: `src/components/team-contacts/TeamContactsTab.tsx`

**Make sub-tabs scrollable/wrapping on mobile** (line 337):
- Change the sub-tabs container from `flex items-center gap-2` to `flex items-center gap-2 flex-wrap` so buttons wrap to a second line on narrow screens instead of overflowing.
- Optionally add `overflow-x-auto` as fallback.

### Files to change

| File | Change |
|------|--------|
| `src/components/news-ticker/NewsTicker.tsx` | Remove mobile scroll→rotate override, use admin setting on all devices |
| `src/components/news-ticker/TickerItem.tsx` | Remove `<a>` link wrapper — items must not be clickable |
| `src/components/team-contacts/TeamContactsTab.tsx` | Add `flex-wrap` to private contacts sub-tabs container |

