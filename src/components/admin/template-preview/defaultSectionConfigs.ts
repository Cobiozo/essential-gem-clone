export const DEFAULT_SECTION_CONFIGS: Record<string, Record<string, any>> = {
  hero: {
    layout: 'centered',
    headline: 'Nagłówek Hero',
    subheadline: 'Podtytuł sekcji hero',
    description: 'Opis sekcji hero — zmień tekst w edytorze.',
    bg_color: '#0a1628',
    cta_primary: { text: 'Dowiedz się więcej', url: '#' },
  },
  text_image: {
    heading: 'Nagłówek sekcji',
    image_side: 'right',
    items: [
      { icon: '✔️', text: 'Punkt pierwszy' },
      { icon: '✔️', text: 'Punkt drugi' },
    ],
  },
  steps: {
    heading: 'Jak to działa?',
    description: 'Trzy proste kroki',
    bg_color: '#0f172a',
    steps: [
      { icon: '1️⃣', title: 'Krok 1', description: 'Opis kroku' },
      { icon: '2️⃣', title: 'Krok 2', description: 'Opis kroku' },
      { icon: '3️⃣', title: 'Krok 3', description: 'Opis kroku' },
    ],
  },
  timeline: {
    heading: 'Oś czasu',
    items: [
      { title: 'Etap 1', description: 'Opis etapu' },
      { title: 'Etap 2', description: 'Opis etapu' },
    ],
  },
  testimonials: {
    heading: 'Opinie klientów',
    cards: [
      { name: 'Jan Kowalski', role: 'Klient', text: 'Świetna usługa!', rating: 5 },
    ],
  },
  products_grid: {
    heading: 'Nasze produkty',
  },
  faq: {
    heading: 'Najczęściej zadawane pytania',
    items: [
      { question: 'Pytanie 1?', answer: 'Odpowiedź 1.' },
      { question: 'Pytanie 2?', answer: 'Odpowiedź 2.' },
    ],
  },
  cta_banner: {
    heading: 'Gotowy na zmianę?',
    description: 'Dołącz do nas już dziś.',
    cta_text: 'Zapisz się',
    bg_color: '#0f172a',
  },
  header: {
    logo_text: 'Logo',
    nav_links: [],
  },
  contact_form: {
    heading: 'Skontaktuj się',
    description: 'Wypełnij formularz, a odezwiemy się do Ciebie.',
  },
  footer: {
    text: '© 2026 Wszelkie prawa zastrzeżone.',
  },
  products_with_form: {
    heading: 'Produkty + Formularz',
  },
  survey: {
    heading: 'Ankieta zdrowotna',
    subtitle: 'Dopasuj suplementy do swoich potrzeb',
    bg_color: '#0a1628',
    text_color: '#ffffff',
    accent_color: '#3b82f6',
    result_heading: 'Twoje rekomendowane produkty',
    result_description: 'Na bazie Twoich odpowiedzi dopasowaliśmy najlepsze produkty:',
    questions: [
      { id: 'gender', question: 'Jaka jest Twoja płeć?', type: 'single', options: [
        { label: 'Kobieta', value: 'female', tags: ['kobieta'] },
        { label: 'Mężczyzna', value: 'male', tags: ['mezczyzna'] },
      ]},
      { id: 'age', question: 'Ile masz lat?', type: 'single', options: [
        { label: '18–30', value: '18-30', tags: ['mlody'] },
        { label: '31–50', value: '31-50', tags: ['sredni_wiek'] },
        { label: '51+', value: '51+', tags: ['senior'] },
      ]},
      { id: 'height', question: 'Jaki jest Twój wzrost?', type: 'single', options: [
        { label: 'Poniżej 160 cm', value: '<160', tags: [] },
        { label: '160–175 cm', value: '160-175', tags: [] },
        { label: '176–190 cm', value: '176-190', tags: [] },
        { label: 'Powyżej 190 cm', value: '>190', tags: [] },
      ]},
      { id: 'weight', question: 'Jaka jest Twoja waga?', type: 'single', options: [
        { label: 'Poniżej 60 kg', value: '<60', tags: ['niska_waga'] },
        { label: '60–80 kg', value: '60-80', tags: [] },
        { label: '81–100 kg', value: '81-100', tags: ['nadwaga'] },
        { label: 'Powyżej 100 kg', value: '>100', tags: ['nadwaga', 'otylosc'] },
      ]},
      { id: 'activity', question: 'Jak oceniasz swoją aktywność fizyczną?', type: 'single', options: [
        { label: 'Niska (siedzący tryb życia)', value: 'low', tags: ['niska_aktywnosc'] },
        { label: 'Umiarkowana (2–3x/tydzień)', value: 'moderate', tags: ['umiarkowana_aktywnosc'] },
        { label: 'Wysoka (5+ razy/tydzień)', value: 'high', tags: ['wysoka_aktywnosc'] },
      ]},
      { id: 'ailments', question: 'Czy masz jakieś dolegliwości?', type: 'multiple', options: [
        { label: 'Bóle stawów', value: 'joints', tags: ['stawy'] },
        { label: 'Problemy z trawieniem', value: 'digestion', tags: ['trawienie'] },
        { label: 'Zmęczenie / brak energii', value: 'fatigue', tags: ['energia'] },
        { label: 'Problemy ze snem', value: 'sleep', tags: ['sen'] },
        { label: 'Problemy ze skórą', value: 'skin', tags: ['skora'] },
        { label: 'Nie mam dolegliwości', value: 'none', tags: [] },
      ]},
      { id: 'supplements', question: 'Czy stosujesz obecnie suplementy?', type: 'single', options: [
        { label: 'Tak, regularnie', value: 'regular', tags: ['suplementacja'] },
        { label: 'Sporadycznie', value: 'sometimes', tags: [] },
        { label: 'Nie stosuję', value: 'none', tags: ['brak_suplementacji'] },
      ]},
      { id: 'diet', question: 'Jak opisałbyś swoją dietę?', type: 'single', options: [
        { label: 'Zróżnicowana, bogata w warzywa i owoce', value: 'balanced', tags: [] },
        { label: 'Dużo przetworzonej żywności', value: 'processed', tags: ['slaba_dieta'] },
        { label: 'Wegetariańska / wegańska', value: 'vegan', tags: ['weganizm'] },
        { label: 'Ketogeniczna / niskotłuszczowa', value: 'keto', tags: ['keto'] },
      ]},
      { id: 'stress', question: 'Jak oceniasz poziom stresu w codziennym życiu?', type: 'single', options: [
        { label: 'Niski', value: 'low', tags: [] },
        { label: 'Umiarkowany', value: 'moderate', tags: ['stres'] },
        { label: 'Wysoki', value: 'high', tags: ['stres', 'wysoki_stres'] },
      ]},
      { id: 'goals', question: 'Jakie są Twoje główne cele zdrowotne?', type: 'multiple', options: [
        { label: 'Więcej energii', value: 'energy', tags: ['energia'] },
        { label: 'Lepsza odporność', value: 'immunity', tags: ['odpornosc'] },
        { label: 'Zdrowa skóra, włosy, paznokcie', value: 'beauty', tags: ['skora', 'uroda'] },
        { label: 'Zdrowe stawy i kości', value: 'joints', tags: ['stawy'] },
        { label: 'Kontrola wagi', value: 'weight', tags: ['nadwaga'] },
        { label: 'Lepszy sen', value: 'better_sleep', tags: ['sen'] },
      ]},
    ],
    product_recommendations: [
      { tags: ['stawy', 'senior'], product_name: 'Marine Collagen', description: 'Kolagen morski wspierający zdrowie stawów i skóry.' },
      { tags: ['energia', 'stres'], product_name: 'EQ Pure Arctic Oil', description: 'Olej omega-3 o wysokiej czystości dla energii i równowagi.' },
      { tags: ['odpornosc', 'slaba_dieta'], product_name: 'EQ Pure Arctic Oil z witaminą D', description: 'Wspiera odporność i uzupełnia braki witaminowe.' },
      { tags: ['skora', 'uroda'], product_name: 'Marine Collagen + Skin Care', description: 'Kompleksowa pielęgnacja skóry od wewnątrz.' },
    ],
    anchor_id: 'ankieta',
  },
  static: {},
};

export const SECTION_TYPE_OPTIONS: { type: string; label: string; icon: string }[] = [
  { type: 'hero', label: 'Hero (banner)', icon: '🖼️' },
  { type: 'text_image', label: 'Tekst + Obraz', icon: '📝' },
  { type: 'steps', label: 'Kroki', icon: '👣' },
  { type: 'timeline', label: 'Oś czasu', icon: '📅' },
  { type: 'testimonials', label: 'Opinie', icon: '⭐' },
  { type: 'products_grid', label: 'Siatka produktów', icon: '🛒' },
  { type: 'faq', label: 'FAQ', icon: '❓' },
  { type: 'cta_banner', label: 'Baner CTA', icon: '📢' },
  { type: 'header', label: 'Nagłówek', icon: '🔝' },
  { type: 'contact_form', label: 'Formularz kontaktowy', icon: '✉️' },
  { type: 'footer', label: 'Stopka', icon: '🔚' },
  { type: 'products_with_form', label: 'Produkty + Formularz', icon: '🛍️' },
];
