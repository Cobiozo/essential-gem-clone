import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/contexts/LanguageContext';

interface StyleTabProps {
  item: any;
  onUpdate: (updates: Partial<any>) => void;
}

export const StyleTab: React.FC<StyleTabProps> = ({ item, onUpdate }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Colors */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm">{t('style.colors')}</h4>
        
        <div className="space-y-2">
          <Label>{t('style.textColor')}</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={item.text_color || '#000000'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={item.text_color || '#000000'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              placeholder="#000000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('style.backgroundColor')}</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={item.background_color || '#ffffff'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={item.background_color || '#ffffff'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm">{t('style.typography')}</h4>
        
        <div className="space-y-2">
          <Label>{t('style.fontSize')}</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[item.font_size || 16]}
              onValueChange={([value]) => onUpdate({ font_size: value })}
              min={8}
              max={72}
              step={1}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{item.font_size || 16}px</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('style.fontWeight')}</Label>
          <Select
            value={String(item.font_weight || 400)}
            onValueChange={(value) => onUpdate({ font_weight: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300">{t('style.fontWeightLight')}</SelectItem>
              <SelectItem value="400">{t('style.fontWeightNormal')}</SelectItem>
              <SelectItem value="500">{t('style.fontWeightMedium')}</SelectItem>
              <SelectItem value="600">{t('style.fontWeightSemibold')}</SelectItem>
              <SelectItem value="700">{t('style.fontWeightBold')}</SelectItem>
              <SelectItem value="800">{t('style.fontWeightExtraBold')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('style.alignment')}</Label>
          <Select
            value={item.text_align || 'left'}
            onValueChange={(value) => {
              onUpdate({ text_align: value });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t('style.alignLeft')}</SelectItem>
              <SelectItem value="center">{t('style.alignCenter')}</SelectItem>
              <SelectItem value="right">{t('style.alignRight')}</SelectItem>
              <SelectItem value="justify">{t('style.alignJustify')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Spacing */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm">{t('style.spacing')}</h4>
        
        <div className="space-y-2">
          <Label>{t('style.padding')}</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[item.padding || 0]}
              onValueChange={([value]) => onUpdate({ padding: value })}
              min={0}
              max={100}
              step={4}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{item.padding || 0}px</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('style.marginTop')}</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[item.margin_top || 0]}
              onValueChange={([value]) => onUpdate({ margin_top: value })}
              min={0}
              max={100}
              step={4}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{item.margin_top || 0}px</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('style.marginBottom')}</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[item.margin_bottom || 0]}
              onValueChange={([value]) => onUpdate({ margin_bottom: value })}
              min={0}
              max={100}
              step={4}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{item.margin_bottom || 0}px</span>
          </div>
        </div>
      </div>

      {/* Border & Effects */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm">{t('style.borderAndEffects')}</h4>
        
        <div className="space-y-2">
          <Label>{t('style.borderRadius')}</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[item.border_radius || 0]}
              onValueChange={([value]) => onUpdate({ border_radius: value })}
              min={0}
              max={50}
              step={2}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{item.border_radius || 0}px</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('style.opacity')}</Label>
          <div className="flex gap-2 items-center">
            <Slider
              value={[item.opacity || 100]}
              onValueChange={([value]) => onUpdate({ opacity: value })}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{item.opacity || 100}%</span>
          </div>
        </div>
      </div>

      {/* Custom CSS Class */}
      <div className="space-y-2">
        <Label>{t('style.customCssClass')}</Label>
        <Input
          value={item.style_class || ''}
          onChange={(e) => onUpdate({ style_class: e.target.value })}
          placeholder="np. custom-class another-class"
        />
        <p className="text-xs text-muted-foreground">
          {t('style.customCssHint')}
        </p>
      </div>
    </div>
  );
};
