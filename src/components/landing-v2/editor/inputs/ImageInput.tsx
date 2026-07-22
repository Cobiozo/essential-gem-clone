import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `homepage-v2/${Date.now()}-${rand}.${ext}`;
  const { error } = await supabase.storage.from('cms-images').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('cms-images').getPublicUrl(path);
  return data.publicUrl;
}

export function ImageInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {value && (
        <img src={value} alt="" className="w-full max-h-40 object-contain rounded border bg-neutral-50" />
      )}
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="URL obrazu"
        className="h-9 text-xs"
      />
      <div className="flex gap-2">
        <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border rounded cursor-pointer hover:bg-muted">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Wgraj plik
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                const url = await uploadImage(f);
                onChange(url);
                toast.success('Wgrano');
              } catch (err: any) {
                toast.error(err.message || 'Błąd uploadu');
              } finally {
                setBusy(false);
                e.target.value = '';
              }
            }}
          />
        </label>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')}>
            Usuń
          </Button>
        )}
      </div>
    </div>
  );
}
