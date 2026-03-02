import React, { useMemo } from 'react';
import type { VideoBlockData } from '@/types/leaderLanding';

interface Props {
  data: VideoBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export const VideoBlock: React.FC<Props> = ({ data, blockId }) => {
  const embedUrl = useMemo(() => getEmbedUrl(data.video_url || ''), [data.video_url]);

  if (!embedUrl) return null;

  return (
    <section id={blockId} className="max-w-4xl mx-auto px-6 py-12">
      {data.title && <h3 className="text-xl font-semibold mb-4 text-center">{data.title}</h3>}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={data.title || 'Video'}
        />
      </div>
    </section>
  );
};
