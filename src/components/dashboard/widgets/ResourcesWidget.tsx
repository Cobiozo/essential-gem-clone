import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, FileText, ArrowRight, Download } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  created_at: string;
}

export const ResourcesWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      if (!user) return;

      try {
        const currentRole = userRole?.role || 'client';
        
        let query = supabase
          .from('knowledge_resources')
          .select('id, title, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4);

        if (currentRole === 'client') {
          query = query.eq('visible_to_clients', true);
        } else if (currentRole === 'partner') {
          query = query.eq('visible_to_partners', true);
        } else if (currentRole === 'specjalista') {
          query = query.eq('visible_to_specjalista', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        setResources((data || []) as Resource[]);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [user, userRole]);

  if (loading) {
    return (
      <Card className="dashboard-widget h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Zasoby wiedzy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-widget h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Zasoby wiedzy
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/centrum-wiedzy')}
          className="text-primary hover:text-primary/80"
        >
          Wszystkie
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Brak zasobów</p>
          </div>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => navigate('/centrum-wiedzy')}
            >
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{resource.title}</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
