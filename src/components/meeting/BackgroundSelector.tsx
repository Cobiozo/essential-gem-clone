import React, { useRef } from 'react';
import { Ban, Sparkles, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
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
  // Custom backgrounds
  customImages?: string[];
  maxCustom?: number;
  isUploading?: boolean;
  onUpload?: (file: File) => void;
  onDelete?: (url: string) => void;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  currentMode,
  selectedImage,
  backgroundImages,
  isLoading,
  isSupported,
  onSelect,
  trigger,
  customImages = [],
  maxCustom = 3,
  isUploading = false,
  onUpload,
  onDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isSupported) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="bg-zinc-800 border-zinc-700 min-w-[220px] max-h-[400px] overflow-y-auto">
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
                <div className="w-8 h-5 rounded overflow-hidden bg-zinc-600 flex-shrink-0">
                  <img src={src} alt={`Tło ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                Tło {i + 1}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Custom user backgrounds */}
        {onUpload && (
          <>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuLabel className="text-zinc-400 text-xs">
              Twoje tła ({customImages.length}/{maxCustom})
            </DropdownMenuLabel>
            {customImages.map((src, i) => (
              <DropdownMenuItem
                key={src}
                className={`flex items-center gap-2 cursor-pointer ${
                  currentMode === 'image' && selectedImage === src ? 'text-blue-400 bg-zinc-700/50' : 'text-zinc-200'
                }`}
                onClick={() => onSelect('image', src)}
              >
                <div className="w-8 h-5 rounded overflow-hidden bg-zinc-600 flex-shrink-0">
                  <img src={src} alt={`Własne tło ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                <span className="flex-1 truncate">Własne {i + 1}</span>
                {onDelete && (
                  <button
                    type="button"
                    className="ml-1 p-0.5 hover:text-red-400 text-zinc-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(src);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </DropdownMenuItem>
            ))}
            {customImages.length < maxCustom && (
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 cursor-pointer text-zinc-300"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Przesyłanie...' : 'Dodaj tło'}
              </DropdownMenuItem>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        {(isLoading || isUploading) && (
          <div className="px-2 py-1.5 text-xs text-zinc-500 flex items-center gap-2">
            <div className="h-3 w-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            {isUploading ? 'Przesyłanie...' : 'Ładowanie modelu...'}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
