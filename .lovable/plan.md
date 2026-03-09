

# Poprawki Auto-Webinarów — 3 problemy

## 1. Logo pokoju — błąd RLS przy uploadzie

Sprawdziłem polityki storage. Wcześniejsza migracja zmieniła uprawnienia uploadu do `cms-images` na **admin-only** (`is_admin()`), ale istnieje też starsza polityka `Allow authenticated uploads to cms-images`. Wygląda na to, że polityki się nawzajem nadpisały i teraz działają te z `is_admin()`. 

Rozwiązanie: zmienić ścieżkę uploadu logo na dedykowany folder w `cms-images` z jawną polityką, albo prościej — upewnić się, że `handleUploadLogo` uploaduje do folderu, który jest dozwolony. Ponieważ admin korzysta z tego panelu, a polityka `Admins can upload CMS images` wymaga `is_admin()`, sprawdzę czy funkcja `is_admin()` istnieje i działa poprawnie.

Alternatywne podejście (prostsze): dodać upload do bucketu `auto-webinar` lub użyć dedykowanego folderu. Jednak najprościej jest sprawdzić i naprawić `is_admin()` function, albo zmienić upload path.

**Plan**: Dodać migrację SQL, która dropnie starą restrykcyjną politykę i utworzy nową pozwalającą admin-om uploadować. Ale to już istnieje... Problem może być w braku funkcji `is_admin()`. Sprawdzę:

Widzę w db functions: `check_is_admin_for_events()` ale nie `is_admin()`. To jest przyczyna! Polityka `Admins can upload CMS images` odwołuje się do `is_admin()` która może nie istnieć lub zwracać błąd.

**Fix**: Dodać migrację tworzącą `is_admin()` jeśli nie istnieje, lub zmienić upload na bezpośredni path (folder w `cms-images` z admin prefixem).

Prostsze rozwiązanie: stworzyć funkcję `is_admin()` jeśli brakuje.

## 2. Usunięcie sekcji harmonogramu, przeniesienie toggle do sekcji własnej

**W `AutoWebinarManagement.tsx`:**
- Usunąć switch "Sekcja harmonogramu" (linie 750-758)
- Zmienić nagłówek sekcji z "Sekcja własna (pod harmonogramem)" na "Sekcja własna"
- Dodać switch włącz/wyłącz do sekcji własnej (kontroluje `room_show_schedule_info` → przemianować na bardziej ogólny, ale reuse tego pola jako toggle widoczności sekcji własnej)

**W `AutoWebinarRoom.tsx`:**
- Usunąć kartę harmonogramu (linie 142-156)
- Sekcja własna warunkowana przełącznikiem (reuse `room_show_schedule_info` jako "show custom section")

**W podglądzie pokoju (preview):**
- Usunąć preview harmonogramu (linie 822-830)

## 3. Wyjaśnienie sekcji "Wydarzenie i zaproszenia" + dostęp partnera

Sekcja "Wydarzenie i zaproszenia" tworzy rekord `events`, który automatycznie pojawia się w widoku wydarzeń partnerów (`EventCard`). Partner widzi link zapraszający bezpośrednio w karcie wydarzenia — przycisk "Kopiuj zaproszenie" z `buildInviteUrl()` który generuje `https://purelife.info.pl/e/{slug}?ref={EQID}`. To działa tak samo jak dla każdego innego wydarzenia.

Nie wymaga zmian w kodzie — wystarczy wyjaśnienie. Ale mogę dodać krótką informację w panelu admina.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Utworzenie funkcji `is_admin()` jeśli nie istnieje |
| `AutoWebinarManagement.tsx` | Usunięcie switcha harmonogramu, zmiana nagłówka sekcji własnej, dodanie toggle do sekcji własnej |
| `AutoWebinarRoom.tsx` | Usunięcie karty harmonogramu, warunkowanie sekcji własnej nowym toggle |

