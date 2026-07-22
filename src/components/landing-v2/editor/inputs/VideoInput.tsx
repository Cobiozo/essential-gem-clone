import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function uploadVideo(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `homepage-v2/videos/${Date.now()}-${rand}.${ext}`;
  const { error } = await supabase.storage.from('cms-images').upload(path, file, {
    upsert: false,
    contentType: file.type || 'video/mp4',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('cms-images').getPublicUrl(path);
  return data.publicUrl;
}

export function VideoInput({
  label,
  value,
  onChange,
  placeholder = 'URL wideo (MP4 lub YouTube)',
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {value && /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(value) && (
        <video src={value} controls className="w-full max-h-40 rounded border bg-black" />
      )}
      {value && /youtu\.?be|vimeo\.com/i.test(value) && (
        <div className="text-[11px] text-muted-foreground truncate">{value}</div>
      )}
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-xs"
      />
      <div className="flex gap-2">
        <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border rounded cursor-pointer hover:bg-muted">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Wgraj plik wideo
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 100 * 1024 * 1024) {
                toast.error('Maksymalny rozmiar wideo to 100 MB — użyj kompresji lub linka YouTube.');
                e.target.value = '';
                return;
              }
              setBusy(true);
              try {
                const url = await uploadVideo(f);
                onChange(url);
                toast.success('Wgrano wideo');
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
