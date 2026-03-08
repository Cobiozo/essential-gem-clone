
# Plan: Naprawić wyświetlanie danych prospekta w EventDetailsDialog

## Problem
`EventDetailsDialog` szuka pól `prospect_name`, `notes`, `goal` w JSON, ale `PartnerMeetingBooking` zapisuje dane pod innymi nazwami:
- `prospect_first_name` + `prospect_last_name` (nie `prospect_name`)
- `booking_notes` (nie `notes`)
- `consultation_purpose` (nie `goal`)

Dlatego na screenshocie brakuje imienia prospekta, notatek i celu.

## Zmiana

### `src/components/events/EventDetailsDialog.tsx`

1. Zmienić interfejs `prospectData` na prawidłowe pola:
   - `prospect_first_name`, `prospect_last_name`, `prospect_phone`, `prospect_email`
   - `booking_notes`, `consultation_purpose`

2. Zaktualizować rendering:
   - **Prospekt**: `prospect_first_name` + `prospect_last_name`
   - **Telefon**: `prospect_phone`
   - **Email**: `prospect_email`
   - **Cel konsultacji**: `consultation_purpose` (dla `partner_consultation`)
   - **Notatki**: `booking_notes`

3. Dodać sekcję "Prowadzący" z imieniem i nazwiskiem hosta (z `event.host_profile` lub `event.host_name`) w karcie danych spotkania, aby było jasne kto prowadzi.

Jeden plik do edycji: `EventDetailsDialog.tsx`
