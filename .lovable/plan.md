

# Regulamin i Polityka Prywatności - implementacja

## Zakres prac

Utworzenie dwóch stron prawnych (Regulamin i Polityka prywatności) dostępnych przez przyciski w stopce dashboardu. Strony będą edytowalne przez administratora za pomocą edytora wizualnego HTML.

---

## Decyzja architektoniczna

**Wybieram system HTML Pages** zamiast Pages dlatego że:
- Ma wbudowany edytor WYSIWYG (HtmlHybridEditor) do łatwej edycji
- Obsługuje custom CSS
- Kontrola widoczności per rola
- Możliwość ukrycia/pokazania nagłówka i stopki
- Wsparcie dla formatowania tekstu, nagłówków, list

---

## Szczegóły implementacji

### 1. Aktualizacja linków w stopce

**Plik: `src/components/dashboard/widgets/DashboardFooterSection.tsx`**

Zmiana linków z `/page/...` na `/html/...`:

```typescript
// PRZED (linie 144, 148):
<a href="/page/polityka-prywatnosci" ...>
<a href="/page/regulamin" ...>

// PO:
<a href="/html/polityka-prywatnosci" ...>
<a href="/html/regulamin" ...>
```

**Plik: `src/components/homepage/Footer.tsx`**

Aktualizacja linków w stopce strony głównej:

```typescript
// PRZED (linie 25, 29):
<a href="#" ...>{t('footer.privacyPolicy')}</a>
<a href="#" ...>{t('footer.terms')}</a>

// PO:
<a href="/html/polityka-prywatnosci" ...>{t('footer.privacyPolicy')}</a>
<a href="/html/regulamin" ...>{t('footer.terms')}</a>
```

### 2. Migracja bazy danych - dodanie stron

**Nowy plik: `supabase/migrations/[timestamp]_add_legal_pages.sql`**

```sql
-- Dodanie strony Polityka Prywatności
INSERT INTO public.html_pages (
  title, slug, html_content, meta_title, meta_description,
  is_published, is_active,
  visible_to_everyone, visible_to_clients, visible_to_partners, 
  visible_to_specjalista, visible_to_anonymous,
  show_header, show_footer
) VALUES (
  'Polityka Prywatności',
  'polityka-prywatnosci',
  '[TREŚĆ HTML]',
  'Polityka Prywatności | PureLife',
  'Polityka prywatności serwisu PureLife - informacje o przetwarzaniu danych osobowych',
  true, true,
  true, true, true, true, true,
  true, true
);

-- Dodanie strony Regulamin
INSERT INTO public.html_pages (
  title, slug, html_content, meta_title, meta_description,
  is_published, is_active,
  visible_to_everyone, visible_to_clients, visible_to_partners, 
  visible_to_specjalista, visible_to_anonymous,
  show_header, show_footer
) VALUES (
  'Regulamin',
  'regulamin',
  '[TREŚĆ HTML]',
  'Regulamin | PureLife',
  'Regulamin korzystania z serwisu PureLife',
  true, true,
  true, true, true, true, true,
  true, true
);
```

---

## Treść stron (pierwsza wersja)

### Polityka Prywatności

