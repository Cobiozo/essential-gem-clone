import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, FileText, Users, Pencil, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { PartnerLeadsList } from './PartnerLeadsList';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  placeholder: string;
  required: boolean;
}

interface FormDefinition {
  id: string;
  name: string;
  cta_key: string;
  fields: FormField[];
  submit_text: string;
  success_message: string;
  is_active: boolean;
  created_at: string;
  description?: string;
  consent_text?: string;
}

const generateId = () => crypto.randomUUID().slice(0, 8);

const DEFAULT_FIELDS: FormField[] = [
  { id: generateId(), label: 'Imię', type: 'text', placeholder: 'Twoje imię', required: true },
  { id: generateId(), label: 'Email', type: 'email', placeholder: 'Twój email', required: true },
];

export const PartnerFormsManager: React.FC = () => {
  const [subTab, setSubTab] = useState<'definitions' | 'leads'>('definitions');
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partner_page_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching forms:', error);
      toast.error('Błąd pobierania formularzy');
    } else {
      setForms((data || []).map(d => ({
        ...d,
        fields: (d.fields as any) || [],
        description: (d as any).description || '',
        consent_text: (d as any).consent_text || '',
      })));
    }
    setLoading(false);
  };

  const handleNew = () => {
    setEditingForm({
      id: '',
      name: '',
      cta_key: '',
      fields: [...DEFAULT_FIELDS],
      submit_text: 'Wyślij',
      success_message: 'Dziękujemy! Formularz został wysłany.',
      is_active: true,
      created_at: '',
      description: '',
      consent_text: 'Wyrażam zgodę na przetwarzanie moich danych osobowych zawartych w formularzu w celu przesłania poradnika/e-booka na podany adres email.',
    });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editingForm) return;
    if (!editingForm.name.trim() || !editingForm.cta_key.trim()) {
      toast.error('Nazwa i kotwica CTA są wymagane');
      return;
    }

    const sanitizedKey = editingForm.cta_key
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (!sanitizedKey) {
      toast.error('Kotwica CTA musi zawierać znaki alfanumeryczne');
      return;
    }

    const payload = {
      name: editingForm.name.trim(),
      cta_key: sanitizedKey,
      fields: editingForm.fields as any,
      submit_text: editingForm.submit_text,
      success_message: editingForm.success_message,
      is_active: editingForm.is_active,
      description: editingForm.description || null,
      consent_text: editingForm.consent_text || null,
    };

    if (isNew) {
      const { error } = await supabase.from('partner_page_forms').insert(payload);
      if (error) {
        toast.error(error.message.includes('duplicate') ? 'Kotwica CTA już istnieje' : 'Błąd zapisu');
        return;
      }
    } else {
      const { error } = await supabase.from('partner_page_forms').update(payload).eq('id', editingForm.id);
      if (error) {
        toast.error('Błąd aktualizacji');
        return;
      }
    }

    toast.success(isNew ? 'Formularz utworzony' : 'Formularz zaktualizowany');
    setEditingForm(null);
    setIsNew(false);
    fetchForms();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('partner_page_forms').update({ is_active: false }).eq('id', id);
    if (error) {
      toast.error('Błąd usuwania');
      return;
    }
    toast.success('Formularz dezaktywowany');
    fetchForms();
  };

  const addField = () => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      fields: [...editingForm.fields, { id: generateId(), label: '', type: 'text', placeholder: '', required: false }],
    });
  };

  const updateField = (fieldId: string, key: keyof FormField, value: any) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      fields: editingForm.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f),
    });
  };

  const removeField = (fieldId: string) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      fields: editingForm.fields.filter(f => f.id !== fieldId),
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={v => setSubTab(v as any)}>
        <TabsList>
          <TabsTrigger value="definitions">
            <FileText className="w-4 h-4 mr-2" />
            Definicje formularzy
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Users className="w-4 h-4 mr-2" />
            Zebrane leady
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definitions">
          {editingForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isNew ? 'Nowy formularz' : 'Edytuj formularz'}</span>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingForm(null); setIsNew(false); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nazwa formularza</Label>
                    <Input
                      value={editingForm.name}
                      onChange={e => setEditingForm({ ...editingForm, name: e.target.value })}
                      placeholder="np. Darmowy poradnik"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kotwica CTA (slug)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">#</span>
                      <Input
                        value={editingForm.cta_key}
                        onChange={e => setEditingForm({ ...editingForm, cta_key: e.target.value })}
                        placeholder="np. darmowy-poradnik"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Przyciski z URL <code>#{editingForm.cta_key || 'slug'}</code> otworzą ten formularz
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tekst przycisku submit</Label>
                    <Input
                      value={editingForm.submit_text}
                      onChange={e => setEditingForm({ ...editingForm, submit_text: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wiadomość po wysłaniu</Label>
                    <Input
                      value={editingForm.success_message}
                      onChange={e => setEditingForm({ ...editingForm, success_message: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingForm.is_active}
                    onCheckedChange={v => setEditingForm({ ...editingForm, is_active: v })}
                  />
                  <Label>Aktywny</Label>
                </div>

                {/* Fields editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Pola formularza</Label>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="w-4 h-4 mr-1" /> Dodaj pole
                    </Button>
                  </div>

                  {editingForm.fields.map((field, idx) => (
                    <div key={field.id} className="flex items-start gap-3 p-3 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-1 text-muted-foreground pt-2">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-xs font-mono">{idx + 1}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Etykieta</Label>
                          <Input
                            value={field.label}
                            onChange={e => updateField(field.id, 'label', e.target.value)}
                            placeholder="np. Imię"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Typ</Label>
                          <Select value={field.type} onValueChange={v => updateField(field.id, 'type', v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Tekst</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="tel">Telefon</SelectItem>
                              <SelectItem value="textarea">Pole tekstowe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={field.placeholder}
                            onChange={e => updateField(field.id, 'placeholder', e.target.value)}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={field.required}
                              onCheckedChange={v => updateField(field.id, 'required', v)}
                            />
                            <Label className="text-xs">Wymagane</Label>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeField(field.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {editingForm.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Dodaj co najmniej jedno pole</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setEditingForm(null); setIsNew(false); }}>Anuluj</Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    {isNew ? 'Utwórz formularz' : 'Zapisz zmiany'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Formularze na strony partnerskie</span>
                  <Button onClick={handleNew}>
                    <Plus className="w-4 h-4 mr-2" /> Nowy formularz
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner />
                ) : forms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Brak zdefiniowanych formularzy</p>
                ) : (
                  <div className="space-y-3">
                    {forms.map(form => (
                      <div key={form.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{form.name}</span>
                            <Badge variant={form.is_active ? 'default' : 'secondary'}>
                              {form.is_active ? 'Aktywny' : 'Nieaktywny'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Kotwica: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">#{form.cta_key}</code>
                            {' · '}{form.fields.length} {form.fields.length === 1 ? 'pole' : 'pól'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditingForm(form); setIsNew(false); }}>
                            <Pencil className="w-4 h-4 mr-1" /> Edytuj
                          </Button>
                          {form.is_active && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(form.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leads">
          <PartnerLeadsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerFormsManager;
