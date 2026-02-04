

# Plan: Sekcja zarządzania ustawieniami Open Graph w panelu admina

## Cel

Dodać w panelu admina (zakładka **Settings**) pełną sekcję do zarządzania ustawieniami SEO/Social Media:
- Tytuł OG (`og_title`)
- Opis OG (`og_description`)
- Nazwa strony (`og_site_name`)
- URL strony (`og_url`)
- Obrazek OG (już istnieje)

---

## Aktualny stan

| Element | Status |
|---------|--------|
| Kolumny w bazie danych | Istnieją: `og_title`, `og_description`, `og_site_name`, `og_url` |
| UI do zarządzania OG Image | Istnieje (linie 3573-3654) |
| UI do zarządzania pozostałych ustawień OG | Brak |

**Aktualne wartości w bazie:**
- `og_title`: "Pure Life Center"
- `og_description`: "Zmieniamy życie i zdrowie ludzi na lepsze"
- `og_site_name`: "Pure Life Center"
- `og_url`: "https://purelife.info.pl"

---

## Zakres zmian

### Plik: `src/pages/Admin.tsx`

#### 1. Dodanie nowych stanów (po linii 361)

```typescript
// OG Meta Tags state
const [ogTitle, setOgTitle] = useState('');
const [ogDescription, setOgDescription] = useState('');
const [ogSiteName, setOgSiteName] = useState('');
const [ogUrl, setOgUrl] = useState('');
const [ogMetaLoading, setOgMetaLoading] = useState(false);
```

#### 2. Rozszerzenie funkcji `loadPageSettings` (linia 1548)

Pobieranie dodatkowych kolumn z bazy:
```typescript
.select('favicon_url, og_image_url, og_title, og_description, og_site_name, og_url')
```

I ustawienie stanów:
```typescript
setOgTitle(data.og_title || '');
setOgDescription(data.og_description || '');
setOgSiteName(data.og_site_name || '');
setOgUrl(data.og_url || '');
```

#### 3. Rozszerzenie funkcji `updatePageSettings` (linia 1563)

Zmiana typowania parametru:
```typescript
const updatePageSettings = async (updates: { 
  favicon_url?: string; 
  og_image_url?: string;
  og_title?: string;
  og_description?: string;
  og_site_name?: string;
  og_url?: string;
}) => {
```

#### 4. Dodanie funkcji `updateOgMetaTags`

```typescript
const updateOgMetaTags = async () => {
  try {
    setOgMetaLoading(true);
    await updatePageSettings({
      og_title: ogTitle,
      og_description: ogDescription,
      og_site_name: ogSiteName,
      og_url: ogUrl,
    });
  } finally {
    setOgMetaLoading(false);
  }
};
```

#### 5. Nowa karta UI w sekcji Settings (przed linią 3573)

```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 Ustawienia SEO / Social Media                           │
│  Zarządzaj meta tagami wyświetlanymi przy udostępnianiu     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tytuł strony (og:title)                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pure Life Center                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Opis strony (og:description)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Zmieniamy życie i zdrowie ludzi na lepsze           │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Nazwa witryny (og:site_name)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pure Life Center                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  URL strony (og:url)                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ https://purelife.info.pl                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                     ┌─────────────────┐     │
│                                     │ 💾 Zapisz       │     │
│                                     └─────────────────┘     │
│                                                             │
│  ⚠️ Uwaga: Po zmianie ustawień pamiętaj o odświeżeniu       │
│  cache na platformach social media (Facebook Debugger)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Struktura kodu UI

```tsx
{/* OG Meta Tags Management */}
<div className="mb-8">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Ustawienia SEO / Social Media
      </CardTitle>
      <CardDescription>
        Zarządzaj meta tagami wyświetlanymi przy udostępnianiu linków w social media (WhatsApp, Facebook, Messenger)
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* og:title */}
      <div>
        <Label htmlFor="og-title">Tytuł strony (og:title)</Label>
        <Input
          id="og-title"
          value={ogTitle}
          onChange={(e) => setOgTitle(e.target.value)}
          placeholder="Pure Life Center"
        />
      </div>
      
      {/* og:description */}
      <div>
        <Label htmlFor="og-description">Opis strony (og:description)</Label>
        <Textarea
          id="og-description"
          value={ogDescription}
          onChange={(e) => setOgDescription(e.target.value)}
          placeholder="Zmieniamy życie i zdrowie ludzi na lepsze"
          rows={3}
        />
      </div>
      
      {/* og:site_name */}
      <div>
        <Label htmlFor="og-site-name">Nazwa witryny (og:site_name)</Label>
        <Input
          id="og-site-name"
          value={ogSiteName}
          onChange={(e) => setOgSiteName(e.target.value)}
          placeholder="Pure Life Center"
        />
      </div>
      
      {/* og:url */}
      <div>
        <Label htmlFor="og-url">URL strony (og:url)</Label>
        <Input
          id="og-url"
          type="url"
          value={ogUrl}
          onChange={(e) => setOgUrl(e.target.value)}
          placeholder="https://purelife.info.pl"
        />
      </div>
      
      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={updateOgMetaTags}
          disabled={ogMetaLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {ogMetaLoading ? 'Zapisywanie...' : 'Zapisz ustawienia OG'}
        </Button>
      </div>
      
      {/* Info alert */}
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Ważne:</strong> Po zmianie ustawień pamiętaj o odświeżeniu cache na platformach social media. 
          Użyj <a href="https://developers.facebook.com/tools/debug/" target="_blank" className="underline">Facebook Sharing Debugger</a> 
          i kliknij "Scrape Again" dla Twojego URL.
        </p>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## Podsumowanie zmian

| Lokalizacja | Zmiana |
|-------------|--------|
| Linia ~361 | Dodanie 5 nowych stanów dla OG meta tags |
| Linia ~1548 | Rozszerzenie `loadPageSettings` o nowe kolumny |
| Linia ~1563 | Rozszerzenie typów w `updatePageSettings` |
| Linia ~1680 | Dodanie funkcji `updateOgMetaTags` |
| Przed linią 3573 | Nowa karta UI "Ustawienia SEO / Social Media" |

---

## Korzyści

1. **Centralne zarządzanie** - wszystkie ustawienia OG w jednym miejscu
2. **Brak konieczności edycji kodu** - admin może zmieniać tytuł, opis bez developera
3. **Informacja o cache** - użytkownik wie, że musi odświeżyć cache FB/WhatsApp
4. **Spójność z istniejącym UI** - ten sam styl co sekcja OG Image

