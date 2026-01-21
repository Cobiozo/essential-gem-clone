import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSyncNbpRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rate: number) => {
      // Get the settings IDs first
      const { data: calcSettings } = await supabase
        .from('calculator_settings')
        .select('id')
        .limit(1)
        .single();

      const { data: specSettings } = await supabase
        .from('specialist_calculator_settings')
        .select('id')
        .limit(1)
        .single();

      // Update influencer calculator settings
      if (calcSettings?.id) {
        const { error: error1 } = await supabase
          .from('calculator_settings')
          .update({ eur_to_pln_rate: rate })
          .eq('id', calcSettings.id);

        if (error1) throw new Error('Błąd aktualizacji kalkulatora influencerów');
      }

      // Update specialist calculator settings
      if (specSettings?.id) {
        const { error: error2 } = await supabase
          .from('specialist_calculator_settings')
          .update({ eur_to_pln_rate: rate })
          .eq('id', specSettings.id);

        if (error2) throw new Error('Błąd aktualizacji kalkulatora specjalistów');
      }

      return rate;
    },
    onSuccess: (rate) => {
      // Invalidate both calculator settings queries
      queryClient.invalidateQueries({ queryKey: ['calculator-settings'] });
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-settings'] });
      
      toast({
        title: "Kurs zsynchronizowany",
        description: `Kurs ${rate.toFixed(4)} PLN zapisany w obu kalkulatorach`,
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd synchronizacji",
        description: error instanceof Error ? error.message : "Nie udało się zsynchronizować kursu",
        variant: "destructive",
      });
    },
  });
}
