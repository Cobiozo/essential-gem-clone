

# Dodanie opisów do uprawnień w Panelu Lidera

## Zmiana

Rozszerzyć definicję `columns` w `LeaderPanelManagement.tsx` o pole `description` z krótkim opisem każdego uprawnienia. Opis wyświetlany pod nazwą uprawnienia (pod `col.label`) mniejszą czcionką.

## Opisy uprawnień

| Uprawnienie | Opis |
|---|---|
| Spotkania | Lider może konfigurować dostępność i prowadzić spotkania indywidualne ze swoim zespołem |
| Szkolenia | Lider widzi postępy szkoleniowe członków swojego zespołu |
| Struktura | Lider widzi drzewo organizacyjne (downline) swojego zespołu |
| Zatwierdzanie | Lider może zatwierdzać rejestracje nowych użytkowników w swoim zespole |
| Wydarzenia | Lider może tworzyć i zarządzać wydarzeniami dla swojego zespołu |
| Rejestracje | Lider może zarządzać rejestracjami uczestników na wydarzenia |
| Zarz. szkoleniami | Lider może tworzyć i edytować szkolenia dostępne dla zespołu |
| Baza wiedzy | Lider może dodawać i edytować materiały w bazie wiedzy zespołu |
| Powiadomienia | Lider może wysyłać powiadomienia w aplikacji do członków zespołu |
| Emaile | Lider może wysyłać wiadomości e-mail do członków zespołu |
| Push | Lider może wysyłać powiadomienia push do członków zespołu |
| Kontakty | Lider może przeglądać dane kontaktowe członków swojego zespołu |
| Edycja kontaktów | Lider może edytować dane kontaktowe członków zespołu |
| Sygnał Dnia | Lider może zarządzać treścią Sygnału Dnia dla zespołu |
| Ważne info | Lider może publikować ważne informacje widoczne dla zespołu |
| Reflinki | Lider może zarządzać linkami referencyjnymi członków zespołu |
| Moja strona | Lider może personalizować stronę landing page dla swojego zespołu |
| Raporty | Lider może przeglądać raporty i statystyki swojego zespołu |
| Certyfikaty | Lider może zarządzać certyfikatami członków zespołu |
| Kalk. Influencer | Lider uzyskuje dostęp do kalkulatora influencerów |
| Kalk. Specjalista | Lider uzyskuje dostęp do druków specjalisty |

## Zmiany w kodzie

**Plik: `src/components/admin/LeaderPanelManagement.tsx`**

1. Dodać pole `description: string` do interfejsu `ColumnDef`
2. Uzupełnić tablicę `columns` o opisy (jak w tabeli powyżej)
3. W renderowaniu każdego uprawnienia (linia ~361-374) dodać pod `col.label` mały tekst `col.description` w klasie `text-[10px] text-muted-foreground leading-tight`
4. Tooltip na hover (Tooltip z shadcn) jako alternatywa — ale user chce widzieć opis od razu, więc lepiej tekst pod labelem

## Layout

Obecny układ: `Switch | Icon | Label` w jednej linii.
Nowy: `Switch | Icon | [Label + Description pod spodem]` — label i description w kolumnie flex-col.

```
<label className="flex items-start gap-2 cursor-pointer group">
  <Switch ... className="scale-90 mt-0.5" />
  <col.icon className="h-3.5 w-3.5 mt-0.5 ..." />
  <div className="flex flex-col">
    <span className="text-xs">{col.label}</span>
    <span className="text-[10px] text-muted-foreground leading-tight">{col.description}</span>
  </div>
</label>
```

## Zakres

| Plik | Zmiana |
|---|---|
| `src/components/admin/LeaderPanelManagement.tsx` | Dodanie `description` do `ColumnDef` i `columns`, wyświetlenie w UI |

