/* CyberPulse article topic analyser. All parsing happens in the user's browser.
   Edit this list to match WordPress categories as your taxonomy evolves. */
(function (root) {
  'use strict';
  const categories = [
    { name: 'AI & Cybersecurity', symbol: '✦', priority: 1.10,
      terms: [['artificial intelligence',7],['generative ai',7],['genai',7],['large language model',7],['llm',6],['machine learning',5],['prompt injection',9],['ai agent',6],['agentic ai',7],['deepfake',8],['model poisoning',8],['ai security',8],['chatgpt',5],['openai',4],['copilot',5],['neural network',6],['ai model',6],['ai-powered',5],['ai driven',5],['adversarial ai',7]],
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

  function analyseArticle(title, article) {
    const headline = String(title || '').toLowerCase().slice(0, 260);
    const body = String(article || '').toLowerCase().slice(0, 16000);
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
    if (!primary || primary.score < 5) primary = categories.find(c => c.name === 'Cybersecurity News & Threats');
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
    return {
      primary: primary.name, symbol: primary.symbol, confidence, reason,
      other: secondary.map(c=>c.name), searches,
      matchedKeywords: reasons
    };
  }

  root.CyberPulseAnalyzer = { categories: categories.map(({name,symbol})=>({name,symbol})), analyseArticle };
})(window);
