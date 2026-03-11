import { pl, enUS, de } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export interface InvitationLabels {
  webinarInvitation: string;
  meetingInvitation: string;
  date: string;
  time: string;
  host: string;
  signUp: string;
  copied: string;
  invitationCopied: string;
  // HK OTP
  hkGreeting: string;
  hkIntro: string;
  hkInstructions: string;
  hkLink: string;
  hkAccessCode: string;
  hkAfterFirstUse: string;
  hkRegards: string;
}

const templates: Record<string, InvitationLabels> = {
  pl: {
    webinarInvitation: 'Zaproszenie na webinar',
    meetingInvitation: 'Zaproszenie na spotkanie',
    date: 'Data',
    time: 'Godzina',
    host: 'Prowadzący',
    signUp: 'Zapisz się tutaj',
    copied: 'Skopiowano!',
    invitationCopied: 'Zaproszenie skopiowane do schowka',
    hkGreeting: 'Cześć!',
    hkIntro: 'Mam dla Ciebie ciekawy materiał:',
    hkInstructions: 'Wejdź na link poniżej i użyj kodu dostępu:',
    hkLink: 'Link',
    hkAccessCode: 'Kod dostępu',
    hkAfterFirstUse: 'Po pierwszym użyciu masz {hours} godzin dostępu.',
    hkRegards: 'Pozdrawiam',
  },
  en: {
    webinarInvitation: 'Webinar Invitation',
    meetingInvitation: 'Meeting Invitation',
    date: 'Date',
    time: 'Time',
    host: 'Host',
    signUp: 'Sign up here',
    copied: 'Copied!',
    invitationCopied: 'Invitation copied to clipboard',
    hkGreeting: 'Hi!',
    hkIntro: 'I have an interesting material for you:',
    hkInstructions: 'Go to the link below and use the access code:',
    hkLink: 'Link',
    hkAccessCode: 'Access code',
    hkAfterFirstUse: 'After first use you have {hours} hours of access.',
    hkRegards: 'Best regards',
  },
  de: {
    webinarInvitation: 'Einladung zum Webinar',
    meetingInvitation: 'Einladung zum Meeting',
    date: 'Datum',
    time: 'Uhrzeit',
    host: 'Moderator',
    signUp: 'Hier anmelden',
    copied: 'Kopiert!',
    invitationCopied: 'Einladung in die Zwischenablage kopiert',
    hkGreeting: 'Hallo!',
    hkIntro: 'Ich habe ein interessantes Material für dich:',
    hkInstructions: 'Gehe zum Link unten und verwende den Zugangscode:',
    hkLink: 'Link',
    hkAccessCode: 'Zugangscode',
    hkAfterFirstUse: 'Nach der ersten Nutzung hast du {hours} Stunden Zugang.',
    hkRegards: 'Mit freundlichen Grüßen',
  },
};

export function getInvitationLabels(lang: string): InvitationLabels {
  return templates[lang] || templates.pl;
}

export function getDateLocale(lang: string): Locale {
  switch (lang) {
    case 'en': return enUS;
    case 'de': return de;
    default: return pl;
  }
}

// ── Registration form labels ──

export interface RegistrationLabels {
  formTitle: string;
  emailLabel: string;
  firstNameLabel: string;
  lastNameLabel: string;
  phoneLabel: string;
  submitButton: string;
  submitting: string;
  consent: string;
  successTitle: string;
  successMessage: string;
  alreadyRegisteredTitle: string;
  alreadyRegisteredMsg1: string;
  alreadyRegisteredMsg2: string;
  alreadyRegisteredMsg3: string;
  eventFinished: string;
  registrationClosed: string;
  registrationClosedDetail: string;
  host: string;
  webinarBadge: string;
  onlineWebinar: string;
  emailError: string;
  nameError: string;
  notFound: string;
  registrationError: string;
  footer: string;
  roomOpens5min: string;
  roomOpensOnTime: string;
  checkEmail: string;
  nextWebinar: string;
  reminderNote24: string;
  reminderNote12: string;
  reminderNote2: string;
  reminderNote1: string;
  reminderNote15min: string;
  thanksForRegistration: string;
  placeholderEmail: string;
  placeholderFirstName: string;
  placeholderLastName: string;
  placeholderPhone: string;
}

