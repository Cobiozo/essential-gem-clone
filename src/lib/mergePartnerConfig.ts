/**
 * Merges template config with partner overrides.
 * Only fields listed in editable_fields are overridden.
 */
export const getMergedConfig = (
  templateConfig: Record<string, any>,
  partnerOverrides?: Record<string, any>
): Record<string, any> => {
  if (!partnerOverrides || Object.keys(partnerOverrides).length === 0) {
    return templateConfig;
  }

  const merged = { ...templateConfig };
  const editableFields: string[] = templateConfig.editable_fields || [];

  for (const field of editableFields) {
    // Support dot notation e.g. "cta_primary.url"
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (partnerOverrides[field] !== undefined) {
        merged[parent] = { ...(merged[parent] || {}), [child]: partnerOverrides[field] };
      }
    } else {
      if (partnerOverrides[field] !== undefined) {
        merged[field] = partnerOverrides[field];
      }
    }
  }

  return merged;
};

/**
 * Returns only editable fields from a config for display in the partner editor.
 */
export const getEditableFieldsList = (config: Record<string, any>): string[] => {
  return config.editable_fields || [];
};

/**
 * Gets the display label for a field name.
 */
export const getFieldLabel = (fieldName: string): string => {
  const labels: Record<string, string> = {
    headline: 'Nagłówek',
    subheadline: 'Podtytuł',
    description: 'Opis',
    badge_text: 'Tekst badge',
    heading: 'Nagłówek',
    subheading: 'Podtytuł',
    cta_text: 'Tekst CTA',
    cta_url: 'URL CTA',
    'cta_primary.url': 'URL CTA głównego',
    'cta_secondary.url': 'URL CTA drugiego',
    highlight_text: 'Tekst wyróżnienia',
    highlight_description: 'Opis wyróżnienia',
    company_name: 'Nazwa firmy',
    address: 'Adres',
    phone: 'Telefon',
    email: 'Email',
    logo_text: 'Tekst logo',
  };
  return labels[fieldName] || fieldName;
};
