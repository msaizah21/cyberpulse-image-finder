/* CyberPulse article topic analyser. All parsing happens in the user's browser.
   Edit this list to match WordPress categories as your taxonomy evolves. */
(function (root) {
  'use strict';
  const categories = [
    { name: 'AI & Cybersecurity', symbol: '✦', priority: 1.10,
      terms: [['artificial intelligence',7],['generative ai',7],['genai',7],['large language model',7],['llm',6],['machine learning',5],['prompt injection',9],['ai agent',6],['agentic ai',7],['deepfake',8],['model poisoning',8],['ai security',8],['ai',5],['ai chip',9],['ai accelerator',8],['gpu',5],['nvidia',5],['chatgpt',5],['openai',4],['copilot',5],['neural network',6],['ai model',6],['ai-powered',5],['ai driven',5],['adversarial ai',7]],
      searches: ['artificial intelligence technology', 'AI computer chips data center', 'machine learning digital network', 'artificial intelligence cybersecurity'] },
    { name: 'Cloud Security', symbol: '☁', priority: 1.05,
      terms: [['cloud security',9],['cloud computing',7],['cloud infrastructure',7],['cloud environment',6],['cloud service',5],['public cloud',6],['aws',6],['amazon web services',8],['microsoft azure',7],['azure',4],['google cloud',7],['gcp',5],['kubernetes',7],['container security',8],['container',3],['s3 bucket',8],['storage bucket',8],['cloud misconfiguration',8],['cloud data',5],['multi-cloud',6],['cloud workload',7],['iam',4],['saas',5]],
      searches: ['cloud computing data center', 'data center server infrastructure', 'cloud network technology', 'secure cloud servers'] },
    { name: 'Cybersecurity', symbol: '◎', priority: 0.48,
      terms: [['cybersecurity',2],['cyber security',2],['information security',3],['digital safety',4],['security awareness',4],['zero trust',6],['encryption',4],['security operations center',6],['soc',2],['network security',5],['cyber defense',5],['infosec',3]],
      searches: ['computer cybersecurity lock', 'information security technology', 'computer network protection', 'secure data technology'] },
    { name: 'Cybersecurity News & Threats', symbol: '⚡', priority: 0.82,
      terms: [['zero-day',9],['zero day',9],['vulnerability',6],['vulnerabilities',6],['security patch',7],['patch tuesday',8],['cve-',8],['security update',6],['actively exploited',9],['exploitation',5],['security flaw',7],['security advisory',7],['critical flaw',7],['cyberattack',5],['cyber attack',5],['threat actor',5],['threat intelligence',5],['hacker',2],['hackers',2],['security researcher',4],['exploit',4]],
      searches: ['computer network cybersecurity', 'server room digital security', 'computer security warning', 'cybersecurity data center'] },
    { name: 'Data Breaches', symbol: '▦', priority: 1.12,
      terms: [['data breach',10],['breached data',9],['database exposed',9],['data exposure',8],['leaked records',9],['leaked data',9],['data leak',9],['customer records',5],['stolen customer',8],['exfiltrat',7],['personal information exposed',9],['sensitive data exposed',9],['compromised accounts',6],['exposed personal',8],['data theft',8],['stolen records',8]],
      searches: ['personal data privacy laptop', 'data protection secure database', 'computer data privacy security', 'data center computer security'] },
    { name: 'Malware', symbol: '⬡', priority: 0.96,
      terms: [['malware',8],['malicious software',9],['infostealer',8],['information stealer',8],['spyware',7],['keylogger',9],['worm',4],['computer virus',7],['malicious code',7],['malicious payload',8],['remote access tool',5],['stealer',5]],
      searches: ['computer virus cybersecurity', 'malicious software computer screen', 'computer system security alert', 'computer hacker code'] },
    { name: 'Malware & Threats', symbol: '◈', priority: 0.80,
      terms: [['malware campaign',10],['malware attack',8],['botnet',8],['threat campaign',8],['cybercriminal group',7],['command and control',8],['malicious campaign',8],['advanced persistent threat',8],['apt group',8],['threat group',6],['attack chain',7],['malicious activity',6],['threat landscape',6]],
      searches: ['cyber attack hacker computer', 'network security threat technology', 'computer malware security', 'computer cybersecurity warning'] },
    { name: 'Phishing', symbol: '✉', priority: 1.20,
      terms: [['phishing',10],['spear phishing',10],['spearphishing',10],['smishing',9],['email scam',9],['fraudulent email',9],['fake login',9],['credential harvesting',10],['credential theft',8],['social engineering',8],['business email compromise',9],['email fraud',9],['phishing link',10],['phishing email',10],['fake website',5]],
      searches: ['phishing email laptop inbox', 'email scam computer screen', 'email security smartphone', 'cybersecurity email warning'] },
    { name: 'Ransomware', symbol: '▣', priority: 1.22,
      terms: [['ransomware',12],['ransom note',10],['file encryption attack',10],['file-encrypting',10],['double extortion',9],['ransom demand',10],['lockbit',11],['blackcat',10],['alphv',10],['akira ransomware',11],['clop',8],['cl0p',8],['decryptor',8],['encrypted systems',7]],
      searches: ['ransomware computer locked screen', 'computer locked cybersecurity', 'computer security hacker attack', 'digital padlock computer'] },
    { name: 'Trojan', symbol: '◇', priority: 1.20,
      terms: [['trojan',11],['trojanized',11],['banking trojan',12],['remote access trojan',12],['rat malware',10],['trojan horse',11],['backdoor trojan',12],['remote access malware',8]],
      searches: ['computer malware trojan cybersecurity', 'malicious code computer security', 'computer virus hacker', 'cybersecurity malware warning'] }
  ];

  const sceneSignals = [
    {pattern:/\b(hospital|healthcare|patient|medical|clinic)\b/i, query:'hospital computer systems'},
    {pattern:/\b(bank|banking|financial|fintech|payment|credit card)\b/i, query:'financial banking computer technology'},
    {pattern:/\b(phone|smartphone|android|iphone|mobile app)\b/i, query:'smartphone digital security'},
    {pattern:/\b(industrial|manufacturing|factory|operational technology|scada)\b/i, query:'industrial automation control room'},
    {pattern:/\b(satellite|spacecraft|space station)\b/i, query:'satellite communication technology'},
    {pattern:/\b(school|university|education|student)\b/i, query:'university laptop computer technology'},
    {pattern:/\b(airport|airline|aviation)\b/i, query:'airport computers technology'},
    {pattern:/\b(data center|datacenter|server|servers)\b/i, query:'server room data center racks'},
    {pattern:/\b(email|inbox|outlook|gmail)\b/i, query:'email inbox laptop computer'},
    {pattern:/\b(cloud|aws|azure|kubernetes)\b/i, query:'cloud computing data center'}
  ];

  function hits(text, needle) {
    const safe = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('(^|[^a-z0-9])' + safe + '(?=$|[^a-z0-9])', 'gi');
    const match = text.match(pattern);
    return match ? Math.min(match.length, 8) : 0;
  }

  const entities = [
    {name:'NVIDIA', rx:/\b(nvidia|geforce|blackwell|h100|h200|b200|gb200)\b/i, product:/\b(gpu|graphics|blackwell|processor|chip|semiconductor|h100|h200|b200|gb200)\b/i,
      searches:['NVIDIA graphics card GPU', 'NVIDIA headquarters building', 'NVIDIA AI computer chip'], concept:['GPU graphics card close up', 'computer processor chip circuit board', 'artificial intelligence microchip']},
    {name:'Microsoft', rx:/\b(microsoft|windows|outlook|microsoft 365|azure|defender|copilot|exchange online)\b/i,
      searches:['Microsoft headquarters building', 'Microsoft office building', 'Microsoft computer Windows'], concept:['business laptop computer', 'software development computer screen', 'data center technology']},
    {name:'Google', rx:/\b(google|alphabet|gemini|google cloud|chrome|android)\b/i,
      searches:['Google headquarters building', 'Google office campus', 'Google server center'], concept:['search technology laptop computer','data center network servers']},
    {name:'OpenAI', rx:/\b(openai|chatgpt|gpt-\d|sora)\b/i,
      searches:['OpenAI office building','OpenAI technology'], concept:['AI computing microchip','artificial intelligence data center']},
    {name:'Apple', rx:/\b(apple|iphone|ipad|macos|ios 2\d|macbook)\b/i,
      searches:['Apple headquarters Cupertino', 'Apple iPhone smartphone', 'Apple technology store'], concept:['smartphone on desk','modern laptop computer']},
    {name:'Amazon AWS', rx:/\b(amazon web services|amazon aws|aws|amazon s3|amazon cloud)\b/i,
      searches:['Amazon data center','Amazon headquarters building','Amazon Web Services servers'], concept:['data center server racks','cloud computing technology']},
    {name:'Intel', rx:/\b(intel|xeon|core ultra)\b/i,
      searches:['Intel computer processor chip','Intel headquarters building'], concept:['microchip semiconductor macro','computer motherboard processor']},
    {name:'AMD', rx:/\b(amd|advanced micro devices|radeon|ryzen|epyc)\b/i,
      searches:['AMD processor CPU', 'AMD computer chip', 'AMD headquarters'], concept:['computer CPU processor chip','GPU circuit board']},
    {name:'CrowdStrike', rx:/\b(crowdstrike|falcon sensor|falcon platform)\b/i,
      searches:['CrowdStrike headquarters','CrowdStrike company building'], concept:['security operations computer screens','cybersecurity monitoring center']},
    {name:'Cisco', rx:/\b(cisco|webex|talos)\b/i,
      searches:['Cisco networking equipment','Cisco headquarters building'], concept:['network switches data center','enterprise networking hardware']},
    {name:'Meta', rx:/\b(meta platforms|facebook|instagram|whatsapp|meta ai)\b/i,
      searches:['Meta headquarters building','Facebook headquarters campus'], concept:['social media smartphone','data center servers']},
    {name:'Palo Alto Networks', rx:/\b(palo alto networks|unit 42|cortex xdr)\b/i,
      searches:['Palo Alto Networks headquarters building'], concept:['network security operations center','cybersecurity firewall server']},
    {name:'Samsung', rx:/\b(samsung|galaxy smartphone|exynos)\b/i,
      searches:['Samsung headquarters building','Samsung Galaxy smartphone'], concept:['smartphone on desk','semiconductor chip manufacturing']},
    {name:'Cloudflare', rx:/\b(cloudflare|cloudflare workers)\b/i,
      searches:['Cloudflare data center','Cloudflare company office'], concept:['data center server racks','secure internet network']},
    {name:'Oracle', rx:/\b(oracle cloud|oracle database|oracle corporation)\b/i,
      searches:['Oracle headquarters building','Oracle server facility'], concept:['business data center infrastructure']},
  ];
  const topicVisuals = [
    {rx:/\b(ai chip|ai chips|gpu|semiconductor|processor|microchip|graphics card|silicon chip|blackwell|b200|gb200)\b/i,
     searches:['microprocessor on circuit board close up','GPU graphics card hardware','semiconductor chip motherboard macro']},
    {rx:/\b(data centre|data center|server|cloud infrastructure|aws|azure)\b/i,
     searches:['modern data center server racks','server rack lights technology','data center computing hardware']},
    {rx:/\b(ransomware|encrypt(?:ed|ion)? files|ransom demand)\b/i,
     searches:['computer screen security warning','locked laptop cybersecurity','dark server room cyber security']},
    {rx:/\b(phishing|fraudulent email|email scam|smishing)\b/i,
     searches:['suspicious email inbox laptop','phishing email computer','smartphone email notification']},
    {rx:/\b(healthcare|hospital|medical clinic)\b/i,
     searches:['hospital computer workstation','hospital corridor technology','medical data computer']},
    {rx:/\b(critical vulnerability|security flaw|zero.day|cve-\d|security patch)\b/i,
     searches:['computer code on monitor close up','cybersecurity analyst at computer','computer security monitoring dashboard']},
  ];

  function normalizeInput(rawTitle, rawBody) {
    let title=String(rawTitle||'').trim();
    let body=String(rawBody||'').trim().replace(/<[^>]*>/g,' ');
    // If the user pasted the entire article into only one box, infer the first line as a title.
    if(!title&&body){
      const firstLine=body.split(/\n/).map(s=>s.trim()).find(Boolean)||'';
      title=(firstLine.length<=220 ? firstLine : (firstLine.match(/^.{20,160}?[.!?](?:\s|$)/)?.[0] || firstLine.slice(0,130))).trim();
      if(title.length<12)title=body.slice(0,120).trim();
    }
    return {title,body};
  }
  function uniqueQueries(phrases){return [...new Set(phrases.map(x=>x.trim()).filter(Boolean))].slice(0,8);}
  function findEntity(title,body){
    const text=(title+' '+body.slice(0,3500));
    const choices=entities.filter(x=>x.rx.test(text)).map(x=>({item:x,headline:x.rx.test(title)}));
    choices.sort((a,b)=>Number(b.headline)-Number(a.headline));
    return choices[0]?.item||null;
  }
  function buildImagePlan(title,body,primaryCategory) {
    const content=title+' '+body;
    const entity=findEntity(title,body);
    const matched=topicVisuals.find(t=>t.rx.test(title))||topicVisuals.find(t=>t.rx.test(body));
    let editorial=[],concept=[];
    if(entity){
      editorial=[...entity.searches];concept=[...(matched?.searches||entity.concept),...entity.concept];
      if(entity.name==='NVIDIA' && entity.product.test(content)) {
        editorial=['NVIDIA GPU graphics card','NVIDIA AI chip','NVIDIA headquarters building',...editorial];
      }
    } else if(matched) {
      editorial=[...matched.searches];concept=[...matched.searches];
    }
    concept.push(...primaryCategory.searches);
    if(!editorial.length)editorial=concept.slice(0,3);
    return {
      entity:entity?.name||'',
      topic:matched?.searches?.[0]||primaryCategory.searches[0],
      editorialSearches:uniqueQueries(editorial),
      stockSearches:uniqueQueries(concept),
      primaryQuery:entity?editorial[0]:concept[0],
      caption:entity?`Specific company detected: ${entity.name}. Look for an authentic editorial photograph; generic stock images should not be presented as a photo of that company.`:'Showing story-related concepts; these photos may illustrate the topic rather than the actual event.'
    };
  }

  function analyseArticle(title, article) {
    const parsed=normalizeInput(title,article);
    const headline = parsed.title.toLowerCase().slice(0, 260);
    const body = parsed.body.toLowerCase().slice(0, 16000);
    const combined = `${headline} ${body}`;
    const scored = categories.map(category => {
      let score = 0;
      const signals = [];
      for (const [term, weight] of category.terms) {
        const headlineCount = hits(headline, term);
        const bodyCount = hits(body, term);
        if (headlineCount || bodyCount) {
          score += ((headlineCount ? 2.4 : 0) + Math.min(bodyCount, 3) * 0.83) * weight * category.priority;
          signals.push({term, value: weight * (headlineCount ? 2.4 : 0.83)});
        }
      }
      signals.sort((a,b) => b.value - a.value);
      return {...category, score: Math.round(score * 100)/100, signals};
    }).sort((a,b) => b.score - a.score);

    const meaningful = scored.filter(c => c.score > 0);
    let primary = scored[0];
    if (!primary || primary.score < 5) primary = scored.find(c => c.name === 'Cybersecurity News & Threats');
    const secondary = meaningful.filter(c => c.name !== primary.name && c.score >= Math.max(5,primary.score * 0.20)).slice(0, 3);
    const strong = primary.score >= 34 && primary.score >= (scored.find(c=>c.name!==primary.name)?.score || 0) * 1.30;
    const confidence = strong ? 'Strong keyword match' : primary.score >= 12 ? 'Likely match' : 'Broad match — review';
    const reasons = primary.signals.slice(0,3).map(x => x.term);
    const reason = reasons.length ? `Detected: ${reasons.join(', ')}. Review this editorial suggestion before publishing.` : 'No strong category signal was found. Review this broad recommendation.';

    let searches = primary.searches.slice();
    // Physical context adds a useful story-specific alternative without searching for copyrighted logos.
    const matchedScene = sceneSignals.find(s => s.pattern.test(combined));
    if (matchedScene && !searches.some(s=>s===matchedScene.query)) searches.splice(1,0,matchedScene.query);
    // Prefer varied stock-photo-friendly phrases, not a verbatim full headline.
    searches = [...new Set(searches.map(s => s.trim()))].slice(0, 5);
    const plan=buildImagePlan(parsed.title,parsed.body,primary);
    searches=uniqueQueries([...plan.editorialSearches,...plan.stockSearches,...searches]);
    return {
      primary: primary.name, symbol: primary.symbol, confidence, reason,
      other: secondary.map(c=>c.name), searches,
      matchedKeywords: reasons, inferredTitle: parsed.title, ...plan
    };
  }

  root.CyberPulseAnalyzer = { categories: categories.map(({name,symbol})=>({name,symbol})), analyseArticle };
})(window);
