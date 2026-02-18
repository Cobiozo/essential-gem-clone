

# Zmiana selektorow jezyka na flagi (jak na screenie)

## Opis

Zamiana obecnych selektorow jezyka (z emoji flagami i tekstem) na styl identyczny ze screena - rozwijane menu z prawdziwymi obrazkami flag (z flagcdn.com) i nazwami jezykow w ich ojczystym jezyku.

## Zmiany

### 1. Nowy komponent `ContentLanguageSelector`

**Nowy plik**: `src/components/ContentLanguageSelector.tsx`

Komponent wielokrotnego uzytku (dla Training i HealthyKnowledge), oparty na wzorcu z `LanguageSelector.tsx`:
- Select z flagami pobieranymi z `https://flagcdn.com/w40/{countryCode}.png`
- Trigger pokazuje tylko flage (lub flage + "Wszystkie" dla opcji "all")
- Opcje w rozwijanym menu: flaga + nazwa jezyka (Polski, English, Deutsch, Wloski, Hiszpanski, Francuski, Portugalski)
- Mapowanie kodow jezykow na kody krajow (pl->pl, en->gb, de->de, it->it, es->es, fr->fr, pt->pt)
- Props: `value: string`, `onValueChange: (value: string) => void`
- Opcja "all" z ikona globu zamiast flagi

### 2. Training.tsx (linia 698-708)

Zamiana obecnego Select na `<ContentLanguageSelector value={trainingLanguage} onValueChange={setTrainingLanguage} />`. Usuniecie importu `Globe` (jesli nieuzywany gdzie indziej) i `LANGUAGE_OPTIONS`.

### 3. HealthyKnowledge.tsx (linia 204-212)

Zamiana obecnego Select na `<ContentLanguageSelector value={contentLanguage} onValueChange={setContentLanguage} />`.

## Wyglad komponentu

Trigger: mala flaga wybranego jezyka (jak w topbarze).
Menu rozwijane (ciemne tlo, jak na screenie):
- Checkmark przy wybranej opcji
- Flaga (obraz 24x16px) + nazwa jezyka
- Opcja "Wszystkie" z ikona globu na gorze listy

