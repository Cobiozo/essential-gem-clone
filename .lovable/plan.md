

# Plan: Ulepszenie formularza materiałów w module Zdrowa Wiedza

## Cel

Dwa ulepszenia w formularzu edycji/dodawania materiału:

1. **Miniaturka po uploadzie pliku** - wyświetlenie podglądu przesłanego pliku obok informacji o pliku
2. **Edytor szablonu wiadomości** - pole tekstowe do edycji szablonu wiadomości kopiowanej przy generowaniu kodu OTP

## Zmiany w komponencie

### 1. Miniaturka pliku po uploadzie

Lokalizacja: Sekcja "Plik" (linie 640-664)

**Stan obecny:**
```tsx
{editingMaterial.file_name && (
  <p className="text-sm text-muted-foreground mt-1">
    Aktualny plik: {editingMaterial.file_name}
  </p>
)}
```

**Po zmianie:**
- Dla obrazów: wyświetlenie miniaturki 80x80px z `object-cover`
- Dla wideo: wyświetlenie miniatury z ikoną Play
- Dla dokumentów/audio: ikona typu z nazwą pliku
- Ramka z zaokrąglonymi rogami i cieniem
- Przycisk "Usuń" aby wyczyścić plik

Wizualnie:
```text
┌────────────────────────────────────────────────┐
│ Plik                                           │
│ ┌──────────────────────────────────────────┐   │
│ │ [Wybierz plik]  Nie wybrano pliku        │   │
│ └──────────────────────────────────────────┘   │
│                                                │
│ ┌─────────────────────────────────────────┐   │
│ │ ┌──────┐                                │   │
│ │ │ 📷   │  Mój_obrazek.jpg              │   │
│ │ │      │  (125 KB)          [🗑 Usuń]  │   │
│ │ └──────┘                                │   │
│ └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

### 2. Edytor szablonu wiadomości do kopiowania

Lokalizacja: Po sekcji "Max użyć kodu" (po linii 776), wewnątrz warunku `allow_external_share`

**Nowe pole:**
- Label: "Szablon wiadomości do udostępniania"
- Opis: "Tekst kopiowany przy generowaniu kodu OTP"
- Textarea z 8 rzędami
- Przycisk "Przywróć domyślny"
- Lista dostępnych zmiennych: `{title}`, `{description}`, `{share_url}`, `{otp_code}`, `{validity_hours}`, `{partner_name}`

Wizualnie:
```text
┌──────────────────────────────────────────────────────┐
│ Szablon wiadomości do udostępniania                  │
│ Tekst kopiowany przy generowaniu kodu OTP            │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Cześć!                                           │ │
│ │                                                  │ │
│ │ Mam dla Ciebie ciekawy materiał: "{title}"      │ │
│ │ {description}                                    │ │
│ │                                                  │ │
│ │ 🔗 Link: {share_url}                             │ │
│ │ 🔑 Kod dostępu: {otp_code}                       │ │
│ │                                                  │ │
│ │ ⏰ Kod ważny przez {validity_hours} godzin.      │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ 💡 Zmienne: {title}, {description}, {share_url},     │
│    {otp_code}, {validity_hours}, {partner_name}      │
│                                        [Przywróć ↺]  │
└──────────────────────────────────────────────────────┘
```

## Plik do edycji

| Plik | Zmiany |
|------|--------|
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Miniaturka pliku + edytor szablonu |

## Szczegóły implementacji

### Miniaturka pliku - nowa funkcja pomocnicza

```tsx
const getFileThumbnail = () => {
  if (!editingMaterial?.media_url) return null;
  
  const contentType = editingMaterial.content_type;
  
  if (contentType === 'image') {
    return (
      <img 
        src={editingMaterial.media_url} 
        alt="Podgląd" 
        className="w-20 h-20 object-cover rounded-lg border"
      />
    );
  }
  
  if (contentType === 'video') {
    return (
      <div className="w-20 h-20 bg-blue-500/10 rounded-lg border flex items-center justify-center">
        <Play className="w-8 h-8 text-blue-500" />
      </div>
    );
  }
  
  // Dla document/audio
  return (
    <div className="w-20 h-20 bg-muted rounded-lg border flex items-center justify-center">
      <ContentTypeIcon type={contentType} className="w-8 h-8 text-muted-foreground" />
    </div>
  );
};
```

### Struktura sekcji pliku po zmianie

```tsx
{/* File Upload */}
{editingMaterial.content_type !== 'text' && (
  <div className="space-y-2">
    <Label>Plik</Label>
    <div className="flex items-center gap-2">
      <Input type="file" ... />
      {uploading && <Loader2 />}
    </div>
    
    {/* Nowa sekcja: podgląd pliku */}
    {editingMaterial.media_url && (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border mt-2">
        {getFileThumbnail()}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{editingMaterial.file_name}</p>
          <p className="text-sm text-muted-foreground">
            {editingMaterial.file_size ? `${(editingMaterial.file_size / 1024).toFixed(1)} KB` : ''}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setEditingMaterial({
            ...editingMaterial,
            media_url: null,
            file_name: null,
            file_size: null,
          })}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    )}
  </div>
)}
```

### Edytor szablonu wiadomości

```tsx
{editingMaterial.allow_external_share && (
  <div className="space-y-4 pt-2">
    {/* Istniejące pola: Ważność kodu + Max użyć */}
    <div className="grid grid-cols-2 gap-4">...</div>
    
    {/* Nowy edytor szablonu */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>Szablon wiadomości do udostępniania</Label>
          <p className="text-xs text-muted-foreground">
            Tekst kopiowany przy generowaniu kodu OTP
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingMaterial({
            ...editingMaterial,
            share_message_template: DEFAULT_SHARE_MESSAGE_TEMPLATE,
          })}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Przywróć
        </Button>
      </div>
      <Textarea
        value={editingMaterial.share_message_template || DEFAULT_SHARE_MESSAGE_TEMPLATE}
        onChange={(e) => setEditingMaterial({
          ...editingMaterial,
          share_message_template: e.target.value,
        })}
        rows={8}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        💡 Dostępne zmienne: {'{title}'}, {'{description}'}, {'{share_url}'}, 
        {'{otp_code}'}, {'{validity_hours}'}, {'{partner_name}'}
      </p>
    </div>
  </div>
)}
```

## Wizualny efekt końcowy

Po uploadzie pliku graficznego:
```text
Plik
┌─────────────────────────────────────┐
│ Wybierz plik  obrazek.jpg           │
└─────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ┌──────┐  obrazek.jpg                       │
│ │ 🖼️  │  125.5 KB               [🗑️]      │
│ └──────┘                                    │
└─────────────────────────────────────────────┘
```

Po włączeniu udostępniania zewnętrznego:
```text
✓ Udostępnianie zewnętrzne

┌─────────────────────────────────────────────┐
│ Ważność kodu (godziny)  │  Max użyć kodu   │
│ [24                   ] │  [3            ] │
└─────────────────────────────────────────────┘

Szablon wiadomości do udostępniania
Tekst kopiowany przy generowaniu kodu OTP   [↺ Przywróć]

┌─────────────────────────────────────────────┐
│ Cześć!                                      │
│                                             │
│ Mam dla Ciebie ciekawy materiał: "{title}" │
│ ...                                         │
└─────────────────────────────────────────────┘

💡 Zmienne: {title}, {description}, {share_url}...
```

## Sekcja techniczna

### Linie do edycji

| Zakres linii | Zmiana |
|--------------|--------|
| 640-664 | Rozbudowa sekcji upload pliku o miniaturkę |
| 776-777 | Dodanie edytora szablonu po polach OTP |

### Import do sprawdzenia

Import `DEFAULT_SHARE_MESSAGE_TEMPLATE` już istnieje (linia 27), więc nie trzeba dodawać.

