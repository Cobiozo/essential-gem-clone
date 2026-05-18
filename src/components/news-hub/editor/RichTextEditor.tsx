import React, { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Image as ImageIcon, Undo, Redo, Minus, AlignLeft, AlignCenter, AlignRight, Highlighter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const Btn: React.FC<{ active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }> = ({ active, onClick, title, children, disabled }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={cn(
      'h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted transition disabled:opacity-40',
      active && 'bg-muted text-primary',
    )}
  >
    {children}
  </button>
);

const Toolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const promptLink = () => {
    const url = prompt('URL linku:', editor.getAttributes('link').href || '');
    if (url === null) return;
    if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  const promptImage = () => {
    const url = prompt('URL obrazka:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  const setColor = (c: string) => editor.chain().focus().setColor(c).run();

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-card/95 backdrop-blur px-1 py-1">
      <Btn title="Cofnij" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Btn>
      <Btn title="Ponów" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Btn>
      <span className="w-px h-5 bg-border mx-1" />
      <Btn title="Pogrubienie" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn title="Kursywa" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn title="Podkreślenie" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Btn>
      <Btn title="Przekreślenie" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Btn>
      <Btn title="Zakreślenie" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></Btn>
      <span className="w-px h-5 bg-border mx-1" />
      <Btn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Btn>
      <Btn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
      <Btn title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Btn>
      <span className="w-px h-5 bg-border mx-1" />
      <Btn title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn title="Lista numerowana" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn title="Cytat" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Btn>
      <Btn title="Linia" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Btn>
      <span className="w-px h-5 bg-border mx-1" />
      <Btn title="Wyrównaj lewo" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Btn>
      <Btn title="Wyśrodkuj" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Btn>
      <Btn title="Wyrównaj prawo" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Btn>
      <span className="w-px h-5 bg-border mx-1" />
      <Btn title="Link" active={editor.isActive('link')} onClick={promptLink}><Link2 className="h-4 w-4" /></Btn>
      <Btn title="Obrazek" onClick={promptImage}><ImageIcon className="h-4 w-4" /></Btn>
      <span className="w-px h-5 bg-border mx-1" />
      <label className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted transition cursor-pointer" title="Kolor tekstu">
        <span className="h-4 w-4 rounded border border-border" style={{ background: editor.getAttributes('textStyle').color || '#888' }} />
        <input type="color" className="hidden" onChange={(e) => setColor(e.target.value)} />
      </label>
    </div>
  );
};

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight,
      Placeholder.configure({ placeholder: placeholder || 'Zacznij pisać...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none px-3 py-2',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
