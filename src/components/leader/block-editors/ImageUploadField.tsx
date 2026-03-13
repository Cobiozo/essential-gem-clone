import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export const ImageUploadField: React.FC<Props> = ({ label, value, onChange, placeholder }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Błąd', description: 'Dozwolone tylko pliki graficzne.', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Błąd', description: 'Maksymalny rozmiar pliku to 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('landing-images').upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('landing-images').getPublicUrl(path);
      onChange(urlData.publicUrl);
      toast({ title: 'Przesłano', description: 'Obraz został przesłany.' });
    } catch (err: any) {
      toast({ title: 'Błąd uploadu', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value && (
        <div className="relative w-full">
          <img src={value} alt="Podgląd" className="w-full h-32 object-cover rounded-md border" />
          <button
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'URL obrazu lub prześlij plik'}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
};
