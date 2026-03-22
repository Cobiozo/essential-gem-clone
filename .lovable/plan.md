

# Edytor mapowania danych na plikach BP (obrazy + PDF)

## Cel
Rozbudowa modułu "Pliki na stronę BP" o wizualny edytor pozwalający nakładać dynamiczne placeholdery (zmienne użytkownika jak `{{imie}}`, `{{email}}` itp.) na przesłane pliki JPG/PNG/PDF. Docelowo te pliki z naniesionymi danymi użytkownika będą kompilowane w spersonalizowany ebook PDF.

## Jak to działa

1. Admin przesyła plik (obraz lub PDF) do folderu
2. Klika "Edytuj mapowanie" na wybranym pliku
3. Otwiera się edytor wizualny (Fabric.js canvas) z podglądem pliku jako tłem
4. Admin przeciąga i pozycjonuje elementy tekstowe z placeholderami (np. `{{imie_nazwisko}}`)
5. Konfiguruje czcionkę, rozmiar, kolor, wyrównanie
6. Zapisuje layout — elementy i ich pozycje trafiają do bazy danych
7. Podgląd z danymi testowymi (PREVIEW_PROFILE) pozwala zweryfikować efekt

Dla plików PDF — każda strona renderowana jest jako osobny obraz (canvas), z możliwością dodawania elementów na każdej stronie.

## Baza danych

### Nowa tabela `bp_file_mappings`
Przechowuje elementy mapowania dla każdego pliku:

```sql
create table public.bp_file_mappings (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.bp_page_files(id) on delete cascade not null,
  page_index int not null default 0,
  elements jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(file_id, page_index)
);
```

Kolumna `elements` zawiera tablicę JSON z elementami identycznymi jak w `TemplateDndEditor`:
```json
[
  {
    "id": "el-1",
    "type": "text",
    "content": "{{imie_nazwisko}}",
    "x": 120, "y": 340,
    "fontSize": 24,
    "fontFamily": "Arial",
    "color": "#000000",
    "align": "center",
    "fontWeight": "bold"
  }
]
```

RLS: admin-only (select, insert, update, delete) via `public.has_role()`.

## Nowe / zmienione komponenty

### `BpFileMappingEditor.tsx` (nowy)
Edytor wizualny wzorowany na `TemplateDndEditor`:
- Canvas Fabric.js z plikiem źródłowym jako tło
- Dla obrazów (JPG/PNG): bezpośredni render jako background image
- Dla PDF: konwersja stron na obrazy za pomocą `pdfjs-dist`, nawigacja między stronami
- Toolbar: dodaj element tekstowy, wybór zmiennej z legendy (`VARIABLES_LEGEND`), konfiguracja stylu
- Panel właściwości zaznaczonego elementu (czcionka, rozmiar, kolor, wyrównanie, bold/italic)
- Podgląd z danymi testowymi (`PREVIEW_PROFILE` z `partnerVariables.ts`)
- Zapis/odczyt layoutu z tabeli `bp_file_mappings`

### `BpPageFilesManager.tsx` (zmiana)
- Dodanie przycisku "Mapuj dane" (ikona `Wand2`) w overlay akcji na każdym pliku
- Kliknięcie otwiera `BpFileMappingEditor` w dialogu pełnoekranowym
- Badge na pliku wskazujący czy ma mapowanie (dot/ikona)
- Rozszerzenie `accept` w input file o `.pdf`

### Reużywane zasoby
- `VARIABLES_LEGEND` i `PREVIEW_PROFILE` z `src/lib/partnerVariables.ts`
- `resolveVariablesInText()` do podglądu z danymi testowymi
- Wzorzec edytora z `TemplateDndEditor` (Fabric.js canvas, panel właściwości, zapis elementów jako JSON)

## Zależności
- `fabric` — już zainstalowany (używany w certyfikatach)
- `pdfjs-dist` — do renderowania stron PDF jako obrazy na canvas (wymaga instalacji)

## Pliki do zmiany/utworzenia

| Plik | Akcja |
|------|-------|
| Migracja SQL | Tabela `bp_file_mappings` + RLS |
| `src/components/admin/BpFileMappingEditor.tsx` | Nowy — edytor Fabric.js |
| `src/components/admin/BpPageFilesManager.tsx` | Dodanie przycisku "Mapuj dane" + accept PDF |

## Poza zakresem (na później)
- Generowanie finalnego PDF z nałożonymi danymi użytkownika
- Kompilacja wielu plików w jeden ebook
- Wysyłka mailem

