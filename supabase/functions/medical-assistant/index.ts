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

// Medical terms with synonyms and MeSH terms for better PubMed search
const medicalTermsWithSynonyms: Record<string, { english: string; synonyms: string[]; mesh?: string }> = {
  // Polish terms
  'cukrzyca': { english: 'diabetes', synonyms: ['diabetes mellitus', 'diabetic'], mesh: 'Diabetes Mellitus' },
  'cukrzyca typu 2': { english: 'type 2 diabetes', synonyms: ['diabetes mellitus type 2', 'T2DM', 'non-insulin dependent'], mesh: 'Diabetes Mellitus, Type 2' },
  'omega3': { english: 'omega-3', synonyms: ['omega-3 fatty acids', 'n-3 fatty acids', 'fish oil', 'EPA', 'DHA', 'docosahexaenoic', 'eicosapentaenoic'], mesh: 'Fatty Acids, Omega-3' },
  'omega 3': { english: 'omega-3', synonyms: ['omega-3 fatty acids', 'n-3 fatty acids', 'fish oil', 'EPA', 'DHA'], mesh: 'Fatty Acids, Omega-3' },
  'omega-3': { english: 'omega-3', synonyms: ['omega-3 fatty acids', 'n-3 fatty acids', 'fish oil', 'EPA', 'DHA'], mesh: 'Fatty Acids, Omega-3' },
  'serce': { english: 'heart', synonyms: ['cardiovascular', 'cardiac', 'coronary'], mesh: 'Heart' },
  'nadciśnienie': { english: 'hypertension', synonyms: ['high blood pressure', 'arterial hypertension', 'elevated blood pressure'], mesh: 'Hypertension' },
  'otyłość': { english: 'obesity', synonyms: ['overweight', 'adiposity', 'body mass index', 'BMI'], mesh: 'Obesity' },
  'depresja': { english: 'depression', synonyms: ['major depression', 'depressive disorder', 'mood disorder'], mesh: 'Depression' },
  'mózg': { english: 'brain', synonyms: ['cerebral', 'neurological', 'cognitive', 'neural'], mesh: 'Brain' },
  'pamięć': { english: 'memory', synonyms: ['cognitive function', 'cognition', 'memory performance'], mesh: 'Memory' },
  'zapalenie': { english: 'inflammation', synonyms: ['inflammatory', 'inflammatory response', 'cytokines'], mesh: 'Inflammation' },
  'rak': { english: 'cancer', synonyms: ['neoplasm', 'tumor', 'carcinoma', 'malignancy', 'oncology'], mesh: 'Neoplasms' },
  'cholesterol': { english: 'cholesterol', synonyms: ['LDL', 'HDL', 'lipid', 'hypercholesterolemia', 'dyslipidemia'], mesh: 'Cholesterol' },
  'insulina': { english: 'insulin', synonyms: ['insulin resistance', 'insulin sensitivity', 'glycemic'], mesh: 'Insulin' },
  'wątroba': { english: 'liver', synonyms: ['hepatic', 'hepatocyte', 'fatty liver', 'NAFLD'], mesh: 'Liver' },
  'nerki': { english: 'kidney', synonyms: ['renal', 'nephropathy', 'chronic kidney disease', 'CKD'], mesh: 'Kidney' },
  'tarczyca': { english: 'thyroid', synonyms: ['thyroid gland', 'hypothyroid', 'hyperthyroid', 'TSH'], mesh: 'Thyroid Gland' },
  'witamina': { english: 'vitamin', synonyms: ['vitamins', 'micronutrient'], mesh: 'Vitamins' },
  'witamina d': { english: 'vitamin D', synonyms: ['cholecalciferol', '25-hydroxyvitamin D', 'calciferol'], mesh: 'Vitamin D' },
  'witamina c': { english: 'vitamin C', synonyms: ['ascorbic acid', 'ascorbate'], mesh: 'Ascorbic Acid' },
  'suplementacja': { english: 'supplementation', synonyms: ['dietary supplement', 'nutritional supplement'], mesh: 'Dietary Supplements' },
  'dieta': { english: 'diet', synonyms: ['nutrition', 'dietary', 'nutritional intake', 'food intake'], mesh: 'Diet' },
  'ciąża': { english: 'pregnancy', synonyms: ['pregnant', 'prenatal', 'maternal', 'gestation'], mesh: 'Pregnancy' },
  'dziecko': { english: 'child', synonyms: ['pediatric', 'children', 'infant', 'adolescent'], mesh: 'Child' },
  'stres': { english: 'stress', synonyms: ['psychological stress', 'anxiety', 'cortisol'], mesh: 'Stress, Psychological' },
  'sen': { english: 'sleep', synonyms: ['sleep quality', 'insomnia', 'sleep disorder', 'circadian'], mesh: 'Sleep' },
  'skóra': { english: 'skin', synonyms: ['dermatology', 'dermal', 'cutaneous', 'epidermis'], mesh: 'Skin' },
  'stawy': { english: 'joints', synonyms: ['arthritis', 'articular', 'osteoarthritis', 'rheumatoid'], mesh: 'Joints' },
  'kości': { english: 'bones', synonyms: ['bone', 'osteoporosis', 'bone density', 'skeletal'], mesh: 'Bone and Bones' },
  'odporność': { english: 'immunity', synonyms: ['immune system', 'immune function', 'immunology'], mesh: 'Immunity' },
  'alergia': { english: 'allergy', synonyms: ['allergic', 'hypersensitivity', 'atopic'], mesh: 'Hypersensitivity' },
  'astma': { english: 'asthma', synonyms: ['asthmatic', 'bronchial asthma', 'airway'], mesh: 'Asthma' },
  'alzheimer': { english: 'alzheimer', synonyms: ['alzheimer disease', 'dementia', 'cognitive decline', 'neurodegeneration'], mesh: 'Alzheimer Disease' },
  'parkinson': { english: 'parkinson', synonyms: ['parkinson disease', 'parkinsonian', 'dopamine'], mesh: 'Parkinson Disease' },
  'miażdżyca': { english: 'atherosclerosis', synonyms: ['arteriosclerosis', 'plaque', 'arterial disease'], mesh: 'Atherosclerosis' },
  'arytmia': { english: 'arrhythmia', synonyms: ['cardiac arrhythmia', 'atrial fibrillation', 'heart rhythm'], mesh: 'Arrhythmias, Cardiac' },
  'magnez': { english: 'magnesium', synonyms: ['Mg', 'magnesium deficiency'], mesh: 'Magnesium' },
  'żelazo': { english: 'iron', synonyms: ['iron deficiency', 'ferritin', 'anemia'], mesh: 'Iron' },
  'cynk': { english: 'zinc', synonyms: ['Zn', 'zinc deficiency'], mesh: 'Zinc' },
  'probiotyki': { english: 'probiotics', synonyms: ['probiotic', 'lactobacillus', 'bifidobacterium'], mesh: 'Probiotics' },
  'prebiotyki': { english: 'prebiotics', synonyms: ['prebiotic', 'fiber', 'inulin'], mesh: 'Prebiotics' },
  'mikrobiom': { english: 'microbiome', synonyms: ['gut microbiota', 'intestinal flora', 'microbiota'], mesh: 'Gastrointestinal Microbiome' },
  'jelita': { english: 'intestinal', synonyms: ['gut', 'gastrointestinal', 'bowel', 'digestive'], mesh: 'Intestines' },
  'kwasy tłuszczowe': { english: 'fatty acids', synonyms: ['lipids', 'polyunsaturated fatty acids', 'PUFA'], mesh: 'Fatty Acids' },
  // German terms
  'zucker': { english: 'diabetes', synonyms: ['diabetes mellitus', 'blood sugar', 'glucose'], mesh: 'Diabetes Mellitus' },
  'herz': { english: 'heart', synonyms: ['cardiovascular', 'cardiac', 'coronary'], mesh: 'Heart' },
  'blutdruck': { english: 'blood pressure', synonyms: ['hypertension', 'arterial pressure'], mesh: 'Blood Pressure' },
  'fettleibigkeit': { english: 'obesity', synonyms: ['overweight', 'adiposity', 'BMI'], mesh: 'Obesity' },
  'gehirn': { english: 'brain', synonyms: ['cerebral', 'neurological', 'cognitive'], mesh: 'Brain' },
  'gedächtnis': { english: 'memory', synonyms: ['cognitive function', 'cognition'], mesh: 'Memory' },
  'entzündung': { english: 'inflammation', synonyms: ['inflammatory', 'cytokines'], mesh: 'Inflammation' },
  'krebs': { english: 'cancer', synonyms: ['neoplasm', 'tumor', 'carcinoma'], mesh: 'Neoplasms' },
  'leber': { english: 'liver', synonyms: ['hepatic', 'fatty liver'], mesh: 'Liver' },
  'niere': { english: 'kidney', synonyms: ['renal', 'nephropathy'], mesh: 'Kidney' },
  'schilddrüse': { english: 'thyroid', synonyms: ['thyroid gland'], mesh: 'Thyroid Gland' },
  'schwangerschaft': { english: 'pregnancy', synonyms: ['pregnant', 'prenatal'], mesh: 'Pregnancy' },
  'schlaf': { english: 'sleep', synonyms: ['sleep quality', 'insomnia'], mesh: 'Sleep' },
  'haut': { english: 'skin', synonyms: ['dermatology', 'dermal'], mesh: 'Skin' },
  'gelenke': { english: 'joints', synonyms: ['arthritis', 'articular'], mesh: 'Joints' },
  'knochen': { english: 'bones', synonyms: ['osteoporosis', 'bone density'], mesh: 'Bone and Bones' },
  'immunität': { english: 'immunity', synonyms: ['immune system', 'immune function'], mesh: 'Immunity' },
  'allergie': { english: 'allergy', synonyms: ['allergic', 'hypersensitivity'], mesh: 'Hypersensitivity' },
  'fettsäuren': { english: 'fatty acids', synonyms: ['lipids', 'PUFA'], mesh: 'Fatty Acids' },
  // Additional health-related terms
  'ból': { english: 'pain', synonyms: ['ache', 'soreness', 'discomfort'], mesh: 'Pain' },
  'głowa': { english: 'headache', synonyms: ['head pain', 'migraine', 'cephalalgia'], mesh: 'Headache' },
  'migrena': { english: 'migraine', synonyms: ['migraine headache', 'hemicranial'], mesh: 'Migraine Disorders' },
  'oczy': { english: 'eyes', synonyms: ['ocular', 'visual', 'ophthalmology', 'retina'], mesh: 'Eye' },
  'wzrok': { english: 'vision', synonyms: ['visual acuity', 'eyesight', 'optical'], mesh: 'Vision, Ocular' },
  'włosy': { english: 'hair', synonyms: ['hair growth', 'hair loss', 'alopecia'], mesh: 'Hair' },
  'paznokcie': { english: 'nails', synonyms: ['nail health', 'nail growth'], mesh: 'Nails' },
  'energia': { english: 'energy', synonyms: ['fatigue', 'tiredness', 'vitality', 'energy metabolism'], mesh: 'Energy Metabolism' },
  'zmęczenie': { english: 'fatigue', synonyms: ['tiredness', 'exhaustion', 'asthenia'], mesh: 'Fatigue' },
  'koncentracja': { english: 'concentration', synonyms: ['focus', 'attention', 'cognitive performance'], mesh: 'Attention' },
  'nastrój': { english: 'mood', synonyms: ['mood disorder', 'emotional state', 'affect'], mesh: 'Affect' },
  'lęk': { english: 'anxiety', synonyms: ['anxious', 'nervousness', 'anxiety disorder'], mesh: 'Anxiety' },
  'bezsenność': { english: 'insomnia', synonyms: ['sleep disorder', 'sleeplessness'], mesh: 'Sleep Initiation and Maintenance Disorders' },
  'trądzik': { english: 'acne', synonyms: ['acne vulgaris', 'pimples', 'skin blemishes'], mesh: 'Acne Vulgaris' },
  'egzema': { english: 'eczema', synonyms: ['atopic dermatitis', 'skin inflammation'], mesh: 'Eczema' },
  'łuszczyca': { english: 'psoriasis', synonyms: ['psoriatic', 'skin condition'], mesh: 'Psoriasis' },
  'reumatyzm': { english: 'rheumatism', synonyms: ['rheumatic', 'joint pain', 'arthralgia'], mesh: 'Rheumatic Diseases' },
  'kolagen': { english: 'collagen', synonyms: ['collagen synthesis', 'connective tissue'], mesh: 'Collagen' },
};

