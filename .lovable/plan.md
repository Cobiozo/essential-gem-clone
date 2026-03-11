

# Wybór języka wiadomości zaproszeniowej

## Cel
Dodanie możliwości wyboru języka wiadomości zaproszeniowej we wszystkich 5 miejscach generowania zaproszeń. Domyślnie ustawiony język interfejsu, ale użytkownik może zmienić przed skopiowaniem.

## Nowe pliki

### 1. `src/components/InvitationLanguageSelect.tsx`
Kompaktowy select z flagami (wzorowany na `ContentLanguageSelector`), **bez** opcji "Wszystkie". Pobiera języki z `i18n_languages`. Domyślna wartość = język interfejsu (`useLanguage().language`). Mały rozmiar (`h-7`), inline obok przycisków.

### 2. `src/utils/invitationTemplates.ts`
Statyczne szablony etykiet w 3 językach (pl/en/de), rozszerzalne:

```typescript
const templates = {
  pl: {
    webinarInvitation: 'Zaproszenie na webinar',
    meetingInvitation: 'Zaproszenie na spotkanie',
    date: 'Data',
    time: 'Godzina',
    host: 'Prowadzący',
    signUp: 'Zapisz się tutaj',
    copied: 'Skopiowano!',
    invitationCopied: 'Zaproszenie skopiowane do schowka',
    // HK OTP templates
    hkGreeting: 'Cześć!',
    hkIntro: 'Mam dla Ciebie ciekawy materiał:',
    hkInstructions: 'Wejdź na link poniżej i użyj kodu dostępu:',
    hkLink: 'Link',
    hkAccessCode: 'Kod dostępu',
    hkAfterFirstUse: 'Po pierwszym użyciu masz {hours} godzin dostępu.',
    hkRegards: 'Pozdrawiam',
  },
  en: { ... },
  de: { ... },
}
```

Funkcja `getInvitationLabels(lang: string)` zwraca etykiety z fallbackiem do `pl`.

## Zmiany w istniejących plikach

### 3. `src/components/events/EventCard.tsx`
- Dodać stan `inviteLang` (default: `language`).
- W `handleCopyInvitation` — użyć `getInvitationLabels(inviteLang)` do budowy tekstu + odpowiedni `dateLocale`.
- Obok przycisku "Zaproś Gościa" dodać `<InvitationLanguageSelect>`.

### 4. `src/components/events/EventCardCompact.tsx`
- Analogicznie jak EventCard — stan `inviteLang`, szablony, select obok przycisku.

### 5. `src/components/dashboard/widgets/CalendarWidget.tsx`
- Stan `inviteLang`. W `handleCopyInvitation` użyć szablonów z `invitationTemplates`. Select inline obok przycisku invite.

### 6. `src/components/auto-webinar/AutoWebinarEventView.tsx`
- Stan `inviteLang`. W `handleCopy` użyć szablonów. Select nad lub obok przycisku "Kopiuj zaproszenie".

### 7. `src/pages/HealthyKnowledge.tsx`
- Stan `messageLang` (default: `language`).
- W dialogu share, nad podglądem wiadomości, dodać `<InvitationLanguageSelect>` z etykietą "Język wiadomości".
- Zmiana języka przebudowuje `shareMessage` preview (client-side z `invitationTemplates`).
- W `handleGenerateAndCopy` przekazać `message_language: messageLang` do edge function.

### 8. `supabase/functions/generate-hk-otp/index.ts`
- Przyjąć opcjonalny parametr `message_language` z body (default: `'pl'`).
- Dodać słownik szablonów wiadomości (pl/en/de) analogiczny do frontend.
- Wybrać szablon na podstawie `message_language` przy budowie `clipboardMessage`.

## UX
- Flaga inline, kompaktowa — nie zaburza layoutu.
- Domyślnie = język interfejsu — zero kliknięć dla większości użytkowników.
- Zmiana natychmiast wpływa na kopiowaną wiadomość.

