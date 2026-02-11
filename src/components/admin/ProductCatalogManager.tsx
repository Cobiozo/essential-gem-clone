import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Save, Pencil, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProductCatalogItem } from '@/types/partnerPage';

export const ProductCatalogManager: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductCatalogItem> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_catalog')
      .select('*')
      .order('position');
    setProducts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSave = async () => {
    if (!editingProduct?.name) {
      toast({ title: 'Błąd', description: 'Nazwa produktu jest wymagana', variant: 'destructive' });
      return;
    }
    try {
      if (isNew) {
        const { error } = await supabase.from('product_catalog').insert({
          name: editingProduct.name,
          description: editingProduct.description || null,
          image_url: editingProduct.image_url || null,
          position: products.length,
          is_active: editingProduct.is_active !== false,
        });
        if (error) throw error;
        toast({ title: 'Produkt dodany' });
      } else {
        const { error } = await supabase.from('product_catalog').update({
          name: editingProduct.name,
          description: editingProduct.description,
          image_url: editingProduct.image_url,
          is_active: editingProduct.is_active,
        }).eq('id', editingProduct.id!);
        if (error) throw error;
        toast({ title: 'Produkt zaktualizowany' });
      }
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten produkt?')) return;
    await supabase.from('product_catalog').delete().eq('id', id);
    toast({ title: 'Produkt usunięty' });
    fetchProducts();
  };

  const moveProduct = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= products.length) return;
    const updates = [
      { id: products[index].id, position: newIndex },
      { id: products[newIndex].id, position: index },
    ];
    for (const u of updates) {
      await supabase.from('product_catalog').update({ position: u.position }).eq('id', u.id);
    }
    fetchProducts();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Katalog produktów
              </CardTitle>
              <CardDescription>Zarządzaj produktami dostępnymi na stronach partnerskich</CardDescription>
            </div>
            <Button onClick={() => { setEditingProduct({ name: '', is_active: true }); setIsNew(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Dodaj produkt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak produktów. Dodaj pierwszy produkt.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 border rounded-lg p-4">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveProduct(index, 'up')} disabled={index === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveProduct(index, 'down')} disabled={index === products.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{product.name}</h4>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Aktywny' : 'Nieaktywny'}
                      </Badge>
                    </div>
                    {product.description && <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingProduct(product); setIsNew(false); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Nowy produkt' : 'Edytuj produkt'}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label>Nazwa *</Label>
                <Input
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Nazwa produktu"
                />
              </div>
              <div>
                <Label>Opis</Label>
                <Textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev!, description: e.target.value }))}
                  placeholder="Opis produktu"
                  rows={3}
                />
              </div>
              <div>
                <Label>URL obrazka</Label>
                <Input
                  value={editingProduct.image_url || ''}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev!, image_url: e.target.value }))}
                  placeholder="https://..."
                  type="url"
                />
                {editingProduct.image_url && (
                  <img src={editingProduct.image_url} alt="" className="mt-2 max-w-[200px] max-h-[150px] rounded-md border object-cover" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktywny</Label>
                <Switch
                  checked={editingProduct.is_active !== false}
                  onCheckedChange={(v) => setEditingProduct(prev => ({ ...prev!, is_active: v }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Anuluj</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCatalogManager;
