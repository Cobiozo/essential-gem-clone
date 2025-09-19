import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  showShareButton?: boolean;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  showShareButton = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { toast } = useToast();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: `${title} - Pure Life`,
        text: `Sprawdź sekcję: ${title}`,
        url: window.location.href,
      }).catch(() => {
        fallbackShare();
      });
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: "Link skopiowany",
        description: "Link do strony został skopiowany do schowka",
      });
    });
  };

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
      >
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center space-x-2">
          {showShareButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="p-2 h-8 w-8 text-gray-600 hover:text-gray-800"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200">
          {children}
          {showShareButton && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="text-gray-600 border-gray-300"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Udostępnij
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};