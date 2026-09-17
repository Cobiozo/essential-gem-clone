import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { videoMime } from '@/lib/videoMime';
import { resolveMediaUrl } from '@/lib/mediaUrl';

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

interface NewsHubVideoPlayerProps {
  url: string;
  className?: string;
  poster?: string | null;
  autoPlay?: boolean;
}

export const NewsHubVideoPlayer: React.FC<NewsHubVideoPlayerProps> = ({ url, className, poster, autoPlay }) => {
  const src = resolveMediaUrl(url);
  const posterSrc = resolveMediaUrl(poster) || undefined;
  const [error, setError] = React.useState<number | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const yt = youTubeId(src);
  const vm = vimeoId(src);

  React.useEffect(() => {
    setError(null);
    setAttempt(0);
  }, [src]);

  if (!url) {
    return <div className={cn('aspect-video w-full rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground', className)}>Brak URL wideo</div>;
  }

  if (yt) {
    const embed = `https://www.youtube.com/embed/${yt}${autoPlay ? '?autoplay=1' : ''}`;
    return (
      <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe className="h-full w-full" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  if (vm) {
    const embed = `https://player.vimeo.com/video/${vm}${autoPlay ? '?autoplay=1' : ''}`;
    return (
      <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe className="h-full w-full" src={embed} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={cn('aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground', className)}>
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="font-medium text-sm">Nie można odtworzyć tego pliku wideo.</span>
        <span>
          {error === 2
            ? 'Problem z połączeniem podczas pobierania pliku.'
            : error === 4
              ? 'Plik musi być zapisany jako MP4 H.264 + AAC, zgodny z iPhone/Safari.'
              : 'Plik jest niedostępny pod tym adresem.'}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setError(null); setAttempt((a) => a + 1); }}
            className="text-primary underline"
          >
            Spróbuj ponownie
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">Otwórz plik bezpośrednio</a>
        </div>
      </div>
    );
  }

  // Bez autoodtwarzania i z plakatem nie ma sensu pobierać metadanych — i tak pokażemy obrazek.
  const preload: 'none' | 'metadata' = !autoPlay && posterSrc ? 'none' : 'metadata';

  return (
    <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
      <video
        key={`${src}#${attempt}`}
        src={src}
        controls
        preload={preload}
        playsInline
        // eslint-disable-next-line jsx-a11y/media-has-caption
        autoPlay={autoPlay}
        poster={posterSrc}
        className="h-full w-full object-contain"
        onLoadedMetadata={() => setError(null)}
        onCanPlay={() => setError(null)}
        onError={(e) => {
          const media = e.currentTarget as HTMLVideoElement;
          const code = media.error?.code ?? 0;
          // MEDIA_ERR_ABORTED (1) to zwykle przerwane ładowanie przy odmontowaniu — nie jest błędem pliku.
          if (code === 1) return;
          console.warn('[NewsHubVideoPlayer] błąd odtwarzania', { code, src, type: videoMime(src) });
          setError(code || 4);
        }}
      >
        Twoja przeglądarka nie wspiera wideo.
      </video>
    </div>
  );
};
