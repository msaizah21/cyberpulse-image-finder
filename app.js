/* CyberPulse Studio v3 — client-only article analysis, real paged image APIs.
 * Stock API keys belong ONLY in the optional Worker, never on GitHub Pages.
 * Optional CLIP vision compares image pixels to article photo concepts. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('article-form'), titleInput=$('article-title'), bodyInput=$('article-body');
  const queryInput=$('search-query'), grid=$('image-grid'), state=$('result-state');
  const licenseFilter=$('license-filter'), matchFilter=$('match-filter');
  const sourceFilter=$('source-filter'), sortFilter=$('sort-filter');
  const $more=$('load-more'), $deep=$('deep-search'), toastEl=$('toast');
  let analysis=null, currentQuery='', activeQuery='', batch=0, pendingController=null;
  let allImages=[], seen=new Set(), selectedItem=null, onlySaved=false, pending=false, deepPending=false, visionPending=false, toastTimer;
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
  function resetState(title,description,error=false){
    state.classList.toggle('error',error);state.replaceChildren(txt('div','result-placeholder-icon',error?'!':'▧'),txt('h3','',title),txt('p','',description));
    show(state,true);show(grid,false);
  }
  function updateLinks(){
    const q=currentQuery||analysis?.stockSearches?.[0]||'cybersecurity technology';
    $('open-openverse').href=`https://openverse.org/search/image?q=${encodeURIComponent(q)}`;
    $('open-pexels').href=`https://www.pexels.com/search/${encodeURIComponent(q)}/`;
    $('open-unsplash').href=`https://unsplash.com/s/photos/${encodeURIComponent(q.replaceAll(' ','-'))}`;
    $('open-pixabay').href=`https://pixabay.com/images/search/${encodeURIComponent(q)}/`;
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
  function renderAnalysis(result){
    show($('analysis-empty'),false);show($('analysis-content'),true);show($('visual-intent'),true);show($('vision-panel'),true);
    show($('results-controls'),true);show($('rating-explainer'),true);
    $('primary-category').textContent=result.primary;
    $('category-symbol').textContent=result.symbol;
    $('category-reason').textContent=result.reason;
    $('confidence-pill').textContent=result.confidence;
    $('secondary-categories').replaceChildren();
    (result.other.length?result.other:['No strong alternative']).forEach(x=>$('secondary-categories').appendChild(txt('span','category-chip',x)));
    headlineSuggestions();
    renderChips('query-chips',result.stockSearches||[]);renderChips('more-chips',(result.stockSearches||[]).slice(1));
    const q=result.stockSearches?.[0]||result.primaryQuery;
    queryInput.value=q;
    $('visual-context-copy').textContent=result.entity
      ?`Article mentions ${result.entity}. Searching high-resolution stock concepts linked to the subject, not falsely labelled photos of the company or incident.`
      :'Searching landscape stock-photo concepts aligned with the article subject. Every score is an editorial estimate.';
    updateLinks();
  }
  function isPublicLicense(raw){const s=String(raw||'').toLowerCase();return /cc0|public.?domain|\bpdm\b|^pd$/.test(s);}
  function acceptedLicense(item){
    if(['Pexels','Pixabay'].includes(item.source))return licenseFilter.value!=='credit';
    const lic=String(item.license||'').toLowerCase().replace(/\s+/g,'');
    if(!lic||/noncommercial|noderivatives|by-nc|by-nd|nc-|nd-/.test(lic))return false;
    const good=isPublicLicense(lic)||lic==='by'||lic==='by-sa'||lic.startsWith('ccby')||lic.startsWith('cc-by')||lic.includes('attribution');
    if(!good)return false;
    if(licenseFilter.value==='no-credit')return isPublicLicense(lic);
    if(licenseFilter.value==='credit')return !isPublicLicense(lic);
    return true;
  }
  function normalizeOpenverse(d){
    return {id:'ov:'+d.id,source:'Openverse',title:d.title||'Untitled photograph',tags:(d.tags||[]).slice(0,26).map(t=>typeof t==='string'?t:t.name||'').join(' '),
      creator:d.creator||'Unknown photographer',imageUrl:safeUrl(d.url),thumbnail:safeUrl(d.thumbnail)||safeUrl(d.url),
      sourceUrl:safeUrl(d.foreign_landing_url)||safeUrl(d.detail_url)||safeUrl(d.url),
      license:String(d.license||'').toLowerCase(),licenseUrl:safeUrl(d.license_url),attribution:d.attribution||'',
      width:Number(d.width)||0,height:Number(d.height)||0,mime:String(d.filetype||''),kind:String(d.category||'photograph')};
  }
  async function searchOpenverse(q,page,signal){
    const url=new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q',short(q));url.searchParams.set('page_size','20');url.searchParams.set('page',String(page));
    url.searchParams.set('license','cc0,pdm,by,by-sa');url.searchParams.set('mature','false');
    url.searchParams.set('filter_dead','true');url.searchParams.set('aspect_ratio','wide');url.searchParams.set('category','photograph');
    const response=await fetch(url.href,{signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(`Openverse ${response.status}`);
    const data=await response.json();if(!Array.isArray(data.results))throw Error('Invalid Openverse result');
    return data.results.map(normalizeOpenverse);
  }
  function normalizeWorkerItem(x){
    // New Worker sends normalized {images:[]}; no full article or credentials are sent to it.
    return {id:String(x.id||''),source:String(x.source||''),title:String(x.title||'Professional stock photo'),
      tags:String(x.tags||''),description:String(x.description||''),creator:String(x.creator||'Photographer'),
      imageUrl:safeUrl(x.imageUrl),thumbnail:safeUrl(x.thumbnail),sourceUrl:safeUrl(x.sourceUrl),
      license:String(x.license||''),licenseUrl:safeUrl(x.licenseUrl),attribution:String(x.attribution||''),
      width:Number(x.width)||0,height:Number(x.height)||0,mime:'image/jpeg',kind:'photograph'};
  }
  async function searchStockWorker(q,page,signal){
    const worker=safeUrl(window.CyberPulseConfig?.stockWorkerUrl||'');if(!worker)return [];
    const url=new URL(worker);url.searchParams.set('q',short(q));url.searchParams.set('page',String(page));
    const response=await fetch(url.href,{signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(`Stock photo provider ${response.status}`);
    const data=await response.json();if(!Array.isArray(data.images))throw Error('Invalid stock photo response');
    return data.images.map(normalizeWorkerItem);
  }
  async function searchLegacyPixabay(q,page,signal){
    const worker=safeUrl(window.CyberPulseConfig?.pixabayWorkerUrl||'');if(!worker)return [];
    const url=new URL(worker);url.searchParams.set('q',short(q));url.searchParams.set('page',String(page));
    const response=await fetch(url.href,{signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(`Pixabay ${response.status}`);
    const data=await response.json();if(!Array.isArray(data.hits))throw Error('Invalid Pixabay response');
    return data.hits.map(x=>normalizeWorkerItem({id:'px:'+x.id,source:'Pixabay',title:x.tags||'Professional stock photo',
      tags:x.tags,creator:x.user,thumbnail:x.webformatURL||x.previewURL,imageUrl:x.largeImageURL||x.webformatURL,
      sourceUrl:x.pageURL,license:'Pixabay Content License',licenseUrl:'https://pixabay.com/service/license-summary/',width:x.imageWidth,height:x.imageHeight}));
  }
  function isPhoto(item){
    if(!item.id||!item.imageUrl||!item.thumbnail||!item.sourceUrl)return false;
    if(!['Pexels','Pixabay','Openverse'].includes(item.source))return false;
    if(item.kind && item.kind!=='photograph')return false;
    if(/svg|\.gif\b/i.test(item.mime||''))return false;
    if(graphicTerms.test(`${item.title} ${item.tags} ${item.description||''}`))return false;
    if(item.width && item.width<1200)return false;
    if(item.height && item.width/item.height<1.36)return false;
    return acceptedLicense(item);
  }
  function rated(item,query){
    const base=window.CyberPulseRelevance.estimate(item,query,analysis);
    const visual=item.vision;
    if(visual) return {...item,match:{...base,score:window.CyberPulseVision.combineScore(base.score,visual.affinity),tier:'Metadata + image AI estimate',reason:`Photo-pixel visual affinity ${visual.affinity}% (relative to compared concepts); ${base.reason.toLowerCase()}`}};
    return {...item,match:base};
  }
  function updateSavedCount(){$('saved-count').textContent=Object.keys(favorites).length;}
  function saveFavorite(item){
    if(favorites[item.id])delete favorites[item.id];
    else favorites[item.id]={...item,match:undefined};
    try{localStorage.setItem(favoriteKey,JSON.stringify(favorites));}catch{toast('Browser storage is full or disabled. Saved photos may not persist.');}
    updateSavedCount();renderGrid();
  }
  function setPending(value){pending=value;$more.disabled=value;$deep.disabled=value;$('refresh-search').disabled=value;
    $more.textContent=value?'Searching photo libraries…':'↻ Find more new photos';}
  function toggleSaved(){onlySaved=!onlySaved;$('saved-toggle').setAttribute('aria-pressed',String(onlySaved));
    $('saved-toggle').classList.toggle('active',onlySaved);renderGrid();}
  function renderGrid(){
    const data=onlySaved?Object.values(favorites).map(x=>rated(x,currentQuery||analysis?.stockSearches?.[0]||'')):allImages;
    const minMatch=Number(matchFilter.value)||0;
    const filtered=data.filter(x=>x.match.score>=minMatch&&(sourceFilter.value==='all'||x.source===sourceFilter.value)&&acceptedLicense(x));
    filtered.sort((a,b)=>sortFilter.value==='resolution'?(b.width*b.height-a.width*a.height)||(b.match.score-a.match.score):
      (b.match.score-a.match.score)||(b.width*b.height-a.width*a.height));
    if(filtered.length){grid.replaceChildren(...filtered.map(renderCard));show(grid,true);show(state,false);}
    else if(!pending){resetState(onlySaved?'No saved photos for these filters':'No matching photos in this batch',
      onlySaved?'Save a photo by tapping the star, or adjust your match/source filters.':'Try a lower match threshold or search a different photo concept.');}
    $('result-counter').textContent=`${filtered.length} displayed · ${allImages.length} discovered`;
    show($('load-more-wrap'),Boolean(analysis)&&!onlySaved);
    $('load-more-status').textContent=batch?`Batch ${batch} explored · duplicates hidden · ${allImages.length} unique photos found`:'Each click explores additional results and avoids duplicates';
    updateSavedCount();
  }
  async function runSearch(q,{append=false}={}){
    const query=short(q);if(!query){toast('Enter a photo search phrase first.');return;}
    if(pending)return;
    if(!analysis){toast('Please analyse an article first.');return;}
    if(!append ||query!==activeQuery){
      pendingController?.abort();activeQuery=query;batch=0;seen=new Set();allImages=[];
      resetState('Finding story-related photographs…','Searching fresh landscape images and checking licences, resolution and article relevance.');
      $('result-counter').textContent='';
    }
    currentQuery=query;queryInput.value=query;updateLinks();
    pendingController?.abort();const pendingNow=new AbortController();pendingController=pendingNow;setPending(true);
    const next=batch+1;
    const choices=[query,...(analysis.stockSearches||[]).filter(w=>w.toLowerCase()!==query.toLowerCase())].slice(0,4);
    // Advance actual provider pages and alternate article-aware search terms.
    const idx=Math.floor((next-1)/10)%choices.length;
    const usedQueries=[choices[idx]];
    if(choices.length>1)usedQueries.push(choices[(idx+1)%choices.length]);
    const page=((next-1)%10)+1;
    const services=[];
    for(const phrase of usedQueries){
      if(window.CyberPulseConfig?.stockWorkerUrl)
        services.push({provider:'Professional stock',query:phrase,promise:searchStockWorker(phrase,page,pendingNow.signal)});
      else if(window.CyberPulseConfig?.pixabayWorkerUrl)
        services.push({provider:'Pixabay',query:phrase,promise:searchLegacyPixabay(phrase,page,pendingNow.signal)});
      else services.push({provider:'Openverse',query:phrase,promise:searchOpenverse(phrase,page,pendingNow.signal)});
    }
    try{
      const settled=await Promise.allSettled(services.map(s=>s.promise));
      if(pendingNow.signal.aborted)return;
      const raw=[],errors=[];
      settled.forEach((result,i)=>{
        if(result.status==='fulfilled')raw.push(...result.value.map(x=>({...x,_query:services[i].query})));
        else errors.push(`${services[i].provider}: ${result.reason?.message||'Unavailable'}`);
      });
      let added=0;
      for(const item of raw){
        const key=item.id||item.imageUrl;
        if(seen.has(key))continue;seen.add(key);
        if(!isPhoto(item))continue;
        const scored=rated(item,item._query);
        // Keep broad-but-plausible photos, downrank unrelated ones instead of fabricating a high match.
        if(scored.match.score<32)continue;
        allImages.push(scored);added++;
      }
      batch=next;
      $('results-subtitle').textContent=`“${query}” · ${batch} ${batch===1?'batch':'batches'} explored · ${window.CyberPulseConfig?.stockWorkerUrl||window.CyberPulseConfig?.pixabayWorkerUrl?'professional stock APIs':'openly licensed photo results'} · check source rights`;
      if(!added&&allImages.length===0){
        resetState(errors.length===services.length?'Image sources are unavailable':'No matching stock photographs in this batch',
          errors.length===services.length?'Try again later, or use the Pexels / Pixabay links below.':'Tap “Find more fresh photos” to explore another page or try a different suggested phrase.',errors.length===services.length);
      } else if(!added){toast('No new matching photos in this batch. Try another batch or a different keyword.');}
      else if(errors.length){toast(`${added} photos added. Some sources were unavailable.`);}
      renderGrid();show($('more-search'),true);
    }catch(err){if(!pendingNow.signal.aborted)resetState('Search could not complete',err?.message||'Try again.',true);}
    finally{if(!pendingNow.signal.aborted){setPending(false);renderGrid();}}
  }
  function startNewSearch(q){if(pending){pendingController?.abort();setPending(false);}runSearch(q,{append:false});}
  async function deepSearch(){
    if(!analysis||pending||deepPending)return;
    deepPending=true;
    try{
      for(let n=0;n<3;n++) {
        if(!analysis || !deepPending)break;
        await runSearch(activeQuery||queryInput.value,{append:true});
      }
      if(deepPending)toast(`Deep search complete. ${allImages.length} unique photo matches found.`);
    }finally{deepPending=false;}
  }
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
    if(item.source==='Pexels')return `Photo by ${item.creator} on Pexels\nPhoto: ${item.sourceUrl}\nLicence: ${item.licenseUrl}`;
    if(item.source==='Pixabay')return `Photo by ${item.creator} on Pixabay\nPhoto: ${item.sourceUrl}\nLicence: ${item.licenseUrl}`;
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
    selectedItem=item;$('banner-preview-image').src=item.imageUrl;
    $('banner-preview-title').textContent=`${item.match.score}% estimated match · ${item.width||'?'} × ${item.height||'?'} · ${item.source}`;
    $('banner-original').href=item.sourceUrl;
    const d=$('banner-dialog');if(typeof d.showModal==='function')d.showModal();else toast('Your browser does not support the banner preview.');
  }
  function renderCard(item){
    const card=txt('article','image-card');
    const thumb=txt('div','image-thumb');
    const photo=document.createElement('img');photo.loading='lazy';photo.alt=item.title;photo.src=item.thumbnail;photo.referrerPolicy='no-referrer';
    const fallback=txt('div','fallback','Image preview unavailable — view the photographer source');
    photo.addEventListener('error',()=>{photo.style.display='none';fallback.style.display='grid';});
    const badges=txt('div','image-badges');badges.append(txt('span','source-badge',item.source));
    const fav=txt('button',`favorite-button${favorites[item.id]?' is-saved':''}`,favorites[item.id]?'★ Saved':'☆ Save');
    fav.type='button';fav.setAttribute('aria-label',favorites[item.id]?'Remove saved photo':'Save photo to browser');
    fav.addEventListener('click',()=>saveFavorite(item));
    thumb.append(photo,fallback,badges,fav);
    const info=txt('div','image-body');
    const scoreBox=txt('div','match-row');
    const left=txt('div','match-heading');left.append(txt('span','score-number',`${item.match.score}%`),txt('span','score-label','ARTICLE MATCH · ESTIMATE'));
    const tier=txt('span',`score-tier ${item.match.score>=75?'score-strong':item.match.score>=55?'score-good':'score-review'}`,item.match.tier);
    scoreBox.append(left,tier);info.appendChild(scoreBox);
    const progress=txt('div','score-bar');const fill=txt('span','score-fill');fill.style.width=`${item.match.score}%`;progress.appendChild(fill);info.appendChild(progress);
    info.appendChild(txt('p','score-reason',item.match.reason));
    const breakdown=txt('div','score-breakdown');
    breakdown.append(txt('span','',`Topic ${item.match.topic}/70`),txt('span','',`Quality ${item.match.quality}/20`),txt('span','',`Banner ${item.match.banner}/10`));
    info.appendChild(breakdown);
    if(item.vision){
      const v=txt('div','vision-result');v.append(txt('strong','',`✦ Vision AI: ${item.vision.affinity}% visual affinity`),
        txt('small','',`Image pixels compared locally with relevant and unrelated photo concepts. Combined match rating uses 60% metadata + 40% image vision. Not a statistical probability.`));info.appendChild(v);
    }
    const scan=txt('button','vision-button',item.vision?'✦ Re-scan with free Vision AI':'✦ AI check actual photo pixels');scan.type='button';
    scan.disabled=visionPending;scan.addEventListener('click',()=>scanPhoto(item));info.appendChild(scan);
    info.appendChild(txt('h3','',item.title));
    const meta=txt('div','image-meta');meta.append(txt('span','',`By ${item.creator}`));
    if(item.width&&item.height)meta.append(txt('strong','',`${formatNum(item.width)} × ${formatNum(item.height)}`));info.appendChild(meta);
    const caption=txt('div','image-rights');
    caption.append(txt('span','',`${item.license||'Check licence'} · verify usage rights`));
    if(item.licenseUrl){const link=txt('a','',' Terms ↗');link.href=item.licenseUrl;link.target='_blank';link.rel='noopener noreferrer';caption.append(link);}info.appendChild(caption);
    const actions=txt('div','card-actions');
    const preview=txt('button','card-button primary','▧ Preview 16:9');preview.type='button';preview.addEventListener('click',()=>openPreview(item));
    const download=txt('button','card-button','↓ Download');download.type='button';download.addEventListener('click',()=>downloadImage(item));
    actions.append(preview,download);info.append(actions);
    const footer=txt('div','source-foot'),source=txt('a','','Photo source & licence ↗');
    source.href=item.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
    const copy=txt('button','card-button','Copy credit');copy.type='button';copy.addEventListener('click',()=>copyCredit(item));
    footer.append(source,copy);info.append(footer);card.append(thumb,info);return card;
  }
  function analyseNow(){
    const title=titleInput.value.trim(),body=bodyInput.value.trim();
    if((title+' '+body).trim().length<12){toast('Add article text or a headline first.');bodyInput.focus();return;}
    try{
      analysis=window.CyberPulseAnalyzer.analyseArticle(title,body);
      renderAnalysis(analysis);onlySaved=false;$('saved-toggle').classList.remove('active');$('saved-toggle').setAttribute('aria-pressed','false');
      startNewSearch(analysis.stockSearches?.[0]||analysis.primaryQuery);
    }catch(err){console.error(err);resetState('Article analysis failed','Check that analysis.js and relevance.js are present.',true);}
  }
  function count(){$('char-count').textContent=`${formatNum(titleInput.value.length+bodyInput.value.length)} characters`;}
  function clear(){
    pendingController?.abort();setPending(false);analysis=null;currentQuery='';activeQuery='';batch=0;allImages=[];seen=new Set();onlySaved=false;
    form.reset();matchFilter.value='0';sourceFilter.value='all';sortFilter.value='match';licenseFilter.value='all';count();
    show($('analysis-empty'),true);show($('analysis-content'),false);show($('visual-intent'),false);
    show($('results-controls'),false);show($('rating-explainer'),false);show($('load-more-wrap'),false);show($('more-search'),false);show($('vision-panel'),false);show($('upload-vision-result'),false);
    grid.replaceChildren();resetState('Your stock photo options will appear here','Paste an article to see professional photo concepts with rated article match.');
    $('result-counter').textContent='';$('results-subtitle').textContent='Find wide, high-resolution photos ranked by estimated article relevance.';
    $('saved-toggle').classList.remove('active');$('saved-toggle').setAttribute('aria-pressed','false');
  }
  form.addEventListener('submit',e=>{e.preventDefault();analyseNow();});
  $('refresh-search').addEventListener('click',()=>queryInput.value.trim()===activeQuery?runSearch(activeQuery,{append:true}):startNewSearch(queryInput.value));
  queryInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();startNewSearch(queryInput.value);}});
  $more.addEventListener('click',()=>runSearch(activeQuery||queryInput.value,{append:true}));
  $deep.addEventListener('click',deepSearch);
  $('scan-top').addEventListener('click',scanTop);
  $('vision-upload').addEventListener('change',e=>scanUploadedFile(e.target.files?.[0]));
  $('saved-toggle').addEventListener('click',toggleSaved);
  [matchFilter,sourceFilter,sortFilter,licenseFilter].forEach(el=>el.addEventListener('change',renderGrid));
  $('clear-button').addEventListener('click',clear);
  $('close-banner').addEventListener('click',()=>$('banner-dialog').close());
  bodyInput.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();analyseNow();}});
  $('banner-download').addEventListener('click',()=>{if(selectedItem)downloadImage(selectedItem);});
  titleInput.addEventListener('input',count);bodyInput.addEventListener('input',count);
  $('category-list').replaceChildren(...window.CyberPulseAnalyzer.categories.map(x=>txt('span','',x.name)));
  updateSavedCount();count();
})();
