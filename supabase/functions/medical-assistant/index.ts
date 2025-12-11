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
  doi?: string;
  pmc?: string;
  abstract?: string;
}

// Simple translation map for common medical terms (Polish/German -> English)
const medicalTermsTranslation: Record<string, string> = {
  // Polish terms
  'cukrzyca': 'diabetes',
  'omega3': 'omega-3 fatty acids',
  'omega 3': 'omega-3 fatty acids',
  'omega-3': 'omega-3 fatty acids',
  'serce': 'heart cardiovascular',
  'nadciśnienie': 'hypertension blood pressure',
  'otyłość': 'obesity',
  'depresja': 'depression',
  'mózg': 'brain cognitive',
  'pamięć': 'memory cognitive',
  'zapalenie': 'inflammation',
  'rak': 'cancer',
  'cholesterol': 'cholesterol',
  'insulina': 'insulin',
  'wątroba': 'liver hepatic',
  'nerki': 'kidney renal',
  'tarczyca': 'thyroid',
  'witamina': 'vitamin',
  'suplementacja': 'supplementation',
  'dieta': 'diet nutrition',
  'ciąża': 'pregnancy',
  'dziecko': 'child pediatric',
  'stres': 'stress anxiety',
  'sen': 'sleep',
  'skóra': 'skin dermatology',
  'stawy': 'joints arthritis',
  'kości': 'bones osteoporosis',
  'odporność': 'immunity immune system',
  'alergia': 'allergy',
  'astma': 'asthma',
  'alzheimer': 'alzheimer disease',
  'parkinson': 'parkinson disease',
  'miażdżyca': 'atherosclerosis',
  'arytmia': 'arrhythmia cardiac',
  'cukrzyca typu 2': 'type 2 diabetes',
  'kwasy tłuszczowe': 'fatty acids',
  'kwasy omega': 'omega fatty acids',
  'suplementy': 'supplements dietary',
  'witamina d': 'vitamin D',
  'witamina c': 'vitamin C',
  'magnez': 'magnesium',
  'żelazo': 'iron deficiency',
  'cynk': 'zinc',
  'probiotyki': 'probiotics',
  'prebiotyki': 'prebiotics',
  'mikrobiom': 'microbiome gut',
  'jelita': 'intestinal gut',
  // German terms
  'zucker': 'diabetes sugar',
  'herz': 'heart cardiovascular',
  'blutdruck': 'blood pressure hypertension',
  'fettleibigkeit': 'obesity',
  'gehirn': 'brain cognitive',
  'gedächtnis': 'memory',
  'entzündung': 'inflammation',
  'krebs': 'cancer',
  'leber': 'liver hepatic',
  'niere': 'kidney renal',
  'schilddrüse': 'thyroid',
  'schwangerschaft': 'pregnancy',
  'kind': 'child pediatric',
  'schlaf': 'sleep',
  'haut': 'skin dermatology',
  'gelenke': 'joints arthritis',
  'knochen': 'bones osteoporosis',
  'immunität': 'immunity immune system',
  'allergie': 'allergy',
  'fettsäuren': 'fatty acids',
};

function translateQueryToEnglish(query: string): string {
  let translatedQuery = query.toLowerCase();
  
  // Remove common Polish/German stopwords
  const stopwords = ['a', 'i', 'w', 'na', 'z', 'do', 'o', 'czy', 'jak', 'und', 'oder', 'mit', 'für', 'bei', 'auf', 'wpływ', 'działanie', 'efekty'];
  stopwords.forEach(word => {
    translatedQuery = translatedQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  });
  
  // Translate known medical terms
  for (const [term, translation] of Object.entries(medicalTermsTranslation)) {
    translatedQuery = translatedQuery.replace(new RegExp(term, 'gi'), translation);
  }
  
  // Clean up extra spaces
  translatedQuery = translatedQuery.replace(/\s+/g, ' ').trim();
  
  console.log('Translated query:', query, '->', translatedQuery);
  return translatedQuery;
}

