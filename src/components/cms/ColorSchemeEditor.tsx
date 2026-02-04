import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Palette, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

const presetSchemes: ColorScheme[] = [
  {
    name: 'Pure Life Center (Domyślna)',
    primary: '145 50% 25%',
    secondary: '33 15% 90%',
    accent: '45 100% 55%',
    background: '33 22% 95%',
    foreground: '0 0% 20%'
  },
  {
    name: 'Ocean Blue',
    primary: '210 100% 50%',
    secondary: '210 25% 90%',
    accent: '45 100% 60%',
    background: '210 40% 98%',
    foreground: '210 22% 22%'
  },
  {
    name: 'Forest Green',
    primary: '120 60% 30%',
    secondary: '120 20% 90%',
    accent: '60 100% 50%',
    background: '120 30% 96%',
    foreground: '120 15% 15%'
  },
  {
    name: 'Sunset Orange',
    primary: '25 85% 55%',
    secondary: '25 30% 90%',
    accent: '45 100% 65%',
    background: '25 40% 96%',
    foreground: '25 20% 20%'
  },
  {
    name: 'Deep Purple',
    primary: '280 70% 45%',
    secondary: '280 20% 90%',
    accent: '320 100% 65%',
    background: '280 25% 97%',
    foreground: '280 15% 15%'
  },
  {
    name: 'Rose Gold',
    primary: '340 50% 50%',
    secondary: '340 15% 90%',
    accent: '30 100% 70%',
    background: '340 20% 96%',
    foreground: '340 20% 20%'
  },
  {
    name: 'Midnight Dark',
    primary: '220 100% 65%',
    secondary: '220 15% 25%',
    accent: '45 100% 60%',
    background: '220 20% 8%',
    foreground: '220 10% 85%'
  },
  {
    name: 'Corporate Blue',
    primary: '215 85% 40%',
    secondary: '215 20% 88%',
    accent: '195 100% 55%',
    background: '215 25% 95%',
    foreground: '215 25% 15%'
  },
  {
    name: 'Warm Earth',
    primary: '30 70% 40%',
    secondary: '30 20% 88%',
    accent: '60 80% 55%',
    background: '30 25% 95%',
    foreground: '30 25% 15%'
  },
  {
    name: 'Cool Mint',
    primary: '160 60% 40%',
    secondary: '160 20% 90%',
    accent: '180 100% 60%',
    background: '160 30% 96%',
    foreground: '160 20% 15%'
  },
  {
    name: 'Vibrant Pink',
    primary: '315 80% 50%',
    secondary: '315 25% 90%',
    accent: '45 100% 65%',
    background: '315 30% 96%',
    foreground: '315 20% 20%'
  },
  {
    name: 'Slate Gray',
    primary: '210 15% 35%',
    secondary: '210 10% 85%',
    accent: '195 80% 60%',
    background: '210 15% 95%',
    foreground: '210 20% 15%'
  },
  {
    name: 'Crimson Red',
    primary: '350 80% 45%',
    secondary: '350 20% 90%',
    accent: '25 100% 65%',
    background: '350 25% 96%',
    foreground: '350 25% 15%'
  },
  {
    name: 'Electric Cyan',
    primary: '190 100% 45%',
    secondary: '190 25% 90%',
    accent: '45 100% 60%',
    background: '190 30% 96%',
    foreground: '190 25% 15%'
  },
  {
    name: 'Charcoal Dark',
    primary: '200 80% 60%',
    secondary: '200 10% 30%',
    accent: '60 100% 65%',
    background: '200 15% 10%',
    foreground: '200 5% 80%'
  }
];

interface ColorSchemeEditorProps {
  onApplyScheme?: (scheme: ColorScheme) => void;
}

