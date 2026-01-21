-- Insert HTML page: Informacje dla klienta
INSERT INTO public.html_pages (
  title,
  slug,
  html_content,
  custom_css,
  meta_title,
  meta_description,
  is_published,
  is_active,
  show_header,
  show_footer,
  show_in_sidebar,
  sidebar_icon,
  sidebar_position,
  visible_to_everyone,
  visible_to_anonymous,
  visible_to_clients,
  visible_to_partners,
  visible_to_specjalista
) VALUES (
  'Informacje dla klienta',
  'informacje-dla-klienta',
  '<!-- Nagłówek (Logo / Navbar) -->
    <nav class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-20 items-center">
                <div class="flex-shrink-0 flex items-center gap-2">
                    <div class="h-10 w-10 bg-eqology-gold rounded-full flex items-center justify-center text-white font-bold text-xl">E</div>
                    <span class="font-bold text-2xl tracking-tight text-slate-800">PURE LIFE</span>
                </div>
                <div class="hidden md:block">
                    <span class="text-sm text-slate-500 font-medium">Partner Biznesowy Eqology</span>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="gradient-hero text-white py-20 lg:py-28 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full opacity-10">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full text-white fill-current">
                <path d="M0 100 C 20 0 50 0 100 100 Z"></path>
            </svg>
        </div>
        
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Witaj w swojej podróży <span class="text-eqology-gold">po zdrowie!</span>
            </h1>
            <p class="text-lg md:text-xl text-slate-200 mb-8 max-w-3xl mx-auto leading-relaxed">
                Cieszę się, że interesujesz się zdrowiem i szukasz rozwiązań, które realnie wspierają Twoje ciało i umysł. Świadome dbanie o siebie to nie trend – to wybór, który zmienia jakość życia.
            </p>
            <div class="w-24 h-1 bg-eqology-gold mx-auto rounded-full mb-8"></div>
            <p class="text-md md:text-lg text-slate-300 max-w-2xl mx-auto">
                Wierzymy, że najlepszym prezentem, jaki możesz dać sobie i swoim bliskim, jest zdrowsza wersja Ciebie – silna, odporna i pełna energii.
            </p>
        </div>
    </section>

    <!-- Sekcja: O Produkcie -->
    <section class="py-16 bg-white">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold text-slate-800 mb-4">Dlaczego Eqology?</h2>
                <p class="text-lg text-slate-600 leading-relaxed">
                    Przedstawiamy Ci <strong class="text-slate-900">oleje Omega-3 Eqology</strong> – produkty klasy klinicznej, stworzone z myślą o ludziach, którzy nie uznają kompromisów w trosce o zdrowie.
                </p>
                <p class="mt-4 text-slate-600">
                    Obejrzyj poniższe materiały, aby uzyskać więcej informacji. Te kilkanaście minut może wpłynąć na poprawę Twojego zdrowia i życia. Jeśli chcesz zadbać o siebie mądrze – jesteś w dobrym miejscu.
                </p>
            </div>

            <div class="mt-12 bg-slate-50 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="text-xl md:text-2xl font-bold text-center mb-6 text-slate-800 flex items-center justify-center gap-2">
                    <i data-lucide="play-circle" class="text-eqology-gold w-8 h-8"></i>
                    Dlaczego Omega-3?
                </h3>
                
                <div class="video-placeholder group cursor-pointer bg-slate-200 flex items-center justify-center">
                    <div class="text-center">
                        <div class="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <i data-lucide="play" class="w-8 h-8 text-eqology-gold ml-1"></i>
                        </div>
                        <p class="mt-4 text-slate-500 font-medium">[Miejsce na krótkie wideo wprowadzające]</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Sekcja: Ekspert -->
    <section class="py-16 bg-slate-50 border-t border-slate-200">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-1 gap-12 items-center">
                <div class="text-center">
                    <div class="inline-block px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4 tracking-wide uppercase">Wiedza Ekspercka</div>
                    <h2 class="text-3xl font-bold text-slate-900 mb-6">Dlaczego kwasy omega-3 są tak ważne?</h2>
                    <p class="text-lg text-slate-600 mb-8 max-w-3xl mx-auto">
                        Wysłuchaj wykładu <strong class="text-slate-800">dr inż. Karoliny Kowalczyk</strong> – eksperta w dziedzinie technologii żywności, dietetyki klinicznej i biotechnologii.
                    </p>
                </div>
                
                <div class="video-placeholder group cursor-pointer bg-slate-800 flex items-center justify-center shadow-xl">
                     <div class="text-center text-white">
                        <div class="w-20 h-20 bg-eqology-gold rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:bg-white transition-colors duration-300">
                            <i data-lucide="play" class="w-8 h-8 text-white group-hover:text-eqology-gold ml-1 transition-colors"></i>
                        </div>
                        <p class="mt-4 text-slate-300 font-medium">[Miejsce na wykład Dr Kowalczyk]</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Sekcja: CTA i Bonus -->
    <section class="py-20 bg-white relative">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white">
                <div class="p-8 md:p-12 text-center">
                    <h2 class="text-3xl font-bold mb-6 font-montserrat">Gotowy na zmianę?</h2>
                    <p class="text-lg text-slate-300 mb-8 leading-relaxed">
                        Jeśli chcesz zamówić najwyższej jakości oleje z kwasami omega-3 marki Eqology, skontaktuj się z osobą, która udostępniła Ci ten materiał.
                    </p>

                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 md:p-8 mt-8 transform hover:scale-[1.02] transition-transform duration-300">
                        <div class="flex flex-col md:flex-row items-center gap-6">
                            <div class="flex-shrink-0">
                                <div class="w-16 h-16 bg-eqology-gold rounded-full flex items-center justify-center">
                                    <i data-lucide="gift" class="w-8 h-8 text-white"></i>
                                </div>
                            </div>
                            <div class="text-left">
                                <h3 class="text-xl font-bold text-eqology-gold mb-2">Twój Prezent: Wartościowy E-book</h3>
                                <p class="text-slate-200 text-sm md:text-base">
                                    Otrzymasz e-book – <strong>21 stron rzetelnej wiedzy</strong> o kwasach omega-3, opartej na badaniach naukowych.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="mt-10">
                         <p class="text-slate-300 mb-6 italic">
                            Jeśli masz już link, załóż bezpłatne konto, złóż zamówienie i… pij na zdrowie!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Sekcja: Instrukcja -->
    <section class="py-16 bg-slate-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-2xl md:text-3xl font-bold text-slate-800 mb-4">Jak złożyć zamówienie?</h2>
            <p class="text-slate-600 mb-8">👇 Obejrzyj poniżej instrukcję całego procesu krok po kroku.</p>

            <div class="video-placeholder group cursor-pointer bg-white border border-slate-200 shadow-md flex items-center justify-center max-w-3xl mx-auto">
                 <div class="text-center">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:bg-eqology-gold transition-colors duration-300">
                        <i data-lucide="play" class="w-6 h-6 text-slate-400 group-hover:text-white transition-colors"></i>
                    </div>
                    <p class="mt-4 text-slate-400 text-sm font-medium">[Instrukcja rejestracji i zakupu]</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 pt-16 pb-12">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl font-bold text-slate-800 mb-6">Bądź z nami w kontakcie!</h2>
            <p class="text-lg text-slate-600 mb-8">Dołącz do naszej społeczności.</p>

            <a href="https://www.facebook.com/" target="_blank" class="inline-flex items-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                <i data-lucide="facebook" class="w-6 h-6"></i>
                Dołącz do grupy "Twoja omega-3"
            </a>
            
            <p class="mt-4 text-sm text-slate-400">Kliknij w przycisk powyżej i dołącz do grupy na Facebooku.</p>

            <div class="mt-16 border-t border-slate-100 pt-8">
                <p class="text-slate-400 text-sm">© 2026 Pure Life Team. Partner Niezależny Eqology.</p>
            </div>
        </div>
    </footer>

    <script>lucide.createIcons();</script>',
  '/* Zewnętrzne zasoby - automatycznie ładowane przez system */
body {
    font-family: ''Open Sans'', sans-serif;
    background-color: #f8fafc;
}
h1, h2, h3, h4 {
    font-family: ''Montserrat'', sans-serif;
}
.text-eqology-gold {
    color: #c5a059;
}
.bg-eqology-gold {
    background-color: #c5a059;
}
.bg-eqology-dark {
    background-color: #0f172a;
}
.gradient-hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}
.video-placeholder {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    background-color: #e2e8f0;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.video-placeholder iframe,
.video-placeholder object,
.video-placeholder embed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}',
  'Eqology - Twoja Podróż po Zdrowie',
  'Odkryj siłę kwasów Omega-3 Eqology. Produkty klasy klinicznej dla Twojego zdrowia.',
  true,
  true,
  false,
  false,
  true,
  'info',
  10,
  false,
  false,
  true,
  true,
  true
);