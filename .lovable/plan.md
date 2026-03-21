

# "Moje Testy" — Dziennik Optymalizacji Omega

## Co budujemy
Nowa strona `/moje-testy` dostępna z paska bocznego pod PureBox → Moje Testy. Użytkownik wpisuje wyniki swoich testów Omega i widzi wizualizację postępów — identycznie jak na załączonym zdjęciu.

## Elementy strony (wg zdjęcia)

1. **Nagłówek**: "DZIENNIK OPTYMALIZACJI OMEGA: MONITOROWANIE PEŁNEGO SPEKTRUM I BALANSU DLA POPRAWY ZDROWIA"

2. **Panel lewy — Postęp Witalności** (ilustracja sylwetki z paskiem postępu i etapami: Tydzień 0 → Tydzień 12 → Miesiąc 6 → Cel 1 rok). Uproszczona wersja z progress bar i etapami.

3. **Gauge charts (górny środek)**:
   - Stosunek Omega-6:3 (AA/EPA) — gauge od czerwonego do zielonego, np. `20:1 → 3:1`
   - Indeks Omega-3 % (ΣEPA+DHA) — gauge od czerwonego do niebieskiego, np. `2% → 9%`

4. **Formularz "Dodaj wynik nowego testu"** (prawy górny):
   - Data testu (date picker)
   - Omega-3 Index %
   - Omega-6:3 Stosunek
   - Samopoczucie/Uwagi (textarea)
   - Przycisk "Zapisz nowe dane"

5. **Wykres liniowy — Trendy Balansu i Indeksu** (środek):
   - Oś X = kolejne testy, Oś Y = wartości
   - Dwie linie: Ratio O6/O3 (czerwona/pomarańczowa) i Index Omega-3 (niebieska)

6. **Wykres obszarowy — Ewolucja Pełnego Spektrum Błony Komórkowej** (dolny środek):
   - Stacked area chart z kwasami: AA, EPA, DHA, LA itd.

7. **Historia Transformacji Omega** (prawy dolny):
   - Lista wpisów z datą, wynikami i uwagami

## Baza danych — nowa tabela `omega_tests`
```sql
create table public.omega_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  test_date date not null,
  omega3_index numeric,
  omega6_3_ratio numeric,
  aa numeric,
  epa numeric,
  dha numeric,
  la numeric,
  notes text,
  created_at timestamptz default now()
);
alter table public.omega_tests enable row level security;
create policy "Users manage own tests" on public.omega_tests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
```

## Pliki do utworzenia/zmiany

| Plik | Akcja |
|------|-------|
| Migracja SQL `omega_tests` | Nowa tabela |
| `src/pages/OmegaTests.tsx` | Nowa strona — główny layout |
| `src/components/omega-tests/OmegaGaugeCharts.tsx` | Gauge charts (Ratio + Index) |
| `src/components/omega-tests/OmegaTrendChart.tsx` | Wykres liniowy trendów |
| `src/components/omega-tests/OmegaSpectrumChart.tsx` | Stacked area chart spektrum |
| `src/components/omega-tests/OmegaTestForm.tsx` | Formularz dodawania testu |
| `src/components/omega-tests/OmegaTestHistory.tsx` | Lista historii testów |
| `src/components/omega-tests/VitalityProgress.tsx` | Panel postępu witalności |
| `src/hooks/useOmegaTests.ts` | Hook CRUD do tabeli |
| `src/components/dashboard/DashboardSidebar.tsx` | Dodanie "Moje Testy" do PureBox submenu |
| `src/App.tsx` | Nowa trasa `/moje-testy` |

## Styl wizualny
- Ciemne tło (gradient jak dashboard `from-[hsl(225,50%,6%)]`)
- Karty z ciemnym tłem, zaokrąglone, subtelne bordery
- Kolory akcentowe: zielony/niebieski dla pozytywnych wartości, czerwony/pomarańczowy dla negatywnych
- Gauge charts zbudowane na SVG lub za pomocą recharts RadialBarChart
- Responsywny grid: na desktop layout jak na zdjęciu, na mobile kolumny stackują się

