
# Plan: Logo dla trybu jasnego/ciemnego + Podgląd strony rejestracji dla PureLinków

## ✅ ZREALIZOWANE

### Zmiana 1: Obsługa logo dla dwóch trybów (jasny/ciemny)

**Wykonane:**
1. ✅ Usunięto dodany `<h1>PURE LIFE</h1>` z `HeroSection.tsx`
2. ✅ Dodano prop `headerImageDark` do interfejsu `HeroSectionProps`
3. ✅ Zaimplementowano logikę przełączania obrazków w zależności od trybu
4. ✅ Zaktualizowano `Index.tsx` - pobieranie `header_image_dark` z `systemTextsData`
5. ✅ Migracja bazy danych - dodano `header_image_dark` do check constraint i wstawiono rekord

**Pliki edytowane:**
- `src/components/HeroSection.tsx`
- `src/pages/Index.tsx`

---

### Zmiana 2: Przycisk podglądu strony rejestracji dla PureLinków

**Wykonane:**
1. ✅ Dodano import ikony `Eye` z lucide-react
2. ✅ Dodano przycisk podglądu obok QR i Copy
3. ✅ Przycisk otwiera `/auth?ref=REFLINK_CODE` w nowej karcie

**Plik edytowany:**
- `src/components/user-reflinks/UserReflinksPanel.tsx`

---

## Następne kroki (opcjonalne)

### Panel admina - upload logo dla trybu ciemnego

Aby admin mógł łatwo zarządzać logo dla obu trybów, można dodać pole uploadu w panelu CMS.

**Lokalizacja**: Ustawienia strony głównej lub panel CMS > system_texts

---

## Efekt końcowy

1. **Logo na stronie głównej**:
   - W trybie jasnym: wyświetla `header_image` (aktualne logo)
   - W trybie ciemnym: wyświetla `header_image_dark` (jeśli ustawione), inaczej fallback do `header_image`
   
2. **Brak duplikatu h1**: Usunięty tekst "PURE LIFE" - teraz logo z obrazka jest jedynym źródłem

3. **Podgląd PureLinku**: Przycisk z ikoną oka (👁️) pozwala zobaczyć stronę rejestracji tak jak widzi ją nowy użytkownik

