import React from 'react';
import { Heart, Users, Check, Mail } from 'lucide-react';
import dropletIcon from '@/assets/pure-life-droplet.png';

export const DashboardFooterSection: React.FC = () => {
  const teamFeatures = [
    { 
      icon: Heart, 
      title: 'Pasja', 
      description: 'Wierzymy w siłę naturalnych suplementów i ich wpływ na zdrowie.' 
    },
    { 
      icon: Users, 
      title: 'Społeczność', 
      description: 'Tworzymy zespół profesjonalistów wspierających się nawzajem.' 
    },
    { 
      icon: Check, 
      title: 'Misja', 
      description: 'Poszerzać świadomość dbania o zdrowie w sposób naturalny i holistyczny.' 
    },
  ];

  return (
    <div className="mt-8 space-y-12">
      {/* Cytat - misja */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold italic mb-4 text-foreground">
          "Zmieniamy życie ludzi na lepsze"
        </h2>
        <p className="text-muted-foreground max-w-3xl mx-auto text-sm leading-relaxed">
          "Naszą misją jest poprawa zdrowia ludzi, uwolnienie ich od finansowych ograniczeń
          i tworzenie wolności pracy w ramach najbardziej godnej zaufania firmy z branży suplementów diety na świecie,
          działającej w oparciu o rzetelne badania naukowe".
        </p>
      </section>

      {/* Zespół Pure Life */}
      <section className="text-center py-8 bg-muted/30 rounded-lg">
        <h3 className="text-2xl font-bold mb-2 text-foreground">Zespół Pure Life</h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto mb-8">
          Jesteśmy grupą entuzjastów zdrowego życia, którzy wierzą w moc wysokiej jakości suplementów Omega-3.
          Nasza misja to dzielenie się wiedzą i wspieranie Ciebie w budowaniu swojej kariery.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {teamFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="font-semibold mb-1 text-foreground">{feature.title}</h4>
                <p className="text-xs text-muted-foreground max-w-[200px]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Kontakt */}
      <section className="text-center py-8">
        <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-foreground">KONTAKT</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Potrzebujesz wsparcia?<br />
          Masz pytanie, sugestię, uwagi lub czegoś Ci brakuje?<br />
          Napisz do nas.
        </p>
        <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
          Pamiętaj – w pierwszej kolejności skontaktuj się ze swoim opiekunem.<br />
          Jesteśmy tu, by wspierać Cię na każdym etapie.<br />
          Razem tworzymy zespół Pure Life w Eqology<br />
          – oparty na zaufaniu, współpracy i rozwoju.
        </p>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
            <Mail className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">EMAIL SUPPORT PURELIFE</span>
          <a 
            href="mailto:kontakt@purelife.info.pl" 
            className="text-primary hover:underline text-sm"
          >
            kontakt@purelife.info.pl
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-4 pb-2 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-2">
          <img src={dropletIcon} alt="" className="w-5 h-5" />
          <span className="text-primary font-bold">PURE LIFE</span>
        </div>
        <span>© {new Date().getFullYear()} Pure Life. Wszystkie prawa zastrzeżone.</span>
        <div className="flex gap-4">
          <a href="/page/polityka-prywatnosci" className="hover:text-primary transition-colors">
            Polityka prywatności
          </a>
          <span>•</span>
          <a href="/page/regulamin" className="hover:text-primary transition-colors">
            Regulamin
          </a>
        </div>
      </footer>
    </div>
  );
};
