import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

// ========== Types ==========

interface CardItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  visible: boolean;
  position: number;
}

interface FormFieldItem {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  required: boolean;
  position: number;
  width: 'half' | 'full';
}

interface BlockData {
  text?: string;
  level?: 'h1' | 'h2' | 'h3';
  alignment?: 'left' | 'center' | 'right';
  cards?: CardItem[];
  icon?: string;
  title?: string;
  content?: string;
  fields?: FormFieldItem[];
  submit_text?: string;
  success_msg?: string;
  error_msg?: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

interface SupportBlock {
  id: string;
  type: 'heading' | 'text' | 'cards_group' | 'info_box' | 'form' | 'button';
  position: number;
  visible: boolean;
  data: BlockData;
}

interface SupportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

export const SupportFormDialog: React.FC<SupportFormDialogProps> = ({ open, onOpenChange }) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<SupportBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('support_settings').select('*').limit(1).maybeSingle();
        if (error) throw error;
        if (data) {
          const rawBlocks = Array.isArray(data.custom_blocks) ? (data.custom_blocks as unknown as SupportBlock[]) : [];
          const visibleBlocks = rawBlocks.filter(b => b.visible).sort((a, b) => a.position - b.position);
          setBlocks(visibleBlocks);

          // Initialize form data from all form blocks
          const initialFormData: Record<string, string> = {};
          visibleBlocks.filter(b => b.type === 'form').forEach(b => {
            (b.data.fields || []).forEach(f => { initialFormData[f.id] = ''; });
          });
          setFormData(initialFormData);
        }
      } catch (error) {
        console.error('Error fetching support settings:', error);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchSettings();
  }, [open]);

  // Auto-fill for logged in users
  useEffect(() => {
    if (!profile || !user || blocks.length === 0) return;
    const allFields = blocks.filter(b => b.type === 'form').flatMap(b => b.data.fields || []);
    const nameField = allFields.find(f => f.id === 'field_name' || f.label.toLowerCase().includes('imię'));
    const emailField = allFields.find(f => f.id === 'field_email' || f.label.toLowerCase().includes('email'));
    setFormData(prev => ({
      ...prev,
      ...(nameField ? { [nameField.id]: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() } : {}),
      ...(emailField ? { [emailField.id]: user.email || '' } : {}),
    }));
  }, [profile, user, blocks]);

  const handleSubmit = async (e: React.FormEvent, formBlock: SupportBlock) => {
    e.preventDefault();
    const fields = formBlock.data.fields || [];

    const missingFields = fields.filter(f => f.required && !formData[f.id]?.trim()).map(f => f.label);
    if (missingFields.length > 0) {
      toast({ title: 'Błąd', description: `Wypełnij wymagane pola: ${missingFields.join(', ')}`, variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const fieldEntries = fields.map(f => ({ label: f.label, value: formData[f.id] || '' })).filter(e => e.value);

      const { data, error } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: formData['field_name'] || fieldEntries[0]?.value || 'Nieznany',
          email: formData['field_email'] || user?.email || '',
          subject: formData['field_subject'] || 'Formularz wsparcia',
          message: fieldEntries.map(e => `${e.label}: ${e.value}`).join('\n'),
          userId: user?.id,
        },
      });

      if (error) throw new Error(error.message || 'Błąd wywołania funkcji');
      if (data && !data.success) throw new Error(data.error || 'Nie udało się wysłać wiadomości');

      toast({ title: 'Sukces', description: formBlock.data.success_msg || 'Wiadomość wysłana!' });
      const resetData: Record<string, string> = {};
      fields.forEach(f => { resetData[f.id] = ''; });
      setFormData(prev => ({ ...prev, ...resetData }));
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending support email:', error);
      toast({ title: 'Błąd', description: error.message || formBlock.data.error_msg || 'Nie udało się wysłać wiadomości', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const renderBlock = (block: SupportBlock) => {
    switch (block.type) {
      case 'heading': {
        const level = block.data.level || 'h2';
        const align = block.data.alignment || 'left';
        const sizeClass = level === 'h1' ? 'text-3xl font-bold' : level === 'h2' ? 'text-2xl font-bold' : 'text-xl font-semibold';
        const Tag = level as keyof JSX.IntrinsicElements;
        return <Tag className={cn(sizeClass, 'text-foreground', align === 'center' && 'text-center', align === 'right' && 'text-right')}>{block.data.text}</Tag>;
      }
      case 'text': {
        const align = block.data.alignment || 'left';
        return <p className={cn('text-muted-foreground whitespace-pre-wrap', align === 'center' && 'text-center', align === 'right' && 'text-right')}>{block.data.text}</p>;
      }
      case 'cards_group': {
        const cards = (block.data.cards || []).filter(c => c.visible).sort((a, b) => a.position - b.position);
        if (cards.length === 0) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map(card => (
              <Card key={card.id} className="bg-card border shadow-sm">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <DynamicIcon name={card.icon} className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{card.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
      case 'info_box':
        return (
          <div className="flex items-start gap-3 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
            <DynamicIcon name={block.data.icon || 'Info'} className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">{block.data.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{block.data.content}</p>
            </div>
          </div>
        );
      case 'form': {
        const fields = (block.data.fields || []).sort((a, b) => a.position - b.position);
        return (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{block.data.title}</h3>
              <form onSubmit={(e) => handleSubmit(e, block)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map(field => (
                    <div key={field.id} className={cn('space-y-2', field.width === 'full' && 'md:col-span-2')}>
                      <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea id={field.id} value={formData[field.id] || ''} onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder} rows={5} required={field.required} />
                      ) : (
                        <Input id={field.id} value={formData[field.id] || ''} onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder} required={field.required} />
                      )}
                    </div>
                  ))}
                </div>
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wysyłanie...</> : <><Send className="mr-2 h-4 w-4" />{block.data.submit_text || 'Wyślij'}</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      }
      case 'button': {
        const variant = block.data.variant || 'default';
        const handleClick = () => { if (block.data.url) window.open(block.data.url, '_blank'); };
        return (
          <div className="flex justify-center">
            <Button variant={variant as any} onClick={handleClick}>
              {block.data.icon && <DynamicIcon name={block.data.icon} className="h-4 w-4 mr-2" />}
              {block.data.text || 'Przycisk'}
            </Button>
          </div>
        );
      }
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Wsparcie</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {blocks.map(block => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}
          {blocks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Brak skonfigurowanych treści wsparcia.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportFormDialog;
