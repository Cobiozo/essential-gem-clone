import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VideoBlockData } from '@/types/leaderLanding';

interface Props {
  data: VideoBlockData;
  onChange: (data: VideoBlockData) => void;
}

export const VideoBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<VideoBlockData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Wideo</h4>
      <div><Label>URL wideo (YouTube / Vimeo)</Label><Input value={data.video_url || ''} onChange={e => update({ video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
      <div><Label>Tytuł</Label><Input value={data.title || ''} onChange={e => update({ title: e.target.value })} /></div>
    </div>
  );
};