// Health-related keywords that trigger omega-3 association
const healthKeywords = new Set([
  // Polish
  'zdrowie', 'choroba', 'objaw', 'zapalenie', 'ból', 'leczenie', 'terapia', 'profilaktyka',
  'serce', 'mózg', 'wątroba', 'nerki', 'skóra', 'stawy', 'kości', 'oczy', 'włosy',
  'odporność', 'immunologia', 'układ odpornościowy', 'infekcja', 'wirus', 'bakteria',
  'depresja', 'lęk', 'stres', 'pamięć', 'koncentracja', 'nastrój', 'sen', 'energia',
  'cukrzyca', 'cholesterol', 'nadciśnienie', 'otyłość', 'rak', 'nowotwór', 'alzheimer',
  'miażdżyca', 'arytmia', 'astma', 'alergia', 'tarczyca', 'insulina', 'ciąża',
  'trądzik', 'egzema', 'łuszczyca', 'reumatyzm', 'migrena', 'zmęczenie', 'bezsenność',
  // German
  'gesundheit', 'krankheit', 'symptom', 'entzündung', 'schmerz', 'behandlung', 'therapie',
  'herz', 'gehirn', 'leber', 'niere', 'haut', 'gelenke', 'knochen', 'augen', 'haare',
  'immunität', 'immunsystem', 'infektion', 'depression', 'angst', 'stress', 'schlaf',
  // English
  'health', 'disease', 'symptom', 'inflammation', 'pain', 'treatment', 'therapy',
  'heart', 'brain', 'liver', 'kidney', 'skin', 'joints', 'bones', 'eyes', 'hair',
  'immunity', 'immune', 'infection', 'depression', 'anxiety', 'stress', 'sleep', 'energy'
]);

