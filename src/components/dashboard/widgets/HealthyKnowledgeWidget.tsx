import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ArrowRight, Play, FileText, Image, Music, Type, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthyKnowledge } from '@/types/healthyKnowledge';

const ContentTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  const icons: Record<string, React.ReactNode> = {
    video: <Play className={className} />,
    audio: <Music className={className} />,
    document: <FileText className={className} />,
    image: <Image className={className} />,
    text: <Type className={className} />,
  };
  return <>{icons[type] || <FileText className={className} />}</>;
};

export const HealthyKnowledgeWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<HealthyKnowledge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFeaturedMaterials();
    }
  }, [user]);

  const fetchFeaturedMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('healthy_knowledge')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('position', { ascending: true })
        .limit(3);

      if (error) throw error;
      setMaterials((data as HealthyKnowledge[]) || []);
    } catch (error) {
      console.error('Error fetching featured materials:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Zdrowa Wiedza</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (materials.length === 0) {
    return null; // Don't show widget if no featured materials
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Zdrowa Wiedza</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/zdrowa-wiedza')}
            className="text-xs"
          >
            Zobacz wszystkie
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <CardDescription>Wyróżnione materiały edukacyjne</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {materials.map((material) => (
          <div 
            key={material.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => navigate('/zdrowa-wiedza')}
          >
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
              material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
              material.content_type === 'document' && "bg-orange-500/10 text-orange-500",
              material.content_type === 'image' && "bg-green-500/10 text-green-500",
              material.content_type === 'text' && "bg-gray-500/10 text-gray-500",
            )}>
              <ContentTypeIcon type={material.content_type} className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{material.title}</p>
              {material.category && (
                <p className="text-xs text-muted-foreground">{material.category}</p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              Nowe
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default HealthyKnowledgeWidget;
