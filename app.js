/* CyberPulse Newsroom v6 — dependable, free/no-key editorial image discovery.
 * Fetches Openverse and Wikimedia Commons independently with real pagination.
 * Optional CLIP scans pixels; search never relies on the vision model. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('article-form'), titleInput=$('article-title'), bodyInput=$('article-body');
  const queryInput=$('search-query'), grid=$('image-grid'), state=$('result-state');
  const licenseFilter=$('license-filter'), matchFilter=$('match-filter');
  const sourceFilter=$('source-filter'), sortFilter=$('sort-filter'), storyFilter=$('story-filter');
  const $more=$('load-more'), $deep=$('deep-search'), toastEl=$('toast');
  const $topRefresh=$('top-refresh-search'), $topMore=$('top-load-more'), $topDeep=$('top-deep-search');
  let analysis=null, currentQuery='', activeQuery='', batch=0, pendingController=null, activeMode='context', cropMode='card';
  let allImages=[], seen=new Set(), selectedItem=null, onlySaved=false, pending=false, deepPending=false, visionPending=false, toastTimer;
  const $progress=$('search-progress'), $progressText=$('search-progress-text'), $notice=$('curation-notice');
  let lastNewCount=0, lastFreshBatch=0, lastRelevantNewCount=0;
  let shortlistIds=[];
  let safeStorage=null;try{safeStorage=window.localStorage;}catch{/* ephemeral / restricted browser */}
  const learner=window.CyberPulseLearning.create(safeStorage);
  const prime=window.CyberPulsePrime;
  const searchedPhrases=new Set(),searchedProviderQueries=new Set();
  let researchRunning=false,autoResearchDone=false,rateLimitSeen=false;

  const favoriteKey='cyberpulse-stock-favorites-v3';
  let favorites={};
  try {favorites=JSON.parse(localStorage.getItem(favoriteKey)||'{}')||{};}catch{favorites={};}

  const show=(el,on=true)=>{if(el)el.hidden=!on;};
  const short=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,120);
  const txt=(tag,cls,content='')=>{const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=content;return el;};
  const safeUrl=value=>{try{const u=new URL(String(value));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
  const formatNum=n=>Number(n||0).toLocaleString('en-US');
  const slug=s=>String(s||'image').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'image';
  const graphicTerms=window.CyberPulseRelevance.blocked;
  function toast(message){toastEl.textContent=message;toastEl.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('visible'),4000);}
  function progress(message,visible=true){if($progressText)$progressText.textContent=message;show($progress,visible);}
  function notice(message,visible=true){if($notice){$notice.textContent=message;show($notice,visible);}}
  function primeStatus(title,copy,log=[],visible=true){
    show($('prime-status-box'),visible);
    if(!visible)return;
    $('prime-status-title').textContent=title;
    $('prime-status-copy').textContent=copy;
    const logEl=$('prime-search-log');logEl.replaceChildren();
    for(const q of log.slice(-6))logEl.append(txt('span','',q));
  }
  function preferencePoints(item){return learner.preference(item,analysis).points;}
  function feedbackDecision(item){return analysis?learner.decision(item,analysis):'';}
  function updateLearning(message){
    const stats=learner.stats();
    $('learn-used').textContent=String(stats.used);
    $('learn-picked').textContent=String(stats.pick);
    $('learn-rejected').textContent=String(stats.reject);
    $('learning-enabled').checked=stats.enabled;
    $('learning-status').textContent=message || (stats.total
      ?`${stats.total} editorial choices saved in this browser · similar-story photo preferences now influence ranking (not Article Match %).`
      :'No feedback yet. Choose Good photo, Not relevant, or Selected for WordPress to improve future similar-story results.');
  }
  function addFeedback(item,kind){
    if(!analysis)return toast('Analyse the story first.');
    const was=feedbackDecision(item);
    if(was===kind){learner.undo(item,analysis);updateLearning('Editorial choice removed.');}
    else {learner.add(item,analysis,kind);updateLearning(kind==='used'?'Banner selection saved for learning.':kind==='pick'?'Good image preference saved.':'This photo is marked Not relevant and hidden by default.');}
    renderGrid();
  }

  function resetState(title,description,error=false){
    state.classList.toggle('error',error);state.replaceChildren(txt('div','result-placeholder-icon',error?'!':'▧'),txt('h3','',title),txt('p','',description));
    show(state,true);show(grid,false);
  }
  function updateLinks(){
    const q=currentQuery||analysis?.stockSearches?.[0]||'cybersecurity technology';
    $('open-openverse').href=`https://openverse.org/search/image?q=${encodeURIComponent(q)}`;
    $('open-commons').href=`https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=${encodeURIComponent(q)}`;
  }
  function renderChips(id,phrases){
    const container=$(id);container.replaceChildren();
    for(const phrase of [...new Set(phrases)].slice(0,8)){
      const button=txt('button','query-chip',phrase);button.type='button';
      button.addEventListener('click',()=>{queryInput.value=phrase;startNewSearch(phrase);});container.appendChild(button);
    }
  }
  function headlineSuggestions(){
    const wrap=$('headline-suggestions');wrap.replaceChildren();
    (analysis?.titleSuggestions||[]).slice(0,4).forEach((headline,i)=>{
      const row=txt('div','headline-option');
      const inner=txt('div','headline-label');inner.append(txt('span','headline-index',String(i+1).padStart(2,'0')),txt('span','headline-text',headline));
      const use=txt('button','use-title','Use');use.type='button';use.setAttribute('aria-label',`Use headline ${i+1}`);
      use.addEventListener('click',()=>{titleInput.value=headline;count();toast('Suggested title copied into the article title field.');});
      row.append(inner,use);wrap.appendChild(row);
    });
  }
  function renderEditorialIntelligence(result){
    const info=result.editorial;
    if(!info){show($('editorial-intelligence'),false);return;}
    show($('editorial-intelligence'),true);
    $('editorial-summary').textContent=info.summary;
    const groups=$('editorial-keyword-groups');groups.replaceChildren();
    const sections=[['People',info.groups.people],['Organizations',info.groups.organizations],
      ['Story & incident',info.groups.story],['Critical sectors',info.groups.sectors],
      ['Policy & law',info.groups.policy]];
    for(const [name,items] of sections){
      if(!items?.length)continue;
      const block=txt('div','keyword-group');block.appendChild(txt('strong','',name));
      const chips=txt('div','keyword-group-chips');
      for(const entry of items.slice(0,7)){
        const chip=txt('span',entry.lead?'keyword-pill lead-keyword':'keyword-pill',entry.name);
        chip.title=entry.lead?'Mentioned in article opening':'Mentioned later in the article';chips.append(chip);
      }
      block.append(chips);groups.append(block);
    }
    const container=$('editorial-search-plan');container.replaceChildren();
    for(const phrase of (info.searchModes.editorial||[]).slice(0,6)){
      const btn=txt('button','query-chip story-search-chip',phrase);btn.type='button';
      btn.addEventListener('click',()=>{queryInput.value=phrase;startNewSearch(phrase);});container.append(btn);
    }
  }
  function copyKeywordPlan(){
    if(!analysis?.editorial){toast('Analyse an article to create keywords.');return;}
    const ed=analysis.editorial;
    const content=['CYBERPULSE — NEWSROOM IMAGE PLAN',
      `Headline: ${titleInput.value||analysis.titleSuggestions?.[0]||'Review headline'}`,
      `Category: ${analysis.primary}`,
      `Main subject: ${(ed.mainSubjects||[]).join(' / ')||ed.mainStory}`,
      `Story focus: ${ed.focus}`,
      ...Object.entries(ed.groups).filter(([name,list])=>list.length).map(([name,list])=>`${name}: ${list.map(x=>x.name).join(', ')}`),
      'Image searches:',...(ed.searchModes.editorial||[]).slice(0,8).map(x=>`- ${x}`),
      `Editorial warning: ${ed.caution}`,
      'Photo metadata matches do not prove that a photo documents the reported event. Check licensing.'].join('\n');
    copyText(content,'Article image brief copied.');
  }
  function renderShortlist(filtered){
    const el=$('editor-shortlist');shortlistIds=[];
    if(!analysis||onlySaved||!filtered.length){show(el,false);return;}
    const result=prime.choose(filtered.filter(item=>feedbackDecision(item)!=='reject'),preferencePoints);
    if(!result.items.length){show(el,false);return;}
    shortlistIds=result.items.map(item=>item.id);show(el,true);
    $('shortlist-title').textContent=result.headline;
    $('shortlist-note').textContent=result.note;
    $('shortlist-note').classList.toggle('shortlist-review-alert',result.type==='alternatives');
    const wrap=$('shortlist-cards');wrap.replaceChildren();
    result.items.forEach((item,i)=>{
      const button=txt('button','shortlist-item');button.type='button';
      const img=document.createElement('img');img.src=item.thumbnail;img.alt=item.title;img.loading='lazy';
      const detail=txt('div','shortlist-item-detail');
      const category=result.type==='strong'?'ARTICLE-ALIGNED':'REVIEW BEFORE PUBLISHING';
      detail.append(txt('span','shortlist-rank',`OPTION ${i+1} · ${category} · ${item.match.score}% estimated`),
        txt('strong','',item.title),txt('small','',`${item.editorialFit?.label||'Review photo'} · ${item.source}`));
      button.append(img,detail);button.addEventListener('click',()=>openPreview(item));wrap.append(button);
    });
  }
  function renderAnalysis(result){
    show($('analysis-empty'),false);show($('analysis-content'),true);show($('visual-intent'),true);show($('vision-panel'),true);
    show($('results-controls'),true);show($('rating-explainer'),true);show($('results-top-actions'),true);
    $('primary-category').textContent=result.primary;
    $('category-symbol').textContent=result.symbol;
    $('category-reason').textContent=result.reason;
    $('confidence-pill').textContent=result.confidence;
    $('secondary-categories').replaceChildren();
    (result.other.length?result.other:['No strong alternative']).forEach(x=>$('secondary-categories').appendChild(txt('span','category-chip',x)));
    activeMode=result.recommendedMode;
    headlineSuggestions();
    renderChips('query-chips',result.searchModes?.[activeMode]||result.stockSearches||[]);renderChips('more-chips',(result.stockSearches||[]).slice(1));
    const q=result.primaryQuery||result.stockSearches?.[0];
    queryInput.value=q;
    $('visual-context-title').textContent=`${result.angle} · ${result.visualSubject}`;
    $('visual-context-copy').textContent=result.editorial?.summary || (result.entity
      ?`Prioritising photos that fit this ${result.entity} story, with real settings and technology as alternatives.`
      :'Prioritising real-world scenes rather than generic lock and hacker pictures.');
    $('newsroom-angle').textContent=`Angle: ${result.angle}`;
    $('newsroom-subject').textContent=`Subject: ${result.visualSubject}`;
    $('editorial-warning').textContent=result.editorialWarning;
    $('headline-source-note').textContent=result.headlineSource+' · Check every fact before publishing.';
    activeMode=result.recommendedMode;
    document.querySelectorAll('[data-photo-mode]').forEach(el=>{
      const yes=el.dataset.photoMode===activeMode;el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));
    });
    renderEditorialIntelligence(result);
    updateLinks();
  }
  function isPublicLicense(raw){const s=String(raw||'').toLowerCase();return /cc0|public.?domain|\bpdm\b|^pd$/.test(s);}
  function acceptedLicense(item){
    const lic=String(item.license||'').toLowerCase().replace(/\s+/g,'');
    if(!lic||/noncommercial|noderivatives|by-nc|by-nd|nc-|nd-/.test(lic))return false;
    const good=isPublicLicense(lic)||lic==='by'||lic==='by-sa'||lic.startsWith('ccby')||lic.startsWith('cc-by')||lic.includes('attribution');
    if(!good)return false;
    if(licenseFilter.value==='no-credit')return isPublicLicense(lic);
    if(licenseFilter.value==='credit')return !isPublicLicense(lic);
    return true;
  }
  function normalizeOpenverse(d){
    return {id:'ov:'+d.id,source:'Openverse',title:d.title||'Untitled photograph',tags:(d.tags||[]).slice(0,26).map(t=>typeof t==='string'?t:t?.name||'').join(' '),
      creator:d.creator||'Unknown photographer',imageUrl:safeUrl(d.url),thumbnail:safeUrl(d.thumbnail)||safeUrl(d.url),
      sourceUrl:safeUrl(d.foreign_landing_url)||safeUrl(d.detail_url)||safeUrl(d.url),
      license:String(d.license||'').toLowerCase(),licenseUrl:safeUrl(d.license_url),attribution:d.attribution||'',
      width:Number(d.width)||0,height:Number(d.height)||0,mime:String(d.filetype||''),kind:String(d.category||'photograph')};
  }
  async function getJson(url,signal){
    const controller=new AbortController();
    const stop=()=>controller.abort();
    signal?.addEventListener('abort',stop,{once:true});
    const timeout=setTimeout(stop,12500);
    try{
      const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
      if(!response.ok)throw Error(`Image library returned ${response.status}`);
      return await response.json();
    }finally{clearTimeout(timeout);signal?.removeEventListener('abort',stop);}
  }
  async function searchOpenverse(q,page,signal){
    const url=new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q',short(q));url.searchParams.set('page_size','20');url.searchParams.set('page',String(page));
    url.searchParams.set('license','cc0,pdm,by,by-sa');url.searchParams.set('mature','false');
    // Do NOT restrict to 'wide' and 'photograph' at the API: sparse cyber topics can yield zero results.
    // Rank/select in the browser instead so the tool still shows useful choices.
    const data=await getJson(url.href,signal);
    if(!Array.isArray(data.results))throw Error('Image library sent an invalid response');
    return data.results.map(normalizeOpenverse);
  }
  function stripHtml(html){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    return (doc.body.textContent||'').replace(/\s+/g,' ').trim();
  }
  function normalizeCommons(page){
    const info=page.imageinfo?.[0];if(!info)return null;
    const meta=info.extmetadata||{};
    const field=name=>stripHtml(meta[name]?.value||'');
    const license=field('LicenseShortName')||field('UsageTerms');
    return {id:'wm:'+page.pageid,source:'Wikimedia Commons',
      title:String(page.title||'').replace(/^File:/i,'').replace(/\.[^.]{2,6}$/,'').replaceAll('_',' '),
      tags:`${field('ImageDescription')} ${field('ObjectName')}`.slice(0,350),
      creator:field('Artist').slice(0,120)||'Wikimedia contributor',
      thumbnail:safeUrl(info.thumburl)||safeUrl(info.url),imageUrl:safeUrl(info.url),
      sourceUrl:safeUrl(info.descriptionurl)||`https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title||'').replaceAll(' ','_'))}`,
      license,licenseUrl:safeUrl(meta.LicenseUrl?.value)||'',attribution:'',
      width:Number(info.width)||0,height:Number(info.height)||0,mime:String(info.mime||''),kind:'photograph'};
  }
  async function searchCommons(q,page,signal){
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    const parameters={action:'query',generator:'search',gsrsearch:short(q)+' filetype:bitmap',
      gsrnamespace:'6',gsrlimit:'20',gsroffset:String((page-1)*20),
      prop:'imageinfo',iiprop:'url|size|extmetadata|mime',iiurlwidth:'720',
      format:'json',formatversion:'2',origin:'*'};
    Object.entries(parameters).forEach(([key,value])=>url.searchParams.set(key,value));
    const data=await getJson(url.href,signal);
    return (data.query?.pages||[]).map(normalizeCommons).filter(Boolean);
  }
  function sourceJobs(phrase,page,signal){
    return [
      {name:'Openverse',promise:searchOpenverse(phrase,page,signal)},
      {name:'Wikimedia Commons',promise:searchCommons(phrase,page,signal)}
    ];
  }
  function isPhoto(item){
    if(!item.id||!item.imageUrl||!item.thumbnail||!item.sourceUrl)return false;
    if(!['Openverse','Wikimedia Commons'].includes(item.source))return false;
    if(item.kind==='illustration'||/svg|gif/i.test(item.mime||''))return false;
    const details=`${item.title} ${item.tags||''}`;
    // Photographs of a sign or phone displaying a brand logo can be good news photos.
    // Block standalone logo files, but do not block every photograph mentioning a logo.
    if(graphicTerms.test(details)||/^(?:official\s+|company\s+)?(?:logo|logotype|emblem)(?:\s+of|\s+for|[:.\s]|$)/i.test(item.title))return false;
    // Prefer professional-quality wide photography, but do not discard valid editorial photos.
    // A low-resolution image is still a visible choice, clearly identified on its card.
    return acceptedLicense(item);
  }
  function rated(item,query){
    const raw=window.CyberPulseRelevance.estimate(item,query,analysis);
    const editorialFit=window.CyberPulseEditorial?.evaluatePhoto(item,analysis)||null;
    let score=raw.score;
    if(editorialFit){
      if(editorialFit.level==='direct')score=Math.min(99,score+17);
      else if(editorialFit.level==='context')score=Math.min(82,score+5);
      else if(editorialFit.level==='secondary')score=Math.min(53,score-18);
      else score=Math.min(48,score-20);
    }
    const visual=item.vision;
    if(visual) score=window.CyberPulseVision.combineScore(score,visual.affinity);
    // A pixel similarity result cannot establish that an image depicts a named incident.
    if(editorialFit?.level==='review')score=Math.min(score,58);
    if(editorialFit?.level==='secondary')score=Math.min(score,53);
    // Do not let resolution/crop alone make unrelated artwork look like a story match.
    if(editorialFit?.level==='review'&&!visual)score=Math.min(score,45);
    const tier=score>=80?'Strong estimated relevance':score>=60?'Related visual':score>=40?'Illustrative — review':'Low story relevance';
    const reason=editorialFit?.explanation||raw.reason;
    return {...item,editorialFit,match:{...raw,score,tier,reason:visual?`${reason} · CLIP reviewed pixels (${visual.affinity}% relative similarity).`:reason}};
  }
  function updateSavedCount(){$('saved-count').textContent=Object.keys(favorites).length;}
  function saveFavorite(item){
    if(favorites[item.id])delete favorites[item.id];
    else favorites[item.id]={...item,match:undefined};
    try{localStorage.setItem(favoriteKey,JSON.stringify(favorites));}catch{toast('Browser storage is full or disabled. Saved photos may not persist.');}
    updateSavedCount();renderGrid();
  }
  function setPending(value){pending=value;$more.disabled=value;$deep.disabled=value;$('refresh-search').disabled=value;if($topRefresh)$topRefresh.disabled=value;if($topMore)$topMore.disabled=value;if($topDeep)$topDeep.disabled=value;
    $more.textContent=value?'Searching free image libraries…':'↻ Find more photos';if($topMore)$topMore.textContent=value?'Searching…':'＋ More results';
    if($topRefresh)$topRefresh.innerHTML=value?'⌛ FINDING NEW PHOTOS…':'<span aria-hidden="true">↻</span> REFRESH — NEW STORY PHOTOS';}
  function toggleSaved(){onlySaved=!onlySaved;$('saved-toggle').setAttribute('aria-pressed',String(onlySaved));
    $('saved-toggle').classList.toggle('active',onlySaved);renderGrid();}
  function renderGrid(){
    const data=onlySaved?Object.values(favorites).map(x=>rated(x,currentQuery||analysis?.stockSearches?.[0]||'')):allImages;
    const minMatch=Number(matchFilter.value)||0;
    const eligible=data.filter(x=>x.match.score>=minMatch&&(sourceFilter.value==='all'||x.source===sourceFilter.value)&&acceptedLicense(x)
      &&($('show-rejected').checked||feedbackDecision(x)!=='reject'));
    const focused=eligible.filter(x=>x.editorialFit?.level==='direct'||x.editorialFit?.level==='context');
    const useFocus=storyFilter.value==='focused'&&!onlySaved;
    const filtered=useFocus&&focused.length?focused:eligible;
    if(useFocus&&!focused.length&&eligible.length)notice('No clear named-subject / story-context photo found in source descriptions yet. Showing broader options clearly marked for review; try Refresh or another photo direction.');
    else if(lastFreshBatch>1 && lastNewCount>0 && lastRelevantNewCount>0)notice(`${lastRelevantNewCount} article-aligned new photos out of ${lastNewCount} newly found. Fresh matching options appear first; earlier ones remain available.`);
    else if(lastFreshBatch>1 && lastNewCount>0)notice(`${lastNewCount} new photo candidates found, but none passed the article-specific metadata check. Existing good matches are preserved. Select “Show all options” to review them, or Refresh again.`);
    else notice('',false);
    const fitRank={direct:4,context:3,secondary:1,review:0};
    filtered.sort((a,b)=>{
      // Article subject/context always outranks learned preferences.
      const storyPriority=(fitRank[b.editorialFit?.level]||0)-(fitRank[a.editorialFit?.level]||0);
      if(storyPriority)return storyPriority;
      if(sortFilter.value==='newest'&&b._batch!==a._batch)return (b._batch||0)-(a._batch||0);
      if(sortFilter.value==='resolution')return (b.width*b.height-a.width*a.height)||((b.match.score+preferencePoints(b))-(a.match.score+preferencePoints(a)));
      if(sortFilter.value==='visual'&&Boolean(a.vision)!==Boolean(b.vision))return Number(!!b.vision)-Number(!!a.vision);
      return (b.match.score+preferencePoints(b))-(a.match.score+preferencePoints(a)) || (b.width*b.height-a.width*a.height);
    });
    renderShortlist(eligible);
    if(filtered.length){grid.replaceChildren(...filtered.map(renderCard));show(grid,true);show(state,false);}
    else if(!pending){resetState(onlySaved?'No saved photos for these filters':'No photos match the selected filters',
      onlySaved?'Save a photo by tapping the star, or adjust your match/source filters.':'Try All rated, All sources and Eligible licences; then search again.');}
    $('result-counter').textContent=`${filtered.length} displayed · ${allImages.length} discovered`;
    show($('load-more-wrap'),Boolean(analysis)&&!onlySaved);show($('results-top-actions'),Boolean(analysis)&&!onlySaved);
    $('load-more-status').textContent=batch?`Batch ${batch} explored · duplicates hidden · ${allImages.length} unique photos found`:'Each click explores additional results and avoids duplicates';
    updateSavedCount();
  }