// Omega-3 terms for automatic enrichment
const omega3Terms: ParsedTerm = {
  original: 'omega-3',
  english: 'omega-3',
  synonyms: ['omega-3 fatty acids', 'n-3 fatty acids', 'fish oil', 'EPA', 'DHA', 'docosahexaenoic acid', 'eicosapentaenoic acid', 'marine omega'],
  mesh: 'Fatty Acids, Omega-3'
};

// Eqology products database
const eqologyProducts = [
  {
    name: 'Pure Arctic Oil (Omega-3 Test Based)',
    description: 'Premium omega-3 z arktycznego dorsza z certyfikatem jakości. Zawiera EPA i DHA w naturalnej formie trójglicerydów.',
    benefits: ['serce', 'mózg', 'wzrok', 'stawy', 'odporność', 'skóra', 'cholesterol', 'zapalenie', 'koncentracja', 'nastrój'],
    url: 'https://eqology.com/product/pure-arctic-oil/'
  },
  {
    name: 'Premium Marine Collagen',
    description: 'Kolagen morski typu I wspomagający zdrowie skóry, włosów, paznokci i stawów. Wzbogacony witaminą C.',
    benefits: ['skóra', 'włosy', 'paznokcie', 'stawy', 'kolagen', 'elastyczność', 'zmarszczki', 'starzenie'],
    url: 'https://eqology.com/product/marine-collagen/'
  },
  {
    name: 'EQ Pure Arctic Oil Lemon',
    description: 'Omega-3 o smaku cytrynowym, idealna dla osób preferujących łagodniejszy smak. Ta sama jakość co Pure Arctic Oil.',
    benefits: ['serce', 'mózg', 'wzrok', 'odporność', 'energia', 'dzieci'],
    url: 'https://eqology.com/product/pure-arctic-oil-lemon/'
  },
  {
    name: 'EQ Omega-3 Test',
    description: 'Domowy test poziomu omega-3 w organizmie. Mierzy stosunek omega-6/omega-3 oraz indeks omega-3.',
    benefits: ['diagnostyka', 'test', 'poziom omega-3', 'personalizacja'],
    url: 'https://eqology.com/product/omega-3-test/'
  }
];