export const ColorSchemeEditor: React.FC<ColorSchemeEditorProps> = ({ onApplyScheme }) => {
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme>(presetSchemes[0]);
  const [customColors, setCustomColors] = useState<ColorScheme>({
    name: 'Niestandardowa',
    primary: '145 50% 25%',
    secondary: '33 15% 90%',
    accent: '45 100% 55%',
    background: '33 22% 95%',
    foreground: '0 0% 20%'
  });
  const { toast } = useToast();
  const { t } = useLanguage();

  const applyColorScheme = (scheme: ColorScheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', scheme.primary);
    root.style.setProperty('--secondary', scheme.secondary);
    root.style.setProperty('--accent', scheme.accent);
    root.style.setProperty('--background', scheme.background);
    root.style.setProperty('--foreground', scheme.foreground);
    
    // Also update card colors to match
    root.style.setProperty('--card', scheme.background);
    root.style.setProperty('--card-foreground', scheme.foreground);
    root.style.setProperty('--popover', scheme.background);
    root.style.setProperty('--popover-foreground', scheme.foreground);

    toast({
      title: t('colors.applied'),
      description: `${t('colors.active')}: ${scheme.name}`,
    });

    onApplyScheme?.(scheme);
  };

  const resetToDefault = () => {
    applyColorScheme(presetSchemes[0]);
    setSelectedScheme(presetSchemes[0]);
  };

  const hslToHex = (hsl: string) => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
    const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const ColorPreview = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center space-x-2">
      <div 
        className="w-8 h-8 rounded border-2 border-border" 
        style={{ backgroundColor: `hsl(${color})` }}
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground font-mono">{color}</div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="w-5 h-5" />
          <span>{t('colors.colorSchemeEditor')}</span>
        </CardTitle>
        <CardDescription>
          {t('colors.manageColors')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Schemes */}
        <div>
          <Label className="text-sm font-medium mb-3 block">{t('colors.presetSchemes')}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {presetSchemes.map((scheme) => (
              <Card key={scheme.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4" onClick={() => {
                  setSelectedScheme(scheme);
                  applyColorScheme(scheme);
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{scheme.name}</span>
                    {selectedScheme.name === scheme.name && (
                      <Badge variant="default" className="text-xs">{t('colors.active')}</Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${scheme.primary})` }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${scheme.secondary})` }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${scheme.accent})` }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${scheme.background})` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Current Color Preview */}
        <div>
          <Label className="text-sm font-medium mb-3 block">{t('colors.currentPreview')}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorPreview color={selectedScheme.primary} label={t('colors.primary')} />
            <ColorPreview color={selectedScheme.secondary} label={t('colors.secondary')} />
            <ColorPreview color={selectedScheme.accent} label={t('colors.accent')} />
            <ColorPreview color={selectedScheme.background} label={t('colors.background')} />
          </div>
        </div>

        {/* Custom Color Editor */}
        <div>
          <Label className="text-sm font-medium mb-3 block">{t('colors.customScheme')}</Label>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-primary" className="text-xs">{t('colors.primaryHSL')}</Label>
                <Input
                  id="custom-primary"
                  value={customColors.primary}
                  onChange={(e) => setCustomColors({...customColors, primary: e.target.value})}
                  placeholder="145 50% 25%"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="custom-secondary" className="text-xs">{t('colors.secondaryHSL')}</Label>
                <Input
                  id="custom-secondary"
                  value={customColors.secondary}
                  onChange={(e) => setCustomColors({...customColors, secondary: e.target.value})}
                  placeholder="33 15% 90%"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="custom-accent" className="text-xs">{t('colors.accentHSL')}</Label>
                <Input
                  id="custom-accent"
                  value={customColors.accent}
                  onChange={(e) => setCustomColors({...customColors, accent: e.target.value})}
                  placeholder="45 100% 55%"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="custom-background" className="text-xs">{t('colors.backgroundHSL')}</Label>
                <Input
                  id="custom-background"
                  value={customColors.background}
                  onChange={(e) => setCustomColors({...customColors, background: e.target.value})}
                  placeholder="33 22% 95%"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button 
              onClick={() => applyColorScheme(customColors)}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {t('colors.applyCustom')}
            </Button>
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline"
            onClick={resetToDefault}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('colors.resetDefault')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};