function strictCandidates(){
  if(!analysis)return [];
  const primary=(analysis.searchModes?.[activeMode]||[]).map(short);
  const editorial=(analysis.editorialSearches||[]).map(short);
  const context=(analysis.searchModes?.context||[]).map(short);
  const concept=(analysis.searchModes?.concept||[]).map(short);
  let phrases=[];
  if(analysis.entity){
    phrases=[...primary,...editorial,...context];
  }else if(['hardware','service-outage','data-breach','university-breach','government-ai','phishing','ransomware'].includes(analysis.directionKey)){
    phrases=[...primary,...context,...editorial,...concept];
  }else{
    phrases=[...primary,...context,...concept,...editorial];
  }
  return [...new Set(phrases.map(short).filter(Boolean))].slice(0,12);
}
function selectPhraseForBatch(query,next){
  const strict=strictCandidates();
  const broad=[query,...(analysis?.stockSearches||[]),...(analysis?.editorialSearches||[])].map(short).filter(Boolean);
  const choices=[...new Set([query,...strict,...broad])].slice(0,12);
  const firstWindow=Math.min(4, choices.length||1);
  if(next<=firstWindow){
    return {phrase:choices[next-1], page:1, strict:true};
  }
  const offset=next-firstWindow-1;
  const phrase=choices[offset % choices.length];
  const page=Math.floor(offset / choices.length)+2;
  return {phrase,page,strict:false};
}


