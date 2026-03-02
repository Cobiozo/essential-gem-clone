// Block types for leader landing pages

export type LandingBlockType = 
  | 'hero' | 'text' | 'image' | 'quiz' | 'products' 
  | 'cta_button' | 'testimonial' | 'video' | 'form' | 'divider';

export interface LandingBlockBase {
  id: string;
  type: LandingBlockType;
  position: number;
  visible: boolean;
}

export interface HeroBlockData {
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  background_image?: string;
  background_color?: string;
}

export interface TextBlockData {
  content: string; // markdown
}

export interface ImageBlockData {
  image_url: string;
  alt_text?: string;
  caption?: string;
}

export interface QuizAnswer {
  label: string;
  action_type: 'scroll_to_block' | 'link';
  action_target: string;
}

export interface QuizBlockData {
  question: string;
  answers: QuizAnswer[];
}

export interface ProductItem {
  name: string;
  description?: string;
  image_url?: string;
  link?: string;
}

export interface ProductsBlockData {
  heading?: string;
  items: ProductItem[];
}

export interface CtaButtonBlockData {
  text: string;
  link: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface TestimonialBlockData {
  quote: string;
  author_name: string;
  author_image?: string;
}

export interface VideoBlockData {
  video_url: string; // YouTube/Vimeo URL
  title?: string;
}

export interface FormBlockData {
  heading?: string;
  fields: Array<'name' | 'email' | 'phone' | 'message'>;
  submit_text?: string;
}

export interface DividerBlockData {
  style?: 'line' | 'space' | 'dots';
}

// Union type mapping
export type LandingBlockDataMap = {
  hero: HeroBlockData;
  text: TextBlockData;
  image: ImageBlockData;
  quiz: QuizBlockData;
  products: ProductsBlockData;
  cta_button: CtaButtonBlockData;
  testimonial: TestimonialBlockData;
  video: VideoBlockData;
  form: FormBlockData;
  divider: DividerBlockData;
};

export interface LandingBlock<T extends LandingBlockType = LandingBlockType> extends LandingBlockBase {
  type: T;
  data: T extends keyof LandingBlockDataMap ? LandingBlockDataMap[T] : Record<string, unknown>;
}

export interface LeaderLandingPage {
  id: string;
  user_id: string;
  eq_id: string;
  blocks: LandingBlock[];
  page_title: string;
  page_description: string | null;
  theme_color: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Default data for new blocks
export const DEFAULT_BLOCK_DATA: Record<LandingBlockType, unknown> = {
  hero: { title: 'Witaj!', subtitle: '', cta_text: 'Dowiedz się więcej', cta_link: '#', background_color: '#10b981' } as HeroBlockData,
  text: { content: 'Wpisz treść...' } as TextBlockData,
  image: { image_url: '', alt_text: '' } as ImageBlockData,
  quiz: { question: 'Czym jesteś zainteresowany?', answers: [{ label: 'Opcja 1', action_type: 'scroll_to_block', action_target: '' }] } as QuizBlockData,
  products: { heading: 'Nasze produkty', items: [] } as ProductsBlockData,
  cta_button: { text: 'Kliknij tutaj', link: '#', variant: 'primary' } as CtaButtonBlockData,
  testimonial: { quote: '', author_name: '' } as TestimonialBlockData,
  video: { video_url: '', title: '' } as VideoBlockData,
  form: { heading: 'Skontaktuj się', fields: ['name', 'email', 'message'], submit_text: 'Wyślij' } as FormBlockData,
  divider: { style: 'line' } as DividerBlockData,
};
