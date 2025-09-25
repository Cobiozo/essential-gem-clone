hover_box_shadow: editedSection.hover_box_shadow?.trim() || null,
};

    const finalSection = (!allowSizeEditing && section)
      ? {
        ...cleanedSection,
        width_type: section.width_type,
        custom_width: section.custom_width,
        height_type: section.height_type,
        custom_height: section.custom_height,
        max_width: section.max_width,
      }
      : cleanedSection;
    let finalSection: Section;
    if (!allowSizeEditing) {
      // Omit size-related fields so we don't overwrite widths/heights saved in Layout Editor
      const { width_type, custom_width, height_type, custom_height, max_width, ...rest } = cleanedSection as any;
      finalSection = rest as Section;
    } else {
      finalSection = cleanedSection as Section;
    }

onSave(finalSection);
setIsOpen(false);
};

const handleCancel = () => {
if (hasUnsavedChanges) {
setShowConfirmDialog(true);
} else {
resetAndClose();
}
};

const resetAndClose = () => {
setEditedSection(section || {
title: '',
description: '',
position: 1,
is_active: true,
background_color: 'hsl(var(--background))',
text_color: 'hsl(var(--foreground))',
font_size: 16,
alignment: 'left',
padding: 16,