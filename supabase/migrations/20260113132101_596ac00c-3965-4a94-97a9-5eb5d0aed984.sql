-- Usuń wszystkie anulowane rejestracje (pozwoli na ponowne zapisanie się)
DELETE FROM event_registrations WHERE status = 'cancelled';