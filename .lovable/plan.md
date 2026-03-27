

## Plan: Wysłanie jednorazowego emaila "missed_event" do tatanabacznosci@gmail.com

### Dane z bazy
Najnowsza rejestracja gościa:
- **Email**: tatanabacznosci@gmail.com
- **Imię**: Janek, **Nazwisko**: Burczymucha
- **Event**: "Bussines Opportunity" (event_id: `15ea8422-9d1b-471c-bc12-727f3e3c9cc5`)
- **Zapraszający**: user_id `629a2d9a-994a-4e6a-a9c4-8ae0b07e3770`
- **Registration ID**: `9198dd44-8412-46ea-9984-cf8375782432`

### Działanie
Jednorazowe wywołanie Edge Function `send-post-event-thank-you` z parametrami:
```json
{
  "event_id": "15ea8422-9d1b-471c-bc12-727f3e3c9cc5",
  "recipient_email": "tatanabacznosci@gmail.com",
  "recipient_name": "Janek",
  "event_title": "Bussines Opportunity",
  "inviter_user_id": "629a2d9a-994a-4e6a-a9c4-8ae0b07e3770",
  "email_type": "missed_event",
  "source_type": "guest_event_registration",
  "source_id": "9198dd44-8412-46ea-9984-cf8375782432"
}
```

Użyję narzędzia `supabase--curl_edge_functions` do wywołania tej funkcji. Żadne pliki nie będą modyfikowane — to jednorazowe wywołanie istniejącej funkcji.

