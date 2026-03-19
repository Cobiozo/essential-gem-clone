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

  // Collect social overrides separately
  const socialOverrides: Record<string, string> = {};

  for (const field of editableFields) {
    if (field.startsWith('social.')) {
      const platform = field.replace('social.', '');
      if (partnerOverrides[field] !== undefined) {
        socialOverrides[platform] = partnerOverrides[field];
      }
    } else if (field.includes('.')) {
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

  // Merge social overrides into social array
  if (Object.keys(socialOverrides).length > 0) {
    const baseSocial: Array<{ platform: string; url: string }> = merged.social || [];
    const mergedSocial = baseSocial.map(s => ({
      ...s,
      url: socialOverrides[s.platform] !== undefined ? socialOverrides[s.platform] : s.url,
    }));
    // Add new platforms not in template
    for (const [platform, url] of Object.entries(socialOverrides)) {
      if (!mergedSocial.find(s => s.platform === platform) && url) {
        mergedSocial.push({ platform, url });
      }
    }
    merged.social = mergedSocial;
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
    image_url: 'Obrazek',
    hero_image_url: 'Obraz Hero',
    logo_url: 'Logo',
    'social.facebook': 'Facebook URL',
    'social.instagram': 'Instagram URL',
    'social.linkedin': 'LinkedIn URL',
    'social.youtube': 'YouTube URL',
    'social.messenger': 'Messenger URL',
    'social.whatsapp': 'WhatsApp URL',
    'social.telegram': 'Telegram URL',
  };
  return labels[fieldName] || fieldName;
};
