
# Naprawa: zarejestrowane webinary nie widoczne w widżecie "Moje spotkania"

## Przyczyna

W `src/hooks/useEvents.ts` (linia 166-173) filtr liderski usuwa webinary/szkolenia hostowane przez liderów, jeśli użytkownik nie jest w downline danego lidera. Problem: filtr nie sprawdza, czy użytkownik jest **zarejestrowany** na to wydarzenie. Efekt: użytkownik zapisuje się na webinar (np. na stronie Webinary, gdzie filtr liderski nie działa), ale po powrocie na Dashboard wydarzenie znika z widżetu "Moje spotkania", bo `useEvents` je odfiltrowuje.

## Naprawa

### Plik: `src/hooks/useEvents.ts`

Jedna zmiana w linii 172 — dodanie warunku `event.is_registered`:

```typescript
// Przed:
return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id);

// Po:
return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id) || event.is_registered;
```

Logika: jeśli użytkownik jest już zarejestrowany na wydarzenie, powinien je widzieć niezależnie od filtra liderskiego. To jest spójne z filtrem spotkań indywidualnych (linia 145), który już stosuje taką zasadę.

## Zakres zmian
- `src/hooks/useEvents.ts` — jedna linia (172)
- Żadne inne pliki nie wymagają zmian
