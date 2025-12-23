import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { EmailBlock, BLOCK_TYPES, BlockType } from './types';
import { BlockPalette } from './BlockPalette';
import { DraggableEmailBlock } from './DraggableEmailBlock';
import { BlockEditor } from './BlockEditor';
import { BlockPreview } from './BlockPreview';
import { blocksToHtml } from './blocksToHtml';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Eye, Code } from 'lucide-react';

interface EmailDndEditorProps {
  initialBlocks?: EmailBlock[];
  onChange: (html: string, blocks: EmailBlock[]) => void;
}

export const EmailDndEditor: React.FC<EmailDndEditorProps> = ({
  initialBlocks = [],
  onChange,
}) => {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const updateBlocks = useCallback((newBlocks: EmailBlock[]) => {
    // Recalculate positions
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index,
    }));
    setBlocks(updatedBlocks);
    onChange(blocksToHtml(updatedBlocks), updatedBlocks);
  }, [onChange]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Dropping from palette
    if (active.id.toString().startsWith('palette-')) {
      const blockType = (active.data.current as any)?.blockType as BlockType;
      if (blockType) {
        const newBlock: EmailBlock = {
          id: `block-${Date.now()}`,
          type: blockType.type,
          content: { ...blockType.defaultContent },
          position: blocks.length,
        };

        // Find insert position
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        const newBlocks = [...blocks];
        if (overIndex >= 0) {
          newBlocks.splice(overIndex, 0, newBlock);
        } else {
          newBlocks.push(newBlock);
        }
        updateBlocks(newBlocks);
        setSelectedBlockId(newBlock.id);
      }
      return;
    }

    // Reordering existing blocks
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        updateBlocks(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  const handleBlockContentChange = (content: Record<string, any>) => {
    if (!selectedBlockId) return;
    const newBlocks = blocks.map((b) =>
      b.id === selectedBlockId ? { ...b, content } : b
    );
    updateBlocks(newBlocks);
  };

  const handleDeleteBlock = (id: string) => {
    updateBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleDuplicateBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const index = blocks.findIndex((b) => b.id === id);
    const newBlock: EmailBlock = {
      ...block,
      id: `block-${Date.now()}`,
      content: { ...block.content },
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateBlocks(newBlocks);
  };

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-12 gap-4 h-[600px]">
        {/* Block Palette */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Bloki</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[520px]">
                <BlockPalette />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="col-span-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="py-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Kanwa</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <Code className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showPreview ? 'Edytor' : 'Podgląd'}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-2 overflow-hidden">
              <ScrollArea className="h-full">
                {showPreview ? (
                  <div
                    className="bg-white rounded border p-2"
                    dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) }}
                  />
                ) : (
                  <SortableContext
                    items={blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[200px]">
                      {blocks.length === 0 && (
                        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center text-muted-foreground">
                          Przeciągnij bloki tutaj, aby rozpocząć
                        </div>
                      )}
                      {blocks.map((block) => (
                        <DraggableEmailBlock
                          key={block.id}
                          block={block}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => setSelectedBlockId(block.id)}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Block Editor */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {selectedBlock ? `Edycja: ${BLOCK_TYPES.find(t => t.type === selectedBlock.type)?.label}` : 'Właściwości'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[520px]">
                {selectedBlock ? (
                  <BlockEditor
                    block={selectedBlock}
                    onChange={handleBlockContentChange}
                  />
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">
                    Wybierz blok, aby edytować jego właściwości
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <DragOverlay>
        {activeBlock && (
          <div className="bg-card border rounded-md shadow-lg opacity-90">
            <BlockPreview block={activeBlock} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
