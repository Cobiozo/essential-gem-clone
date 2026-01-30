
# Plan: Utworzenie przykładowego wydarzenia płatnego (LinkedIn w Firmie)

## Cel

Jako administrator-organizator, stworzę kompletne przykładowe wydarzenie ze wszystkimi elementami CMS, zgodne z referencyjnymi zrzutami ekranu. Wydarzenie będzie dostępne pod adresem `/events/linkedin-w-firmie`.

---

## Wizualizacja struktury landing page

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                HERO SECTION                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [Banner graficzny - turkusowe tło z grafiką LinkedIn]                         │  │
│  │                                                                                 │  │
│  │  LinkedIn w Firmie - kompleksowe szkolenie                                     │  │
│  │  dla pracowników i przedsiebiorców                                             │  │
│  │                                                                                 │  │
│  │  📅 20 lutego 2026, 09:00 - 15:30     📍 Online                                │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [Szkolenie] | [Program] | [Prelegenci] | [Rejestracja]  ← STICKY NAVIGATION   │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐  ┌─────────────────────────────┐
│              MAIN CONTENT                        │  │    STICKY SIDEBAR           │
│                                                  │  │                             │
│  ┌────────────────────────────────────────────┐ │  │  ╔═══════════════════════╗  │
│  │  O szkoleniu                               │ │  │  ║    REJESTRACJA        ║  │
│  │  ─────────────────────────────────────     │ │  │  ╠═══════════════════════╣  │
│  │  Kompleksowe szkolenie dotyczące           │ │  │  ║ Online, 20 luty 2026 ║  │
│  │  wykorzystywania LinkedIn w rozmaitych     │ │  │  ╠═══════════════════════╣  │
│  │  zastosowaniach związanych z marketingiem, │ │  │  ║                       ║  │
│  │  budowaniem wizerunku...                   │ │  │  ║  Przedpłata           ║  │
│  └────────────────────────────────────────────┘ │  │  ║  648 zł (+23% VAT)    ║  │
│                                                  │  │  ║                       ║  │
│  ┌────────────────────────────────────────────┐ │  │  ║  Cena zawiera:        ║  │
│  │  Dlaczego warto wziąć udział?             │ │  │  ║  ✓ zniżkę 10%         ║  │
│  │  ─────────────────────────────────────     │ │  │  ║  ✓ udział w zajęciach ║  │
│  │  Twój profil na LinkedIn to nie wirtualne │ │  │  ║  ✓ materiały          ║  │
│  │  CV - to Twoja całodobowa wizytówka.      │ │  │  ║  ✓ certyfikat         ║  │
│  │  Nauczysz się budować autorytet,          │ │  │  ║  ✓ anulowanie do 3 dni║  │
│  │  angażować odbiorców...                   │ │  │  ║                       ║  │
│  └────────────────────────────────────────────┘ │  │  ║  [Zapisz się →]       ║  │
│                                                  │  │  ╚═══════════════════════╝  │
│  ┌────────────────────────────────────────────┐ │  │                             │
│  │  Kto powinien wziąć udział?               │ │  └─────────────────────────────┘
│  │  ─────────────────────────────────────     │ │
│  │  Szkolenie dla pracowników firm           │ │
│  │  (marketing, HR, handlowcy) i             │ │
│  │  przedsiębiorców, którzy chcą             │ │
│  │  wykorzystywać LinkedIn do budowania...   │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Program szkolenia                         │ │
│  │  ─────────────────────────────────────     │ │
│  │                                            │ │
│  │  LinkedIn jako narzędzie rozwoju           │ │
│  │  • LinkedIn 2025/2026 - kim są użytkownicy?│ │
│  │  • Jak zmienił się LinkedIn: od CV do...   │ │
│  │  • LinkedIn vs. Facebook - podobieństwa    │ │
│  │                                            │ │
│  │  Profil, który sprzedaje kompetencje       │ │
│  │  • Profil personalny - nie jako CV         │ │
│  │  • Najważniejsze sekcje profilu            │ │
│  │  • Kręgi kontaktów i Social Selling Index  │ │
│  │                                            │ │
│  │  Strona firmowa (Company Page)             │ │
│  │  • Jak założyć i prowadzić stronę          │ │
│  │  • Budowanie zasięgów organicznych         │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Czas trwania                              │ │
│  │  ─────────────────────────────────────     │ │
│  │  Szkolenie trwa 1 dzień w godz. 9-15:30.  │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│                      SEKCJA PRELEGENCI (niebieskie tło)                              │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Prelegenci                                             │  │
│  │                                                                                 │  │
│  │    ┌───────────────────────────────────────────────────────────────────────┐   │  │
│  │    │  ┌────────┐                                                           │   │  │
│  │    │  │ 👤     │  Marcin Pietraszek                                        │   │  │
│  │    │  │ PHOTO  │  Empemedia                                                │   │  │
│  │    │  └────────┘                                                           │   │  │
│  │    │                                                                       │   │  │
│  │    │  Trener social media, konsultant; od kilkunastu lat usługowo          │   │  │
│  │    │  zajmuje się marketingiem i mediami społecznościowymi, w tym          │   │  │
│  │    │  platformą LinkedIn. Obecnie dzieli się swoją wiedzą poprzez          │   │  │
│  │    │  szkolenia i konsultacje. Jest autorem wielu publikacji na temat      │   │  │
│  │    │  biznesu i marketingu, w tym książki "PRo-MOC-ja"...                   │   │  │
│  │    └───────────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Dane do wstawienia do bazy danych