```html
<div class="max-w-4xl mx-auto px-6 py-12">
  <h1 class="text-3xl font-bold mb-8 text-center">Polityka Prywatności</h1>
  <p class="text-sm text-muted-foreground mb-8 text-center">
    Ostatnia aktualizacja: 24 stycznia 2026
  </p>
  
  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">1. Administrator danych</h2>
    <p>Administratorem Twoich danych osobowych jest PureLife z siedzibą pod adresem wskazanym na stronie kontaktowej. W sprawach związanych z ochroną danych osobowych możesz skontaktować się z nami poprzez email: kontakt@purelife.info.pl</p>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">2. Cele przetwarzania danych</h2>
    <p>Twoje dane osobowe przetwarzamy w następujących celach:</p>
    <ul class="list-disc pl-6 mt-2 space-y-1">
      <li>Świadczenie usług dostępnych w serwisie</li>
      <li>Obsługa Twojego konta użytkownika</li>
      <li>Komunikacja z Tobą w sprawach związanych z usługami</li>
      <li>Realizacja obowiązków prawnych ciążących na Administratorze</li>
      <li>Marketing bezpośredni własnych produktów i usług (za Twoją zgodą)</li>
    </ul>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">3. Podstawy prawne przetwarzania</h2>
    <p>Przetwarzamy Twoje dane na podstawie:</p>
    <ul class="list-disc pl-6 mt-2 space-y-1">
      <li>Art. 6 ust. 1 lit. a RODO - Twoja zgoda</li>
      <li>Art. 6 ust. 1 lit. b RODO - wykonanie umowy</li>
      <li>Art. 6 ust. 1 lit. c RODO - obowiązek prawny</li>
      <li>Art. 6 ust. 1 lit. f RODO - prawnie uzasadniony interes Administratora</li>
    </ul>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">4. Odbiorcy danych</h2>
    <p>Twoje dane mogą być przekazywane:</p>
    <ul class="list-disc pl-6 mt-2 space-y-1">
      <li>Dostawcom usług IT i hostingowych</li>
      <li>Podmiotom świadczącym usługi płatnicze</li>
      <li>Kancelariom prawnym i audytorom</li>
      <li>Organom państwowym w przypadkach przewidzianych prawem</li>
    </ul>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">5. Twoje prawa</h2>
    <p>Przysługuje Ci prawo do:</p>
    <ul class="list-disc pl-6 mt-2 space-y-1">
      <li>Dostępu do swoich danych</li>
      <li>Sprostowania danych</li>
      <li>Usunięcia danych ("prawo do bycia zapomnianym")</li>
      <li>Ograniczenia przetwarzania</li>
      <li>Przenoszenia danych</li>
      <li>Sprzeciwu wobec przetwarzania</li>
      <li>Cofnięcia zgody w dowolnym momencie</li>
      <li>Wniesienia skargi do Prezesa UODO</li>
    </ul>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">6. Okres przechowywania</h2>
    <p>Dane przechowujemy przez okres niezbędny do realizacji celów przetwarzania, nie dłużej niż wymaga tego obowiązujące prawo lub uzasadniony interes Administratora.</p>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">7. Pliki cookies</h2>
    <p>Serwis wykorzystuje pliki cookies w celu zapewnienia prawidłowego działania, analizy ruchu oraz personalizacji treści. Szczegółowe informacje znajdziesz w polityce cookies dostępnej w ustawieniach.</p>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">8. Zmiany polityki</h2>
    <p>Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. O istotnych zmianach będziemy informować poprzez serwis.</p>
  </section>

  <section class="mt-12 p-6 bg-muted/50 rounded-lg">
    <h3 class="font-semibold mb-2">Kontakt</h3>
    <p>W sprawach dotyczących ochrony danych osobowych prosimy o kontakt:</p>
    <p class="mt-2"><strong>Email:</strong> kontakt@purelife.info.pl</p>
    <p><strong>Strona:</strong> purelife.info.pl</p>
  </section>
</div>
```

### Regulamin

