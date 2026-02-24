

## Naprawa uciętego pytania w bąbelku wiadomości

### Problem

Tekst pytania użytkownika w bąbelku czatu jest ucięty wizualnie. Bąbelek wiadomości użytkownika (`role === 'user'`) nie ma ustawionych właściwości zawijania tekstu, przez co dłuższe słowa mogą wychodzić poza bąbelek i być niewidoczne (obcięte przez `overflow: hidden` rodzica ScrollArea).

### Przyczyna

W linii 1214-1218 (`MedicalChatWidget.tsx`) bąbelek użytkownika ma `max-w-[85%]`, ale brakuje klas `break-words` / `overflow-wrap`. W połączeniu z wąskim panelem (420px) i prawym borderem 3px, tekst może się ucinać.

### Rozwiązanie

Dodanie klas CSS zapewniających zawijanie tekstu w bąbelku użytkownika:

```text
Plik: src/components/MedicalChatWidget.tsx
Linia 1215: dodać do className bąbelka klasy: break-words overflow-hidden
Linia 1226: owinąć message.content w <span> z word-break: break-word
```

Konkretna zmiana w linii 1215:
```
// Przed:
className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${...}`}

// Po:
className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words overflow-wrap-anywhere ${...}`}
```

### Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/MedicalChatWidget.tsx` | Dodanie `break-words` i stylów zawijania tekstu do bąbelka wiadomości użytkownika |

