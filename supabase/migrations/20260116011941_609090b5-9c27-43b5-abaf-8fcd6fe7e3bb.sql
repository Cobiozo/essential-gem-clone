-- Add registration_form_config column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_form_config JSONB DEFAULT '{
  "fields": [
    {"id": "email", "type": "email", "label": "Email", "required": true, "enabled": true},
    {"id": "first_name", "type": "text", "label": "Imię", "required": true, "enabled": true},
    {"id": "last_name", "type": "text", "label": "Nazwisko", "required": false, "enabled": true},
    {"id": "phone", "type": "tel", "label": "Telefon", "required": false, "enabled": true}
  ],
  "submitButtonText": "Zapisz się na webinar",
  "successMessage": "Dziękujemy za zapisanie się!"
}'::jsonb;