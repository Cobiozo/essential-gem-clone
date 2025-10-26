import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestimonialEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const TestimonialEditor: React.FC<TestimonialEditorProps> = ({ item, onSave, onCancel }) => {
  const testimonialCell = (item.cells as any[])?.[0] || {};
  const [content, setContent] = useState(testimonialCell.content || '');
  const [author, setAuthor] = useState(testimonialCell.author || '');
  const [role, setRole] = useState(testimonialCell.role || '');
  const [avatar, setAvatar] = useState(testimonialCell.avatar || '');
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current) {
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
      
      setTimeout(() => {
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 300);
    }
  }, [debouncedItem, onSave]);

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'testimonial',
      content,
      author,
      role,
      avatar,
      position: 0,
      is_active: true,
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updateCell({ content: newContent });
  };

  const handleAuthorChange = (newAuthor: string) => {
    setAuthor(newAuthor);
    updateCell({ author: newAuthor });
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    updateCell({ role: newRole });
  };

  const handleAvatarChange = (newAvatar: string) => {
    setAvatar(newAvatar);
    updateCell({ avatar: newAvatar });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja referencji
          {isSaving && <span className="text-xs text-muted-foreground">(zapisywanie...)</span>}
          {justSaved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => onSave(editedItem)} size="sm">
            Zapisz
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none px-4">
            <TabsTrigger value="content">Treść</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Treść referencji</Label>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="To jest najlepsza usługa, z jakiej korzystałem..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Autor</Label>
              <Input
                value={author}
                onChange={(e) => handleAuthorChange(e.target.value)}
                placeholder="Jan Kowalski"
              />
            </div>

            <div className="space-y-2">
              <Label>Rola / Stanowisko</Label>
              <Input
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                placeholder="CEO, Firma XYZ"
              />
            </div>

            <div className="space-y-2">
              <Label>Avatar (URL)</Label>
              <Input
                value={avatar}
                onChange={(e) => handleAvatarChange(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Podgląd:</p>
              <div className="border rounded-lg p-4 bg-background">
                <p className="text-sm italic mb-4">"{content || 'Treść referencji...'}"</p>
                <div className="flex items-center gap-3">
                  {avatar && (
                    <img src={avatar} alt={author} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="font-semibold">{author || 'Autor'}</div>
                    {role && <div className="text-sm text-muted-foreground">{role}</div>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
