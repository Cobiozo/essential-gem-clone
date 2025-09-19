import React from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { GreenButton } from '@/components/GreenButton';
import { ShareButton } from '@/components/ShareButton';
import pureLifeDroplet from '@/assets/pure-life-droplet.png';
import { 
  Share2, 
  Calendar, 
  MessageCircle, 
  Facebook, 
  ShoppingBag, 
  Download,
  BookOpen,
  Target,
  CheckSquare,
  HelpCircle,
  Users,
  Phone,
  Mail,
  FileText
} from 'lucide-react';

const Index = () => {
  const handleButtonClick = (action: string) => {
    console.log(`Clicked: ${action}`);
    // Tu można dodać konkretne akcje dla każdego przycisku
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto bg-background">
        {/* Header with Logo */}
        <div className="text-center py-8 px-6">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-wide">
            <span className="text-accent">NIEZBĘDNIK</span>
          </h1>
          <div className="flex items-center justify-center mb-4">
            <img 
              src={pureLifeDroplet} 
              alt="Pure Life Oil Droplet" 
              className="w-12 h-12 mr-2"
            />
          </div>
          <h2 className="text-xl font-semibold text-foreground tracking-wide">
            PURE LIFE
          </h2>
          
          <p className="text-sm text-muted-foreground mt-4 px-4 leading-relaxed">
            Witaj w Niezbędniku Pure Life - przestrzeni stworzonej z myślą o Tobie i Twojej codziennej pracy 
            w zespole Pure Life. Tu znajdziesz zbiór wszystkich materiałów oraz zasobów. 
            Nawet pomożę Ci być skuteczniejszy, profesjonalniejszy i mądrzejszy. Nasz 
            zespół używa tego niezbędnego narzędzia.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Pozdrawiam - Dawid Kowalczyk
          </p>
        </div>

        <div className="px-6 space-y-4">
          {/* Strefa współpracy */}
          <CollapsibleSection title="Strefa współpracy">
            <div className="space-y-4">
              
              {/* PARTNER Section */}
              <CollapsibleSection title="PARTNER" defaultOpen>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Poznaj najlepsze gotowe materiały, które pomogą Ci zrazu wyróżniać 
                    spośród innych w przewadze oraz szybkim zinteresowan klientów, które 
                    znajdziesz tu:
                  </p>
                  
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• prezentację i materiały promocyjne</li>
                    <li>• treści startowe do wiadomości</li>
                    <li>• narzędzia uławiające rejestrację i pierwszy zakup klientom</li>
                  </ul>
                  
                  <p className="text-sm text-muted-foreground">
                    Aby zaprosić nową osobę, kliknij przycisk „udostępnij" i podziel się 
                    materiałami
                  </p>

                  <div className="space-y-3">
                    <GreenButton 
                      onClick={() => handleButtonClick('szansa-biznesowa')}
                      icon={<Target className="w-4 h-4" />}
                    >
                      szansa biznesowa - pogląd
                    </GreenButton>
                    
                    <p className="text-xs text-muted-foreground px-2">
                      Jeśli chcesz wysłać krótką prezentację, 
                      produktowo-biznesową potencjalnemu klientowi 
                      czy potencjal „udostępnij" i wyślij w 
                      wiadomości.
                    </p>
                    
                    <ShareButton 
                      text="Udostępnij" 
                      icon={<Share2 className="w-4 h-4" />}
                      onClick={() => handleButtonClick('udostepnij-partner')}
                    />

                    <GreenButton 
                      onClick={() => handleButtonClick('pierwsze-kroki')}
                      icon={<Target className="w-4 h-4" />}
                    >
                      Pierwsze kroki - pogląd
                    </GreenButton>
                    
                    <p className="text-xs text-muted-foreground px-2">
                      Jeśli chcesz wysłać pierwsze kroki 
                      nowemu partnerowi bądźmy kliknij przycisk 
                      „udostępnij" i wyślij w 
                      wiadomości. 
                      <br /><br />
                      <strong>MATERIAŁ WYSYŁAMY DOPIERO PO ZAKUPIE ZESTAWU BIZNESOWEGO</strong>
                    </p>
                    
                    <ShareButton 
                      text="Udostępnij" 
                      icon={<Share2 className="w-4 h-4" />}
                      onClick={() => handleButtonClick('udostepnij-pierwsze-kroki')}
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* SPECJALISTA Section */}
              <CollapsibleSection title="SPECJALISTA">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Poznaj najlepsze gotowe materiały, które pomogą Ci już na start wyróżniać 
                    się już jako wysoki poziom specjalisty zdrowotno-naturalnego znajdziesz tu:
                  </p>
                  
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• prezentację i materiały promocyjne</li>
                    <li>• treści startowe do wiadomości</li>
                    <li>• narzędzia uławiające rejestrację i pierwszy zakup klientom</li>
                  </ul>
                  
                  <p className="text-sm text-muted-foreground">
                    Aby zaprosić nową osobę, kliknij przycisk „udostępnij" i podziel się 
                    materiałami
                  </p>

                  <div className="space-y-3">
                    <GreenButton 
                      onClick={() => handleButtonClick('mozliwosc-wspolpracy')}
                      icon={<Users className="w-4 h-4" />}
                    >
                      możliwość współpracy
                    </GreenButton>
                    
                    <p className="text-xs text-muted-foreground px-2">
                      Jeśli chcesz wysłać krótką prezentację 
                      produktowo-biznesową 
                      zainteresowanemu klientowi kliknij 
                      przycisk „udostępnij" i wyślij w 
                      wiadomości.
                    </p>
                    
                    <ShareButton 
                      text="Udostępnij" 
                      icon={<Share2 className="w-4 h-4" />}
                      onClick={() => handleButtonClick('udostepnij-mozliwosc')}
                    />

                    <GreenButton 
                      onClick={() => handleButtonClick('pierwsze-kroki-specjalista')}
                      icon={<Target className="w-4 h-4" />}
                    >
                      Pierwsze kroki - pogląd
                    </GreenButton>
                    
                    <p className="text-xs text-muted-foreground px-2">
                      Jeśli chcesz wysłać pierwsze kroki 
                      nowemu partnerowi bądźmy kliknij przycisk 
                      „udostępnij" i wyślij w 
                      wiadomości. 
                      <br /><br />
                      <strong>MATERIAŁ WYSYŁAMY DOPIERO PO ZAKUPIE ZESTAWU BIZNESOWEGO</strong>
                    </p>
                    
                    <ShareButton 
                      text="Udostępnij" 
                      icon={<Share2 className="w-4 h-4" />}
                      onClick={() => handleButtonClick('udostepnij-pierwsze-kroki-spec')}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </CollapsibleSection>

          {/* KLIENT Section */}
          <CollapsibleSection title="KLIENT">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                W tej sekcji znajdziesz komplet materiałów stworzonych z myślą o:
                - pozyskiwaniu nowych klientów,
                - budowaniu relacji i zaufania,
                - profesjonalnej opiece nad obecnymi klientami.
              </p>
              <p className="text-sm text-muted-foreground">
                To Twoje centrum wsparcia klienta - 
                - kryteria i regulaminie i dziele się.
              </p>
              
              <p className="text-sm font-medium text-foreground">
                🔸 Aby zaprosić nową osobę, kliknij 
                przycisk „udostępnij" i podziel się 
                materiałami.
              </p>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">OMEGA-3 - informacje</h4>
                  <p className="text-xs text-muted-foreground">
                    Jeśli chcesz wysłać krótką prezentację 
                    zdrowotno-produktową 
                    potencjalnemu klientowi 
                    kliknij w przycisk „udostępnij" i wyślij w wiadomości.
                  </p>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('omega-3')}
                    icon={<FileText className="w-4 h-4" />}
                  >
                    omega-3 - pogląd
                  </GreenButton>
                  
                  <ShareButton 
                    text="Udostępnij" 
                    icon={<Share2 className="w-4 h-4" />}
                    onClick={() => handleButtonClick('udostepnij-omega')}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Niezbędnik klienta</h4>
                  <p className="text-xs text-muted-foreground">
                    Jeśli chcesz wysłać "Niezbędnik 
                    klienta" nowemu klientowi kliknij w 
                    przycisk „udostępnij" i wyślij 
                    w wiadomości.
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    MATERIAŁ WYSYŁAMY DOPIERO PO 
                    ZAKUPIE
                  </p>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('niezbednik-klienta')}
                    icon={<BookOpen className="w-4 h-4" />}
                  >
                    Niezbędnik klienta - 
                    pogląd
                  </GreenButton>
                  
                  <ShareButton 
                    text="Udostępnij" 
                    icon={<Share2 className="w-4 h-4" />}
                    onClick={() => handleButtonClick('udostepnij-niezbednik')}
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* TERMINARZ */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground text-lg">TERMINARZ</h3>
            <p className="text-sm text-muted-foreground">
              wykłócone dla partnerów i specjalistów
            </p>
            
            <GreenButton 
              onClick={() => handleButtonClick('terminarz')}
              icon={<Calendar className="w-4 h-4" />}
            >
              Terminarz Pure Life
            </GreenButton>
          </div>

          {/* Social Media */}
          <CollapsibleSection title="Social Media">
            <div className="space-y-4">
              <CollapsibleSection title="WhatsApp">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    WhatsApp
                  </p>
                  <p className="text-sm text-muted-foreground">
                    dostęp do społeczności
                  </p>
                  
                  <p className="text-sm text-muted-foreground">
                    Po dołączeniu wybierz odpowiednie czaty:
                  </p>
                  
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• <strong>PARTNER</strong> - jeśli jesteś partnerem 
                    biznesowym budującym zespół</li>
                    <li>• <strong>SPECJALISTA</strong> - jeśli jesteś dietetykiem, 
                    lekarzem, bioenergoterapeuta, trenerem 
                    personalnym lub podobną specjalizacją w 
                    kierunku zdrowotnym, żywieniowym i korzystasz z systemów analitycznych 
                    klientów oraz pracujesz</li>
                    <li>• jeśli jesteś specjalistą i chcesz rozwijać 
                    klientów własne franc zuez - dołącz do obu 
                    grup grup</li>
                  </ul>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('whatsapp')}
                    icon={<MessageCircle className="w-4 h-4" />}
                  >
                    WhatsApp - dołącz
                  </GreenButton>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Grupy na Facebooku">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Grupy na Facebooku - skupowisko
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dołącz do grup na facebooku 
                    wyłącznie dla partnerów i specjalistów
                  </p>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('fb-pure-life-biznes')}
                    icon={<Facebook className="w-4 h-4" />}
                  >
                    FB - Pure Life Biznes
                  </GreenButton>
                  
                  <p className="text-sm text-muted-foreground">
                    dla członków i osób zainteresowanych 
                    zespołem
                  </p>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('twoja-omega-3')}
                    icon={<Facebook className="w-4 h-4" />}
                  >
                    Twoja omega 3 (Pure 
                    Life)
                  </GreenButton>
                  
                  <p className="text-sm text-muted-foreground">
                    kliknij tu później czy przyjść i wejdź do 
                    zainteresowanych do zainteresowanych gruby tak 
                    wyszukaj omega zde lutaj klienta
                  </p>
                  
                  <ShareButton 
                    text="Zaproś" 
                    icon={<Share2 className="w-4 h-4" />}
                    onClick={() => handleButtonClick('zapros')}
                  />
                </div>
              </CollapsibleSection>
            </div>
          </CollapsibleSection>

          {/* Materiały - social media */}
          <CollapsibleSection title="Materiały - social media">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                SOCIAL MEDIA - materiały
              </p>
              
              <GreenButton 
                onClick={() => handleButtonClick('materialy-social')}
                icon={<Download className="w-4 h-4" />}
              >
                materiały - social 
                media
              </GreenButton>
            </div>
          </CollapsibleSection>

          {/* Aplikacje */}
          <CollapsibleSection title="Aplikacje">
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  FCapp
                </p>
                <p className="text-sm text-muted-foreground">
                  aplikacja optymalizacji 
                  tłuszczów związků człetkami
                </p>
                
                <GreenButton 
                  onClick={() => handleButtonClick('zaloz-konto')}
                  icon={<ShoppingBag className="w-4 h-4" />}
                >
                  Załóż konto
                </GreenButton>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Epiloog PRO
                </p>
                <p className="text-sm text-muted-foreground">
                  epilogia aplikacja temop,  
                  o której snuła porużywanie analiz tłuszczów omega w 
                  mózgu dla wybinegu już diagnozowego
                </p>
                
                <div className="space-y-2">
                  <GreenButton 
                    onClick={() => handleButtonClick('pobierz-sklep-play')}
                    icon={<ShoppingBag className="w-4 h-4" />}
                  >
                    Pobierz - Sklep Play
                  </GreenButton>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('pobierz-appstore')}
                    icon={<ShoppingBag className="w-4 h-4" />}
                  >
                    Pobierz - AppStore
                  </GreenButton>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Materiały na zamówienie */}
          <CollapsibleSection title="Materiały na zamówienie">
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  E-book (personalizowany)
                </p>
                <p className="text-sm text-muted-foreground">
                  który na pewno przeczytają Twoi 
                  klienci
                </p>
                
                <GreenButton 
                  onClick={() => handleButtonClick('e-book')}
                  icon={<BookOpen className="w-4 h-4" />}
                >
                  E-book
                </GreenButton>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Katalog - ulotki
                </p>
                <p className="text-sm text-muted-foreground">
                  będąe wyśljena pryciscy zejścia 
                  klienta
                </p>
                
                <GreenButton 
                  onClick={() => handleButtonClick('katalog')}
                  icon={<FileText className="w-4 h-4" />}
                >
                  Katalog
                </GreenButton>
              </div>
            </div>
          </CollapsibleSection>

          {/* EQ GO */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground text-lg">EQ GO</h3>
            <p className="text-sm text-muted-foreground">
              Proweni mądrzej. dłu.
            </p>
            
            <GreenButton 
              onClick={() => handleButtonClick('eq-go')}
              icon={<Target className="w-4 h-4" />}
            >
              EQ GO
            </GreenButton>
          </div>

          {/* Lista zadań */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground text-lg">Lista zadań</h3>
            <p className="text-sm text-muted-foreground">
              rzecz współą pomoże w organizowaniu tempu 
              działania, targaj nocą pierwszej dla dzielenia 
              w kolejności - przyf oraz po co
            </p>
            
            <GreenButton 
              onClick={() => handleButtonClick('pobierz-lista')}
              icon={<CheckSquare className="w-4 h-4" />}
            >
              pobierz
            </GreenButton>
          </div>

          {/* POMOC */}
          <CollapsibleSection title="POMOC">
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  🆘 SUPPORT
                </p>
                <p className="text-sm text-muted-foreground">
                  🎯 KONTAKT
                </p>
                <p className="text-sm text-muted-foreground">
                  Jeśli masz jakieś pytania, wątpliwości 
                  lub prob czy potrzebujesz więcej informacji - na 
                  problemy i pytania dotyczące biznesu, 
                  produktów lub samego niezbędnika - 
                  właściwa funkcja skłowna niezbędnika. 
                  Pamiętaj - my z tożsamości pomagamy lub 
                  udzielamy wsparcia optywne jak najszybsiej 
                  potrzebujesz do pytania w właścim niczym 
                  miejscu - to.
                </p>
                
                <p className="text-sm font-medium text-foreground">
                  Kontakt 3 support:
                </p>
                <p className="text-sm text-muted-foreground">
                  Omawialam właściwych od 
                  gwintesed kod pytań w prośla 
                  potrzebujesz do gyptał w poefind od 
                  wtony.sielsc
                </p>
                
                <div className="space-y-2">
                  <GreenButton 
                    onClick={() => handleButtonClick('zadzwon')}
                    icon={<Phone className="w-4 h-4" />}
                  >
                    ZADZWOŃ - kliknij
                  </GreenButton>
                  
                  <GreenButton 
                    onClick={() => handleButtonClick('napisz')}
                    icon={<Mail className="w-4 h-4" />}
                  >
                    NAPISZ - kliknij
                  </GreenButton>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Wsparcie - Zespół Pure Life */}
          <div className="space-y-4 pb-8">
            <h3 className="font-medium text-foreground text-lg">Wsparcie - Zespół Pure Life</h3>
            <p className="text-sm text-muted-foreground">
              Potrzebujesz wsparcia?
            </p>
            <p className="text-sm text-muted-foreground">
              Możę pytanie, sugestię, uwagę lub 
              chcesz się o brałożie? Napisz do nas.
            </p>
            <p className="text-sm text-muted-foreground">
              Pamiętaj - w pierwszej kolejności 
              skorzystaj się ze treścią, informacjami, 
              tutaj w niezbędniku.
            </p>
            <p className="text-sm text-muted-foreground">
              Wsparcie: Cze na każdym etapie.
            </p>
            <p className="text-sm text-muted-foreground">
              Pozderu kierowniczej zespół Pure Life 
              w którym stale różksjwane i rozwijamy.
            </p>
            
            <GreenButton 
              onClick={() => handleButtonClick('napisz-zespol')}
              icon={<Mail className="w-4 h-4" />}
            >
              NAPISZ - kliknij
            </GreenButton>

            {/* Pure Life Logo at bottom */}
            <div className="text-center py-6">
              <div className="flex items-center justify-center mb-2">
                <img 
                  src={pureLifeDroplet} 
                  alt="Pure Life Oil Droplet" 
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-wide">
                PURE LIFE
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;