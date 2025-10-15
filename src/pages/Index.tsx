import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { useLanguage } from '@/contexts/LanguageContext';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import niezbednikLogo from '@/assets/logo-niezbednika-pure-life.png';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import TeamSection from '@/components/homepage/TeamSection';
import LearnMoreSection from '@/components/homepage/LearnMoreSection';
import ContactSection from '@/components/homepage/ContactSection';
import Footer from '@/components/homepage/Footer';

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [headerText, setHeaderText] = React.useState<string>('');
  const [authorText, setAuthorText] = React.useState<string>('');
  const [siteLogo, setSiteLogo] = React.useState<string>(newPureLifeLogo);
  const [headerImage, setHeaderImage] = React.useState<string>(niezbednikLogo);
  const [publishedPages, setPublishedPages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Enable security preventions
  useSecurityPreventions();

  React.useEffect(() => {
    fetchBasicData();
  }, [user]);

  const fetchBasicData = async () => {
    try {
      // Pobierz teksty nagłówka, autora, logo i zdjęcie nagłówka z system_texts
      const { data: systemTexts } = await supabase
        .from('system_texts')
        .select('type, content, text_formatting')
        .eq('is_active', true)
        .in('type', ['header_text', 'author', 'site_logo', 'header_image']);
      
      const headerSystemText = systemTexts?.find((item: any) => item.type === 'header_text');
      const authorSystemText = systemTexts?.find((item: any) => item.type === 'author');
      const logoSystemText = systemTexts?.find((item: any) => item.type === 'site_logo');
      const headerImageSystemText = systemTexts?.find((item: any) => item.type === 'header_image');
      
      if (headerSystemText?.content) setHeaderText(headerSystemText.content);
      if (authorSystemText?.content) setAuthorText(authorSystemText.content);
      if (logoSystemText?.content) setSiteLogo(logoSystemText.content);
      if (headerImageSystemText?.content) setHeaderImage(headerImageSystemText.content);
      
      // Pobierz opublikowane strony
      const { data: pagesData } = await supabase
        .from('pages')
        .select('id, title, slug, meta_description, created_at')
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('visible_to_everyone', true)
        .order('position', { ascending: true });
      
      setPublishedPages(pagesData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={siteLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <Header siteLogo={siteLogo} publishedPages={publishedPages} />

      {/* Hero Section */}
      <HeroSection 
        headerImage={headerImage || niezbednikLogo}
        headerText={headerText}
        authorText={authorText}
        showLoginButton={!user}
      />

      {/* Main Content */}
      <main id="main-content" className="bg-white">
        <TeamSection />
        <LearnMoreSection />
        <ContactSection />
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
