import type { NewsHubBlock } from './newsHubBlocks';

export type NewsHubPostType = 'announcement' | 'article' | 'video' | 'gallery' | 'file' | 'link' | 'embed';
export type NewsHubBentoSize = 's' | 'm' | 'l';

export interface NewsHubCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
}

export interface NewsHubPost {
  id: string;
  type: NewsHubPostType;
  title: string;
  slug: string;
  category_id: string | null;
  tags: string[];
  cover_url: string | null;
  short_description: string | null;
  content: string | null;
  media_url: string | null;
  media_metadata: Record<string, any>;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  link_cta: string | null;
  embed_html: string | null;
  author_id: string | null;
  is_pinned: boolean;
  is_published: boolean;
  bento_size: NewsHubBentoSize;
  published_at: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: NewsHubCategory | null;
  style_overrides?: NewsHubStyleOverrides;
  content_blocks?: NewsHubBlock[];
}

export interface NewsHubTextStyle {
  size?: number;
  weight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export interface NewsHubCoverStyle {
  fit?: 'cover' | 'contain' | 'fill';
  height?: number;
  position?: string; // e.g. 'center', 'top', 'top left'
  overlay?: string; // hex
  overlayOpacity?: number; // 0-1
}

export interface NewsHubPageStyle {
  background?: string; // CSS background value
  maxWidth?: number;
}

export interface NewsHubStyleOverrides {
  title?: NewsHubTextStyle;
  shortDescription?: NewsHubTextStyle;
  cover?: NewsHubCoverStyle;
  page?: NewsHubPageStyle;
}

export const POST_TYPE_LABELS: Record<NewsHubPostType, string> = {
  announcement: 'Ogłoszenie',
  article: 'Artykuł',
  video: 'Wideo',
  gallery: 'Galeria',
  file: 'Plik',
  link: 'Link',
  embed: 'Embed',
};

export const POST_TYPE_ICONS: Record<NewsHubPostType, string> = {
  announcement: 'Megaphone',
  article: 'FileText',
  video: 'Video',
  gallery: 'Images',
  file: 'Download',
  link: 'Link2',
  embed: 'Code2',
};
