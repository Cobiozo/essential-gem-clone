// News Hub block-based content engine

export type NewsHubBlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'gallery'
  | 'video'
  | 'file_download'
  | 'button_cta'
  | 'callout'
  | 'divider'
  | 'columns'
  | 'table'
  | 'embed'
  | 'legacy_html';

export interface NewsHubBlockStyle {
  mt?: number;            // margin-top px
  mb?: number;            // margin-bottom px
  bg?: string;            // background color/gradient
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;      // px
  paddingX?: number;
  paddingY?: number;
  radius?: number;
  hideMobile?: boolean;
  hideDesktop?: boolean;
}

export interface NewsHubBlock {
  id: string;
  type: NewsHubBlockType;
  data: Record<string, any>;
  style?: NewsHubBlockStyle;
}

// Per-block data shapes (loose typing; renderer uses defensive defaults)
export interface HeadingBlockData { level?: 1 | 2 | 3 | 4; text?: string; color?: string; align?: 'left' | 'center' | 'right' }
export interface ParagraphBlockData { html?: string }
export interface ImageBlockData { url?: string; alt?: string; caption?: string; href?: string; fit?: 'cover' | 'contain'; height?: number }
export interface GalleryBlockData { images?: string[]; columns?: 2 | 3 | 4 }
export interface VideoBlockData { url?: string; caption?: string }
export interface FileDownloadBlockData { url?: string; name?: string; description?: string; size?: number }
export interface ButtonCtaBlockData { text?: string; url?: string; variant?: 'default' | 'outline' | 'secondary' | 'ghost'; align?: 'left' | 'center' | 'right' }
export interface CalloutBlockData { variant?: 'info' | 'warning' | 'success' | 'danger'; title?: string; text?: string; icon?: string }
export interface DividerBlockData { thickness?: number; color?: string }
export interface ColumnsBlockData { columns?: NewsHubBlock[][]; ratio?: '1-1' | '1-2' | '2-1' | '1-1-1' }
export interface TableBlockData { rows?: string[][]; headerRow?: boolean }
export interface EmbedBlockData { html?: string }
export interface LegacyHtmlBlockData { html?: string; plain?: string }

export const BLOCK_LABELS: Record<NewsHubBlockType, string> = {
  heading: 'Nagłówek',
  paragraph: 'Tekst',
  image: 'Obrazek',
  gallery: 'Galeria',
  video: 'Wideo',
  file_download: 'Plik do pobrania',
  button_cta: 'Przycisk CTA',
  callout: 'Ramka ogłoszenia',
  divider: 'Separator',
  columns: 'Kolumny',
  table: 'Tabela',
  embed: 'Embed / HTML',
  legacy_html: 'Treść (legacy)',
};

export function makeBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return 'b_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createBlock(type: NewsHubBlockType): NewsHubBlock {
  const id = makeBlockId();
  switch (type) {
    case 'heading': return { id, type, data: { level: 2, text: 'Nowy nagłówek', align: 'left' } };
    case 'paragraph': return { id, type, data: { html: '<p></p>' } };
    case 'image': return { id, type, data: { url: '', alt: '', fit: 'cover' } };
    case 'gallery': return { id, type, data: { images: [], columns: 3 } };
    case 'video': return { id, type, data: { url: '' } };
    case 'file_download': return { id, type, data: { url: '', name: '', description: '' } };
    case 'button_cta': return { id, type, data: { text: 'Przejdź', url: '', variant: 'default', align: 'left' } };
    case 'callout': return { id, type, data: { variant: 'info', title: '', text: '' } };
    case 'divider': return { id, type, data: { thickness: 1 } };
    case 'columns': return { id, type, data: { ratio: '1-1', columns: [[], []] } };
    case 'table': return { id, type, data: { headerRow: true, rows: [['Kolumna A', 'Kolumna B'], ['', '']] } };
    case 'embed': return { id, type, data: { html: '' } };
    case 'legacy_html': return { id, type, data: { html: '' } };
  }
}

export interface NewsHubTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  blocks: NewsHubBlock[];
  is_system: boolean;
  created_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