```html
<div class="max-w-4xl mx-auto px-6 py-12">
  <h1 class="text-3xl font-bold mb-8 text-center">Regulamin serwisu PureLife</h1>
  <p class="text-sm text-muted-foreground mb-8 text-center">
    Ostatnia aktualizacja: 24 stycznia 2026
  </p>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§1. Postanowienia ogólne</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Niniejszy Regulamin określa zasady korzystania z serwisu internetowego PureLife dostępnego pod adresem purelife.info.pl</li>
      <li>Właścicielem i administratorem serwisu jest PureLife.</li>
      <li>Korzystanie z serwisu oznacza akceptację niniejszego Regulaminu.</li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§2. Definicje</h2>
    <ul class="list-disc pl-6 space-y-2">
      <li><strong>Serwis</strong> - platforma internetowa PureLife dostępna pod adresem purelife.info.pl</li>
      <li><strong>Użytkownik</strong> - osoba fizyczna korzystająca z Serwisu</li>
      <li><strong>Konto</strong> - indywidualne konto Użytkownika w Serwisie</li>
      <li><strong>Usługi</strong> - funkcjonalności dostępne w Serwisie</li>
    </ul>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§3. Rejestracja i Konto</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Rejestracja w Serwisie jest dobrowolna i bezpłatna.</li>
      <li>Podczas rejestracji Użytkownik zobowiązany jest podać prawdziwe dane.</li>
      <li>Użytkownik odpowiada za poufność danych dostępowych do Konta.</li>
      <li>Jedno Konto może być przypisane tylko do jednej osoby.</li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§4. Zasady korzystania z Serwisu</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Użytkownik zobowiązuje się do korzystania z Serwisu zgodnie z prawem i dobrymi obyczajami.</li>
      <li>Zabrania się:
        <ul class="list-disc pl-6 mt-2 space-y-1">
          <li>Podawania nieprawdziwych informacji</li>
          <li>Naruszania praw autorskich i własności intelektualnej</li>
          <li>Rozpowszechniania treści bezprawnych lub szkodliwych</li>
          <li>Podejmowania działań mogących zakłócić działanie Serwisu</li>
        </ul>
      </li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§5. Usługi</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Serwis oferuje dostęp do materiałów edukacyjnych, szkoleń i narzędzi wspierających zdrowy styl życia.</li>
      <li>Zakres dostępnych funkcjonalności może zależeć od typu Konta Użytkownika.</li>
      <li>Administrator zastrzega sobie prawo do modyfikacji zakresu Usług.</li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§6. Prawa autorskie</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Wszelkie treści dostępne w Serwisie są chronione prawem autorskim.</li>
      <li>Kopiowanie, rozpowszechnianie lub wykorzystywanie materiałów bez zgody jest zabronione.</li>
      <li>Użytkownik może korzystać z materiałów wyłącznie na własny użytek osobisty.</li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§7. Odpowiedzialność</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Administrator dokłada starań, aby Serwis działał prawidłowo.</li>
      <li>Administrator nie ponosi odpowiedzialności za przerwy techniczne lub awarie.</li>
      <li>Treści w Serwisie mają charakter informacyjny i nie zastępują profesjonalnej porady medycznej.</li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§8. Reklamacje</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Reklamacje można składać drogą elektroniczną na adres: kontakt@purelife.info.pl</li>
      <li>Reklamacja powinna zawierać opis problemu i dane kontaktowe.</li>
      <li>Rozpatrzenie reklamacji nastąpi w terminie 14 dni roboczych.</li>
    </ol>
  </section>

  <section class="mb-8">
    <h2 class="text-xl font-semibold mb-4">§9. Postanowienia końcowe</h2>
    <ol class="list-decimal pl-6 space-y-2">
      <li>Administrator zastrzega sobie prawo do zmiany Regulaminu.</li>
      <li>O zmianach Użytkownicy zostaną poinformowani poprzez Serwis.</li>
      <li>W sprawach nieuregulowanych zastosowanie mają przepisy prawa polskiego.</li>
      <li>Spory rozstrzygane będą przez sąd właściwy dla siedziby Administratora.</li>
    </ol>
  </section>

  <section class="mt-12 p-6 bg-muted/50 rounded-lg">
    <h3 class="font-semibold mb-2">Kontakt</h3>
    <p>W sprawach dotyczących Regulaminu prosimy o kontakt:</p>
    <p class="mt-2"><strong>Email:</strong> kontakt@purelife.info.pl</p>
    <p><strong>Strona:</strong> purelife.info.pl</p>
  </section>
</div>
```

---

## Pliki do modyfikacji/utworzenia

| Plik | Operacja | Opis |
|------|----------|------|
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | Edycja | Zmiana linków na `/html/...` |
| `src/components/homepage/Footer.tsx` | Edycja | Dodanie działających linków |
| `supabase/migrations/[timestamp]_add_legal_pages.sql` | Utworzenie | Migracja dodająca strony z treścią |

---

## Edycja przez admina

Po wdrożeniu administrator może edytować treść stron:

1. Panel Admin → Strony HTML
2. Kliknięcie "Edytuj" przy odpowiedniej stronie
3. Zakładka "Podgląd" → edytor WYSIWYG HtmlHybridEditor
4. Możliwość dodawania nagłówków, list, formatowania tekstu
5. Zapisanie zmian → automatyczna publikacja

---

## Oczekiwany rezultat

1. Kliknięcie "Polityka prywatności" w stopce → otwiera `/html/polityka-prywatnosci`
2. Kliknięcie "Regulamin" w stopce → otwiera `/html/regulamin`
3. Strony mają profesjonalną treść prawną dostosowaną do PureLife
4. Admin może w dowolnym momencie edytować treść przez panel
5. Strony są dostępne dla wszystkich (zalogowanych i niezalogowanych)

