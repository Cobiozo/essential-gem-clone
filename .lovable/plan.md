

# Mega-menu nawigacja — zamiana sidebara na kafelki

## Koncepcja

Sidebar zostaje zredukowany do **wąskiego paska z logo, profilem i 2-3 skrótami** (Pulpit, Panel Lidera). Główna nawigacja przeniesiona do **pełnoekranowego overlay z kafelkami** otwieranego przyciskiem "☰ Menu" w sidebarze lub topbarze.

```text
┌──────┐  ┌─────────────────────────────────────────┐
│ LOGO │  │          MEGA-MENU OVERLAY               │
│      │  │                                           │
│ [☰]  │  │  WIEDZA          SPOŁECZNOŚĆ              │
│      │  │  ┌─────────┐    ┌─────────┐               │
│Pulpit│  │  │🎓       │    │📰       │               │
│      │  │  │Akademia │    │Aktual.  │               │
│Lider │  │  └─────────┘    └─────────┘               │
│      │  │  ┌─────────┐    ┌─────────┐               │
│      │  │  │❤ Zdrowa │    │📅       │               │
│      │  │  │ Wiedza  │    │Wydarzenia│              │
│      │  │  └─────────┘    └─────────┘               │
│      │  │                                           │
│      │  │  NARZĘDZIA       SYSTEM                   │
│ ⚙️   │  │  ┌─────────┐    ┌─────────┐               │
│ 🚪   │  │  │🔗PureL. │    │⚙Ustawien│              │
│      │  │  └─────────┘    └─────────┘               │
└──────┘  └─────────────────────────────────────────┘
```

## Szczegóły

### 1. Nowy komponent `DashboardMegaMenu.tsx`
- Pełnoekranowy overlay (`fixed inset-0 z-50`) z ciemnym tłem i blur
- Kafelki w gridzie 3-4 kolumny, pogrupowane w sekcje:
  - **Wiedza**: Akademia, Zdrowa Wiedza, Biblioteka, PureBox
  - **Społeczność**: Aktualności, Wydarzenia, Eventy płatne, Pure-Kontakty
  - **Narzędzia**: PureLinki, Moja Strona, PureLinki info, Kalkulator, dynamiczne strony HTML
  - **System**: Ustawienia, Wsparcie, Panel CMS (admin)
- Każdy kafelek: ikona + nazwa + opcjonalny krótki opis (tooltip tekst)
- Zamykanie: klik na kafelek, przycisk X, klawisz Escape, klik poza menu
- Animacja: fade-in + scale z `framer-motion` lub CSS transitions

### 2. Uproszczenie `DashboardSidebar.tsx`
- Sidebar zawiera tylko:
  - Logo
  - Profil użytkownika (jak teraz)
  - **Przycisk "Menu"** otwierający mega-menu
  - Pulpit (szybki dostęp)
  - Panel Lidera (jeśli widoczny)
  - Separator
  - Ikony społeczności (footer)
  - Wyloguj
- Cała reszta pozycji przeniesiona do mega-menu
- Sidebar staje się znacznie krótszy — bez scrollowania

### 3. Logika widoczności
- Mega-menu dziedziczy CAŁĄ logikę widoczności z obecnego sidebara (role, uprawnienia, dynamiczne strony HTML, chat visibility itd.)
- Dane pobierane w sidebarze i przekazywane do mega-menu przez props lub shared hook

### 4. Responsywność
- Desktop: sidebar mini + mega-menu overlay
- Mobile: hamburger w topbarze otwiera ten sam mega-menu (zamiast wysuwanego sidebara)

## Pliki do zmiany
1. **Nowy** `src/components/dashboard/DashboardMegaMenu.tsx` — overlay z kafelkami
2. **Edycja** `src/components/dashboard/DashboardSidebar.tsx` — redukcja do mini-paska + przycisk menu
3. **Edycja** `src/components/dashboard/DashboardLayout.tsx` — ewentualne dostosowanie layoutu

## Efekt
- Z 18+ pozycji w długiej liście → 5 w sidebarze + elegancki grid w overlay
- Użytkownik widzi wszystko na raz w uporządkowanych kategoriach
- Sidebar nie wymaga scrollowania

