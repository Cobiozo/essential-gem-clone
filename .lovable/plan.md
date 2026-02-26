

## Naprawa wyświetlania surowych kluczy tłumaczeń w `ContactEventInfoButton`

### Problem

Komponent używa wzorca `t('key') || 'fallback'`, który nie działa, ponieważ `t()` zwraca klucz (np. `"teamContacts.eventRegistrations"`) gdy brak tłumaczenia -- a to jest wartość "truthy", więc fallback nigdy się nie pojawia.

### Rozwiązanie

Zamienić wszystkie wystąpienia `t(key) || 'fallback'` na `tf(key, 'fallback')` w pliku `src/components/team-contacts/ContactEventInfoButton.tsx`.

Helper `tf()` jest już dostępny w `useLanguage()` i sprawdza, czy wynik `t()` różni się od klucza przed zwróceniem fallbacku.

### Zmiany w pliku `ContactEventInfoButton.tsx`

1. Zmienić destrukturyzację z `const { t } = useLanguage()` na `const { t, tf } = useLanguage()`

2. Zamienić wszystkie wywołania (7 miejsc):
   - `t('common.loading') || 'Ładowanie...'` -> `tf('common.loading', 'Ładowanie...')`
   - `t('teamContacts.registeredFor') || 'Zarejestrowany na'` -> `tf('teamContacts.registeredFor', 'Zarejestrowany na')`
   - `t('teamContacts.meeting') || 'spotkanie'` -> `tf('teamContacts.meeting', 'spotkanie')`
   - `t('teamContacts.meetings') || 'spotkań'` -> `tf('teamContacts.meetings', 'spotkań')`
   - `t('teamContacts.noRegistrations') || 'Brak rejestracji na spotkania'` -> `tf('teamContacts.noRegistrations', 'Brak rejestracji na spotkania')`
   - `t('teamContacts.registered') || 'Zarejestrowany'` -> `tf('teamContacts.registered', 'Zapisano')`
   - `t('teamContacts.cancelled') || 'Anulowany'` -> `tf('teamContacts.cancelled', 'Anulowany')`
   - `t('teamContacts.eventRegistrations') || 'Rejestracje na spotkania'` -> `tf('teamContacts.eventRegistrations', 'Rejestracje na spotkania')`

Zakres: 1 plik, brak zmian w bazie.
