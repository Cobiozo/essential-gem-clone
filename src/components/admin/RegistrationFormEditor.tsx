import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

export interface FormFieldConfig {
  id: string;
  type: 'email' | 'text' | 'tel';
  label: string;
  required: boolean;
  enabled: boolean;
}

export interface RegistrationFormConfig {
  fields: FormFieldConfig[];
  submitButtonText: string;
  successMessage: string;
}

export const defaultRegistrationFormConfig: RegistrationFormConfig = {
  fields: [
    { id: 'email', type: 'email', label: 'Email', required: true, enabled: true },
    { id: 'first_name', type: 'text', label: 'Imię', required: true, enabled: true },
    { id: 'last_name', type: 'text', label: 'Nazwisko', required: false, enabled: true },
    { id: 'phone', type: 'tel', label: 'Telefon', required: false, enabled: true },
  ],
  submitButtonText: 'Zapisz się na webinar',
  successMessage: 'Dziękujemy za zapisanie się!',
};

interface RegistrationFormEditorProps {
  config: RegistrationFormConfig | null;
  onChange: (config: RegistrationFormConfig) => void;
}

export const RegistrationFormEditor: React.FC<RegistrationFormEditorProps> = ({
  config,
  onChange,
}) => {
  const currentConfig = config || defaultRegistrationFormConfig;

  const updateField = (fieldId: string, updates: Partial<FormFieldConfig>) => {
    const newFields = currentConfig.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    onChange({ ...currentConfig, fields: newFields });
  };

  const isEmailField = (fieldId: string) => fieldId === 'email';

  return (
    <div className="space-y-6">
      {/* Fields Configuration */}
      <div className="space-y-4">
        <Label className="text-primary font-medium">Pola formularza</Label>
        <div className="space-y-3">
          {currentConfig.fields.map((field) => (
            <div
              key={field.id}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                field.enabled ? 'bg-card' : 'bg-muted/50'
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              
              <div className="flex-1">
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  className="h-8"
                  disabled={!field.enabled}
                />
              </div>

              <div className="flex items-center gap-2">
                {field.required && (
                  <Badge variant="secondary" className="text-xs">
                    Wymagane
                  </Badge>
                )}
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                    disabled={isEmailField(field.id) || !field.enabled}
                  />
                  <span className="text-xs text-muted-foreground">Wymagane</span>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.enabled}
                    onCheckedChange={(checked) => updateField(field.id, { enabled: checked })}
                    disabled={isEmailField(field.id)}
                  />
                  {field.enabled ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Pole Email jest zawsze wymagane i nie może być wyłączone.
        </p>
      </div>

      <Separator />

      {/* Submit Button Text */}
      <div className="space-y-2">
        <Label className="text-muted-foreground font-medium">Tekst przycisku</Label>
        <Input
          value={currentConfig.submitButtonText}
          onChange={(e) => onChange({ ...currentConfig, submitButtonText: e.target.value })}
          placeholder="Zapisz się na webinar"
        />
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <Label className="text-muted-foreground font-medium">Komunikat sukcesu</Label>
        <Input
          value={currentConfig.successMessage}
          onChange={(e) => onChange({ ...currentConfig, successMessage: e.target.value })}
          placeholder="Dziękujemy za zapisanie się!"
        />
      </div>

      {/* Preview Section */}
      <div className="space-y-2">
        <Label className="text-muted-foreground font-medium">Podgląd formularza</Label>
        <Card className="bg-muted/30">
          <CardContent className="pt-4 space-y-3">
            {currentConfig.fields
              .filter(f => f.enabled)
              .map(field => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-sm">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input disabled placeholder={field.label} className="bg-background" />
                </div>
              ))}
            <div className="pt-2">
              <div className="w-full h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-sm font-medium">
                {currentConfig.submitButtonText || 'Zapisz się'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationFormEditor;
