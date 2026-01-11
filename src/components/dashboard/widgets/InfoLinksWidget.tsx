import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InfoLink {
  id: string;
  title: string;
  description: string | null;
  clipboard_content: string | null;
  link_url: string | null;
  is_active: boolean;
}

export const InfoLinksWidget: React.FC = () => {
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [links, setLinks] = useState<InfoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinks = async () => {
      if (!userRole?.role) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('reflinks')
          .select('id, title, description, clipboard_content, link_url, is_active')
          .eq('is_active', true)
          .contains('visible_to_roles', [userRole.role])
          .order('position', { ascending: true });

        if (!error && data) {
          setLinks(data);
        }
      } catch (error) {
        console.error('Error fetching info links:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [userRole]);

  const handleCopy = async (link: InfoLink) => {
    const textToCopy = link.clipboard_content || link.link_url || '';
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(link.id);
      toast({
        title: t('dashboard.copied'),
        description: link.title,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {t('dashboard.infoLinks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          {t('dashboard.infoLinks')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium text-foreground truncate">
                {link.title}
              </p>
              {link.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {link.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleCopy(link)}
              title={t('dashboard.copyLink')}
            >
              {copiedId === link.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
