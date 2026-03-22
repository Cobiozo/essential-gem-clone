import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PdfThumbnailProps {
  url: string;
}

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);

        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fit to container (aspect-square ~200px)
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(200 / viewport.width, 200 / viewport.height);
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
        if (!cancelled) setStatus('done');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    render();
    return () => { cancelled = true; };
  }, [url]);

  if (status === 'error') {
    return <FileText className="w-10 h-10 text-muted-foreground" />;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {status === 'loading' && (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground absolute" />
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: status === 'done' ? 'block' : 'none' }}
      />
    </div>
  );
};

export default PdfThumbnail;
