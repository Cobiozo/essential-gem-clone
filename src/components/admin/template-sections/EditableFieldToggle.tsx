import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface EditableFieldToggleProps {
  fieldName: string;
  label?: string;
  editableFields: string[];
  onToggle: (updatedFields: string[]) => void;
}

export const EditableFieldToggle: React.FC<EditableFieldToggleProps> = ({
  fieldName,
  label,
  editableFields,
  onToggle,
}) => {
  const isChecked = editableFields.includes(fieldName);

  const handleChange = (checked: boolean) => {
    if (checked) {
      onToggle([...editableFields, fieldName]);
    } else {
      onToggle(editableFields.filter(f => f !== fieldName));
    }
  };

  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleChange}
        className="h-3.5 w-3.5"
      />
      <span>{label || 'Edytowalne'}</span>
    </label>
  );
};
