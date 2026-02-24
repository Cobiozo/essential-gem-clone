

## Naprawa Pure Science Search AI -- ilosc wynikow, scrollowanie, tlumaczenie tytulow

### Zidentyfikowane problemy

**1. Ilosc wynikow PubMed nie jest przekazywana do system promptu**

Uzytkownik wybiera ilosc wynikow w selectorze, wartosc `resultsCount` trafia do edge function i jest uzywana w `searchPubMed()`, ale system prompt NIE informuje AI ile wynikow ma pokazac. AI moze wiec pokazac np. 3 badania mimo ze PubMed zwrocil 30.

**2. Auto-scroll przewija zawsze na DOL**

W `MedicalChatWidget.tsx` auto-scroll ustawia `scrollTop = scrollHeight` przy kazdej zmianie `messages`. Podczas streamingu uzytkownik jest ciagle przerzucany na koniec tekstu -- nie moze czytac odpowiedzi od gory.

**3. Tytuly badan PubMed sa po angielsku**

Tytuly artykulow z PubMed sa przekazywane do AI w oryginalnej formie (angielskiej). System prompt nie instruuje AI, zeby tlumaczyl tytuly na jezyk uzytkownika. Uzytkownik np. polski widzi angielskie tytuly badan, co utrudnia zrozumienie.

---

### Plan zmian

#### 1. Edge function -- resultsCount w prompcie + instrukcja tlumaczenia tytulow

**a) Dodanie parametru `resultsCount` do `getSystemPrompt`:**

Zmiana sygnatury:
```text
getSystemPrompt(language, includeEqology) -> getSystemPrompt(language, includeEqology, resultsCount)
```

Dodanie instrukcji w CZESCI 3 kazdego jezyka:
- PL: "Przedstaw WSZYSTKIE dostarczone badania (do X). Nie pomijaj zadnego. Tytuly badan PRZETLUMACZ na jezyk polski, podajac oryginalny tytul angielski w nawiasie."
- DE: analogicznie po niemiecku
- EN: brak tlumaczenia (tytuly juz sa po angielsku)
- IT: analogicznie po wlosku

**b) Zmiana wywolania (linia 810):**
```text
getSystemPrompt(language, isHealthQuery) -> getSystemPrompt(language, isHealthQuery, resultsCount)
```

#### 2. MedicalChatWidget -- scroll do poczatku odpowiedzi

**Zmiana logiki auto-scroll:**
- Przy dodaniu nowej wiadomosci assistant: scroll do poczatku tej wiadomosci (nie na dol)
- Podczas streamingu (aktualizacja tresci): NIE scrollowac automatycznie
- Scroll na dol tylko przy wyslaniu pytania przez uzytkownika

**Implementacja:**
- Dodanie `lastAssistantRef` (useRef na div ostatniej wiadomosci assistant)
- Dodanie `prevMessagesLenRef` do sledzenia czy to nowa wiadomosc czy streaming update
- Przy nowej wiadomosci assistant: `scrollIntoView({ block: 'start' })`
- Przy wiadomosci user: scroll na dol

---

### Szczegoly techniczne

#### Plik: `supabase/functions/medical-assistant/index.ts`

**Zmiana sygnatury `getSystemPrompt` (linia 596):**
```typescript
function getSystemPrompt(language: string, includeEqology: boolean = false, resultsCount: number = 10): string {
```

**Dodanie instrukcji w promptach CZESC 3 -- przyklad dla PL (linia 625-633):**

Obecny tekst CZESCI 3 zostanie rozszerzony o:
```text
Przedstaw WSZYSTKIE dostarczone badania (do ${resultsCount} sztuk). Nie pomijaj żadnego.
Tytuły badań PRZETŁUMACZ na język polski, a oryginalny tytuł angielski podaj w nawiasie po przetłumaczonym tytule.
Format: **Przetłumaczony tytuł** *(Original English Title)*
```

Analogicznie dla DE i IT. Dla EN -- bez tlumaczenia tytulow, tylko instrukcja o ilosci.

**Zmiana wywolania (linia 810):**
```typescript
const systemPrompt = getSystemPrompt(language, isHealthQuery, resultsCount);
```

#### Plik: `src/components/MedicalChatWidget.tsx`

**Nowe refy:**
```typescript
const lastAssistantRef = useRef<HTMLDivElement>(null);
const prevMessagesLenRef = useRef(0);
```

**Zmiana useEffect auto-scroll (linia 73-81):**

Zamiast obecnego `scrollTop = scrollHeight` przy kazdej zmianie messages:

```typescript
useEffect(() => {
  if (messages.length > prevMessagesLenRef.current) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastAssistantRef.current) {
      lastAssistantRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (lastMsg?.role === 'user') {
      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
    prevMessagesLenRef.current = messages.length;
  }
}, [messages]);
```

**Dodanie ref na ostatnia wiadomosc assistant (w renderze messages):**

Kazda wiadomosc assistant ktora jest ostatnia dostaje `ref={lastAssistantRef}`.

---

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `supabase/functions/medical-assistant/index.ts` | Dodanie `resultsCount` do `getSystemPrompt`, instrukcja tlumaczenia tytulow badan na jezyk uzytkownika, instrukcja "pokaz WSZYSTKIE X badan" |
| `src/components/MedicalChatWidget.tsx` | Scroll do poczatku odpowiedzi zamiast na koniec, brak auto-scroll podczas streamingu |

