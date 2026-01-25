import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, ArrowRight, FileText, Video, Image, Music, Copy, Download, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  title: string;
  resource_type: string;
  is_new: boolean;
  is_featured: boolean;
  allow_copy_link: boolean;
  allow_download: boolean;
  allow_share: boolean;
  allow_click_redirect: boolean;
  click_redirect_url: string | null;
  source_url: string | null;
}

export const ResourcesWidget: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const roleFilter = userRole?.role || 'client';
        let query = supabase
          .from('knowledge_resources')
          .select('id, title, resource_type, is_new, is_featured, allow_copy_link, allow_download, allow_share, allow_click_redirect, click_redirect_url, source_url')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);

        if (roleFilter === 'client') {
          query = query.or('visible_to_clients.eq.true,visible_to_everyone.eq.true');
        } else if (roleFilter === 'partner') {
          query = query.or('visible_to_partners.eq.true,visible_to_everyone.eq.true');
        } else if (roleFilter === 'specjalista') {
          query = query.or('visible_to_specjalista.eq.true,visible_to_everyone.eq.true');
        }

        const { data } = await query;
        setResources((data as any) || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [userRole]);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'image': return Image;
      case 'audio': return Music;
      default: return FileText;
    }
  };

  const getDownloadUrl = (resourceId: string): string => {
    return `https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/download-resource?id=${resourceId}`;
  };

  const handleCopyLink = async (resource: Resource) => {
    if (resource.source_url) {
      await navigator.clipboard.writeText(resource.source_url);
      toast({
        title: t('dashboard.copied'),
        description: resource.title,
      });
    }
  };

  const handleClickRedirect = (resource: Resource) => {
    if (resource.click_redirect_url) {
      if (resource.click_redirect_url.startsWith('/')) {
        navigate(resource.click_redirect_url);
      } else {
        window.open(resource.click_redirect_url, '_blank');
      }
    }
  };

  const hasAnyAction = (resource: Resource) => {
    return resource.allow_copy_link || resource.allow_download || resource.allow_click_redirect;
  };

  return (
    <Card className="shadow-sm" data-tour="resources-widget">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          {t('dashboard.latestResources')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge')} className="text-xs">
          {t('dashboard.viewAll')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse h-10 bg-muted rounded" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('dashboard.noResourcesAvailable')}
          </p>
        ) : (
          resources.map((resource) => {
            const Icon = getResourceIcon(resource.resource_type);
            const showActions = hasAnyAction(resource);
            
            return (
              <div
                key={resource.id}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div 
                  className="p-2 rounded-lg bg-primary/10 cursor-pointer"
                  onClick={() => navigate(`/knowledge?highlight=${resource.id}`)}
                >
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/knowledge?highlight=${resource.id}`)}
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {resource.title}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!showActions ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{t('dashboard.comingSoon')}</span>
                    </div>
                  ) : (
                    <>
                      {resource.allow_copy_link && resource.source_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(resource);
                          }}
                          title={t('dashboard.copyLink')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {resource.allow_download && resource.source_url && (
                        <a
                          href={getDownloadUrl(resource.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground"
                          title={t('dashboard.download')}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {resource.allow_click_redirect && resource.click_redirect_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickRedirect(resource);
                          }}
                          title={t('dashboard.goTo')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default ResourcesWidget;
