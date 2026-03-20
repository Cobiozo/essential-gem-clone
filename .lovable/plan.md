

# Plan: Sekcja Social Proof z horyzontalnym karuzelą kafelek

## Cel
Przebudować renderer `TestimonialsSection` tak, aby karty wyświetlały się jako **horyzontalnie przewijany karuzela** z kafelkami w stylu ze screena: zdjęcie osoby (okrągłe), imię, opis, dane PRZED/PO z kolorowymi wskaźnikami. Dodać nagłówek i podtytuł nad karuzelą.

## Design (na podstawie screena)

```text
┌──────────────────────────────────────────────────┐
│  7) Social Proof: Dowody Przed i Po              │
│  0 Ryzyka. 100% Gwarancji Zadowolenia.           │
│                                                    │
│  ◄ [ Card1 ] [ Card2 ] [ Card3 ] [ Card4 ] ... ► │
│                                                    │
│  Każda karta:                                      │
│  ┌─────────────┐                                   │
│  │  (○ avatar)  │                                  │
│  │   Imię       │                                  │
│  │  opis...     │                                  │
│  │ PRZED: 15:1 🔴  PO: 2:1 🟢                    │
│  └─────────────┘                                   │
└──────────────────────────────────────────────────┘
```

Karty mają zaokrąglone rogi, delikatny gradient tła (pastelowy), okrągłe zdjęcie osoby na górze karty.

## Zmiany

### 1. `TestimonialsSection.tsx` — nowy layout karuzelowy
- Zmienić grid na `flex overflow-x-auto` z `snap-x snap-mandatory`
- Każda karta: `min-w-[220px] snap-center`, okrągły avatar na górze, imię, opis, dane PRZED/PO
- Karty z pastelowym gradientem tła (różowy/zielony/niebieski — cyklicznie per karta)
- Dodać pole `subtitle` pod heading
- Ukryć scrollbar (`scrollbar-hide`)
- Duże okrągłe zdjęcia w tle za kartami (blurred/faded) — pominąć, zbyt skomplikowane; skupić się na kartach

### 2. `TestimonialsSectionEditor.tsx` — dodać pole `subtitle` + pole `name` na karcie
- Dodać pole `subtitle` (podtytuł sekcji)
- Na karcie dodać osobne pole `name` (imię osoby) obok istniejącego `label` (opis)
- Pole `before_label` i `after_label` (np. "PRZED:", "PO:" — konfigurowalne)

### 3. Dane karty (rozszerzony model)
```
{
  name: "Anna",
  image: "url",
  label: "Suplementacja wspierająca...",  // opis
  before_label: "PRZED:",
  before: "15:1",
  after_label: "PO:",
  after: "2:1",
}
```

## Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `TestimonialsSection.tsx` | Nowy layout: horyzontalny carousel z kartami ze zdjęciami |
| `TestimonialsSectionEditor.tsx` | Dodać pola `subtitle`, `name` na karcie, `before_label`/`after_label` |

