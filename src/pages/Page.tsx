import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Home } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { toast } from 'sonner';

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

const Page = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching page:', error);
          setNotFound(true);
        } else if (data) {
          setPage(data);
          // Update page title and meta description if available
          if (data.meta_title) {
            document.title = data.meta_title;
          } else {
            document.title = data.title;
          }
          
          if (data.meta_description) {
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
              metaDescription.setAttribute('content', data.meta_description);
            }
          }
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        toast.error('Wystąpił błąd podczas ładowania strony');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie strony...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-background relative">
        {/* Theme Selector */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeSelector />
        </div>
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Strona nie została znaleziona</h2>
              <p className="text-muted-foreground mb-8">
                Przepraszamy, ale strona której szukasz nie istnieje lub została usunięta.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Strona główna
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Wstecz
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Theme Selector */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSelector />
      </div>
      
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do strony głównej
              </Link>
            </Button>
            
            <h1 className="text-lg font-semibold text-foreground truncate mx-4">
              {page.title}
            </h1>
            
            <div className="w-[120px]"></div> {/* Spacer for layout balance */}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            <article className="prose prose-lg max-w-none dark:prose-invert">
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  {page.title}
                </h1>
                {page.meta_description && (
                  <p className="text-lg text-muted-foreground">
                    {page.meta_description}
                  </p>
                )}
              </header>
              
              <div 
                className="content"
                dangerouslySetInnerHTML={{ 
                  __html: page.content || '<p>Brak treści.</p>' 
                }}
                style={{
                  lineHeight: '1.6',
                  fontSize: '16px'
                }}
              />
            </article>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Page;