/* CyberPulse Newsroom Intelligence v8.
 * Editorial keyword extraction, search direction and explainable subject-fit.
 * Works fully in-browser without a paid API or invented facts. Metadata-only:
 * source descriptions may be wrong, and matching does not prove event depiction.
 */
(function(root){
  'use strict';
  const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const unique=arr=>[...new Set(arr.filter(Boolean).map(clean))];
  const lexicon={
    people:[
      ['Donald Trump',/\b(?:President\s+)?Donald\s+Trump\b|\bTrump(?:’s|'s)?\b/i],
      ['Emil Michael',/\bEmil\s+Michael\b/i],
      ['Joe Biden',/\b(?:President\s+)?Joe\s+Biden\b/i],
      ['Jensen Huang',/\bJensen\s+Huang\b/i],
      ['Satya Nadella',/\bSatya\s+Nadella\b/i]
    ],
    organizations:[
      ['U.S. Department of Defense',/\b(?:Defense|Defence)\s+Department\b|\bDepartment\s+of\s+Defense\b|\bPentagon\b/i],
      ['White House',/\bWhite\s+House\b/i],
      ['OpenAI',/\bOpenAI\b/i],
      ['Hugging Face',/\bHugging\s+Face\b/i],
      ['Microsoft',/\bMicrosoft\b|\bMicrosoft\s*365\b/i],
      ['NVIDIA',/\bNVIDIA\b/i],
      ['Google',/\bGoogle\b/i],
      ['Amazon AWS',/\bAWS\b|\bAmazon\s+Web\s+Services\b/i],
      ['Apple',/\bApple\b/i],
      ['CrowdStrike',/\bCrowdStrike\b/i],
      ['U.S. government',/\b(?:U\.S\.|United\s+States)\s+(?:government|administration|federal)\b/i]
    ],
    story:[
      ['AI task force',/\bAI\s+task\s+force\b/i],
      ['AI-powered cyberattacks',/\bAI[- ](?:powered|driven)\s+cyberattacks?\b|\bcyberattacks?\s+(?:powered|driven)\s+by\s+(?:artificial\s+intelligence|AI)\b/i],
      ['autonomous AI agents',/\bautonomous\s+AI\s+agents?\b|\bAI\s+agents?\s+that\s+can\s+hack\b/i],
      ['AI safety incident reporting',/\bAI\s+safety\s+incidents?\b/i],
      ['cyberattack disclosure',/\bdisclos(?:e|ure|ing)\s+(?:cyber)?attacks?\b|\breporting\s+(?:of\s+)?(?:AI\s+)?cyberattacks?\b/i],
      ['critical infrastructure security',/\bcritical\s+infrastructure\b/i],
      ['cybersecurity information sharing',/\bcybersecurity\s+information\s+sharing\b|\bsharing\s+cybersecurity\s+information\b/i],
      ['government AI policy',/\b(?:AI|artificial\s+intelligence)\s+(?:policy|regulation|legislation|governance)\b|\bgovernment['’]?s\s+approach\b/i],
      ['cloud service outage',/\b(?:service|platform|cloud)\s+outage\b|\bservices?\s+offline\b|\brecovery\s+under\s+way\b/i],
      ['data breach',/\bdata\s+breach\b|\bpersonal\s+data\s+(?:expos|leak)\w*\b/i],
      ['ransomware attack',/\bransomware\b/i],
      ['phishing',/\bphishing\b/i],
      ['AI chip / GPU',/\b(?:AI\s+chip|graphics\s+card|semiconductor|GPU|Blackwell)\b/i]
    ],
    sectors:[
      ['banking',/\bbanking\b|\bbanks?\b/i],
      ['energy',/\benergy\b|\bpower\s+grid\b/i],
      ['emergency services',/\bemergency\s+services\b/i],
      ['healthcare',/\bhospitals?\b|\bhealthcare\b/i],
      ['education',/\buniversity\b|\bstudents?\b|\bcampus\b/i],
      ['data centers',/\bdata\s+cent(?:er|re)s?\b/i]
    ],
    policy:[
      ['Cybersecurity Information Sharing Act',/\b(?:2015\s+)?Cybersecurity\s+Information\s+Sharing\s+Act\b/i],
      ['national reporting standards',/\bnational\s+standards?\b/i],
      ['legal safe-harbor protections',/\bwithout\s+legal\s+risk\b|\bsafe\s*harbor\b|\blegal\s+protections?\b/i],
      ['vulnerability disclosure',/\bdisclos(?:e|ure|ing)\s+vulnerabilities\b|\bvulnerability\s+disclosure\b/i]
    ],
    locations:[
      ['United States',/\bU\.S\.\b|\bUnited\s+States\b|\bAmerican\s+government\b/i],
      ['Washington, D.C.',/\bWashington(?:,?\s*D\.?C\.?)?\b/i]
    ]
  };
  function detect(title,body){
    const full=clean([title,body].filter(Boolean).join(' '));
    const lead=clean([title,body.slice(0,800)].join(' '));
    const result={};
    for(const [group,terms] of Object.entries(lexicon)){
      result[group]=terms.filter(([,rx])=>rx.test(full)).map(([name,rx])=>({name,lead:rx.test(lead),first:full.search(rx)}))
        .sort((a,b)=>Number(b.lead)-Number(a.lead)||a.first-b.first).map(({name,lead})=>({name,lead}));
    }
    return result;
  }
  const photoIdeas={
    'Donald Trump':['Donald Trump White House official photograph','President Donald Trump speaking Washington DC','Donald Trump White House press conference','Donald Trump portrait photograph'],
    'Emil Michael':['Emil Michael Department of Defense official photograph','Emil Michael technology official photograph'],
    'U.S. Department of Defense':['Pentagon building Washington DC exterior photograph','United States Department of Defense Pentagon building','Pentagon headquarters aerial photograph'],
    'White House':['White House Washington DC exterior photo','White House press briefing room'],
    'Microsoft':['Microsoft headquarters building photograph','Microsoft logo on office building photo','Microsoft office campus Redmond'],
    'NVIDIA':['NVIDIA building headquarters photograph','NVIDIA graphics card GPU hardware photo','NVIDIA technology event photograph'],
    'OpenAI':['OpenAI office building photograph','OpenAI headquarters photograph'],
    'Hugging Face':['Hugging Face company event photograph'],
    'Google':['Google company headquarters photograph','Google campus exterior'],
    'Apple':['Apple Park building Cupertino photo','Apple iPhone product photograph'],
    'Amazon AWS':['Amazon cloud data center photograph','Amazon headquarters building'],
    'CrowdStrike':['CrowdStrike company headquarters photograph']
  };
  const incidentIdeas={
    'AI task force':['United States Capitol building Washington photograph','White House Washington DC exterior photo','Pentagon building Washington DC photograph'],
    'AI-powered cyberattacks':['security operations center screens photograph','cybersecurity researchers working computers'],
    'autonomous AI agents':['artificial intelligence computer laboratory','technology research computers office'],
    'AI safety incident reporting':['government committee meeting technology photo','government cybersecurity officials briefing'],
    'cyberattack disclosure':['cybersecurity government policy meeting','security operations center real photo'],
    'critical infrastructure security':['electric power substation infrastructure photo','power grid electrical transmission photograph','data center server racks photograph'],
    'cybersecurity information sharing':['computer security operations room photograph','government technology conference photograph'],
    'cloud service outage':['data center servers photographs','Microsoft office headquarters photograph'],
    'data breach':['university campus exterior photo','server room infrastructure photograph'],
    'ransomware attack':['cybersecurity analyst office computer photograph','computer data center rack photo'],
    'phishing':['email on laptop workplace photograph','smartphone email application photo'],
    'AI chip / GPU':['GPU graphics card hardware close up','semiconductor microchip motherboard photo']
  };
  function plan(title,body,base){
    const groups=detect(title,body);
    const governmentAI=groups.story.some(x=>x.name==='AI task force') ||
      (/\b(?:task\s+force|government|administration|defense\s+department|national\s+standards?)\b/i.test(body)&&/\bAI\b/i.test(body)&&/\b(?:cyberattack|cybersecurity|safety)\b/i.test(body));
    const mainPeople=groups.people.filter(x=>x.lead);
    const mainOrgs=groups.organizations.filter(x=>x.lead && (governmentAI ? !['OpenAI','Hugging Face'].includes(x.name) : true));
    const named=unique([...mainPeople,...mainOrgs,...groups.people,...groups.organizations].map(x=>x.name));
    const topNames=unique([...mainPeople,...mainOrgs].map(x=>x.name));
    const subjects=unique([...topNames,...named]);
    const mainStory=groups.story.find(x=>x.lead)?.name||groups.story[0]?.name||base.angle||base.primary;
    let primary=unique(topNames.flatMap(s=>photoIdeas[s]||[])).slice(0,8);
    let settings=unique([...(photoIdeas['U.S. Department of Defense']||[]),...(incidentIdeas[mainStory]||[])]);
    if(!governmentAI)settings=unique([...(incidentIdeas[mainStory]||[]),...(base.searchModes?.context||[])]);
    if(governmentAI){
      // A photo of Trump or Pentagon is illustrative, not proof of the alleged meeting.
      primary=unique([...primary,...(photoIdeas['Donald Trump']||[]),...(photoIdeas['U.S. Department of Defense']||[])]).slice(0,9);
      settings=unique([...settings,...(incidentIdeas['AI task force']||[]),...((base.searchModes?.context)||[])]);
    }
    const people=unique(groups.people.map(x=>x.name));
    const orgs=unique(groups.organizations.map(x=>x.name));
    const headlines=unique([mainStory,...groups.story.map(x=>x.name)]).slice(0,5);
    const wide=unique([...primary,...settings,...(base.searchModes?.editorial||[]),...(base.searchModes?.concept||[])]).slice(0,20);
    // Rotate genuinely different editorial angles early rather than four near-identical portraits.
    const topSearches=governmentAI
      ? unique([primary[0],(photoIdeas['U.S. Department of Defense']||[])[0],
        (photoIdeas['White House']||[])[0],people.includes('Emil Michael')?(photoIdeas['Emil Michael']||[])[0]:'',
        ...primary,...settings])
      : unique([primary[0],settings[0],...primary.slice(1),...settings]);
    const directions={
      editorial:topSearches.slice(0,12),
      context:unique([...settings,...primary.slice(0,3),...(base.searchModes?.context||[])]).slice(0,12),
      concept:unique([...(base.searchModes?.concept||[]),...(incidentIdeas[mainStory]||[])]).slice(0,12)
    };
    const focus=governmentAI?'US AI cyberattack reporting policy':mainStory;
    const proposedHeadlines=[];
    if(governmentAI){
      if(people.includes('Donald Trump')&&groups.story.some(x=>x.name==='AI task force')&&/\b(?:report|disclos|sharing)\w*/i.test(body))
        proposedHeadlines.push('Trump AI Task Force Weighs Reporting Rules for AI-Driven Cyberattacks');
      if(groups.story.some(x=>x.name==='AI safety incident reporting'))
        proposedHeadlines.push('U.S. Advisers Explore National Standards for Reporting AI Safety Incidents');
      if(groups.sectors.some(x=>x.name==='energy'||x.name==='banking')&&/\bcyberattacks?\b/i.test(body))
        proposedHeadlines.push('AI Cyberattack Reporting Draws Scrutiny Over Critical Infrastructure Risks');
      if(people.includes('Emil Michael')&&groups.policy.some(x=>x.name==='national reporting standards'))
        proposedHeadlines.push('Defense Technology Chief Discusses AI Incident Reporting Standards');
    }
    const evidence=governmentAI
      ?'Prioritise real photographs of Donald Trump, the Pentagon and U.S. government institutions. AI incidents and infrastructure are supporting context—not proof an event occurred.'
      :`Prioritise real photographs of ${topNames[0]||mainStory}; use broad technology scenes only as clearly illustrative alternatives.`;
    return {groups,subjects,mainSubjects:topNames.length?topNames.slice(0,3):subjects.slice(0,2),mainStory,focus,governmentAI,
      highlightedKeywords:unique([...people,...orgs,...headlines,...groups.sectors.map(x=>x.name),...groups.policy.map(x=>x.name)]).slice(0,18),
      searchModes:directions,searchOrder:wide,primaryQuery:directions.editorial[0]||base.primaryQuery,
      summary:evidence,suggestedHeadlines:unique(proposedHeadlines).slice(0,4),
      caution:governmentAI?'Do not label a generic Trump, Pentagon or government image as a photo of the AI task-force meeting; the article claims must be independently fact-checked.':'Matching a name in image metadata does not prove the photograph depicts this news event.'};
  }
  const normalized=s=>clean(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9\s]/g,' ');
  const contains=(text,phrase)=>{
    const t=normalized(text),p=normalized(phrase);
    if(!p)return false;
    if(t.includes(p))return true;
    if(p==='u s department of defense')return /\bpentagon\b|\bdepartment of defen[sc]e\b/.test(t);
    if(p==='donald trump')return /\btrump\b/.test(t);
    if(p==='microsoft')return /\bmicrosoft\b|\bwindows\b/.test(t);
    if(p==='nvidia')return /\bnvidia\b|\bgeforce\b/.test(t);
    return false;
  };
  function evaluatePhoto(item,article){
    const intelligence=article?.editorial;
    if(!intelligence)return {label:'Context needs review',level:'review',explanation:'Confirm image content from its source.',subjectMatches:[],contextMatches:[]};
    const meta=[item.title||'',item.tags||'',item.description||''].join(' ');
    const primary=intelligence.mainSubjects||[];
    const direct=primary.filter(n=>contains(meta,n));
    const secondary=(intelligence.subjects||[]).filter(n=>!primary.includes(n)&&contains(meta,n));
    const concepts=unique([intelligence.mainStory,intelligence.focus,...(intelligence.groups.story||[]).map(x=>x.name),
      ...(intelligence.groups.sectors||[]).map(x=>x.name)]).filter(n=>contains(meta,n));
    // A standalone OpenAI photo is NOT a good lead photo for a Trump task-force story.
    const secondaryOnly=!direct.length&&secondary.length>0;
    let level='review',label='Generic / review';
    if(direct.length){level='direct';label='Named subject match';}
    else if(concepts.length){level='context';label='Contextual match';}
    else if(secondaryOnly){level='secondary';label='Supporting mention only';}
    const explanation=direct.length?`Source metadata mentions ${direct.slice(0,2).join(', ')}. Verify that the photograph and date suit the story.`:
      concepts.length?`Related topic in metadata: ${concepts.slice(0,2).join(', ')}. Illustrative, not an event photograph.`:
      secondaryOnly?`Photo relates to ${secondary.slice(0,2).join(', ')}, but that is not the story's main subject.`:
      'No clear story-specific clue in the image description; consider another photo.';
    return {label,level,explanation,subjectMatches:direct,contextMatches:concepts,secondaryMatches:secondary};
  }
  root.CyberPulseEditorial={detect,plan,evaluatePhoto};
})(typeof window!=='undefined'?window:globalThis);
