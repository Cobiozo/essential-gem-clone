import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Type, Save, RotateCcw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface FontSettings {
  name: string;
  family: string;
  googleFontUrl?: string;
  headingSize: number;
  bodySize: number;
  lineHeight: number;
  fontWeight: string;
}

const googleFonts = [
  { 
    name: 'Inter (Domyślny)', 
    family: 'Inter, system-ui, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Roboto', 
    family: 'Roboto, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
  },
  { 
    name: 'Open Sans', 
    family: 'Open Sans, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Lato', 
    family: 'Lato, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap'
  },
  { 
    name: 'Montserrat', 
    family: 'Montserrat, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Poppins', 
    family: 'Poppins, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Source Sans Pro', 
    family: 'Source Sans Pro, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap'
  },
  { 
    name: 'Nunito', 
    family: 'Nunito, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Work Sans', 
    family: 'Work Sans, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Raleway', 
    family: 'Raleway, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Fira Sans', 
    family: 'Fira Sans, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Ubuntu', 
    family: 'Ubuntu, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap'
  },
  { 
    name: 'Oswald', 
    family: 'Oswald, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Rubik', 
    family: 'Rubik, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'DM Sans', 
    family: 'DM Sans, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap'
  },
  { 
    name: 'Playfair Display (Serif)', 
    family: 'Playfair Display, serif',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Merriweather (Serif)', 
    family: 'Merriweather, serif',
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap'
  },
  { 
    name: 'Crimson Text (Serif)', 
    family: 'Crimson Text, serif',
    url: 'https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&display=swap'
  },
  { 
    name: 'Lora (Serif)', 
    family: 'Lora, serif',
    url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Cormorant Garamond (Serif)', 
    family: 'Cormorant Garamond, serif',
    url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Libre Baskerville (Serif)', 
    family: 'Libre Baskerville, serif',
    url: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap'
  },
  { 
    name: 'Dancing Script (Handwriting)', 
    family: 'Dancing Script, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Caveat (Handwriting)', 
    family: 'Caveat, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Pacifico (Handwriting)', 
    family: 'Pacifico, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap'
  },
  { 
    name: 'Satisfy (Handwriting)', 
    family: 'Satisfy, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Satisfy&display=swap'
  },
  { 
    name: 'Bebas Neue (Display)', 
    family: 'Bebas Neue, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'
  },
  { 
    name: 'Anton (Display)', 
    family: 'Anton, sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Anton&display=swap'
  },
  { 
    name: 'Righteous (Display)', 
    family: 'Righteous, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap'
  },
  { 
    name: 'Bangers (Display)', 
    family: 'Bangers, cursive',
    url: 'https://fonts.googleapis.com/css2?family=Bangers&display=swap'
  },
  { 
    name: 'Fira Code (Monospace)', 
    family: 'Fira Code, monospace',
    url: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'JetBrains Mono (Monospace)', 
    family: 'JetBrains Mono, monospace',
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap'
  },
  { 
    name: 'Source Code Pro (Monospace)', 
    family: 'Source Code Pro, monospace',
    url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@300;400;500;600;700&display=swap'
  }
];

const fontWeights = [
  { value: '300', label: 'Lekka (300)' },
  { value: '400', label: 'Normalna (400)' },
  { value: '500', label: 'Średnia (500)' },
  { value: '600', label: 'Półgruba (600)' },
  { value: '700', label: 'Gruba (700)' }
];

interface FontEditorProps {
  onApplyFont?: (settings: FontSettings) => void;
}