async function runSearch(q,{append=false}={}){
  const query=short(q);
  if(!query){toast('Enter search keywords first.');return;}
  if(pending)return;
  if(!analysis){toast('Please analyse an article first.');return;}
  if(!append||query!==activeQuery){
    pendingController?.abort();activeQuery=query;batch=0;seen=new Set();allImages=[];lastNewCount=0;lastFreshBatch=0;lastRelevantNewCount=0;
    searchedPhrases.clear();searchedProviderQueries.clear();autoResearchDone=false;rateLimitSeen=false;
    sortFilter.value='match';
    resetState('Finding photos for your story…','Searching real photo libraries across story-specific angles.');
    $('result-counter').textContent='';notice('',false);
  }
  currentQuery=query;queryInput.value=query;updateLinks();
  pendingController?.abort();const pendingNow=new AbortController();pendingController=pendingNow;setPending(true);
  const next=batch+1;
  const planner=window.CyberPulseSearchPlan;
  const selections=planner.batchPlan(analysis,activeMode,query,next,learner);
  // Each click tries TWO different editorial directions, then up to two deeper alternatives if neither yields photos.
  const attempted=[];let newlyAdded=0;let unavailable=[];
  try{
    const trySelection=async(sel)=>{
      if(pendingNow.signal.aborted)return;
      attempted.push(sel.phrase);searchedPhrases.add(sel.phrase.toLowerCase());
      progress(`Searching ${attempted.length}: ${sel.phrase} · source page ${sel.page}`);
      const names=['Openverse','Wikimedia Commons'];
      const jobs=names.map(source=>{
        const compact=planner.providerQuery(sel.phrase,source);
        searchedProviderQueries.add(compact.toLowerCase());
        const work=source==='Openverse'?searchOpenverse(compact,sel.page,pendingNow.signal):searchCommons(compact,sel.page,pendingNow.signal);
        return {name:source,work};
      });
      const settled=await Promise.allSettled(jobs.map(x=>x.work));
      if(pendingNow.signal.aborted)return;
      settled.forEach((result,i)=>{
        if(result.status!=='fulfilled'){
          if(String(result.reason?.message||result.reason||'').includes('429'))rateLimitSeen=true;
          if(!unavailable.includes(jobs[i].name))unavailable.push(jobs[i].name);return;
        }
        for(const item of result.value){
          if(!isPhoto(item))continue;
          const key=item.imageUrl||item.id;
          if(seen.has(key))continue;
          seen.add(key);
          allImages.push(rated({...item,_query:sel.phrase,_batch:next},sel.phrase));newlyAdded++;
        }
      });
    };
    for(const selection of selections)await trySelection(selection);
    const relevantNew=()=>allImages.filter(x=>x._batch===next&&(x.editorialFit?.level==='direct'||x.editorialFit?.level==='context')).length;
    if(!relevantNew() && !pendingNow.signal.aborted && !rateLimitSeen){
      // Search another related angle when the first directions have no clear story-specific results.
      const fallback=planner.batchPlan(analysis,activeMode,query,next+1,learner);
      for(const selection of fallback){if(relevantNew()||pendingNow.signal.aborted)break;await trySelection(selection);}
    }
    if(pendingNow.signal.aborted)return;
    batch=next;lastNewCount=newlyAdded;lastRelevantNewCount=relevantNew();lastFreshBatch=next;
    if(append&&newlyAdded>0)sortFilter.value='newest';
    $('results-subtitle').textContent=`${analysis?.editorial?.mainStory||analysis?.angle||'Your article'} · ${batch} search ${batch===1?'round':'rounds'} · actual source descriptions guide ranking`;
    if(!newlyAdded&&!allImages.length){
      resetState(unavailable.length===2?'Image providers could not be reached':'No relevant photographs found',
        'Try Refresh again, select another story angle, or open the original photo libraries linked below.');
      progress('No photos returned. Try Refresh for other story-specific search directions.');
    }else if(!newlyAdded){
      toast('No new photos in this round. Existing photos preserved. Refresh again for the next story angle.');
      progress(`No new results · attempted: ${attempted.slice(0,4).join(' / ')}. Previous photos preserved.`);
    }else{
      progress(`${lastRelevantNewCount} article-aligned / ${newlyAdded} new candidates · searched: ${attempted.slice(0,4).join(' / ')} · earlier photos preserved.`);
      if(unavailable.length)toast(`${newlyAdded} photos added. One source may be temporarily unavailable.`);
      else if(append)toast(lastRelevantNewCount?`${lastRelevantNewCount} new article-aligned photos appear first.`:`${newlyAdded} broader photo candidates found; switch to Show all options or Refresh.`);
    }
    renderGrid();show($('more-search'),true);
  }catch(err){
    if(!pendingNow.signal.aborted){
      progress('Photo search could not finish. Previous results are preserved.');
      if(allImages.length)toast('A source could not load. Your earlier photos are still here.');
      else resetState('Photo libraries unavailable','Try another keyword or use the links to browse originals.');
      renderGrid();
    }
  }finally{if(!pendingNow.signal.aborted){setPending(false);renderGrid();}}
}
  function startNewSearch(q){if(pending){pendingController?.abort();setPending(false);}return runSearch(q,{append:false});}
  async function primeResearch({auto=false}={}){
    if(!analysis||pending||researchRunning)return;
    if(auto&&!prime.needsResearch(allImages))return;
    if(rateLimitSeen){primeStatus('Research paused: image source rate limit','A provider has returned a rate limit. Your existing photos remain available. Try later or use the original library links.');return;}
    const thisAnalysis=analysis;
    const all=prime.plan(analysis,activeMode,activeQuery||queryInput.value,new Set([...searchedPhrases,...searchedProviderQueries]),learner);
    const max=auto?3:6;const selections=all.slice(0,max);
    if(!selections.length){primeStatus('All available article-search directions explored','No additional unique search ideas remain. Try another photo direction, or open the original sources below.');return;}
    researchRunning=true;pendingController?.abort();const controller=new AbortController();pendingController=controller;
    setPending(true);
    const startCount=allImages.length,log=[];
    let errors=0,added=0;const next=batch+1;
    primeStatus(auto?'Prime Research automatically activated':'Prime Research · expanded investigation',
      auto?'Your strongest photo options are weak. Searching related people, real locations and physical story context…':'Searching more specific real-world angles before ranking the top three…');
    try{
      for(const selection of selections){
        if(controller.signal.aborted||analysis!==thisAnalysis)break;
        const phrase=selection.phrase;
        searchedPhrases.add(phrase.toLowerCase());searchedProviderQueries.add(window.CyberPulseSearchPlan.providerQuery(phrase,'Openverse').toLowerCase());log.push(phrase);
        primeStatus('Prime Research · exploring story angles',`Searching ${log.length}/${selections.length} · ${phrase} · keeping older results`,log);
        progress(`Prime research: ${phrase}`);
        const jobs=sourceJobs(phrase,1,controller.signal);
        const settled=await Promise.allSettled(jobs.map(job=>job.promise));
        if(controller.signal.aborted||analysis!==thisAnalysis)break;
        for(let i=0;i<settled.length;i++){
          const result=settled[i];
          if(result.status!=='fulfilled'){
            errors++;
            if(String(result.reason?.message||result.reason||'').includes('429'))rateLimitSeen=true;
            continue;
          }
          for(const item of result.value){
            if(!isPhoto(item))continue;
            const key=item.imageUrl||item.id;
            if(seen.has(key))continue;
            seen.add(key);
            allImages.push(rated({...item,_query:phrase,_batch:next},phrase));added++;
          }
        }
        // Stop when there are three strong article-oriented choices; avoid needless API calls.
        if(prime.choose(allImages,preferencePoints).verified>=3||rateLimitSeen)break;
      }
      if(controller.signal.aborted||analysis!==thisAnalysis)return;
      batch=next;lastNewCount=added;lastFreshBatch=next;
      lastRelevantNewCount=allImages.filter(x=>x._batch===next&&['direct','context'].includes(x.editorialFit?.level)).length;
      // Prime ranks best fit rather than repeatedly showing newest generic photos.
      sortFilter.value='match';
      const top=prime.choose(allImages,preferencePoints);
      const status=top.type==='strong'?'Prime Research · article-aligned options found':top.items.length?'Prime Research · best available alternatives':'Prime Research · no suitable image found';
      const message=top.type==='strong'?`${top.verified} promising article-aligned banner candidates found. Source verification remains essential.`:
        `${allImages.length} total unique photos considered; no reliably close match confirmed. Alternatives are marked for review.`;
      primeStatus(status,message,log);
      progress(`${added} additional photos checked from ${log.length} article-specific searches. ${top.type==='strong'?'Top matches shortlisted.':'No misleading high scores assigned.'}${errors?' Some sources were unavailable.':''}`);
      renderGrid();show($('more-search'),true);
      if(!auto)toast(top.type==='strong'?'Prime Research completed: review the best three banners.':'Research completed. Showing best available alternatives, not guaranteed matches.');
      if(rateLimitSeen)notice('An image provider returned a rate limit. Further searches may be temporarily unavailable; existing results are preserved.');
    }catch(err){
      if(!controller.signal.aborted){primeStatus('Prime Research interrupted','Image sources were unavailable; earlier results are preserved.',log);renderGrid();}
    }finally{
      researchRunning=false;
      if(!controller.signal.aborted){setPending(false);renderGrid();}
    }
  }
  async function deepSearch(){return primeResearch({auto:false});}
  function visionStatus(message,error=false){const el=$('vision-status');el.textContent=message;el.classList.toggle('error',error);el.classList.toggle('working',visionPending&&!error);}
  async function scanPhoto(item){
    if(visionPending){toast('An AI scan is already running.');return;}
    if(!analysis){toast('Analyse an article before running vision AI.');return;}
    visionPending=true;$('scan-top').disabled=true;
    const currentAnalysis=analysis;
    try{
      visionStatus(`Scanning ${item.title.slice(0,65)}…`);
      const result=await window.CyberPulseVision.scan(item.thumbnail||item.imageUrl,currentAnalysis,visionStatus);
      if(analysis!==currentAnalysis)return;
      item.vision=result;Object.assign(item,rated(item,item._query||currentQuery));
      visionStatus(`AI scan completed. Visual affinity ${result.affinity}% — relative to the tested article concepts, not a factual probability.`);
      renderGrid();
    }catch(err){
      visionStatus(`Photo AI scan unavailable: ${err.message}. If the photo host blocks browser access, download the original from its source, then use “Upload photo to scan”.`,true);
    }finally{visionPending=false;$('scan-top').disabled=false;}
  }
  async function scanTop(){
    if(!analysis||visionPending){toast('Analyse the article first or finish the current scan.');return;}
    const queue=allImages.filter(x=>!x.vision).sort((a,b)=>b.match.score-a.match.score).slice(0,3);
    if(!queue.length){toast('No unscanned photos in this batch. Try “Find more new photos”.');return;}
    // Scan serially to prevent browser memory exhaustion.
    for(const item of queue){await scanPhoto(item);}
  }
  async function scanUploadedFile(file){
    if(visionPending||!file)return;
    if(!analysis){toast('Analyse an article before scanning a photo.');return;}
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>12*1024*1024){visionStatus('Select a JPG, PNG or WebP photo smaller than 12MB.',true);return;}
    visionPending=true;$('scan-top').disabled=true;
    try{
      const result=await window.CyberPulseVision.scan(file,analysis,visionStatus);
      const output=$('upload-vision-result');output.replaceChildren(
        txt('strong','',`${file.name}: ${result.affinity}% relative AI visual affinity`),
        txt('p','',`Compared the actual photo with your article concepts. Best detected idea: ${result.bestLabel}. This is not proof that an incident is depicted.`)
      );show(output,true);
      visionStatus('Local photo AI scan completed. No photo or article was uploaded to an AI inference service.');
    }catch(err){visionStatus(`Local image scan failed: ${err.message}`,true);}
    finally{visionPending=false;$('scan-top').disabled=false;$('vision-upload').value='';}
  }
  function imageAttribution(item){
    return item.attribution?`${item.attribution}\nOriginal source: ${item.sourceUrl}`:
      `Image: ${item.title}\nPhotographer: ${item.creator}\nLicence: ${item.license}\nTerms: ${item.licenseUrl}\nOriginal source: ${item.sourceUrl}`;
  }
  async function copyCredit(item){
    const content=imageAttribution(item);
    try{await navigator.clipboard.writeText(content);toast('Photo credit and original link copied.');}
    catch{const area=txt('textarea','',content);document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('Photo credit copied.');}
  }
  async function downloadImage(item){
    const newTab=window.open('about:blank','_blank');
    try{
      const response=await fetch(item.imageUrl,{mode:'cors'});if(!response.ok)throw Error('Download blocked');
      const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('Not an image');
      const fileUrl=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=fileUrl;a.download=`cyberpulse-${slug(titleInput.value||analysis?.inferredTitle||item.title)}.${blob.type.includes('png')?'png':blob.type.includes('webp')?'webp':'jpg'}`;
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(fileUrl),12000);newTab?.close();
      toast('Original download started. Verify the photo licence.');
    }catch{if(newTab)newTab.location.replace(item.sourceUrl);else window.open(item.sourceUrl,'_blank','noopener,noreferrer');
      toast('Direct download unavailable. Opened the photographer source instead.');}
  }
  function openPreview(item){
    selectedItem=item;$('banner-preview-image').src=item.thumbnail||item.imageUrl;
    $('wp-card-category').textContent=analysis?.primary||'CYBERSECURITY';
    $('wp-card-headline').textContent=titleInput.value||analysis?.titleSuggestions?.[0]||analysis?.inferredTitle||'Article headline';
    setCrop('card');
    $('banner-preview-title').textContent=`${item.match.score}% estimated ${item.vision?'metadata + CLIP':'metadata'} match · ${item.width||'?'} × ${item.height||'?'} · ${item.source}`;
    $('banner-original').href=item.sourceUrl;
    const d=$('banner-dialog');if(typeof d.showModal==='function')d.showModal();else toast('Your browser does not support the banner preview.');
  }
  async function exportWordPressCrop(item){
    const button=$('download-crop');button.disabled=true;button.textContent='Preparing image…';
    try{
      // Never process a tiny thumbnail for final publication when original exists.
      const response=await fetch(item.imageUrl,{mode:'cors'});
      if(!response.ok)throw Error('Original image cannot be downloaded');
      const blob=await response.blob();
      if(!blob.type.startsWith('image/')||blob.size>30*1024*1024)throw Error('Image file is unsupported or too large');
      const bitmap=await createImageBitmap(blob);
      const w=1200,h=cropMode==='card'?800:675;
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
      const scale=Math.max(w/bitmap.width,h/bitmap.height);
      const sw=w/scale,sh=h/scale;
      ctx.drawImage(bitmap,(bitmap.width-sw)/2,(bitmap.height-sh)/2,sw,sh,0,0,w,h);
      if(typeof bitmap.close==='function')bitmap.close();
      const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.91));
      if(!result)throw Error('Browser cannot export JPG');
      const url=URL.createObjectURL(result);const link=document.createElement('a');
      link.download=`cyberpulse-${slug(titleInput.value||analysis?.titleSuggestions?.[0]||'article')}-${w}x${h}.jpg`;
      link.href=url;document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
      if(analysis)addFeedback(item,'used');
      toast(`WordPress-ready ${w}×${h} JPG exported. Selection saved; verify the photo licence.`);
    }catch(err){
      toast('This photo host blocks export. Use Original download and crop it in WordPress.');
      console.info('Crop export blocked:',err.message);
    }finally{button.disabled=false;button.textContent='↓ Export WordPress JPG';}
  }
  function setCrop(mode){
    cropMode=mode;
    $('wp-card-frame').classList.toggle('crop-wide',mode==='feature');
    $('crop-card').classList.toggle('active',mode==='card');
    $('crop-feature').classList.toggle('active',mode==='feature');
  }
  function copyText(value,message){
    (async()=>{try{await navigator.clipboard.writeText(value);toast(message);}catch{
      const field=txt('textarea','',value);document.body.appendChild(field);field.select();document.execCommand('copy');field.remove();toast(message);
    }})();
  }
  function copyBrief(){
    if(!analysis)return toast('Analyse an article first.');
    const text=[
      'CYBERPULSE EDITORIAL IMAGE BRIEF',
      `Headline: ${titleInput.value||analysis.titleSuggestions?.[0]||'Needs editorial confirmation'}`,
      `Suggested category: ${analysis.primary}`,
      `Story angle: ${analysis.angle}`,
      `Named subject: ${analysis.visualSubject}`,
      `Image direction: ${analysis.searchModeNames[activeMode]}`,
      `Search ideas: ${(analysis.searchModes[activeMode]||[]).slice(0,4).join(' | ')}`,
      `Editorial caution: ${analysis.editorialWarning}`,
      `Story intelligence: ${(analysis.editorial?.highlightedKeywords||[]).join(' | ')}`,
      `Priority real-photo queries: ${(analysis.editorial?.searchModes.editorial||[]).slice(0,6).join(' | ')}`,
      `Image suitability warning: ${analysis.editorial?.caution||'Verify photo evidence'}`, 
      'Use as an illustrative featured image unless the source confirms exact event context.',
      'Recommended preview: CyberPulse card crop 3:2; featured banner 16:9.'
    ].join('\n');
    copyText(text,'Newsroom brief copied.');
  }
  function copyWordPressDetails(item){
    const text=[
      `Article: ${titleInput.value||analysis?.titleSuggestions?.[0]||'Check headline'}`,
      `Category suggestion: ${analysis?.primary||'Needs review'}`,
      `Image alt text (verify before using): ${item.title}`,
      `Photo credit: ${item.creator}`,
      `Licence: ${item.license} — ${item.licenseUrl||'See original'}`,
      `Image source: ${item.sourceUrl}`,
      'Image is illustrative unless its original metadata proves it depicts the stated news event.'
    ].join('\n');
    copyText(text,'WordPress image details copied.');
  }
  function renderCard(item){
    const card=txt('article','image-card');
    const thumb=txt('div','image-thumb');
    const photo=document.createElement('img');photo.loading='lazy';photo.alt=item.title;photo.src=item.thumbnail;photo.referrerPolicy='no-referrer';let thumbnailRetried=false;
    const fallback=txt('div','fallback','Image preview unavailable — view the photographer source');
    photo.addEventListener('error',()=>{if(!thumbnailRetried&&item.imageUrl!==photo.src){thumbnailRetried=true;photo.src=item.imageUrl;return;}photo.style.display='none';fallback.style.display='grid';});
    const badges=txt('div','image-badges');badges.append(txt('span','source-badge',item.source));
    if(shortlistIds.includes(item.id))badges.append(txt('span','shortlist-badge',`Top pick #${shortlistIds.indexOf(item.id)+1}`));
    if(lastFreshBatch>1 && item._batch===lastFreshBatch)badges.append(txt('span','fresh-badge','NEW · LATEST REFRESH'));
    const fav=txt('button',`favorite-button${favorites[item.id]?' is-saved':''}`,favorites[item.id]?'★ Saved':'☆ Save');
    fav.type='button';fav.setAttribute('aria-label',favorites[item.id]?'Remove saved photo':'Save photo to browser');
    fav.addEventListener('click',()=>saveFavorite(item));
    thumb.append(photo,fallback,badges,fav);
    const info=txt('div','image-body');
    const scoreBox=txt('div','match-row');
    const left=txt('div','match-heading');left.append(txt('span','score-number',`${item.match.score}%`),txt('span','score-label',item.vision?'ESTIMATE · AI PIXELS CHECKED':'ARTICLE MATCH · METADATA ESTIMATE'));
    const tier=txt('span',`score-tier ${item.match.score>=75?'score-strong':item.match.score>=55?'score-good':'score-review'}`,item.match.tier);
    scoreBox.append(left,tier);info.appendChild(scoreBox);
    const progress=txt('div','score-bar');const fill=txt('span','score-fill');fill.style.width=`${item.match.score}%`;progress.appendChild(fill);info.appendChild(progress);
    info.appendChild(txt('p','score-reason',item.match.reason));
    if(item.editorialFit)info.appendChild(txt('div',`editorial-fit-tag fit-${item.editorialFit.level}`,`● ${item.editorialFit.label}`));
    const breakdown=txt('div','score-breakdown');
    breakdown.append(txt('span','',`Topic clues ${item.match.topic}`),txt('span','',`Photo size ${item.match.quality}/20`),txt('span','',`Crop ${item.match.banner}/10`));
    info.appendChild(breakdown);
    const pixelNote=txt('div','pixel-qa','PIXEL QUALITY: checking preview if host allows…');
    pixelNote.title='Local canvas brightness, contrast and crop diagnostic. Not semantic AI.';
    info.appendChild(pixelNote);
    if(!item.pixelQA && !item.pixelQAFailed && window.CyberPulsePixelQA && item.thumbnail){
      window.CyberPulsePixelQA.check(item.thumbnail).then(qa=>{
        item.pixelQA=qa;
        if(pixelNote.isConnected)pixelNote.textContent=`PIXEL QA · ${qa.summary} · ${qa.width}×${qa.height}`;
      }).catch(()=>{item.pixelQAFailed=true;
        if(pixelNote.isConnected)pixelNote.textContent='PIXEL QA: photo host does not allow inspection · gallery unaffected';
      });
    }else if(item.pixelQA)pixelNote.textContent=`PIXEL QA · ${item.pixelQA.summary} · ${item.pixelQA.width}×${item.pixelQA.height}`;
    else if(item.pixelQAFailed)pixelNote.textContent='PIXEL QA unavailable (photo host restriction)';
    if(item.vision){
      const v=txt('div','vision-result');v.append(txt('strong','',`✦ Vision AI: ${item.vision.affinity}% visual affinity`),
        txt('small','',`Image pixels compared locally with relevant and unrelated photo concepts. Combined match rating uses 60% metadata + 40% image vision. Not a statistical probability.`));info.appendChild(v);
    }
    const scan=txt('button','vision-button',item.vision?'✦ Re-scan with free Vision AI':'✦ AI check actual photo pixels');scan.type='button';
    scan.disabled=visionPending;scan.addEventListener('click',()=>scanPhoto(item));info.appendChild(scan);
    const mark=txt('div','feedback-row');
    const decision=feedbackDecision(item);
    const good=txt('button',decision==='pick'||decision==='used'?'feedback-selected':'','✓ Good for this article');
    const bad=txt('button',`feedback-no${decision==='reject'?' feedback-rejected':''}`,'✕ Not relevant');
    good.type=bad.type='button';good.addEventListener('click',()=>addFeedback(item,'pick'));
    bad.addEventListener('click',()=>addFeedback(item,'reject'));
    mark.append(good,bad);info.appendChild(mark);
    const prefs=preferencePoints(item);
    if(prefs)info.appendChild(txt('div',`learned-fit${prefs<0?' negative':''}`,
      `Learning preference ${prefs>0?'+':''}${prefs} ranking points · article score unchanged`));
    if(decision==='used')info.appendChild(txt('span','learn-selected-badge','✓ SELECTED FOR WORDPRESS'));
    info.appendChild(txt('h3','',item.title));
    const meta=txt('div','image-meta');meta.append(txt('span','',`By ${item.creator}`));
    if(item.width&&item.height)meta.append(txt('strong','',`${formatNum(item.width)} × ${formatNum(item.height)}`));info.appendChild(meta);
    const caption=txt('div','image-rights');
    caption.append(txt('span','',`${item.license||'Check licence'} · verify usage rights`));
    if(item.licenseUrl){const link=txt('a','',' Terms ↗');link.href=item.licenseUrl;link.target='_blank';link.rel='noopener noreferrer';caption.append(link);}info.appendChild(caption);
    const actions=txt('div','card-actions');
    const preview=txt('button','card-button primary','▧ WordPress preview');preview.type='button';preview.addEventListener('click',()=>openPreview(item));
    const download=txt('button','card-button','↓ Download');download.type='button';download.addEventListener('click',()=>downloadImage(item));
    actions.append(preview,download);info.append(actions);
    const footer=txt('div','source-foot'),source=txt('a','','Photo source & licence ↗');
    source.href=item.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
    const copy=txt('button','card-button','Copy credit');copy.type='button';copy.addEventListener('click',()=>copyCredit(item));
    const wp=txt('button','card-button','Copy WP details');wp.type='button';wp.addEventListener('click',()=>copyWordPressDetails(item));
    footer.append(source,copy,wp);info.append(footer);card.append(thumb,info);return card;
  }
  function analyseNow(){
    const title=titleInput.value.trim(),body=bodyInput.value.trim();
    if((title+' '+body).trim().length<12){toast('Add article text or a headline first.');bodyInput.focus();return;}
    try{
      analysis=window.CyberPulseNewsroom.enhance(window.CyberPulseAnalyzer.analyseArticle(title,body),title,body);
      renderAnalysis(analysis);onlySaved=false;$('saved-toggle').classList.remove('active');$('saved-toggle').setAttribute('aria-pressed','false');
      const reference=analysis;
      primeStatus('Article-aware research is ready','Checking initial results first. If close photos are missing, Prime Research will automatically explore three more targeted directions.',[],true);
      startNewSearch(analysis.primaryQuery||analysis.stockSearches?.[0]).then(async()=>{
        if(analysis!==reference||autoResearchDone)return;
        autoResearchDone=true;
        if(prime.needsResearch(allImages))await primeResearch({auto:true});
        else primeStatus('Initial article matches available','You can still choose PRIME DEEP RESEARCH to explore more story-specific photographs.',[],true);
      }).catch(()=>{if(analysis===reference)primeStatus('Research could not complete','Photo providers may be unavailable. Try Refresh or open the original photo libraries.');});
    }catch(err){console.error(err);resetState('Article analysis failed','Check that analysis.js and relevance.js are present.',true);}
  }
  function count(){$('char-count').textContent=`${formatNum(titleInput.value.length+bodyInput.value.length)} characters`;}
  function clear(){
    pendingController?.abort();setPending(false);analysis=null;currentQuery='';activeQuery='';activeMode='context';batch=0;allImages=[];seen=new Set();onlySaved=false;
    form.reset();matchFilter.value='0';sourceFilter.value='all';sortFilter.value='match';storyFilter.value='focused';licenseFilter.value='all';lastFreshBatch=0;lastNewCount=0;lastRelevantNewCount=0;progress('',false);notice('',false);count();
    show($('analysis-empty'),true);show($('analysis-content'),false);show($('visual-intent'),false);show($('editorial-intelligence'),false);show($('editor-shortlist'),false);
    show($('results-controls'),false);show($('results-top-actions'),false);show($('rating-explainer'),false);show($('load-more-wrap'),false);show($('more-search'),false);show($('vision-panel'),false);show($('upload-vision-result'),false);
    shortlistIds=[];searchedPhrases.clear();searchedProviderQueries.clear();researchRunning=false;autoResearchDone=false;rateLimitSeen=false;primeStatus('','',[],false);
    grid.replaceChildren();resetState('Your article image options will appear here','Paste an article to see image suggestions with estimated match scores.');
    $('result-counter').textContent='';$('results-subtitle').textContent='Find relevant free-licence photographs, ranked by estimated editorial suitability.';
    $('saved-toggle').classList.remove('active');$('saved-toggle').setAttribute('aria-pressed','false');
  }
  form.addEventListener('submit',e=>{e.preventDefault();analyseNow();});
  $('refresh-search').addEventListener('click',()=>queryInput.value.trim()===activeQuery?runSearch(activeQuery,{append:true}):startNewSearch(queryInput.value));
  if($topRefresh)$topRefresh.addEventListener('click',()=>queryInput.value.trim()===activeQuery?runSearch(activeQuery,{append:true}):startNewSearch(queryInput.value));
  queryInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();startNewSearch(queryInput.value);}});
  $more.addEventListener('click',()=>runSearch(activeQuery||queryInput.value,{append:true}));
  if($topMore)$topMore.addEventListener('click',()=>runSearch(activeQuery||queryInput.value,{append:true}));
  $deep.addEventListener('click',deepSearch);
  if($topDeep)$topDeep.addEventListener('click',deepSearch);
  $('scan-top').addEventListener('click',scanTop);
  document.querySelectorAll('[data-photo-mode]').forEach(button=>button.addEventListener('click',()=>{
    if(!analysis)return;
    const mode=button.dataset.photoMode;
    if(activeMode===mode)return;
    activeMode=mode;
    document.querySelectorAll('[data-photo-mode]').forEach(el=>{
      const yes=el.dataset.photoMode===mode;el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));
    });
    const phrases=analysis.searchModes[mode]||[];
    renderChips('query-chips',phrases);
    if(phrases.length)startNewSearch(phrases[0]);
  }));
  $('copy-brief').addEventListener('click',copyBrief);
  $('copy-keyword-plan').addEventListener('click',copyKeywordPlan);
  $('crop-card').addEventListener('click',()=>setCrop('card'));
  $('crop-feature').addEventListener('click',()=>setCrop('feature'));
  $('vision-upload').addEventListener('change',e=>scanUploadedFile(e.target.files?.[0]));
  $('saved-toggle').addEventListener('click',toggleSaved);
  [matchFilter,sourceFilter,sortFilter,storyFilter,licenseFilter].forEach(el=>el.addEventListener('change',renderGrid));
  $('clear-button').addEventListener('click',clear);
  $('banner-mark-used').addEventListener('click',()=>{if(selectedItem){addFeedback(selectedItem,'used');toast('Recorded as the selected WordPress banner.');}});
  $('learning-enabled').addEventListener('change',e=>{learner.enable(e.target.checked);updateLearning();renderGrid();});
  $('show-rejected').addEventListener('change',renderGrid);
  $('learn-reset').addEventListener('click',()=>{if(window.confirm('Clear all saved learning choices in this browser?')){
    learner.reset();updateLearning('Your local learning history was cleared.');renderGrid();
  }});
  $('learn-export').addEventListener('click',()=>{
    const blob=new Blob([learner.exportProfile()],{type:'application/json'}),url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='cyberpulse-newsroom-team-learning.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    toast('Learning preferences exported. Share this JSON with the CyberWaze team to import.');
  });
  $('learn-import').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{if(file.size>250000)throw Error('File is too large (max 250 KB)');
      learner.importProfile(await file.text());updateLearning('Imported teammate preferences; article-fit ranking is still the priority.');renderGrid();
      toast('Team learning imported successfully.');
    }catch(err){toast(`Learning import failed: ${err.message}`);}
    finally{e.target.value='';}
  });
  $('close-banner').addEventListener('click',()=>$('banner-dialog').close());
  bodyInput.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();analyseNow();}});
  $('banner-download').addEventListener('click',()=>{if(selectedItem)downloadImage(selectedItem);});
  $('download-crop').addEventListener('click',()=>{if(selectedItem)exportWordPressCrop(selectedItem);});
  titleInput.addEventListener('input',count);bodyInput.addEventListener('input',count);
  $('category-list').replaceChildren(...window.CyberPulseAnalyzer.categories.map(x=>txt('span','',x.name)));
  updateSavedCount();updateLearning();count();
})();
