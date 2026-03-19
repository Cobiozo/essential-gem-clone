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
