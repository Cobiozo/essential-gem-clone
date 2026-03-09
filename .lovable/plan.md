

# Redesign zakładki Auto-Webinar — widok wydarzeniowy z wyborem godzin

## Problem

Obecnie zakładka auto-webinaru w WebinarsPage pokazuje pokój streamingowy z odtwarzaczem wideo i odliczaniem. Użytkownik chce, aby ta zakładka wyglądała jak standardowa karta webinaru — z grafiką, opisem i listą dostępnych godzin sesji. Partner wybiera konkretną godzinę i kopiuje zaproszenie z linkiem dla osoby z zewnątrz. Partner sam nie musi się zapisywać.

## Nowy komponent: `AutoWebinarEventView`

Zastąpi `AutoWebinarEmbed` w zakładce na stronie Webinarów. Zawartość:

1. **Grafika** — `invitation_image_url` z konfiguracji (lub `room_logo_url`)
2. **Tytuł i opis** — z `invitation_title` / `invitation_description` lub `room_title`
3. **Lista dostępnych godzin** — generowana dynamicznie na podstawie `start_hour`, `end_hour`, `interval_minutes`. Np. dla 8:00-22:00 co 60 min → lista: 8:00, 9:00, 10:00, ..., 21:00. Godziny przeszłe (dzisiejsze) oznaczone jako zakończone. Godziny przyszłe — klikalne.
4. **Przycisk "Kopiuj zaproszenie"** — po kliknięciu na konkretną godzinę, kopiuje tekst zaproszenia z:
   - Tytułem webinaru
   - Wybraną godziną
   - Linkiem: `https://purelife.info.pl/e/{slug}?ref={EQID}`
5. **Brak przycisku "Zapisz się"** — partner nie musi się rejestrować

## Zmiana w plikach

| Plik | Zmiana |
|------|--------|
| `src/components/auto-webinar/AutoWebinarEventView.tsx` | **Nowy** — karta z grafiką, opisem, listą godzin i przyciskami kopiowania |
| `src/pages/WebinarsPage.tsx` | Zamienić `<AutoWebinarEmbed />` na `<AutoWebinarEventView />` w zakładce |

## Struktura `AutoWebinarEventView`

```text
┌──────────────────────────────────────────┐
│  [Grafika / baner - aspect-video]        │
├──────────────────────────────────────────┤
│  Badge: Webinar                          │
│  Tytuł zaproszenia                       │
│  Opis zaproszenia                        │
├──────────────────────────────────────────┤
│  Dostępne sesje (dziś, DD MMMM):         │
│                                          │
│  ○ 08:00  [Zakończone]                   │
│  ○ 09:00  [Zakończone]                   │
│  ● 10:00  [📋 Kopiuj zaproszenie]        │
│  ○ 11:00  [📋 Kopiuj zaproszenie]        │
│  ...                                     │
│  ○ 21:00  [📋 Kopiuj zaproszenie]        │
└──────────────────────────────────────────┘
```

## Logika generowania godzin

```ts
const slots = [];
for (let h = config.start_hour; h < config.end_hour; h += config.interval_minutes / 60) {
  const slotTime = new Date(); slotTime.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
  const isPast = slotTime < now;
  slots.push({ time: format(slotTime, 'HH:mm'), isPast });
}
```

## Tekst kopiowanego zaproszenia

```
🎥 Zaproszenie na webinar: {tytuł}

📅 Data: {dziś, PPP}
⏰ Godzina: {wybrana godzina}
{opis - skrócony}

Zapisz się tutaj: https://purelife.info.pl/e/{slug}?ref={EQID}
```

## `AutoWebinarEmbed` pozostaje

Komponent `AutoWebinarEmbed` (pokój streamingowy) nie jest usuwany — nadal używany na `/auto-webinar` (AutoWebinarRoom/AutoWebinarPage). Zmiana dotyczy tylko zakładki w WebinarsPage.

