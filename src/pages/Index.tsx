import React from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { GreenButton } from '@/components/GreenButton';
import { ShareButton } from '@/components/ShareButton';
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="flex items-center justify-center mb-6">
          <img src={pureLifeDroplet} alt="Pure Life Droplet" className="w-16 h-16 mr-4" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              NIEZBĘDNIK
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              PURE LIFE
            </h2>
          </div>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Witaj w centralnym hub-ie wszystkich narzędzi, materiałów i zasobów Pure Life. 
          Znajdziesz tutaj wszystko czego potrzebujesz do efektywnej pracy i współpracy.
        </p>
        
        {/* Admin Controls */}
        {user && (
          <div className="flex justify-center space-x-4 mt-6">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Panel CMS
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Wyloguj
            </Button>
          </div>
        )}
        
        {!user && (
          <div className="flex justify-center mt-6">
            <Link to="/auth">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Logowanie
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto space-y-4">
        {sections.map((section) => {
          const sectionItems = items.filter(item => item.section_id === section.id);
          
          return (
            <CollapsibleSection 
              key={section.id} 
              title={section.title}
              defaultOpen={section.position === 1}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionItems.map((item) => (
                  <GreenButton 
                    key={item.id}
                    onClick={() => handleButtonClick(item.title || '', item.url || undefined)} 
                    className="h-16"
                  >
                    {item.title}
                  </GreenButton>
                ))}
                {sectionItems.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    Brak elementów w tej sekcji
                  </div>
                )}
              </div>
            </CollapsibleSection>
          );
        })}
        
        {sections.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <img src={pureLifeDroplet} alt="Pure Life" className="w-24 h-24 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Brak zawartości do wyświetlenia</p>
            <p className="text-sm mt-2">
              {user && isAdmin ? (
                <>Przejdź do <Link to="/admin" className="underline">panelu CMS</Link> aby dodać treści.</>
              ) : (
                <>Skontaktuj się z administratorem aby dodać treści.</>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;