async function searchPubMed(query: string, maxResults: number = 10): Promise<PubMedArticle[]> {
  try {
    // Translate query to English for better PubMed results
    const englishQuery = translateQueryToEnglish(query);
    
    // Step 1: Search for article IDs - use relevance and date sort
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(englishQuery)}&retmax=${maxResults}&sort=relevance&retmode=json`;
    
    console.log('Searching PubMed:', searchUrl);
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    const pmids = searchData.esearchresult?.idlist || [];
    console.log('Found PMIDs:', pmids);
    
    if (pmids.length === 0) {
      // Fallback: try original query if translation didn't help
      const fallbackUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=relevance&retmode=json`;
      console.log('Fallback search:', fallbackUrl);
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      const fallbackPmids = fallbackData.esearchresult?.idlist || [];
      
      if (fallbackPmids.length === 0) {
        return [];
      }
      
      return await fetchArticleDetails(fallbackPmids);
    }
    
    return await fetchArticleDetails(pmids);
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

async function fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
  // Use efetch to get full article details including DOI and abstract
  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
  
  console.log('Fetching article details:', fetchUrl);
  const fetchResponse = await fetch(fetchUrl);
  const xmlText = await fetchResponse.text();
  
  const articles: PubMedArticle[] = [];
  
  // Parse each article from XML
  for (const pmid of pmids) {
    try {
      // Extract article data using regex (simpler than full XML parsing in Deno)
      const articleRegex = new RegExp(`<PubmedArticle[^>]*>([\\s\\S]*?)<\\/PubmedArticle>`, 'g');
      const matches = xmlText.matchAll(articleRegex);
      
      for (const match of matches) {
        const articleXml = match[1];
        
        // Check if this is the right article
        const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
        if (!pmidMatch || pmidMatch[1] !== pmid) continue;
        
        // Extract title
        const titleMatch = articleXml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
        const title = titleMatch ? titleMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
        
        if (!title) continue;
        
        // Extract authors
        const authorMatches = articleXml.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?<ForeName>([^<]*)<\/ForeName>[\s\S]*?<\/Author>/g);
        const authors: { name: string }[] = [];
        for (const authorMatch of authorMatches) {
          authors.push({ name: `${authorMatch[1]} ${authorMatch[2]}`.trim() });
        }
        
        // Extract publication date
        const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
        const pubdate = yearMatch ? yearMatch[1] : '';
        
        // Extract journal
        const journalMatch = articleXml.match(/<Title>([^<]+)<\/Title>/);
        const journal = journalMatch ? journalMatch[1] : '';
        
        // Extract DOI
        const doiMatch = articleXml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
        const doi = doiMatch ? doiMatch[1] : undefined;
        
        // Extract PMC ID
        const pmcMatch = articleXml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/);
        const pmc = pmcMatch ? pmcMatch[1] : undefined;
        
        // Extract abstract
        const abstractMatch = articleXml.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
        let abstract = abstractMatch ? abstractMatch[1] : undefined;
        if (abstract && abstract.length > 300) {
          abstract = abstract.substring(0, 300) + '...';
        }
        
        articles.push({
          uid: pmid,
          title,
          authors,
          pubdate,
          source: journal,
          fulljournalname: journal,
          doi,
          pmc,
          abstract,
        });
        break;
      }
    } catch (err) {
      console.error('Error parsing article:', pmid, err);
    }
  }
  
  // If XML parsing failed, fall back to esummary
  if (articles.length === 0) {
    return await fetchArticleSummaries(pmids);
  }
  
  return articles;
}

