import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
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

type Problem =
  | { kind: 'missing' }          // 404 / plik nie istnieje
  | { kind: 'offline' }          // brak sieci
  | { kind: 'network' }          // błąd/timeout pobierania
  | { kind: 'codec' }            // format nieobsługiwany przez przeglądarkę
  | { kind: 'server'; status: number };

const PROBLEM_TEXT: Record<string, { title: string; detail: string }> = {
  missing: {
    title: 'Film jest niedostępny pod tym adresem.',
    detail: 'Plik nie został odnaleziony na serwerze. Zgłoś to administratorowi.',
  },
  offline: {
    title: 'Brak połączenia z internetem.',
    detail: 'Sprawdź połączenie i spróbuj ponownie.',
  },
  network: {
    title: 'Nie udało się pobrać filmu.',
    detail: 'Połączenie zostało przerwane lub trwa zbyt długo.',
  },
  codec: {
    title: 'Ta przeglądarka nie odtworzy tego pliku.',
    detail: 'Wymagany format: MP4 / H.264 / AAC. Materiał wymaga ponownego wgrania przez administratora.',
  },
  server: {
    title: 'Serwer plików zwrócił błąd.',
    detail: 'Spróbuj ponownie za chwilę.',
  },
};

/** Sprawdza realny stan pliku, żeby nie mylić błędu sieci z błędem kodeka. */
async function diagnose(src: string): Promise<Problem> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { kind: 'offline' };
  try {
    const res = await fetch(src, { headers: { Range: 'bytes=0-1' }, cache: 'no-store' });
    if (res.status === 404 || res.status === 410) return { kind: 'missing' };
    if (res.status >= 500) return { kind: 'server', status: res.status };
    if (!res.ok && res.status !== 206) return { kind: 'server', status: res.status };
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.startsWith('text/html')) return { kind: 'missing' };
    return { kind: 'codec' };
  } catch {
    return { kind: 'network' };
  }
}

export const NewsHubVideoPlayer: React.FC<NewsHubVideoPlayerProps> = ({ url, className, poster, autoPlay }) => {
  const src = resolveMediaUrl(url);
  const posterSrc = resolveMediaUrl(poster) || undefined;
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const stallTimer = React.useRef<number | null>(null);
  const yt = youTubeId(src);
  const vm = vimeoId(src);

  React.useEffect(() => {
    setProblem(null);
    setBusy(false);
    setAttempt(0);
  }, [src]);

  const clearStall = React.useCallback(() => {
    if (stallTimer.current) {
      window.clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
  }, []);

  React.useEffect(() => clearStall, [clearStall]);

  const armStall = React.useCallback(() => {
    clearStall();
    setBusy(true);
    // Po 20 s bez danych ustalamy prawdziwą przyczynę zamiast pokazywać wieczne „Ładowanie…”.
    stallTimer.current = window.setTimeout(async () => {
      const p = await diagnose(src);
      setBusy(false);
      setProblem(p);
    }, 20000);
  }, [clearStall, src]);

  const settle = React.useCallback(() => {
    clearStall();
    setBusy(false);
    setProblem(null);
  }, [clearStall]);

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

  if (problem) {
    const t = PROBLEM_TEXT[problem.kind];
    return (
      <div className={cn('aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground', className)}>
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="font-medium text-sm text-foreground">{t.title}</span>
        <span>{t.detail}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setProblem(null); setAttempt((a) => a + 1); }}
            className="text-primary underline"
          >
            Spróbuj ponownie
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">Otwórz plik bezpośrednio</a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black relative', className)}>
      <video
        key={`${src}#${attempt}`}
        src={src}
        controls
        // Nigdy „auto” — przeglądarka pobiera tylko nagłówek i kolejne zakresy w miarę odtwarzania.
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        poster={posterSrc}
        className="h-full w-full object-contain"
        onLoadStart={armStall}
        onWaiting={armStall}
        onStalled={armStall}
        onLoadedMetadata={settle}
        onCanPlay={settle}
        onPlaying={settle}
        onError={(e) => {
          clearStall();
          setBusy(false);
          const media = e.currentTarget as HTMLVideoElement;
          const code = media.error?.code ?? 0;
          // MEDIA_ERR_ABORTED (1) to zwykle przerwane ładowanie przy odmontowaniu — nie jest błędem pliku.
          if (code === 1) return;
          console.warn('[NewsHubVideoPlayer] błąd odtwarzania', { code, src, type: videoMime(src) });
          if (code === 2) {
            setProblem({ kind: 'network' });
            return;
          }
          // 3 (dekodowanie) / 4 (nieobsługiwane źródło) mogą też oznaczać 404 lub DNS — sprawdzamy realnie.
          void diagnose(src).then(setProblem);
        }}
      >
        Twoja przeglądarka nie wspiera wideo.
      </video>
      {busy && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            Buforowanie…
          </span>
        </div>
      )}
    </div>
  );
};