export const FontEditor: React.FC<FontEditorProps> = ({ onApplyFont }) => {
  const [currentFont, setCurrentFont] = useState<FontSettings>({
    name: 'Inter (Domyślny)',
    family: 'Inter, system-ui, sans-serif',
    headingSize: 24,
    bodySize: 16,
    lineHeight: 1.5,
    fontWeight: '400'
  });
  const [selectedGoogleFont, setSelectedGoogleFont] = useState(googleFonts[0]);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadGoogleFont = (font: typeof googleFonts[0]) => {
    // Check if font is already loaded
    const existingLink = document.querySelector(`link[href="${font.url}"]`);
    if (!existingLink && font.url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    }
  };

  const applyFontSettings = (settings: FontSettings) => {
    const root = document.documentElement;
    
    // Apply font family
    root.style.setProperty('font-family', settings.family);
    document.body.style.fontFamily = settings.family;
    
    // Apply font sizes
    root.style.setProperty('--font-size-heading', `${settings.headingSize}px`);
    root.style.setProperty('--font-size-body', `${settings.bodySize}px`);
    root.style.setProperty('--line-height', settings.lineHeight.toString());
    root.style.setProperty('--font-weight-default', settings.fontWeight);

    // Apply to common elements
    const style = document.createElement('style');
    style.innerHTML = `
      body { 
        font-family: ${settings.family} !important; 
        font-size: ${settings.bodySize}px !important;
        line-height: ${settings.lineHeight} !important;
        font-weight: ${settings.fontWeight} !important;
      }
      h1, h2, h3, h4, h5, h6 { 
        font-family: ${settings.family} !important;
        font-size: ${settings.headingSize}px !important;
      }
      .font-heading { font-size: ${settings.headingSize}px !important; }
      .font-body { font-size: ${settings.bodySize}px !important; }
    `;
    
    // Remove existing custom font styles
    const existingStyle = document.querySelector('#custom-font-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.id = 'custom-font-styles';
    document.head.appendChild(style);

    setCurrentFont(settings);
    
    toast({
      title: t('fonts.applied'),
      description: `${t('fonts.activeFont')}: ${settings.name}`,
    });

    onApplyFont?.(settings);
  };

  const selectGoogleFont = (fontName: string) => {
    const font = googleFonts.find(f => f.name === fontName);
    if (font) {
      setSelectedGoogleFont(font);
      loadGoogleFont(font);
      
      const newSettings: FontSettings = {
        ...currentFont,
        name: font.name,
        family: font.family,
        googleFontUrl: font.url
      };
      
      applyFontSettings(newSettings);
    }
  };

  const resetToDefault = () => {
    const defaultSettings: FontSettings = {
      name: 'Inter (Domyślny)',
      family: 'Inter, system-ui, sans-serif',
      headingSize: 24,
      bodySize: 16,
      lineHeight: 1.5,
      fontWeight: '400'
    };
    applyFontSettings(defaultSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Type className="w-5 h-5" />
          <span>{t('fonts.editor')}</span>
        </CardTitle>
        <CardDescription>
          {t('fonts.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Fonts Selection */}
        <div>
          <Label className="text-sm font-medium mb-3 block">{t('fonts.selectGoogleFont')}</Label>
          <Select onValueChange={selectGoogleFont} value={selectedGoogleFont.name}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {googleFonts.map((font) => (
                <SelectItem key={font.name} value={font.name}>
                  <span style={{ fontFamily: font.family }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Preview */}
        <div>
          <Label className="text-sm font-medium mb-3 block">{t('fonts.preview')}</Label>
          <Card className="p-4" style={{ fontFamily: currentFont.family }}>
            <h3 className="text-2xl font-semibold mb-2" style={{ fontSize: `${currentFont.headingSize}px` }}>
              {t('fonts.sampleHeading')}
            </h3>
            <p style={{ 
              fontSize: `${currentFont.bodySize}px`, 
              lineHeight: currentFont.lineHeight,
              fontWeight: currentFont.fontWeight 
            }}>
              {t('fonts.sampleText')}
            </p>
          </Card>
        </div>

        {/* Font Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t('fonts.settings')}</Label>
          
          {/* Heading Size */}
          <div>
            <Label htmlFor="heading-size" className="text-xs mb-2 block">
              {t('fonts.headingSize')}: {currentFont.headingSize}px
            </Label>
            <Slider
              id="heading-size"
              min={16}
              max={48}
              step={1}
              value={[currentFont.headingSize]}
              onValueChange={([value]) => 
                setCurrentFont({...currentFont, headingSize: value})
              }
              className="w-full"
            />
          </div>

          {/* Body Size */}
          <div>
            <Label htmlFor="body-size" className="text-xs mb-2 block">
              {t('fonts.bodySize')}: {currentFont.bodySize}px
            </Label>
            <Slider
              id="body-size"
              min={12}
              max={24}
              step={1}
              value={[currentFont.bodySize]}
              onValueChange={([value]) => 
                setCurrentFont({...currentFont, bodySize: value})
              }
              className="w-full"
            />
          </div>

          {/* Line Height */}
          <div>
            <Label htmlFor="line-height" className="text-xs mb-2 block">
              {t('fonts.lineHeight')}: {currentFont.lineHeight}
            </Label>
            <Slider
              id="line-height"
              min={1.0}
              max={2.0}
              step={0.1}
              value={[currentFont.lineHeight]}
              onValueChange={([value]) => 
                setCurrentFont({...currentFont, lineHeight: value})
              }
              className="w-full"
            />
          </div>

          {/* Font Weight */}
          <div>
            <Label htmlFor="font-weight" className="text-xs mb-2 block">{t('fonts.fontWeight')}</Label>
            <Select 
              value={currentFont.fontWeight} 
              onValueChange={(value) => setCurrentFont({...currentFont, fontWeight: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontWeights.map((weight) => (
                  <SelectItem key={weight.value} value={weight.value}>
                    {weight.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Apply and Reset Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            onClick={() => applyFontSettings(currentFont)}
            className="flex-1 sm:flex-none"
          >
            <Save className="w-4 h-4 mr-2" />
            {t('fonts.apply')}
          </Button>
          <Button 
            variant="outline"
            onClick={resetToDefault}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('fonts.reset')}
          </Button>
        </div>

        {/* Current Font Info */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm space-y-1">
            <div><strong>{t('fonts.activeFont')}:</strong> {currentFont.name}</div>
            <div><strong>{t('fonts.family')}:</strong> <code className="text-xs">{currentFont.family}</code></div>
            <div><strong>{t('fonts.sizes')}:</strong> {t('fonts.headingSize')} {currentFont.headingSize}px, {t('fonts.bodySize')} {currentFont.bodySize}px</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};