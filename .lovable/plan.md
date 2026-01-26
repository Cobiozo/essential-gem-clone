

# Plan: Wymuszenie Google Calendar dla harmonogramu wewnętrznego

## Problem

System ma **odwróconą logikę** - blokuje zewnętrzny link (Calendly) gdy partner ma Google Calendar, ale **NIE blokuje** harmonogramu wewnętrznego gdy partner **NIE MA** Google Calendar.

To powoduje, że partner bez połączenia z Google może tworzyć harmonogram wewnętrzny, a system nie może sprawdzić jego zajętości, co prowadzi do kolizji terminów.

## Rozwiązanie

### Zmiana w `IndividualMeetingForm.tsx`

**Nowa logika wyboru kalendarza:**

| Wariant | Stan | Rezultat |
|---------|------|----------|
| Partner MA Google Calendar | Wbudowany harmonogram = dostępny | Zewnętrzny link = zablokowany |
| Partner NIE MA Google Calendar | Wbudowany harmonogram = zablokowany | Zewnętrzny link = dostępny |

**Wizualnie:**

```
┌────────────────────────────────────────────────────────────────┐
│ Sposób rezerwacji spotkań                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Jeśli NIE masz Google Calendar:                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Wbudowany harmonogram                                │   │
│  │    [ZABLOKOWANY]                                        │   │
│  │    "Aby korzystać z harmonogramu wewnętrznego,          │   │
│  │     połącz Google Calendar w ustawieniach konta."       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Zewnętrzny link (Calendly/Cal.com)                   │   │
│  │    [DOSTĘPNY]                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  Jeśli MASZ Google Calendar:                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Wbudowany harmonogram                                │   │
│  │    [DOSTĘPNY]                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Zewnętrzny link (Calendly/Cal.com)                   │   │
│  │    [ZABLOKOWANY]                                        │   │
│  │    "Niedostępne - masz połączony Google Calendar."      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Sekcja techniczna

### Plik: `src/components/events/IndividualMeetingForm.tsx`

**Zmiana 1 - Automatyczne ustawienie trybu (linie 62-81):**

Dodaj auto-switch do `external` jeśli nie ma Google Calendar:

```typescript
const checkGoogleCalendarConnection = async () => {
  if (!user) return;
  
  const { data } = await supabase
    .from('user_google_tokens')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  const connected = !!data;
  setHasGoogleCalendar(connected);
  
  // Automatycznie ustaw tryb na podstawie połączenia
  // Jeśli nie ma Google Calendar, wymuś tryb zewnętrzny
  if (!connected && bookingMode === 'internal') {
    setBookingMode('external');
  }
  // Jeśli ma Google Calendar, wymuś tryb wewnętrzny
  if (connected && bookingMode === 'external') {
    setBookingMode('internal');
  }
};
```

**Zmiana 2 - Zablokowanie "Wbudowany harmonogram" bez Google (linie 292-305):**

```typescript
<div className={cn(
  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
  !hasGoogleCalendar ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
  bookingMode === 'internal' && hasGoogleCalendar ? "border-primary bg-primary/5" : "hover:bg-muted/50"
)}>
  <RadioGroupItem 
    value="internal" 
    id="internal" 
    className="mt-1" 
    disabled={!hasGoogleCalendar}
  />
  <div className="flex-1">
    <Label htmlFor="internal" className={cn(
      "font-medium cursor-pointer",
      !hasGoogleCalendar && "cursor-not-allowed"
    )}>
      Wbudowany harmonogram
    </Label>
    <p className="text-sm text-muted-foreground mt-1">
      Ustalaj dostępność w aplikacji. Partnerzy rezerwują spotkania bezpośrednio w systemie.
    </p>
    {!hasGoogleCalendar && (
      <Alert className="mt-2 py-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Wymagane połączenie z Google Calendar. Przejdź do <strong>Ustawienia konta</strong> i połącz kalendarz.
        </AlertDescription>
      </Alert>
    )}
  </div>
</div>
```

**Zmiana 3 - Odblokowanie "Zewnętrzny link" bez Google (linie 307-338):**

```typescript
<div className={cn(
  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
  hasGoogleCalendar ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
  bookingMode === 'external' && !hasGoogleCalendar ? "border-primary bg-primary/5" : "hover:bg-muted/50"
)}>
  <RadioGroupItem 
    value="external" 
    id="external" 
    className="mt-1" 
    disabled={hasGoogleCalendar}
  />
  <div className="flex-1">
    <Label htmlFor="external" className={cn(
      "font-medium flex items-center gap-2",
      hasGoogleCalendar ? "cursor-not-allowed" : "cursor-pointer"
    )}>
      Zewnętrzny link (Calendly/Cal.com)
      <ExternalLink className="h-3.5 w-3.5" />
    </Label>
    <p className="text-sm text-muted-foreground mt-1">
      Przekieruj partnerów do swojego zewnętrznego kalendarza rezerwacji.
    </p>
    {hasGoogleCalendar && (
      <Alert variant="destructive" className="mt-2 py-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Niedostępne - masz połączony Google Calendar. Rozłącz go w ustawieniach konta, aby używać Calendly.
        </AlertDescription>
      </Alert>
    )}
  </div>
</div>
```

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `IndividualMeetingForm.tsx` | Auto-switch `bookingMode` | Automatyczne wymuszenie poprawnego trybu |
| `IndividualMeetingForm.tsx` | `disabled={!hasGoogleCalendar}` dla internal | Blokada harmonogramu bez Google |
| `IndividualMeetingForm.tsx` | Alert informacyjny | Komunikat jak połączyć Google |

## Efekt końcowy

**Przed:**
- Partner bez Google Calendar może wybrać harmonogram wewnętrzny
- System nie zna jego zajętości → kolizje terminów

**Po:**
- Partner bez Google Calendar MUSI użyć Calendly
- Partner z Google Calendar MUSI użyć harmonogramu wewnętrznego
- Synchronizacja dwustronna działa poprawnie
- Brak kolizji terminów

## Weryfikacja zasad po wdrożeniu

| Zasada | Status |
|--------|--------|
| Partner dostaje uprawnienia od admina | ✅ |
| Google Calendar → tylko harmonogram wewnętrzny | ✅ (wymuszenie) |
| Brak Google Calendar → tylko zewnętrzny link | ✅ (wymuszenie) |
| Harmonogram dostępności | ✅ |
| Partnerzy widzą terminy | ✅ |
| Spotkania zespołu/webinary blokują sloty | ✅ |
| Google Calendar blokuje sloty | ✅ |
| Zapis → sync do Google | ✅ |
| Anulowanie → slot wolny + usuń z Google | ✅ |
| Dwustronna synchronizacja | ✅ |

