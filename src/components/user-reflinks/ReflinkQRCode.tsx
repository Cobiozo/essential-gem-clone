import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getRoleLabel } from './types';

interface ReflinkQRCodeProps {
  reflinkCode: string;
  targetRole: string;
}

export const ReflinkQRCode: React.FC<ReflinkQRCodeProps> = ({ reflinkCode, targetRole }) => {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;

  const handleDownload = async () => {
    try {
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) return;

      // Create canvas
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(svgUrl);

        // Download
        const link = document.createElement('a');
        link.download = `reflink-qr-${reflinkCode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast({
          title: 'Pobrano!',
          description: 'Kod QR został pobrany jako PNG',
        });
      };
      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading QR:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać kodu QR',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Pokaż kod QR">
          <QrCode className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kod QR - {getRoleLabel(targetRole)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={fullUrl}
              size={256}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-sm text-muted-foreground text-center break-all max-w-full px-2">
            {fullUrl}
          </p>
          <Button onClick={handleDownload} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Pobierz PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
