/* CyberPulse Newsroom v6 — evidence-conservative editorial planner.
 * No server, paid AI, scraping or WordPress credentials. Testable in Node.
 * Outputs photo DIRECTIONS; retrieved images still require editorial review. */
(function(root){
  'use strict';
  const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const dedup=arr=>[...new Set(arr.map(clean).filter(Boolean))].slice(0,12);
  const rules=[
    {key:'university-breach', angle:'University cyber incident',rx:/\b(university|college|campus|student|applicant|admission|school)\b/i,required:/\b(cyberattack|breach|hack|exposed|leaked|offline|portal|ransomware|security)\b/i,
      context:['university campus building exterior','university students using laptop computers','university computer laboratory'],
      concept:['university online application laptop','data center computer server racks','university information security computers'],
      avoid:'Avoid depicting identifiable students as victims of an unverified breach.'},
    {key:'government-ai',angle:'AI policy and government',rx:/\b(task force|congress|senate|white house|government|federal|legislation|regulator|policy|president|trump)\b/i,required:/\b(ai|artificial intelligence|cyber|digital|security|tech)\b/i,
      context:['United States Capitol building photograph','government technology committee meeting','government building Washington DC'],
      concept:['artificial intelligence microchip technology','government digital security laptop','AI technology server room'],
      avoid:'Do not imply an official meeting or a person appears in a photo unless the photo source confirms it.'},
    {key:'service-outage',angle:'Technology service disruption',rx:/\b(outage|offline|down|recovery|recovering|restor|capacity|service disruption|stabiliz|unavailable)\w*/i,
      context:['data center server racks lights','technology service operations room','office worker laptop troubleshooting'],
      concept:['server racks data center technology','computer network systems monitoring','laptop business cloud services'],
      avoid:'Do not present an unrelated server room as the actual outage location.'},
    {key:'espionage',angle:'Technology espionage',rx:/\b(espionage|spies|spy|insider threat|intelligence agency|recruit former)\b/i,
      context:['technology company office building exterior','software engineers working computer office','semiconductor industry computer chips'],
      concept:['computer chip semiconductor macro photograph','corporate technology office workers','laptop security analyst working'],
      avoid:'Avoid images that falsely identify a person as a spy or suspect.'},
    {key:'enterprise-ai',angle:'Enterprise AI adoption',rx:/\b(adoption|rollout|deploy|implementation|workplace|employees|uncontrolled)\b/i,required:/\b(ai|artificial intelligence|chatgpt|copilot|agentic)\b/i,
      context:['office professionals working on laptops','business people using computers in office','technology professionals business meeting'],
      concept:['artificial intelligence microchip close up','business laptop computers office','office team technology collaboration'],
      avoid:'Avoid generic humanoid robots if the article concerns real workplace use of AI.'},
    {key:'data-breach',angle:'Personal data exposure',rx:/\b(data breach|data exposure|exposes? (?:applicant|student|customer|patient|user|personal)|leaked (?:records|data)|stolen records)\b/i,
      context:['data center server room photography','person working on laptop office','security operations team monitors'],
      concept:['computer database network security','laptop privacy security','hard drives computer server rack'],
      avoid:'Avoid fake breach dashboards, invented hackers and made-up screenshots.'},
    {key:'ransomware',angle:'Ransomware incident',rx:/\b(ransomware|ransom note|encrypted files|double extortion)\b/i,
      context:['cybersecurity analyst workstation photograph','computer server room photography','IT professionals monitoring office'],
      concept:['computer locked screen security','server rack dark computer room','laptop cybersecurity analyst'],
      avoid:'Do not imply a generic screen is the actual ransomware note.'},
    {key:'hardware',angle:'AI computing hardware',rx:/\b(gpu|chip|nvidia|semiconductor|microprocessor|accelerator|blackwell|cpu)\b/i,
      context:['semiconductor chip factory photograph','computer graphics card close up','data center computing infrastructure'],
      concept:['microprocessor computer chip close up','graphics card circuit board photography','AI GPU computer hardware'],
      avoid:'Verify hardware model and manufacturer before describing it as a specific product.'},
    {key:'phishing',angle:'Email and identity security',rx:/\b(phishing|fraudulent email|email scam|credential theft|smishing)\b/i,
      context:['person checking email laptop computer','office worker laptop computer','smartphone email mobile technology'],
      concept:['email inbox laptop computer photo','computer keyboard email security','smartphone digital privacy photograph'],
      avoid:'Do not portray a simulated email as real evidence of an attack.'}
  ];
  const companyEnvironments={
    'NVIDIA':['NVIDIA headquarters building','NVIDIA technology event photograph','NVIDIA GPU graphics card'],
    'Microsoft':['Microsoft office building exterior','Microsoft headquarters Redmond','Microsoft office campus'],
    'Google':['Google headquarters building','Google office campus exterior'],
    'OpenAI':['OpenAI office building','artificial intelligence computing facility'],
    'Amazon AWS':['Amazon data center building','AWS data center servers'],
    'Apple':['Apple Park campus building','Apple technology store exterior'],
    'Cisco':['Cisco company headquarters building','Cisco networking server hardware'],
    'Intel':['Intel semiconductor factory','Intel processor chip'],
    'AMD':['AMD graphics card processor chip','AMD headquarters building'],
  };
  const storyFirst=body=>{
    const lines=String(body||'').split(/\n+/).map(clean).filter(Boolean);
    const line=lines[0]||'';
    // A real news headline may stand alone, without a final full stop.
    if(line.length>=22&&line.length<=112&&(!/[.!?]$/.test(line)||lines.length>1)&&line.split(' ').length<=18&&(!/[.!?].+[.!?]/.test(line)))return line;
    return clean((String(body||'').match(/[^.!?\n]+(?:[.!?]|$)/)||[])[0]||'');
  };
  function compactTitle(text){
    let t=clean(text).replace(/^(breaking(?: news)?|latest|update|news)\s*[:–—-]\s*/i,'').replace(/^["“‘]+|["”’]+$/g,'');
    t=t.replace(/^(according to (?:the )?(?:report|researchers),?\s*)/i,'').replace(/[.!?]+$/,'');
    if(t.length>98){const part=t.slice(0,99);t=part.slice(0,Math.max(part.lastIndexOf(' '),70));}
    return t[0]?t[0].toUpperCase()+t.slice(1):'';
  }
  function headlines(title,body){
    const original=clean(title);
    const seed=compactTitle(original||storyFirst(body));
    const list=[];
    function add(s){s=compactTitle(s);if(s.length<17||s.length>105)return;
      const k=s.toLowerCase().replace(/[^a-z0-9]/g,'');
      if(!list.some(x=>{const v=x.toLowerCase().replace(/[^a-z0-9]/g,'');return k===v||k.includes(v)&&k.length-v.length<10||v.includes(k)&&v.length-k.length<10;}))list.push(s);}
    add(seed);
    // Changes stay within asserted text; do not infer dates, causal claims or breaking status.
    if(seed.includes(':')){
      const [a,...rest]=seed.split(':'); const b=rest.join(':').trim();
      add(`${a.trim()} — ${b}`);if(a.length>=22)add(a.trim());
    }
    if(/\s+after\s+/i.test(seed)){
      const m=seed.match(/^(.+?)\s+after\s+(.+)$/i);
      if(m&&m[2].length>15)add(`${m[2]} — ${m[1]}`);
    }
    if(/\s+as\s+/i.test(seed)){
      const m=seed.match(/^(.+?)\s+as\s+(.+)$/i);
      if(m&&m[2].length>15)add(`${m[2]} as ${m[1]}`);
    }
    if(!original){
      const present=seed.replace(/\bhas announced\b/i,'announces').replace(/\bhave announced\b/i,'announce')
        .replace(/\bhas warned\b/i,'warns').replace(/\bhas confirmed\b/i,'confirms')
        .replace(/\bhas launched\b/i,'launches').replace(/\bhas reported\b/i,'reports');
      add(present);
      const second=String(body||'').match(/(?:[.!?]\s+)([^.!?]{23,90})(?:[.!?]|$)/);
      if(second)add(second[1]);
    }
    // No artificial filler variants: two grounded alternatives beat four invented headlines.
    return list.slice(0,4);
  }
  function enhance(base,title,body){
    const text=`${title||''} ${body||''}`;
    const match=rules.find(r=>r.rx.test(title||'')&&(!r.required||r.required.test(text)))||rules.find(r=>r.rx.test(text)&&(!r.required||r.required.test(text)));
    const scene=match?.context||['technology professionals working laptop computers','computer server room technology','office computers teamwork'];
    const concept=match?.concept||base.stockSearches||['computer security technology'];
    const specific=companyEnvironments[base.entity]||base.editorialSearches||[];
    // If the story focuses on a service outage, use facilities and operations before pure logos.
    const editorial=dedup([...specific,...(base.editorialSearches||[]),...scene]);
    const context=dedup([...scene,...(base.stockSearches||[])]);
    const conceptual=dedup([...concept,...(base.stockSearches||[])]);
    let recommended='context';
    if(base.entity && !['university-breach','government-ai','enterprise-ai'].includes(match?.key))recommended='editorial';
    const modes={editorial,context,concept:conceptual};
    const storyHeadlines=headlines(title,body);
    // When a source title exists, do not pad the output with full article sentences.
    const suggested=dedup([...(storyHeadlines||[]),...(!title.trim()?(base.titleSuggestions||[]):[])].filter(x=>x.length<=100)).slice(0,4);
    return {...base,
      angle:match?.angle||'Cybersecurity news',
      directionKey:match?.key||'general',
      visualSubject:base.entity||match?.angle||base.primary,
      editorialWarning:match?.avoid||'Use descriptive captions. Do not imply a stock photograph depicts the exact incident.',
      recommendedMode:recommended,
      searchModes:modes,
      searchModeNames:{editorial:'Company / named subject',context:'Real-world editorial photo',concept:'Concept / stock photo'},
      stockSearches:dedup([...modes[recommended],...modes.context,...modes.concept]),
      primaryQuery:modes[recommended][0]||base.primaryQuery,
      visualConcepts:dedup([...modes[recommended].slice(0,2),...modes.context.slice(0,2),...modes.concept.slice(0,2)]).slice(0,4),
      titleSuggestions:suggested.length?suggested:base.titleSuggestions,
      headlineSource: title.trim()?'Source headline + grounded variations':'Article text only — edit for accuracy'
    };
  }
  root.CyberPulseNewsroom={enhance,headlines,rules:rules.map(r=>r.key)};
})(typeof window!=='undefined'?window:globalThis);
