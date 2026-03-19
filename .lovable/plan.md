

# Plan: Dodanie uploadu wideo w edytorze Hero

## Problem
Pole "URL wideo hero MP4" to zwykły `<Input>` tekstowy — użytkownik może tylko wkleić URL, nie ma przycisku uploadu.

## Rozwiązanie
Zamienić `<Input>` na komponent `MediaUpload` (już istnieje w projekcie, obsługuje wideo) z `allowedTypes={['video']}`.

### Zmiana w `HeroSectionEditor.tsx` (linie 87-91):
```tsx
// Przed:
<Input value={config.hero_video_url || ''} onChange={e => update('hero_video_url', e.target.value)} placeholder="https://...video.mp4" />

// Po:
<MediaUpload
  onMediaUploaded={(url) => update('hero_video_url', url)}
  currentMediaUrl={config.hero_video_url || ''}
  currentMediaType="video"
  allowedTypes={['video']}
/>
```

Dodać import `MediaUpload` na górze pliku.

### Pliki do zmian:
| Plik | Zmiana |
|------|--------|
| `HeroSectionEditor.tsx` | Zamiana Input na MediaUpload dla pola hero_video_url |