// Stopwords to remove from queries
const stopwords = new Set([
  'a', 'i', 'w', 'na', 'z', 'do', 'o', 'czy', 'jak', 'und', 'oder', 'mit', 'für', 'bei', 'auf',
  'wpływ', 'działanie', 'efekty', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'is', 'are',
  'co', 'jakie', 'jaki', 'jaka', 'które', 'który', 'która', 'przy', 'po', 'przed', 'za', 'nad',
  'was', 'wie', 'welche', 'welcher', 'kann', 'können', 'ist', 'sind', 'die', 'der', 'das', 'ein', 'eine'
]);

interface ParsedTerm {
  original: string;
  english: string;
  synonyms: string[];
  mesh?: string;
}

function isHealthRelatedQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return Array.from(healthKeywords).some(keyword => lowerQuery.includes(keyword));
}

function queryAlreadyContainsOmega3(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const omega3Variations = ['omega-3', 'omega3', 'omega 3', 'epa', 'dha', 'fish oil', 'olej rybi', 'kwasy omega'];
  return omega3Variations.some(v => lowerQuery.includes(v));
}

function parseQueryTerms(query: string, enrichWithOmega3: boolean = false): ParsedTerm[] {
  const terms: ParsedTerm[] = [];
  let lowerQuery = query.toLowerCase().trim();
  
  // First, find and extract known multi-word terms
  const sortedTerms = Object.entries(medicalTermsWithSynonyms)
    .sort((a, b) => b[0].length - a[0].length); // Longest first
  
  for (const [term, data] of sortedTerms) {
    if (lowerQuery.includes(term)) {
      terms.push({
        original: term,
        english: data.english,
        synonyms: data.synonyms,
        mesh: data.mesh
      });
      lowerQuery = lowerQuery.replace(new RegExp(term, 'gi'), ' ');
    }
  }
  
  // Then split remaining words
  const remainingWords = lowerQuery.split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
  
  for (const word of remainingWords) {
    // Check if word is a known term
    const termData = medicalTermsWithSynonyms[word];
    if (termData) {
      if (!terms.some(t => t.original === word)) {
        terms.push({
          original: word,
          english: termData.english,
          synonyms: termData.synonyms,
          mesh: termData.mesh
        });
      }
    } else {
      // Unknown term - use as is
      if (!terms.some(t => t.original === word || t.english === word)) {
        terms.push({
          original: word,
          english: word,
          synonyms: [],
          mesh: undefined
        });
      }
    }
  }
  
  // Automatically add omega-3 terms for health-related queries
  if (enrichWithOmega3 && !terms.some(t => t.english.includes('omega'))) {
    terms.push(omega3Terms);
  }
  
  return terms;
}

