## Problem

Kliknięcie "Podgląd" przy formularzu rejestracyjnym (`/event-form/<slug>`) przekierowuje na ekran logowania zamiast pokazać publiczny formularz. Powód: ścieżka `/event-form/` nie znajduje się na liście `PUBLIC_PATHS` w `src/components/profile/ProfileCompletionGuard.tsx`, więc `ProtectedRouteGuard` traktuje ją jako trasę chronioną i wymusza login + uzupełnienie profilu.

Trasa jest poprawnie zarejestrowana w `src/App.tsx` i komponent `EventFormPublicPage` istnieje — brakuje wyłącznie reguły publicznego dostępu.

## Naprawa (1 plik)

### `src/components/profile/ProfileCompletionGuard.tsx`
Dodać `'/event-form/'` do tablicy `PUBLIC_PATHS`. Pokrywa to wszystkie warianty:
- `/event-form/:slug` — publiczny formularz rejestracyjny
- `/event-form/confirm/:token` — potwierdzenie e-mail
- `/event-form/cancel/:token` — anulowanie zapisu

Dzięki użyciu `startsWith` jeden wpis załatwia wszystkie trzy trasy.

## Efekt

- Przycisk "Podgląd" w panelu admina (Eventy → Formularze) otwiera w nowej karcie działający publiczny formularz, dostępny też dla niezalogowanych gości — co jest oczekiwane (formularze rejestracyjne na wydarzenia są publiczne, jak np. `/e/:slug`).
- Linki partnerskie `/event-form/<slug>?ref=<kod>` działają dla zaproszonych gości bez wymagania konta.
