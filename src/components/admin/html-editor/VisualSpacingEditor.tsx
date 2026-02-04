import React from 'react';
import { DebouncedStyleInput, normalizeStyleValue } from './DebouncedStyleInput';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface VisualSpacingEditorProps {
  styles: Record<string, string>;
  onStyleChange: (key: string, value: string) => void;
}

export const VisualSpacingEditor: React.FC<VisualSpacingEditorProps> = ({
  styles,
  onStyleChange
}) => {
  const handleChange = (key: string) => (value: string) => {
    onStyleChange(key, normalizeStyleValue(key, value));
  };

  return (
    <div className="space-y-4">
      {/* Margin (external spacing) */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary/70"></span>
          Zewnętrzny odstęp (margin)
        </Label>
        <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-3 bg-primary/5">
          {/* Top margin */}
          <div className="flex justify-center mb-2">
            <DebouncedStyleInput
              value={styles.marginTop || ''}
              onFinalChange={handleChange('marginTop')}
              normalizeValue={(v) => normalizeStyleValue('marginTop', v)}
              className="w-16 h-7 text-center text-xs"
              placeholder="0"
            />
          </div>
          
          {/* Left, Center box, Right */}
          <div className="flex items-center justify-between gap-2">
            <DebouncedStyleInput
              value={styles.marginLeft || ''}
              onFinalChange={handleChange('marginLeft')}
              normalizeValue={(v) => normalizeStyleValue('marginLeft', v)}
              className="w-16 h-7 text-center text-xs"
              placeholder="0"
            />
            
            {/* Inner padding box */}
            <div className="flex-1 max-w-[180px]">
              <div className="border-2 border-dashed border-secondary rounded-md p-2 bg-secondary/10">
                <Label className="text-[10px] text-muted-foreground text-center block mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block mr-1"></span>
                  Padding
                </Label>
                
                {/* Top padding */}
                <div className="flex justify-center mb-1">
                  <DebouncedStyleInput
                    value={styles.paddingTop || ''}
                    onFinalChange={handleChange('paddingTop')}
                    normalizeValue={(v) => normalizeStyleValue('paddingTop', v)}
                    className="w-12 h-6 text-center text-[10px]"
                    placeholder="0"
                  />
                </div>
                
                {/* Left, Content, Right padding */}
                <div className="flex items-center justify-between gap-1">
                  <DebouncedStyleInput
                    value={styles.paddingLeft || ''}
                    onFinalChange={handleChange('paddingLeft')}
                    normalizeValue={(v) => normalizeStyleValue('paddingLeft', v)}
                    className="w-12 h-6 text-center text-[10px]"
                    placeholder="0"
                  />
                  <div className="flex-1 bg-background border rounded px-2 py-1 text-[9px] text-center text-muted-foreground">
                    treść
                  </div>
                  <DebouncedStyleInput
                    value={styles.paddingRight || ''}
                    onFinalChange={handleChange('paddingRight')}
                    normalizeValue={(v) => normalizeStyleValue('paddingRight', v)}
                    className="w-12 h-6 text-center text-[10px]"
                    placeholder="0"
                  />
                </div>
                
                {/* Bottom padding */}
                <div className="flex justify-center mt-1">
                  <DebouncedStyleInput
                    value={styles.paddingBottom || ''}
                    onFinalChange={handleChange('paddingBottom')}
                    normalizeValue={(v) => normalizeStyleValue('paddingBottom', v)}
                    className="w-12 h-6 text-center text-[10px]"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            
            <DebouncedStyleInput
              value={styles.marginRight || ''}
              onFinalChange={handleChange('marginRight')}
              normalizeValue={(v) => normalizeStyleValue('marginRight', v)}
              className="w-16 h-7 text-center text-xs"
              placeholder="0"
            />
          </div>
          
          {/* Bottom margin */}
          <div className="flex justify-center mt-2">
            <DebouncedStyleInput
              value={styles.marginBottom || ''}
              onFinalChange={handleChange('marginBottom')}
              normalizeValue={(v) => normalizeStyleValue('marginBottom', v)}
              className="w-16 h-7 text-center text-xs"
              placeholder="0"
            />
          </div>
        </div>
      </div>
      
      {/* Quick margin/padding presets */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Szybkie margin:</Label>
          <div className="flex gap-1">
            {['0', '8px', '16px', '24px'].map((val) => (
              <button
                key={val}
                onClick={() => {
                  onStyleChange('marginTop', val);
                  onStyleChange('marginRight', val);
                  onStyleChange('marginBottom', val);
                  onStyleChange('marginLeft', val);
                }}
                className={cn(
                  "flex-1 px-1.5 py-1 rounded border text-[10px] transition-colors",
                  styles.marginTop === val && styles.marginRight === val && 
                  styles.marginBottom === val && styles.marginLeft === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                {val === '0' ? 'Brak' : val}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Szybkie padding:</Label>
          <div className="flex gap-1">
            {['0', '8px', '16px', '24px'].map((val) => (
              <button
                key={val}
                onClick={() => {
                  onStyleChange('paddingTop', val);
                  onStyleChange('paddingRight', val);
                  onStyleChange('paddingBottom', val);
                  onStyleChange('paddingLeft', val);
                }}
                className={cn(
                  "flex-1 px-1.5 py-1 rounded border text-[10px] transition-colors",
                  styles.paddingTop === val && styles.paddingRight === val && 
                  styles.paddingBottom === val && styles.paddingLeft === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                {val === '0' ? 'Brak' : val}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
