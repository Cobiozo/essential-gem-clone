import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, Sparkles, RefreshCw } from 'lucide-react';
import { KnowledgeResource } from '@/types/knowledge';

interface GraphicsCardProps {
  resource: KnowledgeResource;
  onClick: () => void;
}

export const GraphicsCard: React.FC<GraphicsCardProps> = ({ resource, onClick }) => {
  const isNew = new Date(resource.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return (
    <Card 
      className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="aspect-square relative bg-muted overflow-hidden">
          {resource.source_url ? (
            <img
              src={resource.source_url}
              alt={resource.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-sm font-medium line-clamp-2">
                {resource.title}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isNew && (
              <Badge className="bg-blue-500 text-white text-[10px] gap-1">
                <Sparkles className="h-3 w-3" />
                Nowa
              </Badge>
            )}
            {resource.is_updated && (
              <Badge className="bg-purple-500 text-white text-[10px] gap-1">
                <RefreshCw className="h-3 w-3" />
                Aktualizacja
              </Badge>
            )}
          </div>
        </div>

        {/* Title (visible on mobile / when not hovering) */}
        <div className="p-3 sm:hidden">
          <p className="text-sm font-medium line-clamp-1">{resource.title}</p>
          {resource.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {resource.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GraphicsCard;
