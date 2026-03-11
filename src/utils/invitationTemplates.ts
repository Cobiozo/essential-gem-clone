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
