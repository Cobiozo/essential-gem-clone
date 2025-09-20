import React from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSContent } from '@/components/CMSContent';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

interface CMSSection {
  id: string;
  title: string;
  position: number;
  is_active: boolean;
}

interface CMSItem {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  position: number;
  is_active: boolean;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
  text_formatting?: any;
  title_formatting?: any;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const [sections, setSections] = React.useState<CMSSection[]>([]);
  const [items, setItems] = React.useState<CMSItem[]>([]);
  const [headerText, setHeaderText] = React.useState<string>('');
  const [authorText, setAuthorText] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  
  // Enable security preventions
  useSecurityPreventions();

  React.useEffect(() => {
    fetchCMSData();
  }, []);

  const fetchCMSData = async () => {
    try {
      const { data: sectionsData } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('is_active', true)
        .order('position');

      const { data: itemsData } = await supabase
        .from('cms_items')
        .select('*, text_formatting, title_formatting')
        .eq('is_active', true)
        .order('position');

      setSections(sectionsData || []);
      setItems(itemsData || []);
      
      // Pobierz teksty nagłówka
      const headerItem = itemsData?.find(item => item.type === 'header_text');
      const authorItem = itemsData?.find(item => item.type === 'author');
      
      if (headerItem?.description) setHeaderText(headerItem.description);
      if (authorItem?.description) setAuthorText(authorItem.description);
      
    } catch (error) {
      console.error('Error fetching CMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (buttonName: string, url?: string) => {
    console.log(`Clicked: ${buttonName}`);
    if (url) {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={newPureLifeLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="text-center mb-8 max-w-sm sm:max-w-md lg:max-w-2xl xl:max-w-4xl mx-auto">
        <div className="mb-6">
          <img src={newPureLifeLogo} alt="Niezbędnik Pure Life" className="w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto" />
        </div>
        
        {/* Header text with formatting support */}
        {headerText && (
          <div className="text-xs sm:text-sm lg:text-base text-gray-600 leading-relaxed mb-6 px-2">
            {(() => {
              const headerItem = items.find(item => item.type === 'header_text');
              if (headerItem?.text_formatting) {
                return (
                  <div
                    style={{
                      fontSize: `${headerItem.text_formatting.fontSize || 16}px`,
                      fontWeight: headerItem.text_formatting.fontWeight || '400',
                      fontStyle: headerItem.text_formatting.fontStyle || 'normal',
                      textDecoration: headerItem.text_formatting.textDecoration || 'none',
                      textAlign: headerItem.text_formatting.textAlign || 'center',
                      color: headerItem.text_formatting.color || '#666666',
                      backgroundColor: headerItem.text_formatting.backgroundColor === 'transparent' ? undefined : headerItem.text_formatting.backgroundColor,
                      lineHeight: headerItem.text_formatting.lineHeight || 1.5,
                      letterSpacing: `${headerItem.text_formatting.letterSpacing || 0}px`,
                      fontFamily: headerItem.text_formatting.fontFamily || 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    {headerText}
                  </div>
                );
              }
              return headerText;
            })()}
          </div>
        )}
        
        {!headerText && (
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 leading-relaxed mb-6 px-2">
            Witaj w Niezbędniku Pure Life - przestrzeni stworzonej z myślą o Tobie i Twojej codziennej pracy w zespole Pure Life. Tu znajdziesz materiały oraz zasoby, które pomogą Ci być skutecznym profesjonalistą i lekarstwem.
          </p>
        )}
        
        {/* Author text with formatting support */}
        {authorText && (
          <div className="text-xs sm:text-sm text-gray-500 mb-4">
            {(() => {
              const authorItem = items.find(item => item.type === 'author');
              if (authorItem?.text_formatting) {
                return (
                  <div
                    style={{
                      fontSize: `${authorItem.text_formatting.fontSize || 14}px`,
                      fontWeight: authorItem.text_formatting.fontWeight || '400',
                      fontStyle: authorItem.text_formatting.fontStyle || 'normal',
                      textDecoration: authorItem.text_formatting.textDecoration || 'none',
                      textAlign: authorItem.text_formatting.textAlign || 'center',
                      color: authorItem.text_formatting.color || '#666666',
                      backgroundColor: authorItem.text_formatting.backgroundColor === 'transparent' ? undefined : authorItem.text_formatting.backgroundColor,
                      lineHeight: authorItem.text_formatting.lineHeight || 1.5,
                      letterSpacing: `${authorItem.text_formatting.letterSpacing || 0}px`,
                      fontFamily: authorItem.text_formatting.fontFamily || 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    {authorText}
                  </div>
                );
              }
              return authorText;
            })()}
          </div>
        )}
        
        {!authorText && (
          <p className="text-xs sm:text-sm text-gray-500 mb-4">
            Pozostałem - Dawid Kowalczyk
          </p>
        )}
        
        {/* Admin Controls */}
        {user && (
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <Link to="/admin">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Settings className="w-3 h-3 mr-1" />
                Panel CMS
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs w-full sm:w-auto">
              <LogOut className="w-3 h-3 mr-1" />
              Wyloguj
            </Button>
          </div>
        )}
        
        {!user && (
          <div className="flex justify-center mb-4">
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Settings className="w-3 h-3 mr-1" />
                Logowanie
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-sm sm:max-w-md lg:max-w-2xl xl:max-w-4xl mx-auto space-y-3 lg:space-y-4">
        {sections.map((section) => {
          const sectionItems = items.filter(item => 
            item.section_id === section.id && 
            item.type !== 'header_text' && 
            item.type !== 'author'
          ).sort((a, b) => a.position - b.position);
          
          const shouldShowShare = ['Strefa współpracy', 'Klient', 'Social Media', 'Materiały - social media', 'Aplikacje', 'Materiały na zamówienie'].includes(section.title);
          
          return (
            <CollapsibleSection 
              key={section.id} 
              title={section.title}
              defaultOpen={false}
              showShareButton={shouldShowShare}
            >
              <div className="space-y-3">
                 {sectionItems.map((item) => (
                   <CMSContent
                     key={item.id}
                     item={item}
                     onClick={handleButtonClick}
                   />
                 ))}
                 {sectionItems.length === 0 && (
                   <div className="text-center text-gray-500 py-4 sm:py-6 text-xs sm:text-sm">
                     Brak elementów w tej sekcji
                   </div>
                 )}
              </div>
            </CollapsibleSection>
          );
        })}
        
        {sections.length === 0 && (
          <div className="text-center text-gray-500 py-8 sm:py-12">
            <img src={newPureLifeLogo} alt="Pure Life" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base mb-2">Brak zawartości do wyświetlenia</p>
            <p className="text-xs sm:text-sm px-4">
              {user ? (
                <>Przejdź do <Link to="/admin" className="underline">panelu CMS</Link> aby dodać treści.</>
              ) : (
                <>Skontaktuj się z administratorem aby dodać treści.</>
              )}
            </p>
          </div>
        )}
        
        {/* Footer Logo */}
        <div className="text-center py-6 sm:py-8">
          <img src={newPureLifeLogo} alt="Pure Life" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" />
          <div className="text-base sm:text-lg font-bold text-gray-700 mt-2">PURE LIFE</div>
        </div>
      </main>
    </div>
  );
};

export default Index;