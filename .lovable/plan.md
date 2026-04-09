

# Poprawa wizualna listy gości z materiałów ZW

## Problem
Obecny widok tabeli jest ciasny, tekst się ucina, kolumny są zbyt wąskie — szczególnie nazwa materiału i dane kontaktowe są mało czytelne.

## Rozwiązanie
Zamiana tabeli na **layout kartowy** — każdy gość wyświetlany jako osobna karta z czytelnym rozmieszczeniem danych w sekcjach.

## Nowy układ karty

```text
┌──────────────────────────────────────────────────────┐
│  Jan Kowalewski                    [Zgoda email]     │
│  ✉ tatanabacznosci@gmail.com  📞 +48111222333       │
│                                                      │
│  📖 Endometrioza - Jak odzyskać kontrolę...          │
│  🔑 ZW-JL33ZJ   📅 09.04.2026, 23:46   ⏱ <1min    │
└──────────────────────────────────────────────────────┘
```

### Szczegóły
- Imię i nazwisko — duży, pogrubiony tekst + badge zgody email
- Email i telefon — w jednym wierszu, z ikonami, czytelne linki
- Tytuł materiału — pełna szerokość, bez ucinania
- Dolny wiersz: kod OTP, data otwarcia, czas oglądania — w jednej linii z ikonami i etykietami

### Plik do zmiany
`src/components/team-contacts/HKMaterialContactsList.tsx` — zamiana `<Table>` na siatkę kart (`space-y-3`, karty z `border rounded-lg p-4`).

