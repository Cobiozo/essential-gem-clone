

# Analiza responsywności Akademii na urządzeniach mobilnych (Android, iOS, Apple)

## Ocena obecnego stanu

Akademia jest **w dużej mierze dobrze przygotowana** na urządzenia mobilne. Oto szczegółowa analiza z wykrytymi problemami wymagającymi poprawek:

## Problemy do naprawienia

### 1. Header w TrainingModule.tsx -- brak responsywności na wąskich ekranach

**Problem**: Nagłówek modułu szkoleniowego (linie 1320-1338) nie ma `flex-wrap` ani ukrywania tekstu na mobile. Na ekranach < 375px przycisk "Powrót do szkoleń" + tytuł modułu mogą się nie mieścić w jednej linii, powodując obcięcie lub overflow.

**Naprawa**:
- Dodanie `flex-wrap` do kontenera nagłówka
- Ukrycie tekstu "Powrót do szkoleń" na mobile (zostawienie samej ikony strzałki)
- Zmniejszenie paddingu na mobile (`px-2 sm:px-4`)
- Dodanie `truncate` na tytule modułu i opisie

### 2. Przyciski nawigacji lekcji -- za małe na dotyk na iOS

**Problem**: Przyciski "Poprzednia" / "Następna" (linie 1580-1601) nie mają `flex-wrap` i mogą się nakładać na wąskich ekranach. Tekst "X z Y" pomiędzy nimi nie ma minimalnej szerokości.

**Naprawa**:
- Dodanie `flex-wrap` do kontenera
- Na mobile zmiana layoutu na kolumnowy gdy brakuje miejsca
- Upewnienie się, że przyciski mają odpowiedni `min-height: 44px` (wymaganie iOS)

### 3. VideoControls -- kontrolki mogą się przepełniać na iPhone SE (320px)

**Problem**: Rząd kontrolek wideo (Play, -10s, czas, Napraw, Pomoc, Fullscreen) zawiera wiele elementów. Na iPhone SE (320px) mogą się źle zawijać. Choć `flex-wrap` jest obecne, kolejność zawijania może wyglądać chaotycznie.

**Naprawa**:
- Grupowanie kontrolek w logiczne sekcje
- Ukrycie tekstu "-10s" na ekranach < 360px (zostawienie ikony)
- Przeniesienie przycisku "Pomoc" / "Diagnostyka" do drugiego rzędu na mobile

### 4. SecureVideoControls -- Slider trudny do obsługi na dotyk

**Problem**: Pasek postępu (Slider) w trybie "secure" (ukończone lekcje) może być trudny do precyzyjnego obsługiwania na ekranach dotykowych -- domyślna wysokość 8px jest za mała dla palca.

**Naprawa**:
- Zwiększenie obszaru dotykowego slidera na urządzeniach mobilnych (min. 44px)
- Dodanie powiększonego touch target za pomocą pseudo-elementu

### 5. Brak ukrywania Separatora w nagłówku na mobile

**Problem**: `<Separator orientation="vertical" />` w nagłówku TrainingModule jest widoczny na mobile, ale nie dodaje wartości wizualnej gdy elementy się zawijają.

**Naprawa**: Dodanie `hidden sm:block` do Separatora.

## Elementy, które juz dzialaja prawidlowo

- Training.tsx (lista modulow): responsywny grid `md:grid-cols-2 lg:grid-cols-3`, sticky header z `env(safe-area-inset-top)`, `flex-wrap` w nagłówku, ukrywanie tekstów na mobile (`hidden sm:inline`)
- TrainingModule.tsx: oddzielna lista lekcji mobilna (Collapsible) vs desktopowa, responsywne rozmiary wideo (`max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh]`), responsywne paddingi
- LessonNotesDialog: poprawny `max-w-md sm:max-w-lg`, responsywna `ScrollArea`
- Globalne CSS: `touch-action: manipulation`, min. 44px na interaktywne elementy, `-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`, safe area support
- PWA: konfiguracja manifest, service worker, install banner

## Pliki do zmiany

1. **`src/pages/TrainingModule.tsx`** -- naprawa nagłówka (flex-wrap, ukrycie tekstu na mobile, truncate), naprawa przycisków nawigacji, separator
2. **`src/components/training/VideoControls.tsx`** -- lepsza organizacja kontrolek na ekranach < 360px
3. **`src/components/training/SecureVideoControls.tsx`** -- zwiększony touch target dla slidera
4. **`src/index.css`** -- opcjonalnie: dodanie utility dla zwiększonego touch targetu na Slider

## Zakres zmian

Zmiany są kosmetyczne i nie wpływają na logikę biznesową. Dotyczą wyłącznie klas CSS i drobnych zmian w strukturze HTML dla lepszego zawijania na wąskich ekranach.