function findRelevantEqologyProducts(query: string, language: string): string {
  const lowerQuery = query.toLowerCase();
  const matchedProducts: typeof eqologyProducts = [];
  
  for (const product of eqologyProducts) {
    const isRelevant = product.benefits.some(benefit => 
      lowerQuery.includes(benefit) || 
      Object.entries(medicalTermsWithSynonyms).some(([term, data]) => 
        lowerQuery.includes(term) && product.benefits.some(b => 
          data.english.includes(b) || data.synonyms.some(s => s.toLowerCase().includes(b))
        )
      )
    );
    if (isRelevant) {
      matchedProducts.push(product);
    }
  }
  
  // Always include Pure Arctic Oil for health queries
  if (matchedProducts.length === 0 && isHealthRelatedQuery(query)) {
    matchedProducts.push(eqologyProducts[0]); // Pure Arctic Oil
  }
  
  if (matchedProducts.length === 0) return '';
  
  const headers = {
    pl: '\n\n---\n\n## 💊 Możliwe zastosowanie suplementacji\n\nNa podstawie przedstawionych badań, następujące produkty Eqology mogą być pomocne w tym obszarze zdrowotnym:\n\n',
    de: '\n\n---\n\n## 💊 Mögliche Anwendung der Supplementierung\n\nBasierend auf den präsentierten Studien können folgende Eqology-Produkte in diesem Gesundheitsbereich hilfreich sein:\n\n',
    en: '\n\n---\n\n## 💊 Possible Supplementation Application\n\nBased on the presented studies, the following Eqology products may be helpful in this health area:\n\n'
  };
  
  const disclaimers = {
    pl: '\n\n*ℹ️ To są sugestie informacyjne oparte na składzie produktów. Przed rozpoczęciem suplementacji skonsultuj się z lekarzem lub dietetykiem.*',
    de: '\n\n*ℹ️ Dies sind informative Vorschläge basierend auf der Produktzusammensetzung. Konsultieren Sie vor der Einnahme einen Arzt oder Ernährungsberater.*',
    en: '\n\n*ℹ️ These are informational suggestions based on product composition. Consult a doctor or dietitian before starting supplementation.*'
  };
  
  let result = headers[language as keyof typeof headers] || headers.en;
  
  matchedProducts.forEach((product, index) => {
    result += `${index + 1}. **[${product.name}](${product.url})**\n`;
    result += `   ${product.description}\n\n`;
  });
  
  result += disclaimers[language as keyof typeof disclaimers] || disclaimers.en;
  
  return result;
}

function buildAdvancedPubMedQuery(terms: ParsedTerm[]): string {
  if (terms.length === 0) return '';
  
  const termClauses = terms.map(term => {
    const allVariants = [term.english, ...term.synonyms];
    if (term.mesh) {
      allVariants.push(`"${term.mesh}"[MeSH Terms]`);
    }
    
    // Remove duplicates and create OR clause
    const uniqueVariants = [...new Set(allVariants)];
    const quotedVariants = uniqueVariants.map(v => 
      v.includes('[MeSH') ? v : `"${v}"`
    );
    
    return `(${quotedVariants.join(' OR ')})`;
  });
  
  // Join with AND for multi-term queries
  return termClauses.join(' AND ');
}

