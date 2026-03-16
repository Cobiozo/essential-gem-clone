

# Problem: kontakty prywatne z webinarów — duplikaty ignorowane

## Diagnoza

W `send-webinar-confirmation/index.ts` (linia 202-208) wyszukiwanie istniejącego kontaktu odbywa się **wyłącznie po emailu**:

```typescript
.eq('user_id', invitedByUserId)
.eq('email', email)
.eq('contact_type', 'private')
.maybeSingle();
```

Skutek: gdy "testomir testujący" rejestruje się na drugi webinar z **tym samym emailem ale innym numerem telefonu**, system znajduje istniejący kontakt po emailu i nie tworzy nowego. Zapraszający nie widzi, że gość podał inny numer.

## Wymaganie

Kontakt prywatny z rejestracji na wydarzenie ma być zapisany **dokładnie tak, jak wpisał rejestrujący**. Jeśli email LUB telefon różni się od istniejących kontaktów prywatnych — tworzy się **nowy kontakt**.

## Plan naprawy

### Zmiana w `supabase/functions/send-webinar-confirmation/index.ts`

Zmienić logikę dopasowania kontaktu (linie 201-265):

1. **Pobrać WSZYSTKIE kontakty prywatne** tego zapraszającego (nie `.maybeSingle()`)
2. **Szukać exact match** po email + phone_number (oba muszą się zgadzać)
3. Jeśli brak exact match → **zawsze tworzyć nowy kontakt** z dokładnymi danymi z formularza
4. Jeśli exact match istnieje i jest nieaktywny → reaktywować
5. Jeśli exact match istnieje i jest aktywny → tylko powiązać z rejestracją

Logika w pseudokodzie:
```text
existingContact = team_contacts WHERE
  user_id = invitedByUserId AND
  contact_type = 'private' AND
  lower(email) = lower(inputEmail) AND
  phone_number = inputPhone

if (!existingContact) → INSERT nowy kontakt
else if (!existingContact.is_active) → reaktywuj
else → powiąż z rejestracją
```

### Plik do zmiany
| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-webinar-confirmation/index.ts` | Zmiana logiki dopasowania kontaktu: email+phone zamiast samego email |

Zmiana dotyczy jednego bloku kodu (~60 linii). Nie wymaga migracji bazy danych.

