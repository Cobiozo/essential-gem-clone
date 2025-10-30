import React, { useState, useEffect, useRef } from 'react';
import { CMSItem } from '@/types/cms';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2, Save, X, Copy, Check } from 'lucide-react';

interface PpomEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const PpomEditor: React.FC<PpomEditorProps> = ({
  item,
  onSave,
  onCancel
}) => {
  const [productId, setProductId] = useState(item.title || '');
  const [shortcode, setShortcode] = useState(item.description || '');
  const [customClass, setCustomClass] = useState(item.url || '');
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<CMSItem>(item);

  useEffect(() => {
    if (debouncedItem && debouncedItem !== prevItemRef.current) {
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItem;
      
      setTimeout(() => {
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 500);
    }
  }, [debouncedItem, onSave]);

  // Auto-generate shortcode when product ID changes
  useEffect(() => {
    if (productId) {
      const generated = `[ppom_wrapper product_id="${productId}"]`;
      setShortcode(generated);
    }
  }, [productId]);

  const updateItem = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => ({ ...prev, ...updates }));
  };

  const handleProductIdChange = (value: string) => {
    setProductId(value);
    updateItem({ title: value });
  };

  const handleShortcodeChange = (value: string) => {
    setShortcode(value);
    updateItem({ description: value });
  };

  const handleCustomClassChange = (value: string) => {
    setCustomClass(value);
    updateItem({ url: value });
  };

  const handleCopyShortcode = () => {
    navigator.clipboard.writeText(shortcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNow = () => {
    onSave(editedItem);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">PPOM Shortcode</h3>
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Zapisywanie...
              </div>
            )}
            {justSaved && (
              <div className="text-sm text-green-600">
                ✓ Zapisano
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSaveNow}>
              <Save className="w-4 h-4 mr-2" />
              Zapisz
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-id">ID Produktu</Label>
            <Input
              id="product-id"
              value={productId}
              onChange={(e) => handleProductIdChange(e.target.value)}
              placeholder="123"
              type="text"
            />
            <p className="text-xs text-muted-foreground">
              ID produktu WooCommerce z opcjami PPOM
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortcode">Shortcode</Label>
            <div className="relative">
              <Textarea
                id="shortcode"
                value={shortcode}
                onChange={(e) => handleShortcodeChange(e.target.value)}
                placeholder='[ppom_wrapper product_id="123"]'
                rows={3}
                className="pr-10"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyShortcode}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Shortcode jest generowany automatycznie z ID produktu
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-class">Klasa CSS (opcjonalnie)</Label>
            <Input
              id="custom-class"
              value={customClass}
              onChange={(e) => handleCustomClassChange(e.target.value)}
              placeholder="custom-ppom-style"
            />
            <p className="text-xs text-muted-foreground">
              Dodatkowa klasa CSS dla stylizacji
            </p>
          </div>

          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <h4 className="font-semibold text-sm">Informacje o PPOM</h4>
            <p className="text-xs text-muted-foreground">
              PPOM (Product Price & Options Manager) to wtyczka WooCommerce pozwalająca na dodawanie niestandardowych pól i opcji do produktów.
            </p>
            <p className="text-xs text-muted-foreground">
              Shortcode zostanie wyrenderowany na stronie, wyświetlając formularz opcji produktu.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};