function buildSimplePubMedQuery(terms: ParsedTerm[]): string {
  // Simpler fallback query without MeSH
  return terms.map(t => t.english).join(' AND ');
}

async function searchPubMed(query: string, maxResults: number = 10, enrichWithOmega3: boolean = false): Promise<PubMedArticle[]> {
  try {
    // Check if query is health-related and should be enriched with omega-3
    const shouldEnrichWithOmega3 = enrichWithOmega3 || 
      (isHealthRelatedQuery(query) && !queryAlreadyContainsOmega3(query));
    
    console.log('Should enrich with omega-3:', shouldEnrichWithOmega3);
    
    // Parse query into terms with synonyms and MeSH
    const parsedTerms = parseQueryTerms(query, shouldEnrichWithOmega3);
    console.log('Parsed terms:', JSON.stringify(parsedTerms, null, 2));
    
    if (parsedTerms.length === 0) {
      console.log('No valid terms found in query');
      return [];
    }
    
    // Build advanced query with synonyms and MeSH terms
    const advancedQuery = buildAdvancedPubMedQuery(parsedTerms);
    console.log('Advanced PubMed query:', advancedQuery);
    
    // Step 1: Try advanced query first
    let pmids = await searchPubMedIds(advancedQuery, maxResults);
    
    // Step 2: If no results, try simpler query
    if (pmids.length === 0) {
      const simpleQuery = buildSimplePubMedQuery(parsedTerms);
      console.log('Fallback to simple query:', simpleQuery);
      pmids = await searchPubMedIds(simpleQuery, maxResults);
    }
    
    // Step 3: If still no results and we enriched with omega-3, try without omega-3
    if (pmids.length === 0 && shouldEnrichWithOmega3) {
      console.log('Trying without omega-3 enrichment...');
      const termsWithoutOmega = parseQueryTerms(query, false);
      const queryWithoutOmega = buildAdvancedPubMedQuery(termsWithoutOmega);
      pmids = await searchPubMedIds(queryWithoutOmega, maxResults);
    }
    
    // Step 4: If still no results, try related/broader search
    if (pmids.length === 0 && parsedTerms.length > 1) {
      // Try searching for each term separately and combine results
      console.log('Trying individual term search...');
      const allPmids: string[] = [];
      
      for (const term of parsedTerms) {
        const termQuery = term.mesh 
          ? `"${term.mesh}"[MeSH Terms]`
          : `"${term.english}"`;
        const termPmids = await searchPubMedIds(termQuery, Math.ceil(maxResults / parsedTerms.length));
        allPmids.push(...termPmids);
      }
      
      pmids = [...new Set(allPmids)].slice(0, maxResults);
    }
    
    console.log('Found PMIDs:', pmids);
    
    if (pmids.length === 0) {
      return [];
    }
    
    return await fetchArticleDetails(pmids);
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

async function searchPubMedIds(query: string, maxResults: number): Promise<string[]> {
  // Sort by date (most recent first) instead of relevance
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=date&retmode=json`;
  
  console.log('PubMed search URL:', searchUrl);
  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();
  
  return searchData.esearchresult?.idlist || [];
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

async function translateQueryToEnglish(query: string, language: string, apiKey: string): Promise<string> {
  if (language === 'en') return query;
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Translate the following medical/health query to English. Return ONLY the translated query, nothing else. Keep medical terms precise. Do not add explanations.' },
          { role: 'user', content: query }
        ],
      }),
    });
    
    if (!response.ok) return query;
    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (translated) {
      console.log('Translated query:', query, '->', translated);
      return translated;
    }
    return query;
  } catch {
    console.error('Translation failed, using original query');
    return query;
  }
}

function getSystemPrompt(language: string, includeEqology: boolean = false): string {
  const eqologyNote = {
    pl: `\n\nW CZĘŚCI 2, jeśli produkty Eqology są istotne, wspomnij o nich jako o możliwej suplementacji na końcu tej części.`,
    de: `\n\nIn TEIL 2, wenn Eqology-Produkte relevant sind, erwähnen Sie sie als mögliche Ergänzung am Ende dieses Teils.`,
    en: `\n\nIn PART 2, if Eqology products are relevant, mention them as possible supplementation at the end of that part.`,
    it: `\n\nNella PARTE 2, se i prodotti Eqology sono rilevanti, menzionali come possibile integrazione alla fine di quella parte.`
  };

  const prompts = {
    pl: `Jesteś zaawansowanym naukowym asystentem AI specjalizującym się w analizie medycznej i literaturze naukowej z PubMed, ze szczególnym uwzględnieniem badań dotyczących kwasów omega-3 (EPA, DHA).

Twoja odpowiedź MUSI być podzielona na TRZY CZĘŚCI w następującej kolejności:

## 🔬 CZĘŚĆ 1: ANALIZA NAUKOWA

Przedstaw kompleksową analizę naukową pytania użytkownika:
- Wyjaśnij temat z perspektywy naukowej (co to jest, jak działa, mechanizmy)
- Opisz patofizjologię, etiologię lub mechanizmy biologiczne
- Przedstaw aktualny stan wiedzy medycznej na ten temat
- Odpowiedz merytorycznie na pytanie użytkownika, używając własnej wiedzy medycznej

## 🐟 CZĘŚĆ 2: ZASTOSOWANIE OMEGA-3

Przedstaw rolę kwasów omega-3 w kontekście pytania użytkownika:
- Wyjaśnij mechanizm działania EPA/DHA w danym schorzeniu lub obszarze zdrowotnym
- Przedstaw dowody naukowe na skuteczność omega-3 (na podstawie dostarczonych badań)
- Podaj zalecane dawkowanie oparte na badaniach (jeśli dostępne)
- Omów potencjalne korzyści i ograniczenia${includeEqology ? eqologyNote.pl : ''}

## 📚 CZĘŚĆ 3: WYNIKI Z PUBMED

Przedstaw szczegółową listę znalezionych badań naukowych:
- Dla KAŻDEGO badania podaj:
  - Tytuł badania (pogrubiony)
  - Autorzy i rok publikacji
  - Krótkie podsumowanie wniosków
  - WSZYSTKIE dostępne linki: PubMed, DOI, PMC (jako klikalne linki markdown)

WAŻNE ZASADY:
- Odpowiadaj w języku polskim
- Jeśli nie ma wystarczających badań na dany temat, powiedz o tym wprost
- ZAWSZE dodawaj na końcu: "⚠️ Te informacje mają charakter edukacyjny i nie zastępują konsultacji z lekarzem."`,
    
    de: `Sie sind ein fortgeschrittener wissenschaftlicher KI-Assistent für medizinische Analyse und PubMed-Literatur, mit besonderem Fokus auf Omega-3-Fettsäuren (EPA, DHA).

Ihre Antwort MUSS in DREI TEILE unterteilt sein:

## 🔬 TEIL 1: WISSENSCHAFTLICHE ANALYSE

Präsentieren Sie eine umfassende wissenschaftliche Analyse der Benutzerfrage:
- Erklären Sie das Thema aus wissenschaftlicher Perspektive (Was ist es, wie funktioniert es, Mechanismen)
- Beschreiben Sie Pathophysiologie, Ätiologie oder biologische Mechanismen
- Stellen Sie den aktuellen Stand des medizinischen Wissens dar
- Beantworten Sie die Frage fachlich mit Ihrem medizinischen Wissen

## 🐟 TEIL 2: OMEGA-3-ANWENDUNG

Stellen Sie die Rolle von Omega-3 im Kontext der Frage dar:
- Erklären Sie den Wirkmechanismus von EPA/DHA
- Präsentieren Sie wissenschaftliche Belege für die Wirksamkeit
- Nennen Sie empfohlene Dosierungen basierend auf Studien
- Diskutieren Sie potenzielle Vorteile und Einschränkungen${includeEqology ? eqologyNote.de : ''}

## 📚 TEIL 3: PUBMED-ERGEBNISSE

Präsentieren Sie die gefundenen Studien mit allen Details und Links.

WICHTIG: Antworten Sie auf Deutsch. Fügen Sie am Ende IMMER hinzu: "⚠️ Diese Informationen dienen Bildungszwecken und ersetzen keine ärztliche Beratung."`,
    
    en: `You are an advanced scientific AI assistant specializing in medical analysis and PubMed scientific literature, with particular focus on omega-3 fatty acids (EPA, DHA) research.

Your response MUST be divided into THREE PARTS:

## 🔬 PART 1: SCIENTIFIC ANALYSIS

Present a comprehensive scientific analysis of the user's question:
- Explain the topic from a scientific perspective (what it is, how it works, mechanisms)
- Describe pathophysiology, etiology, or biological mechanisms
- Present the current state of medical knowledge
- Answer the question substantively using your medical knowledge

## 🐟 PART 2: OMEGA-3 APPLICATION

Present the role of omega-3 fatty acids in the context of the question:
- Explain the mechanism of action of EPA/DHA in the given condition or health area
- Present scientific evidence for omega-3 effectiveness (based on provided studies)
- Provide recommended dosages based on research (if available)
- Discuss potential benefits and limitations${includeEqology ? eqologyNote.en : ''}

## 📚 PART 3: PUBMED RESULTS

Present a detailed list of found scientific studies:
- For EACH study provide: title (bold), authors and year, brief summary, ALL available links (PubMed, DOI, PMC)

IMPORTANT: Respond in English. ALWAYS add at the end: "⚠️ This information is for educational purposes and does not replace medical consultation."`,

    it: `Sei un assistente scientifico AI avanzato specializzato nell'analisi medica e nella letteratura scientifica di PubMed, con particolare attenzione alla ricerca sugli acidi grassi omega-3 (EPA, DHA).

La tua risposta DEVE essere divisa in TRE PARTI:

## 🔬 PARTE 1: ANALISI SCIENTIFICA

Presenta un'analisi scientifica completa della domanda dell'utente:
- Spiega l'argomento dal punto di vista scientifico
- Descrivi la patofisiologia, l'eziologia o i meccanismi biologici
- Presenta lo stato attuale delle conoscenze mediche

## 🐟 PARTE 2: APPLICAZIONE DEGLI OMEGA-3

Presenta il ruolo degli omega-3 nel contesto della domanda:
- Spiega il meccanismo d'azione di EPA/DHA
- Presenta le evidenze scientifiche sull'efficacia
- Indica i dosaggi raccomandati basati sulla ricerca${includeEqology ? eqologyNote.it : ''}

## 📚 PARTE 3: RISULTATI DA PUBMED

Presenta l'elenco dettagliato degli studi con tutti i link disponibili.

IMPORTANTE: Rispondi in italiano. Aggiungi SEMPRE alla fine: "⚠️ Queste informazioni sono solo a scopo educativo e non sostituiscono la consulenza medica."`
  };
  
  return prompts[language as keyof typeof prompts] || prompts.en;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, query, language = 'en', resultsCount = 10, isSummaryRequest = false } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle summary requests - no PubMed search, just summarize the dialog
    if (isSummaryRequest && query) {
      console.log('Summary request received');
      
      const summaryPrompt = `You are a professional scientific summarizer. Summarize the following dialog concisely and comprehensively.

RULES:
1. Include all main questions asked by the user
2. Summarize key scientific findings and research mentioned
3. Preserve ALL PubMed references, DOIs, and PMIDs exactly as they appear
4. Include important conclusions and recommendations
5. Keep the summary structured and clear
6. Write in English (the summary will be translated later if needed)

DIALOG TO SUMMARIZE:
${query}

Provide a well-structured summary:`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a professional scientific summarizer. Create comprehensive summaries that preserve all important details and references.' },
            { role: 'user', content: summaryPrompt }
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Summary generation error:', response.status, errorText);
        throw new Error(`Summary generation failed: ${response.status}`);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Regular chat flow - get the latest user message for PubMed search
    const lastUserMessage = messages?.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || query || '';
    
    console.log('User query:', userQuery);
    console.log('Language:', language);
    console.log('Results count:', resultsCount);

    // Check if this is a health-related query for omega-3 enrichment and Eqology suggestions
    const isHealthQuery = isHealthRelatedQuery(userQuery);
    const alreadyHasOmega3 = queryAlreadyContainsOmega3(userQuery);
    const shouldEnrichWithOmega3 = isHealthQuery && !alreadyHasOmega3;
    
    console.log('Is health query:', isHealthQuery);
    console.log('Should enrich with omega-3:', shouldEnrichWithOmega3);

    // Translate query to English for better PubMed results
    const englishQuery = await translateQueryToEnglish(userQuery, language, LOVABLE_API_KEY);
    console.log('English query for PubMed:', englishQuery);

    // Search PubMed for relevant articles (with omega-3 enrichment for health queries)
    const articles = await searchPubMed(englishQuery, resultsCount, shouldEnrichWithOmega3);
    console.log('Found articles:', articles.length);

    // Build context from PubMed results
    const pubmedContext = buildPubMedContext(articles, language);
    
    // Get relevant Eqology product suggestions for health queries
    const eqologyContext = isHealthQuery ? findRelevantEqologyProducts(userQuery, language) : '';

    // Prepare messages for AI with PubMed context and Eqology products
    const systemPrompt = getSystemPrompt(language, isHealthQuery);
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `KONTEKST NAUKOWY:\n${pubmedContext}${eqologyContext ? `\n\nPRODUKTY EQOLOGY DO ZASUGEROWANIA:\n${eqologyContext}` : ''}` },
      ...(messages || [])
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