async function fetchArticleSummaries(pmids: string[]): Promise<PubMedArticle[]> {
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json&version=2.0`;
  
  console.log('Fetching summaries:', summaryUrl);
  const summaryResponse = await fetch(summaryUrl);
  const summaryData = await summaryResponse.json();
  
  const articles: PubMedArticle[] = [];
  const result = summaryData.result || {};
  
  for (const pmid of pmids) {
    const article = result[pmid];
    if (article && article.title) {
      // Extract DOI from articleids
      const doiObj = article.articleids?.find((id: any) => id.idtype === 'doi');
      const pmcObj = article.articleids?.find((id: any) => id.idtype === 'pmc');
      
      articles.push({
        uid: pmid,
        title: article.title,
        authors: article.authors || [],
        pubdate: article.pubdate || '',
        source: article.source || '',
        fulljournalname: article.fulljournalname || article.source || '',
        doi: doiObj?.value,
        pmc: pmcObj?.value,
      });
    }
  }
  
  return articles;
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
    context += `   PubMed: https://pubmed.ncbi.nlm.nih.gov/${article.uid}/\n`;
    
    if (article.doi) {
      context += `   DOI: https://doi.org/${article.doi}\n`;
    }
    if (article.pmc) {
      context += `   PMC: https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmc}/\n`;
    }
    if (article.abstract) {
      context += `   Abstrakt: ${article.abstract}\n`;
    }
    context += '\n';
  });
  
  return context;
}

function getSystemPrompt(language: string): string {
  const prompts = {
    pl: `Jesteś medycznym asystentem AI specjalizującym się w analizie literatury naukowej z PubMed.

ZASADY:
1. Odpowiadaj WYŁĄCZNIE na podstawie dostarczonych badań naukowych
2. Dla KAŻDEGO badania podaj:
   - Tytuł badania (pogrubiony)
   - Autorów i rok publikacji
   - Krótkie podsumowanie wniosków z abstraktu
   - WSZYSTKIE dostępne linki: PubMed, DOI, PMC (jako klikalne linki markdown)
3. Odpowiadaj jasno i konkretnie w języku polskim
4. Jeśli nie ma wystarczających badań, powiedz o tym wprost
5. ZAWSZE dodawaj na końcu: "⚠️ Te informacje mają charakter edukacyjny i nie zastępują konsultacji z lekarzem."

FORMAT ODPOWIEDZI:
**Podsumowanie:**
[Krótkie podsumowanie głównych wniosków z badań]

**Badania naukowe:**
1. **[Tytuł badania]** (Autor et al., Rok)
   [Krótki opis wniosków]
   - [PubMed](link) | [DOI](link) | [PMC](link)

[Disclaimer]`,
    
    de: `Sie sind ein medizinischer KI-Assistent für wissenschaftliche Literaturanalyse aus PubMed.

REGELN:
1. Antworten Sie NUR basierend auf den bereitgestellten Studien
2. Für JEDE Studie geben Sie an:
   - Studientitel (fett)
   - Autoren und Erscheinungsjahr
   - Kurze Zusammenfassung der Ergebnisse
   - ALLE verfügbaren Links: PubMed, DOI, PMC (als klickbare Markdown-Links)
3. Antworten Sie klar auf Deutsch
4. Wenn keine Studien verfügbar sind, sagen Sie es direkt
5. IMMER am Ende: "⚠️ Diese Informationen dienen Bildungszwecken und ersetzen keine ärztliche Beratung."`,
    
    en: `You are a medical AI assistant specializing in PubMed scientific literature analysis.

RULES:
1. Respond ONLY based on provided scientific studies
2. For EACH study provide:
   - Study title (bold)
   - Authors and publication year
   - Brief summary of findings from abstract
   - ALL available links: PubMed, DOI, PMC (as clickable markdown links)
3. Respond clearly in English
4. If no studies are available, say so directly
5. ALWAYS add at the end: "⚠️ This information is for educational purposes and does not replace medical consultation."`
  };
  
  return prompts[language as keyof typeof prompts] || prompts.en;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'pl', resultsCount = 10 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get the latest user message for PubMed search
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || '';
    
    console.log('User query:', userQuery);
    console.log('Language:', language);
    console.log('Results count:', resultsCount);

    // Search PubMed for relevant articles
    const articles = await searchPubMed(userQuery, resultsCount);
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
