

# Reorganizacja panelu bocznego CMS

## Obecny stan

7 kategorii, 37 pozycji. Kategoria "Funkcje" ma az 11 elementow — jest workiem na wszystko. Nawigacja wymaga duzego scrollowania, a grupowanie jest nieintuicyjne.

## Proponowany nowy uklad

Zmniejszenie do **6 kategorii** z bardziej logicznym podzialem i polaczeniem powiazanych elementow:

```text
+------------------------------------------+
|  Panel administratora                    |
|  Administrator                           |
+------------------------------------------+
|  Glowna (powrot do pulpitu)              |
+------------------------------------------+
|                                          |
|  STRONA I WYGLAD (6)                     |
|    Zawartosc glowna                      |
|    Uklad stron                           |
|    Strony                                |
|    Strony HTML                           |
|    Kolory i motywy                       |
|    Stopka i ikony paska                  |
+------------------------------------------+
|  UZYTKOWNICY (2)                         |
|    Lista uzytkownikow                    |
|    Moje konto                            |
+------------------------------------------+
|  SZKOLENIA I WIEDZA (5)                  |
|    Szkolenia                             |
|    Certyfikaty                           |
|    Baza wiedzy                           |
|    Zdrowa Wiedza                         |
|    Biblioteka mediow                     |
+------------------------------------------+
|  WYDARZENIA I NARZEDZIA (7)              |
|    Zdarzenia i rejestracje               |
|    Platne wydarzenia                     |
|    Sygnal Dnia                           |
|    Wazne informacje                      |
|    Pasek informacyjny                    |
|    Kalkulatory                           |
|    Struktura organizacji                 |
+------------------------------------------+
|  KOMUNIKACJA (7)                         |
|    Tlumaczenia                           |
|    Kontakty zespolu                      |
|    Zarzadzanie czatem                    |
|    Powiadomienia                         |
|    E-mail                                |
|    Wsparcie                              |
|    Cookies i zgody                       |
+------------------------------------------+
|  SYSTEM (5)                              |
|    Alerty systemowe                      |
|    Konserwacja                           |
|    Zadania CRON                          |
|    Google Calendar                       |
|    Kompas AI                             |
+------------------------------------------+
```

## Kluczowe zmiany logiczne

1. **Polaczenie "Zawartosc" + "Wyglad"** w jedna kategorie "Strona i wyglad" — bo kolory, uklad i strony to wszystko dotyczy wygladu witryny. Pozycje "Stopka dashboardu" i "Ikony paska bocznego" lacza sie w jedna pozycje "Stopka i ikony paska" (przelaczanie zaklakami wewnatrz komponentu).

2. **Rozwiazanie "worka" Funkcje** — rozdzielenie na:
   - Wydarzenia trafiaja do nowej kategorii "Wydarzenia i narzedzia"
   - "Zdarzenia" + "Rejestracje na wydarzenia" lacza sie w jedna pozycje (i tak rejestracje sa powiazane ze zdarzeniami)
   - Oba kalkulatory lacza sie w jedna pozycje "Kalkulatory" (przelaczanie wewnatrz)
   - Cookies przeniesione do "Komunikacja" (bo dotyczy zgod uzytkownikow)
   - Kompas AI przeniesiony do "System" (bo to narzedzie AI, nie funkcja uzytkownikow)

3. **Polaczenie powiadomien** — "Powiadomienia systemowe" i "Powiadomienia Push" lacza sie w jedna pozycje "Powiadomienia" (zakladki wewnatrz).

## Zmiany techniczne

### Plik: `src/components/admin/AdminSidebar.tsx`

Przebudowa tablicy `navCategories`:

- **Strona i wyglad** (`site`): content, layout, pages, html-pages, colors+settings (polaczone), dashboard-footer+sidebar-icons (polaczone)
- **Uzytkownicy** (`users`): users, account — bez zmian
- **Szkolenia i wiedza** (`training`): training, certificates, knowledge, healthy-knowledge, media-library — bez zmian
- **Wydarzenia i narzedzia** (`events-tools`): events (polaczone z event-registrations), paid-events, daily-signal, important-info, news-ticker, calculator (polaczone z specialist-calculator), organization-tree
- **Komunikacja** (`communication`): translations, team-contacts, chat-permissions, notifications (polaczone z push-notifications), emails, support, cookies
- **System** (`system`): system-health, maintenance, cron-jobs, google-calendar, ai-compass

Aktualizacja `hardcodedLabels` i `SIDEBAR_KEYS` odpowiednio.

### Wynik

- Z **37** pozycji spada do **32** (5 par polaczonych)
- Z **7** kategorii spada do **6**
- Kategoria "Funkcje" (11 pozycji) znika — jej elementy sa logicznie rozdzielone
- Zadna kategoria nie przekracza 7 pozycji
- Powiazane elementy sa blisko siebie