### 1. Tabela: `paid_events` (główne wydarzenie)

| Pole | Wartość |
|------|---------|
| slug | `linkedin-w-firmie` |
| title | `LinkedIn w Firmie - kompleksowe szkolenie dla pracowników i przedsiębiorców` |
| short_description | `Naucz się wykorzystywać LinkedIn do budowania wiarygodności, relacji oraz realnych efektów biznesowych.` |
| description | `<p>Kompleksowe szkolenie dotyczące wykorzystywania LinkedIn...</p>` |
| event_date | `2026-02-20 09:00:00+01` |
| event_end_date | `2026-02-20 15:30:00+01` |
| location | `Online` |
| is_online | `true` |
| max_tickets | `30` |
| is_published | `true` |
| is_active | `true` |
| visible_to_partners | `true` |
| visible_to_everyone | `true` |

---

### 2. Tabela: `paid_event_content_sections` (sekcje CMS)

**Sekcja 1: O szkoleniu**
| Pole | Wartość |
|------|---------|
| section_type | `about` |
| title | `O szkoleniu` |
| content | Pełny opis szkolenia (HTML) |
| position | `1` |
| icon_name | `BookOpen` |

**Sekcja 2: Dlaczego warto wziąć udział?**
| Pole | Wartość |
|------|---------|
| section_type | `why_join` |
| title | `Dlaczego warto wziąć udział?` |
| content | Tekst o wartości szkolenia |
| position | `2` |
| icon_name | `Target` |

**Sekcja 3: Kto powinien wziąć udział?**
| Pole | Wartość |
|------|---------|
| section_type | `for_whom` |
| title | `Kto powinien wziąć udział?` |
| content | Opis grupy docelowej |
| position | `3` |
| icon_name | `Users` |

**Sekcja 4: Program szkolenia**
| Pole | Wartość |
|------|---------|
| section_type | `schedule` |
| title | `Program szkolenia` |
| content | Program w formacie HTML z listami |
| position | `4` |
| icon_name | `Calendar` |
| items | JSON z punktami programu |

**Sekcja 5: Czas trwania**
| Pole | Wartość |
|------|---------|
| section_type | `duration` |
| title | `Czas trwania` |
| content | `Szkolenie trwa 1 dzień w godz. 9-15:30.` |
| position | `5` |
| icon_name | `Clock` |

---

### 3. Tabela: `paid_event_tickets` (pakiety biletów)

**Bilet 1: Przedpłata (wyróżniony)**
| Pole | Wartość |
|------|---------|
| name | `Przedpłata` |
| price_pln | `64800` (grosze = 648 zł) |
| highlight_text | `Cena obejmuje zniżkę za przedpłatę` |
| is_featured | `true` |
| quantity_available | `25` |
| benefits | JSON: lista benefitów |

**Bilet 2: Cena standardowa**
| Pole | Wartość |
|------|---------|
| name | `Cena standardowa` |
| price_pln | `72000` (grosze = 720 zł) |
| is_featured | `false` |
| quantity_available | `10` |
| benefits | JSON: lista benefitów |

