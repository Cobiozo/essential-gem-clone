import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PubMedArticle {
  uid: string;
  title: string;
  authors: { name: string }[];
  pubdate: string;
  source: string;
  fulljournalname: string;
}

async function searchPubMed(query: string): Promise<PubMedArticle[]> {
  try {
    // Step 1: Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=6&sort=relevance&retmode=json`;
    
    console.log('Searching PubMed:', searchUrl);
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    const pmids = searchData.esearchresult?.idlist || [];
    console.log('Found PMIDs:', pmids);
    
    if (pmids.length === 0) {
      return [];
    }
    
    // Step 2: Get article summaries
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json&version=2.0`;
    
    console.log('Fetching summaries:', summaryUrl);
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();
    
    const articles: PubMedArticle[] = [];
    const result = summaryData.result || {};
    
    for (const pmid of pmids) {
      const article = result[pmid];
      if (article && article.title) {
        articles.push({
          uid: pmid,
          title: article.title,
          authors: article.authors || [],
          pubdate: article.pubdate || '',
          source: article.source || '',
          fulljournalname: article.fulljournalname || article.source || '',
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

function buildPubMedContext(articles: PubMedArticle[], language: string): string {
  if (articles.length === 0) {
    return language === 'pl' 
      ? 'Nie znaleziono odpowiednich badań naukowych w PubMed.'
      : language === 'de'
      ? 'Keine relevanten wissenschaftlichen Studien in PubMed gefunden.'
      : 'No relevant scientific studies found in PubMed.';
  }
  
  let context = language === 'pl'
    ? 'Znalezione badania naukowe z PubMed:\n\n'
    : language === 'de'
    ? 'Gefundene wissenschaftliche Studien aus PubMed:\n\n'
    : 'Found scientific studies from PubMed:\n\n';
  
  articles.forEach((article, index) => {
    const authorNames = article.authors.slice(0, 3).map(a => a.name).join(', ');
    const authorSuffix = article.authors.length > 3 ? ' et al.' : '';
    const year = article.pubdate.split(' ')[0] || article.pubdate;
    
    context += `${index + 1}. **${article.title}**\n`;
    context += `   Autorzy: ${authorNames}${authorSuffix}\n`;
    context += `   Rok: ${year}\n`;
    context += `   Czasopismo: ${article.fulljournalname}\n`;
    context += `   Link: https://pubmed.ncbi.nlm.nih.gov/${article.uid}/\n\n`;
  });
  
  return context;
}

function getSystemPrompt(language: string): string {
  const prompts = {
    pl: `Jesteś medycznym asystentem AI specjalizującym się w analizie literatury naukowej. 

ZASADY:
1. Odpowiadaj WYŁĄCZNIE na podstawie dostarczonych badań naukowych z PubMed
2. Cytuj konkretne badania, podając autorów i rok
3. Zawsze podawaj linki do PubMed dla każdego cytowanego badania
4. Odpowiadaj jasno, konkretnie i w języku polskim
5. Jeśli nie ma wystarczających danych naukowych, powiedz o tym wprost
6. ZAWSZE dodawaj na końcu disclaimer: "⚠️ Te informacje mają charakter edukacyjny i nie zastępują konsultacji z lekarzem."

FORMAT ODPOWIEDZI:
- Zacznij od krótkiego podsumowania głównych wniosków
- Następnie przedstaw szczegóły z poszczególnych badań
- Zakończ disclaimerem`,
    
    de: `Sie sind ein medizinischer KI-Assistent, spezialisiert auf die Analyse wissenschaftlicher Literatur.

REGELN:
1. Antworten Sie NUR auf Basis der bereitgestellten wissenschaftlichen Studien aus PubMed
2. Zitieren Sie konkrete Studien mit Autoren und Jahr
3. Geben Sie immer PubMed-Links für jede zitierte Studie an
4. Antworten Sie klar, präzise und auf Deutsch
5. Wenn nicht genügend wissenschaftliche Daten vorhanden sind, sagen Sie dies direkt
6. Fügen Sie IMMER am Ende einen Disclaimer hinzu: "⚠️ Diese Informationen dienen Bildungszwecken und ersetzen keine ärztliche Beratung."

ANTWORTFORMAT:
- Beginnen Sie mit einer kurzen Zusammenfassung der Hauptergebnisse
- Präsentieren Sie dann Details aus einzelnen Studien
- Schließen Sie mit dem Disclaimer ab`,
    
    en: `You are a medical AI assistant specializing in scientific literature analysis.

RULES:
1. Respond ONLY based on the provided scientific studies from PubMed
2. Cite specific studies, providing authors and year
3. Always provide PubMed links for each cited study
4. Respond clearly, concisely, and in English
5. If there is insufficient scientific data, say so directly
6. ALWAYS add a disclaimer at the end: "⚠️ This information is for educational purposes and does not replace medical consultation."

RESPONSE FORMAT:
- Start with a brief summary of main conclusions
- Then present details from individual studies
- End with the disclaimer`
  };
  
  return prompts[language as keyof typeof prompts] || prompts.en;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'pl' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get the latest user message for PubMed search
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || '';
    
    console.log('User query:', userQuery);
    console.log('Language:', language);

    // Search PubMed for relevant articles
    const articles = await searchPubMed(userQuery);
    console.log('Found articles:', articles.length);

    // Build context from PubMed results
    const pubmedContext = buildPubMedContext(articles, language);

    // Prepare messages for AI with PubMed context
    const systemPrompt = getSystemPrompt(language);
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `KONTEKST NAUKOWY:\n${pubmedContext}` },
      ...messages
    ];

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: enhancedMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Medical assistant error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
