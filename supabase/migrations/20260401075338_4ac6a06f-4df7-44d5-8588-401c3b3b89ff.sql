
-- First ensure Norwegian exists in i18n_languages
INSERT INTO public.i18n_languages (code, name, native_name, is_active, is_default)
VALUES ('no', 'Norwegian', 'Norsk', true, false)
ON CONFLICT (code) DO NOTHING;

-- Now insert teamContacts.* translation keys
DO $$
DECLARE
  v_namespace TEXT := 'teamContacts';
  v_keys JSONB := '[
    {"key":"historyTitle","pl":"Historia zmian","en":"Change history","de":"Änderungsverlauf","no":"Endringslogg"},
    {"key":"created","pl":"Utworzono","en":"Created","de":"Erstellt","no":"Opprettet"},
    {"key":"updated","pl":"Zaktualizowano","en":"Updated","de":"Aktualisiert","no":"Oppdatert"},
    {"key":"deleted","pl":"Usunięto","en":"Deleted","de":"Gelöscht","no":"Slettet"},
    {"key":"noHistory","pl":"Brak historii zmian","en":"No change history","de":"Kein Änderungsverlauf","no":"Ingen endringslogg"},
    {"key":"eventInvite","pl":"Zaproszono na wydarzenie","en":"Invited to event","de":"Zur Veranstaltung eingeladen","no":"Invitert til arrangement"},
    {"key":"eventInviteReg","pl":"Zaproszony przez partnera","en":"Invited by partner","de":"Vom Partner eingeladen","no":"Invitert av partner"},
    {"key":"eventRegistration","pl":"Samodzielna rejestracja","en":"Self-registration","de":"Selbstregistrierung","no":"Selvregistrering"},
    {"key":"eventInviteAltEmail","pl":"Wysłano na inny email","en":"Sent to alternative email","de":"An alternative E-Mail gesendet","no":"Sendt til alternativ e-post"},
    {"key":"eventInviteResend","pl":"Ponowne wysłanie","en":"Resent","de":"Erneut gesendet","no":"Sendt på nytt"},
    {"key":"altEmail","pl":"Alternatywny email","en":"Alternative email","de":"Alternative E-Mail","no":"Alternativ e-post"},
    {"key":"joined","pl":"Dołączył","en":"Joined","de":"Beigetreten","no":"Ble med"},
    {"key":"notJoined","pl":"Nie dołączył","en":"Did not join","de":"Nicht beigetreten","no":"Ble ikke med"},
    {"key":"watched","pl":"Oglądał","en":"Watched","de":"Zugeschaut","no":"Så på"},
    {"key":"privateContacts","pl":"Kontakty prywatne","en":"Private contacts","de":"Private Kontakte","no":"Private kontakter"},
    {"key":"teamMembers","pl":"Członkowie zespołu","en":"Team members","de":"Teammitglieder","no":"Teammedlemmer"},
    {"key":"searchSpecialist","pl":"Szukaj specjalisty","en":"Search specialist","de":"Spezialisten suchen","no":"Søk spesialist"},
    {"key":"structure","pl":"Struktura","en":"Structure","de":"Struktur","no":"Struktur"},
    {"key":"addContact","pl":"Dodaj kontakt","en":"Add contact","de":"Kontakt hinzufügen","no":"Legg til kontakt"},
    {"key":"editContact","pl":"Edytuj kontakt","en":"Edit contact","de":"Kontakt bearbeiten","no":"Rediger kontakt"},
    {"key":"filters","pl":"Filtry","en":"Filters","de":"Filter","no":"Filtre"},
    {"key":"export","pl":"Eksport","en":"Export","de":"Export","no":"Eksporter"},
    {"key":"clear","pl":"Wyczyść","en":"Clear","de":"Löschen","no":"Tøm"},
    {"key":"search","pl":"Szukaj","en":"Search","de":"Suchen","no":"Søk"},
    {"key":"allRoles","pl":"Wszystkie role","en":"All roles","de":"Alle Rollen","no":"Alle roller"},
    {"key":"allStatuses","pl":"Wszystkie statusy","en":"All statuses","de":"Alle Status","no":"Alle statuser"},
    {"key":"role","pl":"Rola","en":"Role","de":"Rolle","no":"Rolle"},
    {"key":"relationshipStatus","pl":"Status relacji","en":"Relationship status","de":"Beziehungsstatus","no":"Relasjonsstatus"},
    {"key":"observation","pl":"Czynny obserwujący","en":"Active observer","de":"Aktiver Beobachter","no":"Aktiv observatør"},
    {"key":"potentialClient","pl":"Potencjalny klient","en":"Potential client","de":"Potenzieller Kunde","no":"Potensiell klient"},
    {"key":"potentialPartner","pl":"Potencjalny partner","en":"Potential partner","de":"Potenzieller Partner","no":"Potensiell partner"},
    {"key":"closedSuccess","pl":"Zamknięty - sukces dołączył","en":"Closed - successfully joined","de":"Geschlossen - erfolgreich beigetreten","no":"Lukket - vellykket"},
    {"key":"closedNotNow","pl":"Zamknięty - nie teraz","en":"Closed - not now","de":"Geschlossen - nicht jetzt","no":"Lukket - ikke nå"},
    {"key":"active","pl":"Aktywny","en":"Active","de":"Aktiv","no":"Aktiv"},
    {"key":"suspended","pl":"Wstrzymany","en":"Suspended","de":"Ausgesetzt","no":"Suspendert"},
    {"key":"inactive","pl":"Nieaktywny","en":"Inactive","de":"Inaktiv","no":"Inaktiv"},
    {"key":"firstName","pl":"Imię","en":"First name","de":"Vorname","no":"Fornavn"},
    {"key":"lastName","pl":"Nazwisko","en":"Last name","de":"Nachname","no":"Etternavn"},
    {"key":"phone","pl":"Telefon","en":"Phone","de":"Telefon","no":"Telefon"},
    {"key":"email","pl":"Email","en":"Email","de":"E-Mail","no":"E-post"},
    {"key":"profession","pl":"Zawód","en":"Profession","de":"Beruf","no":"Yrke"},
    {"key":"address","pl":"Adres","en":"Address","de":"Adresse","no":"Adresse"},
    {"key":"notes","pl":"Notatki","en":"Notes","de":"Notizen","no":"Notater"},
    {"key":"save","pl":"Zapisz","en":"Save","de":"Speichern","no":"Lagre"},
    {"key":"cancel","pl":"Anuluj","en":"Cancel","de":"Abbrechen","no":"Avbryt"},
    {"key":"saving","pl":"Zapisywanie...","en":"Saving...","de":"Speichern...","no":"Lagrer..."},
    {"key":"close","pl":"Zamknij","en":"Close","de":"Schließen","no":"Lukk"},
    {"key":"contactSource","pl":"Skąd jest kontakt","en":"Contact source","de":"Kontaktquelle","no":"Kontaktkilde"},
    {"key":"contactReason","pl":"Dlaczego chcesz się odezwać","en":"Why do you want to reach out","de":"Warum möchten Sie Kontakt aufnehmen","no":"Hvorfor vil du ta kontakt"},
    {"key":"products","pl":"Zainteresowanie produktami","en":"Product interest","de":"Produktinteresse","no":"Produktinteresse"},
    {"key":"dateRange","pl":"Zakres dat","en":"Date range","de":"Datumsbereich","no":"Datoperiode"},
    {"key":"myContactList","pl":"Moja lista kontaktów","en":"My contact list","de":"Meine Kontaktliste","no":"Min kontaktliste"},
    {"key":"fromInvitationsBO","pl":"Z zaproszeń na Business Opportunity","en":"From Business Opportunity invitations","de":"Von Business Opportunity Einladungen","no":"Fra Business Opportunity-invitasjoner"},
    {"key":"fromInvitationsHC","pl":"Z zaproszeń na Health Conversation","en":"From Health Conversation invitations","de":"Von Health Conversation Einladungen","no":"Fra Health Conversation-invitasjoner"},
    {"key":"fromInvitationsGeneral","pl":"Z zaproszeń na webinary ogólne","en":"From general webinar invitations","de":"Von allgemeinen Webinar-Einladungen","no":"Fra generelle webinar-invitasjoner"},
    {"key":"fromPartnerPage","pl":"Z Mojej Strony Partnera","en":"From My Partner Page","de":"Von Meiner Partnerseite","no":"Fra Min Partnerside"},
    {"key":"deletedContacts","pl":"Usunięte","en":"Deleted","de":"Gelöscht","no":"Slettet"},
    {"key":"noDeletedContacts","pl":"Brak usuniętych kontaktów","en":"No deleted contacts","de":"Keine gelöschten Kontakte","no":"Ingen slettede kontakter"},
    {"key":"deletedAutoRemove","pl":"Usunięte kontakty są automatycznie usuwane trwale po 30 dniach.","en":"Deleted contacts are permanently removed after 30 days.","de":"Gelöschte Kontakte werden nach 30 Tagen dauerhaft entfernt.","no":"Slettede kontakter fjernes permanent etter 30 dager."},
    {"key":"daysToDelete","pl":"do usunięcia","en":"until deletion","de":"bis zur Löschung","no":"til sletting"},
    {"key":"day","pl":"dzień","en":"day","de":"Tag","no":"dag"},
    {"key":"days","pl":"dni","en":"days","de":"Tage","no":"dager"},
    {"key":"restore","pl":"Przywróć","en":"Restore","de":"Wiederherstellen","no":"Gjenopprett"},
    {"key":"deletedAt","pl":"Usunięto","en":"Deleted at","de":"Gelöscht am","no":"Slettet"},
    {"key":"chatMessages","pl":"Wiadomości na czacie","en":"Chat messages","de":"Chat-Nachrichten","no":"Chatmeldinger"},
    {"key":"noChatMessages","pl":"Brak wiadomości na czacie","en":"No chat messages","de":"Keine Chat-Nachrichten","no":"Ingen chatmeldinger"},
    {"key":"loading","pl":"Ładowanie...","en":"Loading...","de":"Laden...","no":"Laster..."},
    {"key":"noContactsOnMap","pl":"Brak kontaktów do wyświetlenia na mapie","en":"No contacts to display on map","de":"Keine Kontakte auf der Karte","no":"Ingen kontakter å vise på kartet"},
    {"key":"teamMap","pl":"Wizualna mapa zespołu","en":"Visual team map","de":"Visuelle Teamkarte","no":"Visuelt teamkart"},
    {"key":"total","pl":"Łącznie","en":"Total","de":"Gesamt","no":"Totalt"},
    {"key":"noEventContacts","pl":"Brak kontaktów z zaproszeń na wydarzenia","en":"No contacts from event invitations","de":"Keine Kontakte aus Veranstaltungseinladungen","no":"Ingen kontakter fra arrangementsinvitasjoner"},
    {"key":"guest","pl":"gość","en":"guest","de":"Gast","no":"gjest"},
    {"key":"guests","pl":"gości","en":"guests","de":"Gäste","no":"gjester"},
    {"key":"deleteContact","pl":"Usunąć kontakt?","en":"Delete contact?","de":"Kontakt löschen?","no":"Slette kontakt?"},
    {"key":"deleteConfirmation","pl":"Ta operacja jest nieodwracalna. Kontakt zostanie trwale usunięty.","en":"This action is irreversible. The contact will be permanently deleted.","de":"Diese Aktion ist unwiderruflich. Der Kontakt wird dauerhaft gelöscht.","no":"Denne handlingen kan ikke angres. Kontakten vil bli permanent slettet."},
    {"key":"contactExists","pl":"Kontakt już istnieje","en":"Contact already exists","de":"Kontakt existiert bereits","no":"Kontakten eksisterer allerede"},
    {"key":"contactExistsDesc","pl":"Kontakt z tym samym adresem email i numerem telefonu już istnieje w Twojej liście. Czy chcesz zapisać go jako nowy kontakt?","en":"A contact with the same email and phone number already exists. Do you want to save it as a new contact?","de":"Ein Kontakt mit der gleichen E-Mail und Telefonnummer existiert bereits. Möchten Sie ihn als neuen Kontakt speichern?","no":"En kontakt med samme e-post og telefonnummer finnes allerede. Vil du lagre den som en ny kontakt?"},
    {"key":"saveAsNew","pl":"Zapisz jako nowy","en":"Save as new","de":"Als neu speichern","no":"Lagre som ny"},
    {"key":"moveToMyList","pl":"Przenieś do Mojej listy","en":"Move to My list","de":"Auf Meine Liste verschieben","no":"Flytt til Min liste"},
    {"key":"inMyList","pl":"W mojej liście","en":"In my list","de":"In meiner Liste","no":"I min liste"},
    {"key":"events","pl":"wydarzeń","en":"events","de":"Veranstaltungen","no":"arrangementer"},
    {"key":"inviteToEvent","pl":"Zaproś na wydarzenie","en":"Invite to event","de":"Zur Veranstaltung einladen","no":"Inviter til arrangement"},
    {"key":"invite","pl":"Zaproś","en":"Invite","de":"Einladen","no":"Inviter"},
    {"key":"invitationSent","pl":"Zaproszenie wysłane","en":"Invitation sent","de":"Einladung gesendet","no":"Invitasjon sendt"},
    {"key":"resend","pl":"Wyślij ponownie","en":"Resend","de":"Erneut senden","no":"Send på nytt"},
    {"key":"sendToOtherEmail","pl":"Wyślij na inny email","en":"Send to other email","de":"An andere E-Mail senden","no":"Send til annen e-post"},
    {"key":"noUpcomingEvents","pl":"Brak nadchodzących wydarzeń z możliwością zapraszania gości","en":"No upcoming events with guest invitations enabled","de":"Keine kommenden Veranstaltungen mit Gästeeinladungen","no":"Ingen kommende arrangementer med gjesteinvitasjoner"},
    {"key":"noEmailWarning","pl":"Ten kontakt nie ma adresu email — nie można wysłać zaproszenia.","en":"This contact has no email address — cannot send invitation.","de":"Dieser Kontakt hat keine E-Mail-Adresse — Einladung kann nicht gesendet werden.","no":"Denne kontakten har ingen e-postadresse — kan ikke sende invitasjon."},
    {"key":"chooseTerm","pl":"Wybierz termin","en":"Choose date","de":"Termin wählen","no":"Velg dato"}
  ]';
  v_item JSONB;
  v_lang TEXT;
  v_langs TEXT[] := ARRAY['pl','en','de','no'];
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_keys)
  LOOP
    FOREACH v_lang IN ARRAY v_langs
    LOOP
      INSERT INTO public.i18n_translations (language_code, namespace, key, value)
      VALUES (v_lang, v_namespace, v_item->>'key', v_item->>v_lang)
      ON CONFLICT (language_code, namespace, key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
