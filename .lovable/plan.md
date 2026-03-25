

# Zmiana URL z `/auto-webinar/watch/` na `/a-w/`

## Problem
Link wysyłany gościom zawiera `/auto-webinar/watch/` w URL, co zdradza że to nie jest transmisja na żywo.

## Zmiany

Zamiana ścieżki `/auto-webinar/watch/:slug` → `/a-w/:slug` w 4 plikach:

| Plik | Zmiana |
|---|---|
| `src/App.tsx` | Route path: `/auto-webinar/watch/:slug` → `/a-w/:slug` |
| `src/App.tsx` | knownPrefixes: dodać `/a-w` |
| `src/pages/EventGuestRegistration.tsx` | roomLink URL: `/auto-webinar/watch/` → `/a-w/` |
| `src/pages/EventRegistrationBySlug.tsx` | redirect target: `/auto-webinar/watch/` → `/a-w/` |
| `src/components/profile/ProfileCompletionGuard.tsx` | PUBLIC_PATHS: `/auto-webinar/watch/` → `/a-w/` |

Stara ścieżka `/auto-webinar` (panel admina, bez `/watch/`) zostaje bez zmian — goście jej nie widzą.

