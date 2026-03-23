
# Fix: Form input text color too light

## Problem
In `PartnerFormModal.tsx`, the `<input>` and `<textarea>` elements don't have an explicit text color class, so they inherit a light color (likely from the global theme's CSS variables). The typed text appears very faint instead of black.

## Solution

### File: `src/components/partner-page/sections/PartnerFormModal.tsx`

Add `text-gray-900` to both the `<input>` (line 189) and `<textarea>` (line 180) className strings to ensure typed text is dark/black.

| Line | Change |
|------|--------|
| 180 | Add `text-gray-900` to textarea className |
| 189 | Add `text-gray-900` to input className |
