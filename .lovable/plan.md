

# Zamiana hardcoded polskich tekstow na t() w widgetach dashboardu

## Problem

System tlumaczen dziala poprawnie (naglowki jak "Training Progress", "My meetings", "View All" sa po angielsku), ale wiele tekstow w widgetach jest zapisanych na sztywno po polsku zamiast uzywac funkcji `t()`.

## Zakres zmian

### 1. CalendarWidget.tsx - legenda i przyciski

Hardcoded teksty do zamiany:

| Tekst PL | Klucz t() |
|----------|-----------|
| `'Webinar'` | `t('events.type.webinar')` |
| `'Spotkanie zespolu'` | `t('events.type.teamMeeting')` |
| `'Spotkanie trojstronne'` | `t('events.type.tripartiteMeeting')` |
| `'Konsultacje'` | `t('events.type.consultation')` |
| `'Zakonczone'` | `t('events.ended')` |
| `'WEJDZ'` | `t('events.join')` |
| `'Trwa teraz'` | `t('events.liveNow')` |
| `'Wypisz sie'` | `t('events.unregister')` |
| `'Usun z kalendarza'` | `t('events.removeFromCalendar')` |
| `'Dodaj do kalendarza'` | `t('events.addToCalendar')` |
| `'Cykliczne'` | `t('events.recurring')` |
| `'Szczegoly'` | `t('events.details')` |
| `'Prowadzacy'` | `t('events.host')` |
| `'Rezerwujacy'` | `t('events.bookedBy')` |
| `'Skopiowano!'` | `t('common.copied')` |
| `'Zaproszenie zostalo skopiowane...'` | `t('events.invitationCopied')` |
| `'Ladowanie...'` | `t('common.loading')` |
| `'Zaproszenie na webinar:'` | `t('events.webinarInvitation')` |
| Toast w anulowaniu spotkan | `t('events.meetingCancelled')` itd. |

### 2. MyMeetingsWidget.tsx - nazwy typow i przyciski

Funkcja `getEventTypeName()` (linie 117-134) - zamiana na t():
| Tekst PL | Klucz t() |
|----------|-----------|
| `'Webinary'` | `t('events.type.webinars')` |
| `'Spotkanie zespolu'` | `t('events.type.teamMeeting')` |
| `'Spotkania publiczne'` | `t('events.type.publicMeetings')` |
| `'Spotkanie indywidualne'` | `t('events.type.individualMeeting')` |
| `'Spotkanie trojstronne'` | `t('events.type.tripartiteMeeting')` |
| `'Konsultacje dla partnerow'` | `t('events.type.partnerConsultation')` |
| `'Wydarzenia'` | `t('events.events')` |

Inne hardcoded: `'Ladowanie...'`, `'Rozpocznij'`, `'WEJDZ'`, `'Wejdz'`, `'Szczegoly'`, `'Anuluj'`, `'Spotkanie anulowane'`, `'Za X min'`, `'Zoom'`, `'Blad'`

### 3. WelcomeWidget.tsx - drobne

| Tekst PL | Klucz t() |
|----------|-----------|
| `'(Polska)'` (linia 158) | `'(Poland)'` lub `t('common.poland')` |
| WidgetInfoButton description | uzywane wewnetrznie, mniejszy priorytet |

## Podejscie techniczne

- Kazdy hardcoded string zostanie zastapiony wywolaniem `t('klucz')` z polskim fallbackiem: `t('events.join') \|\| 'WEJDZ'`
- Fallback zapewnia ze jezeli klucz nie istnieje jeszcze w bazie, uzytkownik nadal widzi polski tekst
- Klucze uzywaja istniejacych namespace'ow (`events.*`, `common.*`, `dashboard.*`)
- Nie trzeba dodawac kluczy do bazy - system automatycznie wyswietla klucz jako fallback, a tlumaczenia mozna dodac pozniej w panelu admina

## Pliki do zmiany

| Plik | Zakres zmian |
|------|-------------|
| `src/components/dashboard/widgets/CalendarWidget.tsx` | ~25 hardcoded stringow -> t() |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | ~15 hardcoded stringow -> t() |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | 1-2 hardcoded stringi -> t() |

