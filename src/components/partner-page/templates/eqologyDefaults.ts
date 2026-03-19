import type { EqologyTemplateData } from '@/types/eqologyTemplate';

export const DEFAULT_EQOLOGY_TEMPLATE: EqologyTemplateData = {
  template_type: 'eqology_omega3',
  theme: {
    primaryColor: '#1A365D',
    accentColor: '#D4AF37',
    bgColor: '#FFFFFF',
    bgAlt: '#F8F9FA',
    fontFamily: 'Inter',
  },
  sections: {
    hero: {
      title: 'TESTUJ, NIE ZGADUJ.',
      subtitle: 'Twoje zdrowie zasługuje na twarde dane.',
      description: 'Rozpocznij 6-miesięczny proces transformacji zdrowia oparty na badaniach krwi i najwyższej jakości suplementacji Omega-3.',
      bgImageUrl: '',
      ctaPrimaryText: 'KUP TERAZ',
      ctaSecondaryText: 'Wypełnij ankietę',
      ctaSecondaryUrl: '#survey',
    },
    problem: {
      title: 'Większość ludzi suplementuje na ślepo.',
      items: [
        'Kupują suplementy na podstawie reklam, nie badań.',
        'Opierają się na rekomendacjach znajomych bez dowodów.',
        'Nie mają żadnego sposobu, by sprawdzić, czy suplement działa.',
      ],
    },
    scale: {
      title: '9 na 10 osób ma niedobór Omega-3.',
      description: 'Badania pokazują, że aż 97% populacji ma niewystarczający poziom kwasów Omega-3. To cichy problem, który wpływa na serce, mózg i stawy.',
      stat: '9/10',
    },
    howItWorks: {
      title: 'Jak to działa?',
      steps: [
        { icon: 'Package', title: 'Zamów zestaw', description: 'Otrzymasz test krwi i najwyższej jakości suplementy Omega-3.' },
        { icon: 'Droplets', title: 'Zrób test w domu', description: 'Prosty test z palca — bez wizyty w laboratorium.' },
        { icon: 'FlaskConical', title: 'Wyślij do laboratorium', description: 'Certyfikowane laboratorium w Norwegii przeanalizuje Twoje wyniki.' },
      ],
      videoUrl: '',
    },
    timeline: {
      title: 'Proces 6-miesięczny',
      milestones: [
        { month: 'Miesiąc 1', title: 'Start', description: 'Pierwszy test krwi. Rozpoczęcie suplementacji.' },
        { month: 'Miesiąc 2-4', title: 'Kontynuacja', description: 'Codzienne stosowanie suplementów. Twój organizm buduje zapasy.' },
        { month: 'Miesiąc 4', title: 'Prezent', description: 'Otrzymujesz darmowy zestaw produktów jako bonus.' },
        { month: 'Miesiąc 6', title: 'Drugi test', description: 'Powtórne badanie krwi. Porównanie wyników Before & After.' },
      ],
    },
    guarantee: {
      title: '0 ryzyka. Gwarancja satysfakcji.',
      description: 'Jeśli po 6 miesiącach stosowania Twoje wyniki nie ulegną poprawie, zwrócimy Ci pieniądze. Bez pytań, bez stresu.',
    },
    socialProof: {
      title: 'Wyniki mówią same za siebie',
      items: [
        { name: 'Anna K.', beforeRatio: '3:1', afterRatio: '2.5:1' },
        { name: 'Marek W.', beforeRatio: '8:1', afterRatio: '2.8:1' },
        { name: 'Katarzyna S.', beforeRatio: '6:1', afterRatio: '2.2:1' },
      ],
    },
    products: {
      title: 'Wybierz swój zestaw',
      products: [
        {
          id: 'silver',
          name: 'EQ Pure Arctic Oil',
          tier: 'Silver',
          description: 'Idealny start — czysty olej Omega-3 z norweskich wód arktycznych.',
          imageUrl: '',
          ingredients: 'Olej rybi (EPA 750mg, DHA 500mg), witamina D3, polifenole z oliwek',
          defaultCtaUrl: '',
        },
        {
          id: 'gold',
          name: 'EQ Pure Arctic Oil + Test Kit',
          tier: 'Gold',
          description: 'Najpopularniejszy — olej Omega-3 z testem krwi Before & After.',
          imageUrl: '',
          ingredients: 'Olej rybi (EPA 750mg, DHA 500mg), witamina D3, polifenole z oliwek, zestaw do testu krwi',
          defaultCtaUrl: '',
        },
        {
          id: 'green',
          name: 'EQ Pure Vegan Omega-3',
          tier: 'Green',
          description: 'Opcja wegańska — Omega-3 z alg morskich dla świadomych wyborów.',
          imageUrl: '',
          ingredients: 'Olej z alg (EPA 600mg, DHA 400mg), witamina D3, ekstrakt z rozmarynu',
          defaultCtaUrl: '',
        },
      ],
    },
    faq: {
      title: 'Najczęściej zadawane pytania',
      items: [
        { question: 'Czy test krwi boli?', answer: 'Nie. To prosty test z palca — wystarczy jedna kropla krwi. Całość trwa 2 minuty.' },
        { question: 'Kiedy otrzymam wyniki?', answer: 'Wyniki są dostępne online w ciągu 15-20 dni roboczych od wysłania próbki.' },
        { question: 'Czy mogę anulować subskrypcję?', answer: 'Tak, w każdej chwili. Nie ma żadnego zobowiązania — możesz zrezygnować kiedy chcesz.' },
        { question: 'Skąd pochodzi olej?', answer: 'Z czystych, zimnych wód arktycznych u wybrzeży Norwegii. Produkt jest certyfikowany Friend of the Sea.' },
        { question: 'Czy to bezpieczne dla dzieci?', answer: 'Tak, Eqology oferuje specjalną formułę dla dzieci. Skonsultuj dawkowanie z lekarzem.' },
      ],
    },
    footerSurvey: {
      title: 'Nie wiesz od czego zacząć?',
      description: 'Wypełnij krótką ankietę, a pomożemy Ci dobrać najlepszy zestaw.',
      ctaText: 'Wypełnij ankietę',
      ctaUrl: '',
    },
  },
};
