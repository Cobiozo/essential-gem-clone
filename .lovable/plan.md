

# Fix: Browser auto-translation breaking React app

## Problem
When users enable browser auto-translation (Chrome Translate, Safari, etc.), it modifies the DOM directly — inserting `<font>` tags, replacing text nodes, wrapping content in `<span>`. This breaks React's virtual DOM reconciliation, causing crashes, broken event handlers, and UI glitches.

## Solution — two-pronged approach

### 1. Disable browser auto-translate on the app (`index.html`)
Add the `translate="no"` attribute and the `notranslate` class to the `<html>` tag, plus the Google-specific meta tag. This tells all major browsers (Chrome, Edge, Safari, Firefox) to NOT offer auto-translation.

```html
<html lang="en" translate="no" class="notranslate">
  <head>
    <meta name="google" content="notranslate" />
```

This is the standard, widely-adopted fix used by Gmail, Google Docs, and most React SPAs.

### 2. Set `lang` attribute dynamically (already done)
The app already sets `document.documentElement.lang = language` in `LanguageContext.tsx`. This further signals browsers that the page is already in the user's language, reducing translation prompts.

## Why this is safe
- The app has its own multi-language system (i18n with database translations)
- Browser translation is redundant and destructive to React
- Users who need a different language can use the built-in language selector

## Files to change

| File | Change |
|---|---|
| `index.html` | Add `translate="no"` + `class="notranslate"` to `<html>`, add `<meta name="google" content="notranslate" />` |

## Scope
Single file, 2-line change. No risk to existing functionality.

