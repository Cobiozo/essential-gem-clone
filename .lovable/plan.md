
# Dodanie sekcji "Grafiki produktow" z linkami partnerow

## Opis funkcjonalnosci

Nowa sekcja na stronie partnerskiej -- **"Moje polecane produkty"** (widoczna na screenie). Admin dodaje grafiki produktow (zdjecia) do centralnego katalogu, a partner wybiera ktore chce wyswietlic i podpina pod kazde zdjecie wlasny link przekierowujacy (np. do sklepu).

Na publicznej stronie partnerskiej grafiki wyswietlaja sie w siatce (jak na screenie -- 3 kolumny), kazda z nazwa produktu i klikalna -- prowadzi do linku partnera.

## Obecny stan

System juz posiada tabele `product_catalog` (grafiki + nazwy produktow dodawane przez admina) oraz `partner_product_links` (linki partnerow do tych produktow). Renderer `PartnerPage.tsx` juz wyswietla te produkty w sekcji "Produkty" z przyciskami "Kup teraz".

**Problem**: W `ProductCatalogManager` (admin) dodawanie obrazka produktu wymaga recznego wklejenia URL -- brak integracji z biblioteka mediow. Ponadto wyglad sekcji produktow na stronie publicznej nie odpowiada screenom (brak naglowka "Moje polecane produkty", zbyt duze karty).

## Zmiany

### 1. `ProductCatalogManager.tsx` -- picker obrazkow z biblioteki mediow

- Dodanie przycisku **"Wybierz z biblioteki"** w dialogu edycji produktu obok pola URL
- Przycisk otwiera `AdminMediaLibrary` w trybie `mode="picker"` z `allowedTypes={['image']}`
- Po wybraniu obrazka z biblioteki, URL automatycznie wstawia sie w pole `image_url`
- Zachowane pole recznego URL jako alternatywa
- Nowy stan `showMediaPicker` i dodatkowy `Dialog` do osadzenia pickera

### 2. `PartnerPage.tsx` -- dostosowanie wygladu sekcji produktow

- Zmiana naglowka sekcji z "Produkty" na **"Moje polecane produkty"**
- Lekkie dostosowanie kart produktow -- grafika z nazwa pod spodem, klikalna calosc karty (bez osobnego przycisku "Kup teraz"), aby pasowalo do stylu ze screena
- Zachowanie responsywnej siatki 1-3 kolumny

### 3. Brak zmian w bazie danych

Istniejace tabele `product_catalog` i `partner_product_links` w pelni pokrywaja te funkcjonalnosc. Nie trzeba tworzyc nowych tabel.

## Szczegoly techniczne

### Plik: `src/components/admin/ProductCatalogManager.tsx`
- Import `AdminMediaLibrary` z `@/components/admin/AdminMediaLibrary`
- Import `Dialog` (dodatkowy) do wyswietlenia pickera
- Nowy stan: `showMediaPicker: boolean`
- W dialogu edycji produktu: przycisk "Wybierz z biblioteki" pod polem URL
- Callback `onSelect`: ustawia `editingProduct.image_url` na `file.file_url`, zamyka picker

### Plik: `src/pages/PartnerPage.tsx`
- Zmiana naglowka sekcji produktow na "Moje polecane produkty"
- Karty produktow: cala karta jako `<a>` z linkiem partnera, grafika na gorze, nazwa produktu pod grafika (bez opisu i przycisku -- czysty styl jak na screenie)
