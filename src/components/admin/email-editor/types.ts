export interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'box' | 'separator' | 'footer' | 'spacer';
  content: Record<string, any>;
  position: number;
}

export interface BlockType {
  type: EmailBlock['type'];
  label: string;
  icon: string;
  defaultContent: Record<string, any>;
}

export const BLOCK_TYPES: BlockType[] = [
  {
    type: 'header',
    label: 'Nagłówek z logo',
    icon: 'Layout',
    defaultContent: {
      text: 'Tytuł emaila',
      backgroundColor: '#16a34a',
      textColor: '#ffffff',
      showLogo: true,
      logoUrl: '',
    },
  },
  {
    type: 'text',
    label: 'Sekcja tekstu',
    icon: 'Type',
    defaultContent: {
      html: '<p>Wprowadź treść...</p>',
    },
  },
  {
    type: 'button',
    label: 'Przycisk CTA',
    icon: 'MousePointer',
    defaultContent: {
      text: 'Kliknij tutaj',
      url: '#',
      backgroundColor: '#16a34a',
      textColor: '#ffffff',
      align: 'center',
    },
  },
  {
    type: 'image',
    label: 'Obraz',
    icon: 'Image',
    defaultContent: {
      src: '',
      alt: 'Opis obrazu',
      width: '100%',
      align: 'center',
    },
  },
  {
    type: 'box',
    label: 'Box informacyjny',
    icon: 'Square',
    defaultContent: {
      variant: 'info', // info, success, warning, error
      title: 'Tytuł',
      content: 'Treść informacji...',
    },
  },
  {
    type: 'separator',
    label: 'Separator',
    icon: 'Minus',
    defaultContent: {
      style: 'solid', // solid, dashed, dotted
      color: '#e5e7eb',
    },
  },
  {
    type: 'spacer',
    label: 'Odstęp',
    icon: 'MoveVertical',
    defaultContent: {
      height: 20,
    },
  },
  {
    type: 'footer',
    label: 'Stopka',
    icon: 'FileText',
    defaultContent: {
      html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Twoja Firma. Wszelkie prawa zastrzeżone.</p>',
    },
  },
];
