import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, ArrowRight, FileText, Video, Image, Music } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface Resource {
  id: string;
  title: string;
  resource_type: string;
  is_new: boolean;
  is_featured: boolean;
}

export const ResourcesWidget: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const roleFilter = userRole?.role || 'client';
        let query = supabase
          .from('knowledge_resources')
          .select('id, title, resource_type, is_new, is_featured')
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

  return (
    <Card className="shadow-sm">
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
            return (
              <div
                key={resource.id}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate('/knowledge')}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {resource.title}
                  </p>
                </div>
                <div className="flex gap-1">
                  {resource.is_new && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {t('dashboard.new')}
                    </Badge>
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
