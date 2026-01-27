

# Plan: Nakładka kontynuacji bezpośrednio na wideo

## Cel

Przenieść komunikat "Kontynuować od X:XX?" z osobnej karty nad wideo na **nakładkę wyświetlaną bezpośrednio na wideo**. Użytkownik zobaczy wideo z zatrzymaną klatką w miejscu gdzie skończył, a na nim przyciski wyboru.

## Obecny stan

Aktualnie w `HealthyKnowledgePlayer.tsx`:
- Komunikat jest renderowany jako osobna `<Card>` NAD miejscem na wideo
- Wideo jest UKRYTE gdy komunikat jest widoczny: `{!showResumePrompt && <SecureMedia ...>}`
- Użytkownik nie widzi wideo dopóki nie podejmie decyzji

## Nowe zachowanie

- Wideo zawsze widoczne i ustawione na zapisanej pozycji
- Na wideo nakładka z półprzezroczystym tłem
- Pytanie "Kontynuować od X:XX?" z przyciskami
- Po kliknięciu nakładka znika i wideo kontynuuje/resetuje

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│        ┌─────────────────────────────┐          │
│        │                             │          │
│        │  [Klatka wideo z :22]       │          │
│        │                             │          │
│        │   ╔═══════════════════════╗ │          │
│        │   ║                       ║ │          │
│        │   ║  Kontynuować od 0:22? ║ │          │
│        │   ║                       ║ │          │
│        │   ║ [Od początku] [Kont.] ║ │          │
│        │   ║                       ║ │          │
│        │   ╚═══════════════════════╝ │          │
│        │                             │          │
│        └─────────────────────────────┘          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Sekcja techniczna

### Modyfikacja: `src/pages/HealthyKnowledgePlayer.tsx`

#### 1. Zmiana logiki initialTime

Zamiast ustawiać `initialTime` dopiero po wyborze, ustawiamy go od razu na zapisaną pozycję:

```typescript
// Na początku (przed pobraniem materiału)
const [initialTime, setInitialTime] = useState(0);
const [showResumePrompt, setShowResumePrompt] = useState(false);
const [savedPosition, setSavedPosition] = useState(0);

// W useEffect po załadowaniu postępu
if (progress.position > 5) {
  setSavedPosition(progress.position);
  setInitialTime(progress.position);  // <-- NOWE: ustaw od razu
  setShowResumePrompt(true);
}
```

#### 2. Usunięcie warunku `{!showResumePrompt && ...}`

Wideo jest teraz ZAWSZE renderowane:

```typescript
{/* Video Player - ZAWSZE WIDOCZNY */}
<Card className="overflow-hidden">
  <CardContent className="p-0 relative">  {/* <-- relative dla pozycjonowania overlay */}
    <SecureMedia
      mediaUrl={material.media_url!}
      mediaType={material.content_type as 'video' | 'audio'}
      className="w-full aspect-video"
      onTimeUpdate={handleTimeUpdate}
      onPlayStateChange={handlePlayStateChange}
      initialTime={initialTime}
    />
    
    {/* Resume Overlay - nakładka NA WIDEO */}
    {showResumePrompt && (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
        <div className="bg-card border border-primary/50 rounded-xl p-6 max-w-sm mx-4 text-center shadow-xl">
          <RotateCcw className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-lg font-medium mb-1">
            Kontynuować od <span className="text-primary font-bold">{formatTime(savedPosition)}</span>?
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Ostatnio oglądałeś to wideo
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleStartOver}>
              Od początku
            </Button>
            <Button onClick={handleResume} className="bg-primary">
              Kontynuuj
            </Button>
          </div>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

#### 3. Logika handleStartOver z resetem initialTime

```typescript
const handleStartOver = () => {
  setInitialTime(0);  // Reset do początku
  setShowResumePrompt(false);
  if (id) {
    localStorage.removeItem(`hk_progress_${id}`);
  }
};

const handleResume = () => {
  // initialTime już ustawione na savedPosition
  setShowResumePrompt(false);
};
```

---

## Struktura JSX po zmianach

```tsx
<Card className="overflow-hidden">
  <CardContent className="p-0 relative">
    {/* Wideo zawsze widoczne */}
    <SecureMedia ... />
    
    {/* Nakładka z pytaniem */}
    {showResumePrompt && (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
        <div className="bg-card border rounded-xl p-6 text-center">
          <RotateCcw className="..." />
          <p>Kontynuować od <strong>{formatTime(savedPosition)}</strong>?</p>
          <div className="flex gap-3">
            <Button onClick={handleStartOver}>Od początku</Button>
            <Button onClick={handleResume}>Kontynuuj</Button>
          </div>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

---

## Podsumowanie zmian

| Element | Było | Będzie |
|---------|------|--------|
| Wideo | Ukryte gdy prompt widoczny | Zawsze widoczne |
| Prompt | Osobna karta nad wideo | Nakładka na wideo |
| initialTime | Ustawiany po wyborze | Ustawiany od razu na savedPosition |
| UX | Użytkownik nie widzi wideo | Widzi wideo z klatką gdzie skończył |

## Korzyści

- **Lepszy UX** - użytkownik od razu widzi gdzie skończył
- **Kontekst wizualny** - klatka wideo pokazuje moment przerwania
- **Nowoczesny wygląd** - nakładka na wideo jak w YouTube, Netflix
- **Jeden plik do zmiany** - tylko `HealthyKnowledgePlayer.tsx`

