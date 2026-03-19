import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RESERVED_ALIASES } from '@/types/partnerPage';
import type { PartnerPage, PartnerPageTemplate, PartnerProductLink, ProductCatalogItem, TemplateElement } from '@/types/partnerPage';

export const usePartnerPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerPage, setPartnerPage] = useState<PartnerPage | null>(null);
  const [template, setTemplate] = useState<TemplateElement[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<PartnerPageTemplate[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [productLinks, setProductLinks] = useState<PartnerProductLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pageRes, productsRes, allTemplatesRes] = await Promise.all([
        supabase.from('partner_pages').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('product_catalog').select('*').eq('is_active', true).order('position'),
        supabase.from('partner_page_template').select('*').eq('is_active', true).order('position'),
      ]);

      setProducts(productsRes.data || []);
      const allTemplates = (allTemplatesRes.data as any) || [];
      setAvailableTemplates(allTemplates);

      if (pageRes.data) {
        const page = pageRes.data as any;
        setPartnerPage(page);

        // Load selected template or first available
        const selectedId = page.selected_template_id;
        const selectedTemplate = selectedId
          ? allTemplates.find((t: PartnerPageTemplate) => t.id === selectedId)
          : null;
        setTemplate(selectedTemplate?.template_data || []);

        // Fetch product links
        const { data: links } = await supabase
          .from('partner_product_links')
          .select('*')
          .eq('partner_page_id', page.id)
          .order('position');
        setProductLinks((links as any) || []);
      } else {
        setTemplate([]);
      }
    } catch (error) {
      console.error('Error fetching partner page data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateAlias = (alias: string): string | null => {
    if (!alias) return null;
    if (alias.length < 3) return 'Alias musi mieć minimum 3 znaki';
    if (alias.length > 50) return 'Alias może mieć maksymalnie 50 znaków';
    if (!/^[a-z0-9-]+$/.test(alias)) return 'Alias może zawierać tylko małe litery, cyfry i myślniki';
    if (RESERVED_ALIASES.includes(alias)) return 'Ten alias jest zarezerwowany';
    return null;
  };

  const savePartnerPage = async (data: { alias?: string; is_active?: boolean; custom_data?: Record<string, any>; selected_template_id?: string }) => {
    if (!user) return false;
    setSaving(true);
    try {
      if (data.alias) {
        const aliasError = validateAlias(data.alias);
        if (aliasError) {
          toast({ title: 'Błąd', description: aliasError, variant: 'destructive' });
          setSaving(false);
          return false;
        }
        const { data: existing } = await supabase
          .from('partner_pages')
          .select('id')
          .eq('alias', data.alias)
          .neq('user_id', user.id)
          .maybeSingle();
        if (existing) {
          toast({ title: 'Błąd', description: 'Ten alias jest już zajęty', variant: 'destructive' });
          setSaving(false);
          return false;
        }
      }

      if (partnerPage) {
        const { error } = await supabase
          .from('partner_pages')
          .update(data)
          .eq('id', partnerPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('partner_pages')
          .insert({ user_id: user.id, ...data });
        if (error) throw error;
      }

      await fetchData();
      toast({ title: 'Zapisano', description: 'Dane strony zostały zapisane' });
      return true;
    } catch (error: any) {
      console.error('Error saving partner page:', error);
      toast({ title: 'Błąd', description: error.message || 'Nie udało się zapisać', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const selectTemplate = async (templateId: string) => {
    return savePartnerPage({ selected_template_id: templateId });
  };

  const saveProductLink = async (productId: string, purchaseUrl: string) => {
    if (!partnerPage) return;
    try {
      const existing = productLinks.find(l => l.product_id === productId);
      if (existing) {
        await supabase
          .from('partner_product_links')
          .update({ purchase_url: purchaseUrl, is_active: true })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('partner_product_links')
          .insert({
            partner_page_id: partnerPage.id,
            product_id: productId,
            purchase_url: purchaseUrl,
            position: productLinks.length,
          });
      }
      await fetchData();
    } catch (error) {
      console.error('Error saving product link:', error);
    }
  };

  const removeProductLink = async (productId: string) => {
    const link = productLinks.find(l => l.product_id === productId);
    if (!link) return;
    try {
      await supabase.from('partner_product_links').delete().eq('id', link.id);
      await fetchData();
    } catch (error) {
      console.error('Error removing product link:', error);
    }
  };

  return {
    partnerPage,
    template,
    availableTemplates,
    products,
    productLinks,
    loading,
    saving,
    savePartnerPage,
    selectTemplate,
    saveProductLink,
    removeProductLink,
    validateAlias,
    refresh: fetchData,
  };
};
