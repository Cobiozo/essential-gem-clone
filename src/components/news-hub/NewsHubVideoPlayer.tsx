import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function videoMime(url: string): string {
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  if (ext === 'webm') return 'video/webm';
  if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
  if (ext === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

interface NewsHubVideoPlayerProps {
  url: string;
  className?: string;
  poster?: string | null;
  autoPlay?: boolean;
}

export const NewsHubVideoPlayer: React.FC<NewsHubVideoPlayerProps> = ({ url, className, poster, autoPlay }) => {
  const [error, setError] = React.useState(false);
  const yt = !error ? youTubeId(url) : null;
  const vm = !error ? vimeoId(url) : null;

  React.useEffect(() => {
    setError(false);
  }, [url]);

  if (!url) {
    return <div className={cn('aspect-video w-full rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground', className)}>Brak URL wideo</div>;
  }

  if (yt) {
    const src = `https://www.youtube.com/embed/${yt}${autoPlay ? '?autoplay=1' : ''}`;
    return (
      <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe className="h-full w-full" src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  if (vm) {
    const src = `https://player.vimeo.com/video/${vm}${autoPlay ? '?autoplay=1' : ''}`;
    return (
      <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe className="h-full w-full" src={src} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground', className)}>
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="font-medium text-sm">Nie można odtworzyć tego pliku wideo.</span>
        <span>Plik musi być zapisany jako MP4 H.264 + AAC, zgodny z iPhone/Safari.</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">Otwórz plik bezpośrednio</a>
      </div>
    );
  }

  // Gdy mamy poster, nie ma sensu pobierać metadanych z pliku — i tak pokażemy obrazek.
  const preload: 'none' | 'metadata' = poster ? 'none' : 'metadata';

  return (
    <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
      <video
        key={url}
        controls
        preload={preload}
        playsInline
        autoPlay={autoPlay}
        poster={poster || undefined}
        controlsList="nodownload"
        className="h-full w-full object-contain"
        onLoadedMetadata={() => setError(false)}
        onCanPlay={() => setError(false)}
        onError={() => setError(true)}
      >
        <source src={url} type={videoMime(url)} onError={() => setError(true)} />
        Twoja przeglądarka nie wspiera wideo.
      </video>
    </div>
  );
};
