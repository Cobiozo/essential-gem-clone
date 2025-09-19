import React from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSButton } from '@/components/CMSButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import pureLifeDroplet from '@/assets/pure-life-droplet.png';

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
}

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [sections, setSections] = React.useState<CMSSection[]>([]);
  const [items, setItems] = React.useState<CMSItem[]>([]);
  const [loading, setLoading] = React.useState(true);

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
        .select('*')
        .eq('is_active', true)
        .order('position');

      setSections(sectionsData || []);
      setItems(itemsData || []);
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
          <img src={pureLifeDroplet} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="text-center mb-8 max-w-md mx-auto">
        <div className="flex items-center justify-center mb-4">
          <img src={pureLifeDroplet} alt="Pure Life Droplet" className="w-12 h-12 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              NIEZBĘDNIK
            </h1>
            <div className="text-lg font-semibold text-gray-700">
              PURE LIFE
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Witaj w Niezbędniku Pure Life - przestrzeni 
          stworzonej z myślą o Tobie i Twojej codziennej pracy 
          w zespole Pure Life. Tu znajdziesz materiały oraz zasoby, 
          które pomogą Ci być skutecznym profesjonalistą i 14 
          lekarstwem.
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Pozostałem - Dawid Kowalczyk
        </p>
        
        {/* Admin Controls */}
        {user && (
          <div className="flex justify-center space-x-2 mb-4">
            <Link to="/admin">
              <Button variant="outline" size="sm" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Panel CMS
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs">
              <LogOut className="w-3 h-3 mr-1" />
              Wyloguj
            </Button>
          </div>
        )}
        
        {!user && (
          <div className="flex justify-center mb-4">
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Logowanie
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto space-y-3">
        {sections.map((section) => {
          const sectionItems = items.filter(item => item.section_id === section.id);
          const shouldShowShare = ['Strefa współpracy', 'Klient', 'Social Media', 'Materiały - social media', 'Aplikacje', 'Materiały na zamówienie'].includes(section.title);
          
          return (
            <CollapsibleSection 
              key={section.id} 
              title={section.title}
              defaultOpen={false}
              showShareButton={shouldShowShare}
            >
              <div className="space-y-3">
                {sectionItems.map((item) => {
                  const hasDescription = item.description && item.description.length > 50;
                  return (
                    <CMSButton
                      key={item.id}
                      title={item.title || ''}
                      description={item.description}
                      url={item.url}
                      type={hasDescription ? 'detailed' : 'simple'}
                      onClick={() => handleButtonClick(item.title || '', item.url || undefined)}
                    />
                  );
                })}
                {sectionItems.length === 0 && (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    Brak elementów w tej sekcji
                  </div>
                )}
              </div>
            </CollapsibleSection>
          );
        })}
        
        {sections.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <img src={pureLifeDroplet} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-base mb-2">Brak zawartości do wyświetlenia</p>
            <p className="text-xs">
              {user ? (
                <>Przejdź do <Link to="/admin" className="underline">panelu CMS</Link> aby dodać treści.</>
              ) : (
                <>Skontaktuj się z administratorem aby dodać treści.</>
              )}
            </p>
          </div>
        )}
        
        {/* Footer Logo */}
        <div className="text-center py-8">
          <img src={pureLifeDroplet} alt="Pure Life" className="w-16 h-16 mx-auto" />
          <div className="text-lg font-bold text-gray-700 mt-2">PURE LIFE</div>
        </div>
      </main>
    </div>
  );
};

export default Index;