// Shared AI provider configuration helper
// Falls back to Lovable AI Gateway when no custom provider is active

interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: Omit<AIConfig, 'apiKey'> = {
  apiUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  model: 'google/gemini-2.5-flash',
};

export async function getAIConfig(supabase: any): Promise<AIConfig> {
  const defaultKey = Deno.env.get('LOVABLE_API_KEY') || '';
  
  try {
    // Check for active custom provider
    const { data, error } = await supabase
      .from('ai_provider_config')
      .select('api_url, api_key_encrypted, model')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      // No active config — use defaults
      return { ...DEFAULT_CONFIG, apiKey: defaultKey };
    }

    // Decrypt the API key if present
    let apiKey = defaultKey;
    if (data.api_key_encrypted) {
      try {
        const { data: decrypted, error: decryptError } = await supabase
          .rpc('decrypt_api_key', { encrypted_key: data.api_key_encrypted });
        
        if (!decryptError && decrypted) {
          apiKey = decrypted;
        } else {
          console.error('Failed to decrypt API key, falling back to default:', decryptError);
        }
      } catch (e) {
        console.error('Decrypt error, falling back to default:', e);
      }
    }

    return {
      apiUrl: data.api_url || DEFAULT_CONFIG.apiUrl,
      apiKey,
      model: data.model || DEFAULT_CONFIG.model,
    };
  } catch (e) {
    console.error('getAIConfig error, using defaults:', e);
    return { ...DEFAULT_CONFIG, apiKey: defaultKey };
  }
}
