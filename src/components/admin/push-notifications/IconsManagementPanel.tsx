import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Upload, X, Check } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';
import { cn } from '@/lib/utils';

interface PushNotificationConfig {
  id: string;
  vapid_public_key: string | null;
  vapid_private_key: string | null;
  vapid_subject: string;
  is_enabled: boolean;
  keys_generated_at: string | null;
  icon_192_url: string | null;
  icon_512_url: string | null;
  badge_icon_url: string | null;
  default_title: string;
  default_body: string;
  translations: Record<string, { title: string; body: string }>;
  created_at: string;
  updated_at: string;
}

interface IconsManagementPanelProps {
  config: PushNotificationConfig;
  onUpdate: (updates: Partial<PushNotificationConfig>) => void;
}

// Default system icons from public/icons folder
const defaultIcons = [
  { name: 'pwa-192', url: '/pwa-192.png', size: '192x192' },
  { name: 'pwa-512', url: '/pwa-512.png', size: '512x512' },
  { name: 'favicon', url: '/favicon.ico', size: 'Badge' },
];

export const IconsManagementPanel: React.FC<IconsManagementPanelProps> = ({ config, onUpdate }) => {
  const [selectedSystemIcon, setSelectedSystemIcon] = useState<string | null>(null);

  // Check which system icon is currently selected
  useEffect(() => {
    if (config.icon_192_url) {
      const matchingIcon = defaultIcons.find(icon => config.icon_192_url?.includes(icon.url));
      if (matchingIcon) {
        setSelectedSystemIcon(matchingIcon.name);
      }
    }
  }, [config.icon_192_url]);

  const selectSystemIcon = (iconUrl: string, iconName: string) => {
    // Use system icon for 192 size
    onUpdate({
      icon_192_url: iconUrl,
    });
    setSelectedSystemIcon(iconName);
  };

  const handleCustomIconUpload = (field: 'icon_192_url' | 'icon_512_url' | 'badge_icon_url', url: string) => {
    onUpdate({ [field]: url });
    setSelectedSystemIcon(null); // Clear system icon selection when custom is uploaded
  };

  const clearIcon = (field: 'icon_192_url' | 'icon_512_url' | 'badge_icon_url') => {
    onUpdate({ [field]: null });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* System icons */}
      <Card>
        <CardHeader>
          <CardTitle>Ikony systemowe</CardTitle>
          <CardDescription>
            Domyślne ikony dostępne w aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {defaultIcons.map((icon) => (
              <button
                key={icon.name}
                type="button"
                className={cn(
                  "border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedSystemIcon === icon.name && "border-primary bg-primary/5"
                )}
                onClick={() => selectSystemIcon(icon.url, icon.name)}
              >
                <div className="relative">
                  <img
                    src={icon.url}
                    alt={icon.name}
                    className="w-12 h-12 mx-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {selectedSystemIcon === icon.name && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-center mt-2 text-muted-foreground">{icon.size}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Kliknij ikonę, aby użyć jej jako domyślnej ikony powiadomień.
          </p>
        </CardContent>
      </Card>

      {/* Custom icons */}
      <Card>
        <CardHeader>
          <CardTitle>Własne ikony</CardTitle>
          <CardDescription>
            Prześlij własne ikony dla powiadomień push
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 192x192 Icon */}
          <div className="space-y-2">
            <Label>Ikona 192x192 (główna)</Label>
            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {config.icon_192_url ? (
                  <img
                    src={config.icon_192_url}
                    alt="Icon 192"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <MediaUpload
                  onMediaUploaded={(url) => handleCustomIconUpload('icon_192_url', url)}
                  allowedTypes={['image']}
                  compact
                />
                {config.icon_192_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearIcon('icon_192_url')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Usuń
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Wymagana dla powiadomień. Zalecany format: PNG, 192x192 px.
            </p>
          </div>

          {/* 512x512 Icon */}
          <div className="space-y-2">
            <Label>Ikona 512x512 (opcjonalna)</Label>
            <div className="flex gap-3 items-center">
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {config.icon_512_url ? (
                  <img
                    src={config.icon_512_url}
                    alt="Icon 512"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <MediaUpload
                  onMediaUploaded={(url) => handleCustomIconUpload('icon_512_url', url)}
                  allowedTypes={['image']}
                  compact
                />
                {config.icon_512_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearIcon('icon_512_url')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Usuń
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Używana na niektórych urządzeniach dla lepszej jakości.
            </p>
          </div>

          {/* Badge Icon */}
          <div className="space-y-2">
            <Label>Ikona badge (mała)</Label>
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {config.badge_icon_url ? (
                  <img
                    src={config.badge_icon_url}
                    alt="Badge"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <MediaUpload
                  onMediaUploaded={(url) => handleCustomIconUpload('badge_icon_url', url)}
                  allowedTypes={['image']}
                  compact
                />
                {config.badge_icon_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearIcon('badge_icon_url')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Usuń
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mała ikona na pasku powiadomień Android. Powinna być monochromatyczna (biała na przezroczystym tle).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
