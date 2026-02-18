import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, MessageCircle, Mic, Video, Monitor } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface MeetingSettings {
  allowChat: boolean;
  allowMicrophone: boolean;
  allowCamera: boolean;
  allowScreenShare: 'host_only' | 'all';
}

interface MeetingSettingsDialogProps {
  settings: MeetingSettings;
  onSettingsChange: (settings: MeetingSettings) => void;
  trigger?: React.ReactNode;
}

export const MeetingSettingsDialog: React.FC<MeetingSettingsDialogProps> = ({
  settings,
  onSettingsChange,
  trigger,
}) => {
  const [local, setLocal] = useState<MeetingSettings>(settings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) setLocal(settings);
  }, [open, settings]);

  const handleSave = () => {
    onSettingsChange(local);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex flex-col items-center gap-1 min-w-[48px]">
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-colors bg-zinc-700 hover:bg-zinc-600">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">Ustawienia</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Ustawienia spotkania</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-zinc-400" />
              <Label className="text-white">Czat dla uczestników</Label>
            </div>
            <Switch
              checked={local.allowChat}
              onCheckedChange={(v) => setLocal(s => ({ ...s, allowChat: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-zinc-400" />
              <Label className="text-white">Mikrofon uczestników</Label>
            </div>
            <Switch
              checked={local.allowMicrophone}
              onCheckedChange={(v) => setLocal(s => ({ ...s, allowMicrophone: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-zinc-400" />
              <Label className="text-white">Kamera uczestników</Label>
            </div>
            <Switch
              checked={local.allowCamera}
              onCheckedChange={(v) => setLocal(s => ({ ...s, allowCamera: v }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-zinc-400" />
              <Label className="text-white">Udostępnianie ekranu</Label>
            </div>
            <RadioGroup
              value={local.allowScreenShare}
              onValueChange={(v) => setLocal(s => ({ ...s, allowScreenShare: v as 'host_only' | 'all' }))}
              className="pl-6 space-y-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="host_only" id="ss-host" className="border-zinc-500" />
                <Label htmlFor="ss-host" className="text-zinc-300 text-sm">Tylko prowadzący</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="ss-all" className="border-zinc-500" />
                <Label htmlFor="ss-all" className="text-zinc-300 text-sm">Wszyscy uczestnicy</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-2">
          Zastosuj zmiany
        </Button>
      </DialogContent>
    </Dialog>
  );
};
