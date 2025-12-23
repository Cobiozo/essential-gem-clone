import React from 'react';
import { EmailBlock } from './types';

const BOX_VARIANTS = {
  info: { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ️' },
  success: { bg: '#dcfce7', border: '#22c55e', icon: '✅' },
  warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️' },
  error: { bg: '#fee2e2', border: '#ef4444', icon: '❌' },
};

interface BlockPreviewProps {
  block: EmailBlock;
}

export const BlockPreview: React.FC<BlockPreviewProps> = ({ block }) => {
  switch (block.type) {
    case 'header':
      return (
        <div
          style={{ backgroundColor: block.content.backgroundColor }}
          className="p-4 text-center"
        >
          {block.content.showLogo && (
            <div className="text-xs text-white/70 mb-1">[Logo]</div>
          )}
          <h2 style={{ color: block.content.textColor }} className="font-bold text-lg m-0">
            {block.content.text}
          </h2>
        </div>
      );

    case 'text':
      return (
        <div
          className="p-3 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content.html }}
        />
      );

    case 'button':
      return (
        <div className="p-3" style={{ textAlign: block.content.align }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: block.content.backgroundColor,
              color: block.content.textColor,
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {block.content.text}
          </span>
        </div>
      );

    case 'image':
      return (
        <div className="p-3" style={{ textAlign: block.content.align }}>
          {block.content.src ? (
            <img
              src={block.content.src}
              alt={block.content.alt}
              style={{ maxWidth: block.content.width }}
              className="inline-block max-h-32 object-contain"
            />
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/30 rounded p-4 text-center text-muted-foreground text-sm">
              Kliknij aby dodać obraz
            </div>
          )}
        </div>
      );

    case 'box':
      const variant = BOX_VARIANTS[block.content.variant as keyof typeof BOX_VARIANTS] || BOX_VARIANTS.info;
      return (
        <div
          className="m-3 p-3 rounded"
          style={{
            backgroundColor: variant.bg,
            borderLeft: `4px solid ${variant.border}`,
          }}
        >
          <div className="font-bold text-sm mb-1">
            {variant.icon} {block.content.title}
          </div>
          <div className="text-sm">{block.content.content}</div>
        </div>
      );

    case 'separator':
      return (
        <div className="px-3 py-2">
          <hr
            style={{
              border: 'none',
              borderTop: `1px ${block.content.style} ${block.content.color}`,
            }}
          />
        </div>
      );

    case 'spacer':
      return (
        <div
          className="flex items-center justify-center text-xs text-muted-foreground bg-muted/30"
          style={{ height: block.content.height }}
        >
          {block.content.height}px
        </div>
      );

    case 'footer':
      return (
        <div
          className="p-3 bg-muted/50 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content.html }}
        />
      );

    default:
      return <div className="p-3 text-muted-foreground">Nieznany typ bloku</div>;
  }
};
