
# Plan: Naprawa widoczności kontrolek wideo w Zdrowa Wiedza

## Diagnoza problemu

### Co widzę na screenshotach użytkownika

**Screenshot 1:** Pokazuje panel sterowania z "Odtwórz", "-10s", "Napraw", "Pomoc" oraz komunikat "Przygotowuję wideo do odtwarzania..." i "Podczas pierwszego oglądania możesz tylko cofać wideo"

**Screenshot 2:** Pokazuje wideo odtwarzające się (widoczna klatka), ale BEZ żadnych kontrolek

### Analiza

Problem polega na tym, że choć kod źródłowy ma `disableInteraction={false}`, to użytkownik widzi elementy z trybu restrykcyjnego. Może to oznaczać:

1. **Cache przeglądarki** - stara wersja kodu nadal jest aktywna
2. **Problem z CSS** - kontrolki natywne są ukryte przez stylowanie

Na drugim screenshocie wideo ODTWARZA SIĘ ale bez kontrolek - to sugeruje że natywne kontrolki HTML5 `<video controls>` nie są widoczne.

### Przyczyna techniczna

W `SecureMedia.tsx` (linia 1129):
```tsx
className={`w-full h-full object-contain rounded-lg ${className || ''}`}
```

Połączenie `h-full` z kontenerem `aspect-video` powoduje problem - `aspect-video` daje proporcje 16:9, ale wysokość elementu wideo z `h-full` może powodować że kontrolki wypadają poza widoczny obszar lub są renderowane w nieoczekiwanym miejscu.

---

## Rozwiązanie

### Zmiana 1: SecureMedia.tsx - uproszczone stylowanie dla trybu nierestrykcyjnego

Zmiana klasy wideo tak, aby używało `aspect-video` wewnętrznie i nie polegało na wysokości rodzica:

```tsx
// Linia 1122-1139, tryb disableInteraction={false}
return (
  <div className="relative w-full aspect-video bg-black rounded-lg">
    <video
      ref={videoRefCallback}
      {...securityProps}
      src={signedUrl}
      controls
      controlsList="nodownload"
      className="absolute inset-0 w-full h-full object-contain rounded-lg"
      preload="metadata"
      playsInline
      webkit-playsinline="true"
      {...(signedUrl.includes('supabase.co') && { crossOrigin: "anonymous" })}
    >
      Twoja przeglądarka nie obsługuje odtwarzania wideo.
    </video>
  </div>
);
```

Kluczowe zmiany:
- Owinięcie w `<div>` z `relative`, `aspect-video`, `bg-black`
- Wideo z `absolute inset-0` wypełniające kontener
- Kontrolki natywne będą zawsze widoczne wewnątrz tego kontenera

### Zmiana 2: HealthyKnowledgePublicPage.tsx - usunięcie podwójnego aspect-video

Ponieważ SecureMedia teraz samo zarządza proporcjami, kontener zewnętrzny nie potrzebuje `aspect-video`:

```tsx
// Linia 230
<div className="bg-black rounded-lg">
  <SecureMedia
    mediaUrl={content.media_url}
    mediaType={content.content_type}
    disableInteraction={false}
  />
</div>
```

---

## Szczegóły techniczne

| Plik | Linia | Zmiana |
|------|-------|--------|
| `src/components/SecureMedia.tsx` | 1122-1139 | Owinięcie `<video>` w `<div>` z prawidłowymi klasami CSS |
| `src/pages/HealthyKnowledgePublicPage.tsx` | 230 | Usunięcie `aspect-video` (bo SecureMedia je zapewnia) |

---

## Dlaczego to zadziała

1. **Kontrola proporcji wewnątrz SecureMedia** - komponent sam zarządza swoim układem
2. **`absolute inset-0`** - wideo wypełnia cały kontener, kontrolki są WEWNĄTRZ
3. **Brak konfliktów CSS** - żadnych podwójnych proporcji ani nakładających się kontenerów

---

## Wpływ na inne moduły

| Moduł | Wpływ |
|-------|-------|
| Szkolenia | ❌ Brak - używają trybu `disableInteraction={true}` (linie 988-1086), ta zmiana nie dotyczy tego trybu |
| Wewnętrzny dashboard | ❌ Brak - zalogowani użytkownicy mają swoje uprawnienia |
| InfoLinki | ❌ Brak - nie używają SecureMedia dla wideo |

---

## Efekt końcowy

Po wdrożeniu zmian użytkownik zewnętrzny (z kodem OTP) zobaczy:
- Wideo wypełniające kontener z zachowaniem proporcji
- Natywne kontrolki przeglądarki: play/pause, pasek postępu, głośność, pełny ekran, prędkość
- Timer dostępu nadal widoczny nad wideo
