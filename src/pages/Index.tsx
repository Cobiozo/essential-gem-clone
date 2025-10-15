import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { useLanguage } from '@/contexts/LanguageContext';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import niezbednikLogo from '@/assets/logo-niezbednika-pure-life.png';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import Footer from '@/components/homepage/Footer';
import { CMSContent } from '@/components/CMSContent';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { convertSupabaseSections } from '@/lib/typeUtils';
import { CMSSection, CMSItem, ContentCell } from '@/types/cms';
import dropletIcon from '@/assets/pure-life-droplet.png';
import * as LucideIcons from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [headerText, setHeaderText] = React.useState<string>('');
  const [authorText, setAuthorText] = React.useState<string>('');
  const [siteLogo, setSiteLogo] = React.useState<string>(newPureLifeLogo);
  const [headerImage, setHeaderImage] = React.useState<string>(niezbednikLogo);
  const [publishedPages, setPublishedPages] = React.useState<any[]>([]);
  const [sections, setSections] = React.useState<CMSSection[]>([]);
  const [items, setItems] = React.useState<CMSItem[]>([]);
  const [nestedSections, setNestedSections] = React.useState<{[key: string]: CMSSection[]}>({});
  const [loading, setLoading] = React.useState(true);
  const [mainPageId, setMainPageId] = React.useState<string | null>(null);
  
  // Enable security preventions
  useSecurityPreventions();

  // Helper function to convert cells from database format
  const convertCellsFromDatabase = (cells: any): ContentCell[] => {
    if (!cells) return [];
    if (typeof cells === 'string') {
      try {
        const parsed = JSON.parse(cells);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        return [];
      }
    }
    if (Array.isArray(cells)) {
      return cells;
    }
    return [];
  };

  const convertDatabaseItemToCMSItem = (dbItem: any): CMSItem => {
    return {
      ...dbItem,
      cells: convertCellsFromDatabase(dbItem.cells)
    };
  };

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

      // Pobierz stronę główną "Główna"
      const { data: mainPage } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', 'glowna')
        .maybeSingle();

      if (mainPage) {
        setMainPageId(mainPage.id);

        // Pobierz sekcje CMS dla strony głównej (tylko sekcje główne bez parent_id)
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', mainPage.id)
          .is('parent_id', null)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (!sectionsError && sectionsData) {
          setSections(convertSupabaseSections(sectionsData));

          // Pobierz sekcje zagnieżdżone dla każdej sekcji głównej
          const nestedSectionsData: {[key: string]: CMSSection[]} = {};
          for (const section of sectionsData) {
            const { data: nestedData, error: nestedError } = await supabase
              .from('cms_sections')
              .select('*')
              .eq('parent_id', section.id)
              .eq('is_active', true)
              .order('position', { ascending: true });
            
            if (!nestedError && nestedData && nestedData.length > 0) {
              nestedSectionsData[section.id] = convertSupabaseSections(nestedData);
            }
          }
          setNestedSections(nestedSectionsData);
        }

        // Pobierz itemy CMS dla strony głównej
        const { data: itemsData, error: itemsError } = await supabase
          .from('cms_items')
          .select('*')
          .eq('page_id', mainPage.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (!itemsError && itemsData) {
          setItems(itemsData.map(convertDatabaseItemToCMSItem));
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render individual item with custom styling
  const renderCMSItem = (item: CMSItem, section: CMSSection) => {
    const IconComponent = item.icon ? (LucideIcons as any)[item.icon] : null;
    
    // For info_text type in grid sections (Team and Contact sections)
    if (item.type === 'info_text' && section.display_type === 'grid') {
      return (
        <div key={item.id} className="text-center group hover:transform hover:scale-105 transition-all duration-300">
          {IconComponent && (
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <IconComponent className="w-10 h-10 text-white" />
              </div>
            </div>
          )}
          <h3 className="text-xl font-bold mb-3 text-black">{item.title}</h3>
          {item.url ? (
            <a 
              href={item.url} 
              className="text-gray-600 hover:text-[hsl(45,100%,51%)] transition-colors font-medium"
            >
              {item.description}
            </a>
          ) : (
            <p className="text-gray-600 leading-relaxed">{item.description}</p>
          )}
        </div>
      );
    }

    // For multi_cell type in Learn More section
    if (item.type === 'multi_cell') {
      const [isExpanded, setIsExpanded] = React.useState(false);
      const sectionItems = items.filter(i => i.section_id === section.id);
      const itemIndex = sectionItems.findIndex(i => i.id === item.id);

      return (
        <div 
          key={item.id}
          className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                {itemIndex + 1}
              </div>
              <span className="text-left text-black font-semibold text-lg">{item.title}</span>
            </div>
            <LucideIcons.ChevronDown 
              className={`w-6 h-6 text-gray-400 group-hover:text-[hsl(45,100%,51%)] transition-all duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </button>
          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6 text-gray-600 leading-relaxed">
              {item.description}
            </div>
          </div>
        </div>
      );
    }

    // Default rendering
    return <CMSContent key={item.id} item={item} />;
  };

  // Render CMS section with custom styling
  const renderCMSSection = (section: CMSSection) => {
    const sectionItems = items.filter(item => item.section_id === section.id);
    
    // Get section styles
    const sectionStyle: React.CSSProperties = {
      backgroundColor: section.background_color || undefined,
      color: section.text_color || undefined,
      padding: section.padding ? `${section.padding}px` : undefined,
    };

    const containerClasses = section.display_type === 'grid' 
      ? 'grid grid-cols-1 md:grid-cols-3 gap-12 mt-8'
      : 'space-y-4';

    return (
      <section key={section.id} style={sectionStyle} className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold mb-6 text-black uppercase tracking-wide">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
                {section.description}
              </p>
            )}
          </div>
          
          {/* Section Items */}
          <div className={containerClasses}>
            {sectionItems.map(item => renderCMSItem(item, section))}
          </div>

          {/* Special handling for Contact section - person info */}
          {section.id === '08b07156-ef06-45ba-8fcc-41c2372162dc' && sectionItems.length > 3 && (
            <div className="text-center border-t border-gray-200 pt-12 mt-12">
              <h3 className="text-xl font-bold mb-3 text-black">{sectionItems[3].title}</h3>
              <p className="text-gray-600 text-lg">{sectionItems[3].description}</p>
            </div>
          )}
        </div>
      </section>
    );
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

      {/* Main Content - CMS Sections */}
      <main id="main-content" className="bg-white">
        {sections.length > 0 ? (
          sections.map(section => renderCMSSection(section))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Ładowanie zawartości...</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
