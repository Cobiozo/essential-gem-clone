

## Naprawa Pure Science Search AI -- struktura odpowiedzi i tlumaczenie zapytan

### Zidentyfikowane problemy

**1. Zapytania do PubMed nie sa tlumaczone na angielski**

Funkcja `searchPubMed()` (linia 723) otrzymuje `userQuery` w oryginalnym jezyku uzytkownika. Funkcja `parseQueryTerms()` tlumacy tylko terminy znajdujace sie w slowniku `medicalTermsWithSynonyms` -- nieznane slowa (np. "wplywa", "leczenie", "stosowanie") trafiaja do PubMed po polsku/niemiecku, co drastycznie obniza jakosc wynikow.

**2. Struktura odpowiedzi jest nieprawidlowa**

Aktualny system prompt (linia 580-602) instruuje AI, zeby odpowiadal WYLACZNIE na podstawie badan PubMed. Brak rozdzielenia na 3 czesci:
- Czesc 1: Analiza naukowa pytania (co to jest, mechanizmy, patofizjologia)
- Czesc 2: Zastosowanie Omega-3 w leczeniu z dowodami naukowymi
- Czesc 3: Konkretne wyniki z PubMed

**3. Brak tlumaczenia zapytania przed wyszukiwaniem PubMed**

Nie ma zadnego kroku tlumaczenia calego zapytania na angielski. Slownik pokrywa ok. 60 terminow, ale nie pokrywa calych zdan ani fraz kontekstowych.

---

### Plan zmian

#### Plik: `supabase/functions/medical-assistant/index.ts`

**A) Dodanie tlumaczenia zapytania na angielski przez AI**

Przed wyszukiwaniem w PubMed, zapytanie uzytkownika bedzie tlumaczone na angielski za pomoca Lovable AI Gateway (bez streamingu, szybkie wywolanie). Tlumaczenie bedzie uzywane TYLKO do budowania query PubMed -- odpowiedz AI bedzie w jezyku interfejsu.

```text
Nowa funkcja: translateQueryToEnglish(query, language, apiKey)
- Jesli language === 'en' -> zwroc query bez zmian
- W przeciwnym razie -> wywolaj AI z prosba o tlumaczenie na angielski (medyczny kontekst)
- Uzyj modelu gemini-2.5-flash-lite (najtanszy, wystarczajacy do tlumaczenia)
- Bez streamingu, krótki prompt
- Fallback: jesli tlumaczenie sie nie uda, uzyj oryginalnego query
```

**B) Przebudowa system promptu na 3-czesciowa strukture**

Nowy format odpowiedzi AI:

```text
CZESC 1: ANALIZA NAUKOWA
- Wyjasnienie tematu z perspektywy naukowej
- Mechanizmy, patofizjologia, aktualna wiedza medyczna
- Odpowiedz na pytanie uzytkownika merytorycznie

CZESC 2: ZASTOSOWANIE OMEGA-3
- Rola kwasow omega-3 (EPA/DHA) w kontekscie pytania
- Mechanizm dzialania omega-3 w danym schorzeniu/obszarze
- Dowody naukowe na skutecznosc (z dostarczonych badan)
- Dawkowanie i zalecenia oparte na badaniach

CZESC 3: WYNIKI Z PUBMED
- Lista badan z linkami (PubMed, DOI, PMC)
- Krotkie podsumowanie kazdego badania

Na koncu: produkty Eqology (jesli dotyczy) + disclaimer
```

**C) Uzycie przetlumaczonego query w PubMed**

Zmiana w linii 723:
```
// Przed:
const articles = await searchPubMed(userQuery, resultsCount, shouldEnrichWithOmega3);

// Po:
const englishQuery = await translateQueryToEnglish(userQuery, language, LOVABLE_API_KEY);
const articles = await searchPubMed(englishQuery, resultsCount, shouldEnrichWithOmega3);
```

---

### Szczegoly techniczne

**Nowa funkcja translateQueryToEnglish (~linia 560):**
```typescript
async function translateQueryToEnglish(query: string, language: string, apiKey: string): Promise<string> {
  if (language === 'en') return query;
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Translate the following medical/health query to English. Return ONLY the translated query, nothing else. Keep medical terms precise.' },
          { role: 'user', content: query }
        ],
      }),
    });
    
    if (!response.ok) return query; // fallback
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || query;
  } catch {
    return query; // fallback
  }
}
```

**Przebudowany system prompt (funkcja getSystemPrompt):**

Prompt bedzie instruowal AI aby odpowiadal w 3 krokach:
1. Analiza naukowa pytania (wlasna wiedza + dostarczone badania)
2. Rola Omega-3 w kontekscie pytania z dowodami
3. Lista badan PubMed ze szczegolami i linkami

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `supabase/functions/medical-assistant/index.ts` | Dodanie funkcji `translateQueryToEnglish`, przebudowa `getSystemPrompt` na 3-czesciowa strukture, uzycie przetlumaczonego query w PubMed search |

