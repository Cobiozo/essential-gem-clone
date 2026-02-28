import React from 'react';
import { Ban, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { BackgroundMode } from './VideoBackgroundProcessor';

interface BackgroundSelectorProps {
  currentMode: BackgroundMode;
  selectedImage: string | null;
  backgroundImages: string[];
  isLoading: boolean;
  isSupported: boolean;
  onSelect: (mode: BackgroundMode, imageSrc?: string) => void;
  trigger: React.ReactNode;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  currentMode,
  selectedImage,
  backgroundImages,
  isLoading,
  isSupported,
  onSelect,
  trigger,
}) => {
  if (!isSupported) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="bg-zinc-800 border-zinc-700 min-w-[200px]">
        <DropdownMenuLabel className="text-zinc-400 text-xs">Tło</DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => onSelect('none')}
          className={`flex items-center gap-2 cursor-pointer ${currentMode === 'none' ? 'text-blue-400 bg-zinc-700/50' : 'text-zinc-200'}`}
        >
          <Ban className="h-4 w-4" />
          Brak efektu
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onSelect('blur-light')}
          className={`flex items-center gap-2 cursor-pointer ${currentMode === 'blur-light' ? 'text-blue-400 bg-zinc-700/50' : 'text-zinc-200'}`}
        >
          <Sparkles className="h-4 w-4" />
          Lekkie rozmycie
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onSelect('blur-heavy')}
          className={`flex items-center gap-2 cursor-pointer ${currentMode === 'blur-heavy' ? 'text-blue-400 bg-zinc-700/50' : 'text-zinc-200'}`}
        >
          <Sparkles className="h-4 w-4" />
          Mocne rozmycie
        </DropdownMenuItem>

        {backgroundImages.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuLabel className="text-zinc-400 text-xs">Wirtualne tło</DropdownMenuLabel>
            {backgroundImages.map((src, i) => (
              <DropdownMenuItem
                key={src}
                onClick={() => onSelect('image', src)}
                className={`flex items-center gap-2 cursor-pointer ${
                  currentMode === 'image' && selectedImage === src ? 'text-blue-400 bg-zinc-700/50' : 'text-zinc-200'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                Tło {i + 1}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {isLoading && (
          <div className="px-2 py-1.5 text-xs text-zinc-500 flex items-center gap-2">
            <div className="h-3 w-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            Ładowanie modelu...
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
