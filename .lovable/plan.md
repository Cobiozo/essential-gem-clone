
# Plan: Naprawa widoczności kontrolek wideo w Zdrowa Wiedza

## Zdiagnozowany problem

### Symptomy
- Wideo wyświetla się (widoczna klatka obrazu)
- Brak natywnych kontrolek przeglądarki (play/pause, pasek postępu, głośność)
- Timer dostępu widoczny (23:59:33)

### Przyczyna
W `HealthyKnowledgePublicPage.tsx` (linia 230):

```tsx
<div className="aspect-video bg-black rounded-lg overflow-hidden">
  <SecureMedia ... />
</div>
```

Problem stanowi kombinacja:
1. **`overflow-hidden`** - ucina wszystko co wychodzi poza kontener
2. **`aspect-video`** - wymusza proporcje 16:9 z określoną wysokością
3. **SecureMedia renderuje `<video>` z `h-auto`** - wysokość dopasowuje się do treści

Natywne kontrolki przeglądarki są renderowane NA DOLE elementu `<video>`. Jeśli wideo jest wyższe niż kontener (lub dokładnie równe), kontrolki są "ucięte" przez `overflow-hidden`.

Dodatkowo w `SecureMedia.tsx` linia 1129:
```tsx
className={`w-full h-auto rounded-lg ${className || ''}`}
```

Klasa `h-auto` pozwala wysokości być dynamiczną, ale to powoduje że kontrolki mogą wychodzić poza `aspect-video` kontener.

---

## Rozwiązanie

### Zmiana 1: HealthyKnowledgePublicPage.tsx

Zmienić kontener wideo tak, aby nie ucinał kontrolek:

```tsx
// PRZED (linia 230):
<div className="aspect-video bg-black rounded-lg overflow-hidden">

// PO:
<div className="aspect-video bg-black rounded-lg">
```

Usunięcie `overflow-hidden` pozwoli natywnym kontrolkom być widocznymi.

### Zmiana 2: SecureMedia.tsx (dodatkowe zabezpieczenie)

Aby wideo idealnie wypełniało kontener, zmodyfikować klasę w trybie `disableInteraction=false`:

```tsx
// PRZED (linia 1129):
className={`w-full h-auto rounded-lg ${className || ''}`}

// PO:
className={`w-full h-full object-contain rounded-lg ${className || ''}`}
```

- `h-full` - wysokość 100% rodzica
- `object-contain` - zachowanie proporcji wewnątrz kontenera

---

## Szczegóły zmian

| Plik | Linia | Zmiana |
|------|-------|--------|
| `src/pages/HealthyKnowledgePublicPage.tsx` | 230 | Usunięcie `overflow-hidden` z kontenera wideo |
| `src/components/SecureMedia.tsx` | 1129 | Zmiana `h-auto` na `h-full object-contain` |

---

## Dlaczego to bezpieczne

1. **Zmiana w HK stronie** - dotyczy tylko zewnętrznej strony Zdrowa Wiedza, nie wpływa na szkolenia ani inne moduły
2. **Zmiana w SecureMedia** - dotyczy tylko trybu `disableInteraction=false` (linia 1122-1139), tryb restrykcyjny dla szkoleń używa innego renderu (linie 989-1086)
3. **`object-contain`** - zachowuje oryginalne proporcje wideo, nie rozciąga obrazu

---

## Przepływ po zmianach

```
Użytkownik wpisuje kod OTP
        ↓
validate-hk-otp generuje signed URL ✓
        ↓
SecureMedia używa signed URL bezpośrednio ✓
        ↓
Wideo renderuje się w kontenerze aspect-video
        ↓
h-full wypełnia kontener, kontrolki widoczne na dole
        ↓
✅ Użytkownik widzi pełne kontrolki (play, seek, volume, fullscreen)
```

---

## Podsumowanie

Dwie małe zmiany CSS naprawią problem:
- Usunięcie `overflow-hidden` które ucina kontrolki
- Zmiana `h-auto` na `h-full object-contain` dla prawidłowego dopasowania

Wideo będzie miało pełne natywne kontrolki przeglądarki: play/pause, przewijanie, głośność, pełny ekran.
