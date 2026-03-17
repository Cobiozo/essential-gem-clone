export interface ScoreRange {
  range: string;
  label: string;
  description: string;
  color: string;
}

export interface AssessmentStepData {
  key: string;
  title: string;
  description: string;
  ranges: ScoreRange[];
  chartColor: string;
}

export const ASSESSMENT_STEPS: AssessmentStepData[] = [
  {
    key: 'why',
    title: 'Jak dobrze znasz swoje "DLACZEGO"?',
    description: 'Twoje "dlaczego" to fundament motywacji w Network Marketingu. To głęboki, osobisty powód, dla którego działasz — nie chodzi o pieniądze, ale o to, co one Ci umożliwią. Silne "dlaczego" pozwala przetrwać trudne chwile i utrzymać konsekwencję.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie masz jasno określonego powodu. Działasz z ciekawości lub pod wpływem impulsu. Brak głębokiej motywacji sprawia, że łatwo się poddajesz.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Masz ogólne pojęcie o swoim "dlaczego", ale nie jest ono jeszcze wystarczająco silne. W trudnych momentach możesz tracić zapał.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Twoje "dlaczego" jest dobrze zdefiniowane i emocjonalnie angażujące. Potrafisz je wyrazić i czerpać z niego siłę w trudnych chwilach.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Twoje "dlaczego" jest krystalicznie czyste, głęboko osobiste i napędza każdą Twoją decyzję. Inspirujesz nim innych.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(0, 84%, 60%)',
  },
  {
    key: 'recruiting',
    title: 'Umiejętności rekrutacyjne',
    description: 'Rekrutacja to umiejętność zapraszania nowych osób do biznesu. Obejmuje identyfikację potencjalnych partnerów, prowadzenie rozmów, prezentowanie możliwości i zamykanie procesu rekrutacyjnego.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie wiesz jak zapraszać ludzi. Unikasz rozmów o biznesie lub robisz to w sposób nachalny, co odstrasza potencjalnych partnerów.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Potrafisz przeprowadzić podstawową rozmowę rekrutacyjną. Czasem udaje Ci się wzbudzić zainteresowanie, ale brakuje Ci systematyczności.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Masz sprawdzony system rekrutacji. Regularnie zapraszasz nowe osoby i potrafisz dostosować przekaz do rozmówcy.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Jesteś mistrzem rekrutacji. Ludzie sami przychodzą do Ciebie, a Twój system jest w pełni zduplikowany w zespole.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(30, 100%, 50%)',
  },
  {
    key: 'compensation',
    title: 'Znajomość planu wynagrodzeń',
    description: 'Plan wynagrodzeń to mapa drogowa Twojego sukcesu finansowego. Zrozumienie jak zarabiasz, jakie są poziomy i bonusy pozwala Ci strategicznie planować działania i motywować zespół.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie rozumiesz planu wynagrodzeń. Nie wiesz jak się zarabia ani jakie są poziomy awansu w firmie.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Znasz podstawy planu — wiesz jak zarabiasz prowizje, ale nie potrafisz go wyjaśnić innym w prosty sposób.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Dobrze rozumiesz plan wynagrodzeń i potrafisz go prezentować. Wykorzystujesz go strategicznie do motywowania zespołu.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Perfekcyjnie znasz każdy aspekt planu. Potrafisz pokazać konkretne ścieżki dochodu i zainspirować wizją finansową.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(55, 100%, 45%)',
  },
  {
    key: 'mindset',
    title: 'Nastawienie "Brak problemów"',
    description: 'Mentalność "brak problemów" to klucz do przetrwania w NM. Oznacza zdolność do postrzegania przeszkód jako wyzwań, zachowania spokoju w trudnych sytuacjach i nieustannego rozwoju.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Łatwo się zniechęcasz. Każda odmowa lub trudność sprawia, że chcesz się poddać. Negatywne myśli dominują.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Starasz się myśleć pozytywnie, ale w trudnych momentach wracasz do starych wzorców. Potrzebujesz wsparcia otoczenia.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Masz silny mindset. Potrafisz szybko podnieść się po porażce i traktujesz problemy jako lekcje. Regularnie pracujesz nad sobą.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Twój mindset jest niezachwiany. Jesteś wzorem pozytywnego nastawienia dla całego zespołu. Problemy to dla Ciebie paliwo do wzrostu.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(120, 60%, 45%)',
  },
  {
    key: 'leadership',
    title: 'Umiejętności przywódcze',
    description: 'Lider w NM inspiruje, wspiera i rozwija swój zespół. Przywództwo to nie zarządzanie, ale dawanie przykładu, mentoring i tworzenie kultury sukcesu.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie postrzegasz siebie jako lidera. Czekasz na instrukcje od góry i nie podejmujesz inicjatywy w zespole.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Zaczynasz przejmować odpowiedzialność za swój zespół. Pomagasz innym, ale brakuje Ci spójnej wizji i systemu.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Jesteś rozpoznawalnym liderem. Twoi ludzie Ci ufają, regularnie ich wspierasz i pomagasz im osiągać cele.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Jesteś liderem liderów. Tworzysz niezależnych liderów w swoim zespole, a Twoja organizacja rośnie nawet bez Twojego bezpośredniego zaangażowania.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(170, 70%, 45%)',
  },
  {
    key: 'finance',
    title: 'Finanse / Bogactwo',
    description: 'Wolność finansowa to cel wielu networkerów. Ta umiejętność obejmuje zarządzanie pieniędzmi, planowanie finansowe, inwestowanie i budowanie wielu źródeł dochodu.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Żyjesz od wypłaty do wypłaty. Nie masz oszczędności ani planu finansowego. Pieniądze to dla Ciebie stres.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Zaczynasz kontrolować swoje finanse. Masz podstawowy budżet, ale wciąż brakuje Ci długoterminowej strategii.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Dobrze zarządzasz finansami. Masz oszczędności, plan inwestycyjny i Twój dochód z NM rośnie systematycznie.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Osiągnąłeś wolność finansową. Masz wiele źródeł dochodu, inwestujesz mądrze i pomagasz innym w edukacji finansowej.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(200, 100%, 50%)',
  },
  {
    key: 'speaking',
    title: 'Przemawianie i Komunikacja',
    description: 'Komunikacja to fundament relacji w Network Marketingu. Umiejętność przemawiania publicznego, prowadzenia prezentacji i budowania relacji decyduje o Twoim sukcesie.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Boisz się mówić publicznie. Unikasz prezentacji i rozmów z nowymi osobami. Komunikacja to Twoja słaba strona.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Potrafisz rozmawiać jeden na jeden, ale prezentacje przed grupą to wyzwanie. Pracujesz nad swoimi umiejętnościami.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Swobodnie prezentujesz przed grupami. Potrafisz zainspirować słuchaczy i prowadzić efektywne spotkania zespołowe.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Jesteś wybitnym mówcą. Twoje prezentacje porywają tłumy, a Twoja komunikacja buduje głębokie relacje i zaufanie.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(240, 70%, 60%)',
  },
  {
    key: 'health',
    title: 'Zdrowie i Kondycja',
    description: 'Energia i zdrowie to paliwo dla Twojego biznesu. Dbanie o siebie fizycznie i psychicznie pozwala Ci działać na najwyższym poziomie i dawać przykład innym.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Zaniedbujesz swoje zdrowie. Brak energii, złe nawyki żywieniowe i brak aktywności fizycznej wpływają na Twój biznes.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Starasz się dbać o zdrowie, ale brakuje Ci konsekwencji. Czasem ćwiczysz, czasem jesz zdrowo, ale bez systemu.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Masz regularne nawyki zdrowotne. Ćwiczysz, dobrze się odżywiasz i dbasz o swój sen. Masz energię do działania.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Jesteś wzorem zdrowia i energii. Twój styl życia inspiruje innych, a Twoja kondycja pozwala Ci osiągać maksimum.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(280, 70%, 55%)',
  },
  {
    key: 'duplication',
    title: 'Skuteczność duplikacji',
    description: 'Duplikacja to serce Network Marketingu. To zdolność do tworzenia systemów, które Twoi partnerzy mogą łatwo powtórzyć, co prowadzi do wykładniczego wzrostu organizacji.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie masz systemu, który inni mogą powtórzyć. Działasz chaotycznie i Twoi partnerzy nie wiedzą co robić.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Masz pewne elementy systemu, ale nie jest on w pełni zduplikowany. Niektórzy partnerzy go stosują, inni nie.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Masz sprawdzony system duplikacji. Twoi partnerzy go znają i stosują. Organizacja rośnie systematycznie.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Twój system duplikacji działa perfekcyjnie. Nowi partnerzy szybko go wdrażają, a Twoja organizacja rośnie sama.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(320, 70%, 55%)',
  },
  {
    key: 'giving',
    title: 'Dawanie od siebie',
    description: 'Dawanie od siebie buduje zaufanie i lojalność w zespole. Chodzi o gotowość do pomocy innym bez oczekiwania natychmiastowej korzyści, dzielenie się wiedzą i wspieranie rozwoju partnеrów.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Skupiasz się głównie na sobie. Pomagasz innym tylko gdy widzisz bezpośrednią korzyść dla siebie.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Starasz się pomagać, ale nie robisz tego systematycznie. Czasem dzielisz się wiedzą, ale brakuje Ci konsekwencji.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Regularnie wspierasz swój zespół. Dzielisz się wiedzą, narzędziami i doświadczeniem. Ludzie cenią Twoją pomoc.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Dawanie jest Twoją drugą naturą. Twoja hojność inspiruje całą organizację i buduje kulturę wzajemnego wsparcia.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(350, 80%, 55%)',
  },
  {
    key: 'sales',
    title: 'Umiejętności sprzedażowe i zbijanie obiekcji',
    description: 'Skuteczna sprzedaż to fundament każdego biznesu NM. Obejmuje umiejętność prezentowania wartości produktu, budowania potrzeby i profesjonalnego odpowiadania na obiekcje.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie lubisz sprzedawać i unikasz tego. Obiekcje klientów Cię paraliżują i nie wiesz jak na nie odpowiadać.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Potrafisz sprzedać produkt bliskim, ale trudniej Ci z obcymi. Znasz kilka technik zbijania obiekcji, ale nie stosujesz ich płynnie.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Sprzedajesz pewnie i naturalnie. Znasz techniki zbijania obiekcji i stosujesz je z łatwością. Klienci Ci ufają.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Jesteś mistrzem sprzedaży. Obiekcje to dla Ciebie szansa na pogłębienie relacji. Twoi klienci stają się ambasadorami marki.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(15, 90%, 55%)',
  },
  {
    key: 'products',
    title: 'Znajomość produktów (Eqology)',
    description: 'Zaufanie klientów buduje się na wiedzy o produkcie. Im lepiej znasz składniki, badania naukowe i korzyści zdrowotne produktów Eqology, tym bardziej przekonująco je prezentujesz.',
    ranges: [
      { range: '1-3', label: 'Początkujący', description: 'Nie znasz dobrze produktów. Nie potrafisz wyjaśnić ich składu ani korzyści. Twoja prezentacja jest nieprzekonująca.', color: 'hsl(0, 84%, 60%)' },
      { range: '4-6', label: 'Rozwijający się', description: 'Znasz podstawowe produkty i ich główne korzyści, ale brakuje Ci głębszej wiedzy o składnikach i badaniach.', color: 'hsl(35, 100%, 50%)' },
      { range: '7-9', label: 'Zaawansowany', description: 'Dobrze znasz całą gamę produktów. Potrafisz dopasować produkt do potrzeb klienta i powołać się na badania naukowe.', color: 'hsl(200, 100%, 50%)' },
      { range: '10', label: 'Ekspert', description: 'Jesteś ekspertem produktowym. Znasz każdy szczegół, badania i potrafisz przekonać nawet największych sceptyków.', color: 'hsl(145, 70%, 45%)' },
    ],
    chartColor: 'hsl(45, 100%, 50%)',
  },
];

export const CHART_LABELS = ASSESSMENT_STEPS.map(s => s.title.length > 15 ? s.title.slice(0, 15) + '…' : s.title);
