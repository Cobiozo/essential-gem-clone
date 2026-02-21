import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'line' | 'shape';
  content?: string;
  imageUrl?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  letterSpacing?: number;
  opacity?: number;
  noWrap?: boolean;
}

interface CertificatePreviewProps {
  elements: TemplateElement[];
  canvasWidth: number;
  canvasHeight: number;
}

// Przykładowe dane użytkownika do podglądu
const SAMPLE_DATA = {
  userName: 'Aleksander Wojciechowski',
  firstName: 'Aleksander',
  lastName: 'Wojciechowski',
  eqId: 'EQ-123456',
  email: 'aleksander.rm@example.com',
  city: 'Warszawa',
  country: 'Polska',
  moduleTitle: 'Podstawy programowania Python',
  completionDate: new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  issueDate: new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }),
  certificateNumber: 'CERT-PREVIEW123',
  currentYear: String(new Date().getFullYear()),
};

const replacePlaceholders = (text: string): string => {
  return text
    .replace(/\{userName\}/gi, SAMPLE_DATA.userName)
    .replace(/\{user_name\}/gi, SAMPLE_DATA.userName)
    .replace(/\{firstName\}/gi, SAMPLE_DATA.firstName)
    .replace(/\{first_name\}/gi, SAMPLE_DATA.firstName)
    .replace(/\{lastName\}/gi, SAMPLE_DATA.lastName)
    .replace(/\{last_name\}/gi, SAMPLE_DATA.lastName)
    .replace(/\{eqId\}/gi, SAMPLE_DATA.eqId)
    .replace(/\{eq_id\}/gi, SAMPLE_DATA.eqId)
    .replace(/\{email\}/gi, SAMPLE_DATA.email)
    .replace(/\{city\}/gi, SAMPLE_DATA.city)
    .replace(/\{country\}/gi, SAMPLE_DATA.country)
    .replace(/\{moduleTitle\}/gi, SAMPLE_DATA.moduleTitle)
    .replace(/\{module_title\}/gi, SAMPLE_DATA.moduleTitle)
    .replace(/\{completionDate\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{completedDate\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{completed_date\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{date\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{issueDate\}/gi, SAMPLE_DATA.issueDate)
    .replace(/\{issue_date\}/gi, SAMPLE_DATA.issueDate)
    .replace(/\{certificateNumber\}/gi, SAMPLE_DATA.certificateNumber)
    .replace(/\{certificate_number\}/gi, SAMPLE_DATA.certificateNumber)
    .replace(/\{currentYear\}/gi, SAMPLE_DATA.currentYear)
    .replace(/\{current_year\}/gi, SAMPLE_DATA.currentYear)
    .replace(/\{\{userName\}\}/gi, SAMPLE_DATA.userName)
    .replace(/\{\{user_name\}\}/gi, SAMPLE_DATA.userName)
    .replace(/\{\{firstName\}\}/gi, SAMPLE_DATA.firstName)
    .replace(/\{\{lastName\}\}/gi, SAMPLE_DATA.lastName)
    .replace(/\{\{eqId\}\}/gi, SAMPLE_DATA.eqId)
    .replace(/\{\{email\}\}/gi, SAMPLE_DATA.email)
    .replace(/\{\{city\}\}/gi, SAMPLE_DATA.city)
    .replace(/\{\{country\}\}/gi, SAMPLE_DATA.country)
    .replace(/\{\{moduleTitle\}\}/gi, SAMPLE_DATA.moduleTitle)
    .replace(/\{\{module_title\}\}/gi, SAMPLE_DATA.moduleTitle)
    .replace(/\{\{completionDate\}\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{\{completedDate\}\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{\{date\}\}/gi, SAMPLE_DATA.completionDate)
    .replace(/\{\{issueDate\}\}/gi, SAMPLE_DATA.issueDate)
    .replace(/\{\{certificateNumber\}\}/gi, SAMPLE_DATA.certificateNumber)
    .replace(/\{\{currentYear\}\}/gi, SAMPLE_DATA.currentYear);
};

// Funkcja zawijania tekstu - identyczna logika jak w jsPDF
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  if (!maxWidth || maxWidth <= 0) return [text];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  elements,
  canvasWidth,
  canvasHeight,
}) => {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const renderPreview = async () => {
    if (!previewRef.current) return;
    
    setIsRendering(true);
    const ctx = previewRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Sort elements - images first (background), then text
    const sortedElements = [...elements].sort((a, b) => {
      if (a.type === 'image' && b.type !== 'image') return -1;
      if (a.type !== 'image' && b.type === 'image') return 1;
      return 0;
    });

    for (const element of sortedElements) {
      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 400;
      const height = element.height || 50;

      if (element.type === 'image' && element.imageUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, x, y, width, height);
              resolve();
            };
            img.onerror = reject;
            img.src = element.imageUrl!;
          });
        } catch (e) {
          console.warn('Could not load preview image:', e);
        }
      } else if (element.type === 'text' && element.content) {
        const text = replacePlaceholders(element.content);
        const fontSize = element.fontSize || 16;
        const fontWeight = element.fontWeight === 'bold' || Number(element.fontWeight) >= 700 ? 'bold' : 'normal';
        const fontStyle = element.fontStyle === 'italic' ? 'italic' : 'normal';
        const fontFamily = element.fontFamily || 'Arial';
        
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = element.color || '#000000';
        ctx.globalAlpha = (element.opacity ?? 100) / 100;
        
        const textAlign = element.align || 'left';
        ctx.textBaseline = 'top';
        
        // Obliczanie pozycji X - IDENTYCZNIE jak w useCertificateGeneration.ts
        let textX = x;
        if (textAlign === 'center') {
          textX = x + width / 2;
        } else if (textAlign === 'right') {
          textX = x + width;
        }
        
        ctx.textAlign = textAlign;

        // Renderowanie tekstu z lub bez zawijania
        if (element.noWrap) {
          // Bez zawijania - tekst w jednej linii
          ctx.fillText(text, textX, y);
          
          // Podkreślenie dla noWrap
          if (element.textDecoration === 'underline') {
            const metrics = ctx.measureText(text);
            const underlineY = y + fontSize + 2;
            ctx.beginPath();
            if (textAlign === 'center') {
              ctx.moveTo(textX - metrics.width / 2, underlineY);
              ctx.lineTo(textX + metrics.width / 2, underlineY);
            } else if (textAlign === 'right') {
              ctx.moveTo(textX - metrics.width, underlineY);
              ctx.lineTo(textX, underlineY);
            } else {
              ctx.moveTo(textX, underlineY);
              ctx.lineTo(textX + metrics.width, underlineY);
            }
            ctx.strokeStyle = element.color || '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else {
          // Z zawijaniem - identycznie jak jsPDF maxWidth
          const lines = wrapText(ctx, text, width);
          const lineHeight = fontSize * 1.2;
          
          lines.forEach((line, lineIndex) => {
            const lineY = y + (lineIndex * lineHeight);
            ctx.fillText(line, textX, lineY);
            
            // Podkreślenie dla każdej linii
            if (element.textDecoration === 'underline') {
              const metrics = ctx.measureText(line);
              const underlineY = lineY + fontSize + 2;
              ctx.beginPath();
              if (textAlign === 'center') {
                ctx.moveTo(textX - metrics.width / 2, underlineY);
                ctx.lineTo(textX + metrics.width / 2, underlineY);
              } else if (textAlign === 'right') {
                ctx.moveTo(textX - metrics.width, underlineY);
                ctx.lineTo(textX, underlineY);
              } else {
                ctx.moveTo(textX, underlineY);
                ctx.lineTo(textX + metrics.width, underlineY);
              }
              ctx.strokeStyle = element.color || '#000000';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          });
        }
        
        ctx.globalAlpha = 1;
      } else if (element.type === 'shape') {
        ctx.fillStyle = element.color || '#e0e0e0';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        if (width === height) {
          // Circle
          ctx.beginPath();
          ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Rectangle
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        }
      }
    }

    setIsRendering(false);
  };

  useEffect(() => {
    if (!isCollapsed) {
      // Debounce rendering
      const timeoutId = setTimeout(() => {
        renderPreview();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [elements, isCollapsed, canvasWidth, canvasHeight]);

  // Calculate scale to fit preview in container
  const scale = Math.min(500 / canvasWidth, 1);
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  // Zwinięty panel - wąski pasek z ikoną
  if (isCollapsed) {
    return (
      <Card 
        className="h-full min-h-[400px] w-12 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsCollapsed(false)}
      >
        <ChevronLeft className="h-5 w-5 text-primary mb-2" />
        <span 
          className="text-xs font-medium text-muted-foreground"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Podgląd
        </span>
        <Eye className="h-4 w-4 text-primary mt-2" />
      </Card>
    );
  }

  // Rozwinięty panel - pełny podgląd
  return (
    <Card className="p-4 h-full relative">
      {/* Przycisk zwijania */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute right-2 top-2 h-8 w-8 p-0"
        onClick={() => setIsCollapsed(true)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="space-y-3">
        <div className="flex items-center gap-2 pr-10">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Podgląd certyfikatu na żywo</span>
          {isRendering && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={renderPreview} 
            disabled={isRendering}
            className="h-7 w-7 p-0 ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
          <strong>Przykładowe dane:</strong> {SAMPLE_DATA.userName} | {SAMPLE_DATA.moduleTitle}
        </div>

        <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center p-2">
          <canvas
            ref={previewRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: scaledWidth,
              height: scaledHeight,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            className="bg-white"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Zmienne zostaną zastąpione prawdziwymi danymi użytkownika podczas generowania certyfikatu
        </p>
      </div>
    </Card>
  );
};

export default CertificatePreview;