const registrationTemplates: Record<string, RegistrationLabels> = {
  pl: {
    formTitle: 'Zapisz się na webinar',
    emailLabel: 'Email',
    firstNameLabel: 'Imię',
    lastNameLabel: 'Nazwisko',
    phoneLabel: 'Telefon',
    submitButton: 'Zapisz się na webinar',
    submitting: 'Zapisywanie...',
    consent: 'Zapisując się, wyrażasz zgodę na przetwarzanie danych osobowych w celu organizacji webinaru.',
    successTitle: 'Rejestracja zakończona!',
    successMessage: 'Dziękujemy za zapisanie się na webinar. Wysłaliśmy potwierdzenie na podany adres email.',
    alreadyRegisteredTitle: 'Jesteś już zarejestrowany/a!',
    alreadyRegisteredMsg1: 'Ten adres email widnieje już na liście zaproszonych na to wydarzenie.',
    alreadyRegisteredMsg2: 'Sprawdź swoją skrzynkę email (w tym folder SPAM/Oferty).',
    alreadyRegisteredMsg3: 'Jeśli nie możesz znaleźć wiadomości, odezwij się niezwłocznie do osoby, która Cię na to wydarzenie zaprosiła.',
    eventFinished: 'Ten webinar już się odbył.',
    registrationClosed: 'Rejestracja zamknięta',
    registrationClosedDetail: 'Zapisanie się na spotkanie było możliwe do godz. {time}. Aktualnie spotkanie trwa. W przyszłości, aby uniknąć takiej sytuacji, zapisz się wcześniej przed rozpoczęciem spotkania.',
    host: 'Prowadzący',
    webinarBadge: 'Webinar',
    onlineWebinar: 'Webinar online',
    emailError: 'Podaj prawidłowy adres email',
    nameError: 'Imię musi mieć minimum 2 znaki',
    notFound: 'Nie znaleziono wydarzenia lub jest nieaktywne.',
    registrationError: 'Wystąpił błąd podczas rejestracji',
    footer: '© {year} Pure Life. Wszelkie prawa zastrzeżone.',
    roomOpens5min: 'Pokój otworzy się 5 minut przed planowanym rozpoczęciem.',
    roomOpensOnTime: 'Pokój otworzy się punktualnie o wyznaczonej godzinie.',
    checkEmail: 'Sprawdź swoją skrzynkę email — wysłaliśmy Ci link do natychmiastowego dołączenia! 🔴',
    nextWebinar: 'Najbliższy webinar: {date} o godz. {time}. {accessNote}',
    reminderNote24: 'Otrzymasz przypomnienia: 24 godziny, 12 godzin, 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.',
    reminderNote12: 'Otrzymasz przypomnienia: 12 godzin, 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.',
    reminderNote2: 'Otrzymasz przypomnienia: 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.',
    reminderNote1: 'Otrzymasz przypomnienia: 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.',
    reminderNote15min: 'Otrzymasz przypomnienie 15 minut przed webinarem z linkiem do spotkania.',
    thanksForRegistration: 'Dziękujemy za rejestrację!',
  },
  en: {
    formTitle: 'Sign up for webinar',
    emailLabel: 'Email',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    phoneLabel: 'Phone',
    submitButton: 'Sign up for webinar',
    submitting: 'Signing up...',
    consent: 'By signing up, you consent to the processing of your personal data for the purpose of organizing the webinar.',
    successTitle: 'Registration complete!',
    successMessage: 'Thank you for signing up for the webinar. We have sent a confirmation to your email address.',
    alreadyRegisteredTitle: 'You are already registered!',
    alreadyRegisteredMsg1: 'This email address is already on the guest list for this event.',
    alreadyRegisteredMsg2: 'Please check your email inbox (including SPAM/Promotions folder).',
    alreadyRegisteredMsg3: 'If you cannot find the message, please contact the person who invited you immediately.',
    eventFinished: 'This webinar has already taken place.',
    registrationClosed: 'Registration closed',
    registrationClosedDetail: 'Registration was available until {time}. The event is currently in progress. In the future, please register before the event starts.',
    host: 'Host',
    webinarBadge: 'Webinar',
    onlineWebinar: 'Online webinar',
    emailError: 'Please enter a valid email address',
    nameError: 'First name must be at least 2 characters',
    notFound: 'Event not found or inactive.',
    registrationError: 'An error occurred during registration',
    footer: '© {year} Pure Life. All rights reserved.',
    roomOpens5min: 'The room will open 5 minutes before the scheduled start.',
    roomOpensOnTime: 'The room will open at the scheduled time.',
    checkEmail: 'Check your email — we sent you a link to join immediately! 🔴',
    nextWebinar: 'Next webinar: {date} at {time}. {accessNote}',
    reminderNote24: 'You will receive reminders: 24 hours, 12 hours, 2 hours, 1 hour and 15 minutes before the webinar with a meeting link.',
    reminderNote12: 'You will receive reminders: 12 hours, 2 hours, 1 hour and 15 minutes before the webinar with a meeting link.',
    reminderNote2: 'You will receive reminders: 2 hours, 1 hour and 15 minutes before the webinar with a meeting link.',
    reminderNote1: 'You will receive reminders: 1 hour and 15 minutes before the webinar with a meeting link.',
    reminderNote15min: 'You will receive a reminder 15 minutes before the webinar with a meeting link.',
    thanksForRegistration: 'Thank you for registering!',
  },
  de: {
    formTitle: 'Zum Webinar anmelden',
    emailLabel: 'E-Mail',
    firstNameLabel: 'Vorname',
    lastNameLabel: 'Nachname',
    phoneLabel: 'Telefon',
    submitButton: 'Zum Webinar anmelden',
    submitting: 'Wird angemeldet...',
    consent: 'Mit der Anmeldung stimmen Sie der Verarbeitung Ihrer personenbezogenen Daten zum Zweck der Organisation des Webinars zu.',
    successTitle: 'Registrierung abgeschlossen!',
    successMessage: 'Vielen Dank für Ihre Anmeldung zum Webinar. Wir haben eine Bestätigung an Ihre E-Mail-Adresse gesendet.',
    alreadyRegisteredTitle: 'Sie sind bereits registriert!',
    alreadyRegisteredMsg1: 'Diese E-Mail-Adresse steht bereits auf der Gästeliste für diese Veranstaltung.',
    alreadyRegisteredMsg2: 'Bitte überprüfen Sie Ihren E-Mail-Posteingang (einschließlich SPAM/Werbung).',
    alreadyRegisteredMsg3: 'Wenn Sie die Nachricht nicht finden, wenden Sie sich bitte umgehend an die Person, die Sie eingeladen hat.',
    eventFinished: 'Dieses Webinar hat bereits stattgefunden.',
    registrationClosed: 'Registrierung geschlossen',
    registrationClosedDetail: 'Die Anmeldung war bis {time} Uhr möglich. Die Veranstaltung läuft derzeit. Bitte melden Sie sich zukünftig vor Beginn der Veranstaltung an.',
    host: 'Moderator',
    webinarBadge: 'Webinar',
    onlineWebinar: 'Online-Webinar',
    emailError: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    nameError: 'Der Vorname muss mindestens 2 Zeichen lang sein',
    notFound: 'Veranstaltung nicht gefunden oder inaktiv.',
    registrationError: 'Bei der Registrierung ist ein Fehler aufgetreten',
    footer: '© {year} Pure Life. Alle Rechte vorbehalten.',
    roomOpens5min: 'Der Raum öffnet sich 5 Minuten vor dem geplanten Beginn.',
    roomOpensOnTime: 'Der Raum öffnet sich pünktlich zur geplanten Zeit.',
    checkEmail: 'Überprüfen Sie Ihre E-Mail — wir haben Ihnen einen Link zum sofortigen Beitritt gesendet! 🔴',
    nextWebinar: 'Nächstes Webinar: {date} um {time} Uhr. {accessNote}',
    reminderNote24: 'Sie erhalten Erinnerungen: 24 Stunden, 12 Stunden, 2 Stunden, 1 Stunde und 15 Minuten vor dem Webinar mit einem Meeting-Link.',
    reminderNote12: 'Sie erhalten Erinnerungen: 12 Stunden, 2 Stunden, 1 Stunde und 15 Minuten vor dem Webinar mit einem Meeting-Link.',
    reminderNote2: 'Sie erhalten Erinnerungen: 2 Stunden, 1 Stunde und 15 Minuten vor dem Webinar mit einem Meeting-Link.',
    reminderNote1: 'Sie erhalten Erinnerungen: 1 Stunde und 15 Minuten vor dem Webinar mit einem Meeting-Link.',
    reminderNote15min: 'Sie erhalten eine Erinnerung 15 Minuten vor dem Webinar mit einem Meeting-Link.',
    thanksForRegistration: 'Vielen Dank für Ihre Registrierung!',
  },
};

export function getRegistrationLabels(lang: string): RegistrationLabels {
  return registrationTemplates[lang] || registrationTemplates.pl;
}

/**
 * Build HK OTP clipboard message from labels
 */
export function buildHkOtpMessage(
  lang: string,
  opts: {
    title: string;
    description: string;
    shareUrl: string;
    otpCode: string;
    validityHours: number;
    partnerName: string;
  }
): string {
  const l = getInvitationLabels(lang);
  return `${l.hkGreeting}

${l.hkIntro}
"${opts.title}"

${opts.description ? opts.description + '\n\n' : ''}${l.hkInstructions}

🔗 ${l.hkLink}:
${opts.shareUrl}

🔑 ${l.hkAccessCode}:
${opts.otpCode}

⏰ ${l.hkAfterFirstUse.replace('{hours}', String(opts.validityHours))}

${l.hkRegards},
${opts.partnerName}`.trim();
}
