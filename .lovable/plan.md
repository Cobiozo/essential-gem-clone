
# Plan: Naprawa zabezpieczeń wideo - eliminacja opcji pobierania

## Zdiagnozowany problem

Na zrzucie ekranu widać **natywne menu kontekstowe przeglądarki** z opcjami:
- "Pobierz" 
- "Szybkość odtwarzania"
- "Obraz w obrazie"

To oznacza, że wideo renderuje się z natywnymi kontrolkami `<video controls>` zamiast bezpiecznych custom kontrolek `SecureVideoControls`.

## Analiza kodu

W `CMSContent.tsx` wideo jest renderowane w **trzech różnych miejscach**, z czego tylko jedno używa `SecureMedia`:

| Lokalizacja | Kod | Problem |
|-------------|-----|---------|
| `renderMedia()` (linia 47) | `<SecureMedia controlMode="secure">` | OK - używa bezpiecznych kontrolek |
| `renderSubCell()` (linie 355-364) | `<video controls>` | PROBLEM - natywne kontrolki z pobieraniem |
| case `'video'` (linie 887-899) | `<video controls={videoControls}>` | PROBLEM - natywne kontrolki z pobieraniem |

## Rozwiązanie

Zamienić wszystkie wystąpienia natywnych tagów `<video>` w CMSContent na komponent `SecureMedia` z `controlMode="secure"`.

---

## Sekcja techniczna

### 1. Zmiana w `renderSubCell()` (linie 353-366)

**Przed:**
```typescript
return (
  <div key={subCell.id} className={subAlignmentClass}>
    <video 
      src={subCell.media_url} 
      controls={subCell.controls !== false}
      autoPlay={subCell.autoplay === true}
      loop={subCell.loop === true}
      muted={subCell.muted !== false}
      playsInline
      className="w-full rounded"
      style={videoStyle}
    />
  </div>
);
```

**Po:**
```typescript
return (
  <div key={subCell.id} className={subAlignmentClass}>
    <SecureMedia
      mediaUrl={subCell.media_url}
      mediaType="video"
      controlMode="secure"
      className="w-full rounded"
    />
  </div>
);
```

### 2. Zmiana w case `'video'` (linie 883-913)

**Przed:**
```typescript
// Local video
return (
  <div style={videoStyles.style} className={cn('w-full', videoStyles.className)}>
    {hasLocalVideo ? (
      <>
        <video
          src={videoUrl}
          controls={videoControls}
          autoPlay={videoAutoplay}
          loop={videoLoop}
          muted={videoMuted}
          className="w-full max-w-full rounded-lg"
          style={{ ... }}
        />
        ...
      </>
    ) : ...}
  </div>
);
```

**Po:**
```typescript
// Local video with secure controls
return (
  <div style={videoStyles.style} className={cn('w-full', videoStyles.className)}>
    {hasLocalVideo ? (
      <>
        <SecureMedia
          mediaUrl={videoUrl}
          mediaType="video"
          controlMode="secure"
          className="w-full max-w-full rounded-lg"
        />
        {item.title && (
          <h4 className="mt-2 font-medium text-foreground">{item.title}</h4>
        )}
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        )}
      </>
    ) : ...}
  </div>
);
```

### 3. Wzmocnienie blokady menu kontekstowego w SecureMedia

Dodanie natywnego event listenera dla 100% pewności blokady menu:

```typescript
// W useEffect dla trybu secure
useEffect(() => {
  if (controlMode !== 'secure' || !videoElement) return;
  
  const blockContextMenu = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
  
  // Blokuj na elemencie video
  videoElement.addEventListener('contextmenu', blockContextMenu, true);
  
  // Blokuj też na kontenerze (dla obszarów wokół wideo)
  const container = containerRef.current;
  if (container) {
    container.addEventListener('contextmenu', blockContextMenu, true);
  }
  
  return () => {
    videoElement.removeEventListener('contextmenu', blockContextMenu, true);
    if (container) {
      container.removeEventListener('contextmenu', blockContextMenu, true);
    }
  };
}, [controlMode, videoElement]);
```

### 4. Blokada w trybie secure na poziomie kontenera

Dodanie `onContextMenu` do div-a zawierającego wideo:

```typescript
// W renderowaniu secure mode (linia 1121)
<div 
  ref={containerRef}
  className={...}
  onContextMenu={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
>
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `CMSContent.tsx` | Zamiana `<video>` na `<SecureMedia controlMode="secure">` w 2 miejscach | Eliminacja natywnych kontrolek |
| `SecureMedia.tsx` | Wzmocnienie blokady menu kontekstowego przez natywny listener | 100% pewność blokady |

## Efekt końcowy

- Wideo w Aktualnościach ma **custom kontrolki** (play/pause, seek, prędkość, fullscreen)
- **Brak opcji "Pobierz"** w menu kontekstowym
- **Brak natywnego menu przeglądarki** przy prawym kliknięciu
- Zachowana pełna funkcjonalność odtwarzania

## Kompatybilność

- YouTube wideo - bez zmian (iframe, kontrolowane przez YouTube)
- Wideo w szkoleniach - bez zmian (używają `disableInteraction` i `VideoControls`)
- Wideo w Aktualnościach/CMS - teraz używają `SecureMedia` z `controlMode="secure"`
