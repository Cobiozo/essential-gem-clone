import { CMSSection } from '@/types/cms';

// Helper function to convert raw Supabase data to properly typed CMSSection with fallbacks
export const convertSupabaseSection = (section: any): CMSSection => ({
  ...section,
  section_type: section.section_type === 'row' ? 'row' : 'section',
  row_column_count: section.row_column_count || 1,
  row_layout_type: section.row_layout_type === 'custom' ? 'custom' : 'equal',
  // Respect DB types; only fallback when missing
  width_type: section.width_type || 'full',
  height_type: section.height_type || 'auto'
});

// Helper function to convert array of raw Supabase sections
export const convertSupabaseSections = (sections: any[]): CMSSection[] => 
  sections.map(convertSupabaseSection);