---

### 4. Tabela: `paid_event_speakers` (prelegenci)

**Prelegent 1: Marcin Pietraszek**
| Pole | Wartość |
|------|---------|
| name | `Marcin Pietraszek` |
| title | `Empemedia` |
| bio | Pełne bio (tekst z referencji) |
| photo_url | `null` (placeholder) |
| position | `1` |

---

## Szczegółowa treść do wstawienia

### Content Sections - pełna treść HTML

**O szkoleniu:**
```html
<p>Kompleksowe szkolenie dotyczące wykorzystywania LinkedIn w rozmaitych zastosowaniach 
związanych z marketingiem, budowaniem wizerunku, analizą konkurencji i poszukiwaniem 
kandydatów na pracowników. Podczas szkolenia omawiane jest zarówno wykorzystywanie 
kont prywatnych, jak i firmowych - pod kątem zastosowania w dowolnych branżach Uczestników.</p>
```

**Dlaczego warto wziąć udział?:**
```html
<p>Twój profil na LinkedIn to nie wirtualne CV – to Twoja całodobowa wizytówka. 
Podczas tego szkolenia nauczysz się, jak budować autorytet, angażować odbiorców, 
znajdować odpowiednich pracowników i pozyskiwać klientów bez nachalności!</p>
```

**Kto powinien wziąć udział?:**
```html
<p>Szkolenie dla pracowników firm (marketing, HR, handlowcy) i przedsiębiorców, 
którzy chcą wykorzystywać LinkedIn do budowania wiarygodności, relacji oraz realnych 
efektów biznesowych (sprzedaż, rekrutacja, współpraca).</p>
```

**Program szkolenia (items jako JSON):**
```json
[
  {"text": "LinkedIn jako narzędzie rozwoju kariery i biznesu", "isHeader": true},
  {"text": "LinkedIn 2025/2026 – kim są użytkownicy?"},
  {"text": "Jak zmienił się LinkedIn: od CV do platformy wpływu, zaufania i sprzedaży społecznościowej (social selling)"},
  {"text": "LinkedIn vs. Facebook – podobieństwa i różnice"},
  {"text": "Kto może szczególnie skorzystać dzięki obecności w LinkedIn?"},
  {"text": "Profil, który sprzedaje kompetencje i buduje zaufanie", "isHeader": true},
  {"text": "Profil personalny – nie jako CV, ale oferta wartości z dowodami"},
  {"text": "Najważniejsze sekcje profilu i ich znaczenie dla odbiorców"},
  {"text": "Kręgi kontaktów i Social Selling Index"},
  {"text": "Ustawienia prywatności"},
  {"text": "Strona firmowa, która wspiera sprzedaż i rekrutację (Company Page)", "isHeader": true},
  {"text": "Jak założyć i prowadzić stronę firmową"},
  {"text": "Budowanie zasięgów organicznych"},
  {"text": "Showcase Pages i grupy"}
]
```

**Benefits dla biletu (JSON):**
```json
[
  "zniżkę 10% przy zgłoszeniu (cena standardowa 720 zł)",
  "udział w zajęciach",
  "materiały szkoleniowe w wersji elektronicznej",
  "certyfikat uczestnictwa",
  "bezpłatne anulowanie zgłoszenia do 3 dni przed terminem"
]
```

---

## Kolejność wykonania

1. **INSERT do `paid_events`** - utworzenie głównego rekordu wydarzenia
2. **INSERT do `paid_event_content_sections`** - 5 sekcji CMS
3. **INSERT do `paid_event_tickets`** - 2 pakiety biletów z benefits
4. **INSERT do `paid_event_speakers`** - 1 prelegent

---

## Efekt końcowy

Po wstawieniu danych:
- Strona `/events/linkedin-w-firmie` będzie w pełni funkcjonalna
- Wszystkie sekcje będą wyświetlane zgodnie z designem referencyjnym
- Sidebar z ceną i benefitami będzie gotowy do zakupu
- Admin może edytować każdą sekcję z poziomu panelu CMS

---

## Pliki do modyfikacji

Brak zmian w plikach - tylko operacje INSERT do bazy danych.
