/* CyberPulse Newsroom v6 — dependable, free/no-key editorial image discovery.
 * Fetches Openverse and Wikimedia Commons independently with real pagination.
 * Optional CLIP scans pixels; search never relies on the vision model. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('article-form'), titleInput=$('article-title'), bodyInput=$('article-body');
  const queryInput=$('search-query'), grid=$('image-grid'), state=$('result-state');
  const licenseFilter=$('license-filter'), matchFilter=$('match-filter');
  const sourceFilter=$('source-filter'), sortFilter=$('sort-filter');
  const $more=$('load-more'), $deep=$('deep-search'), toastEl=$('toast');
  let analysis=null, currentQuery='', activeQuery='', batch=0, pendingController=null, activeMode='context', cropMode='card';
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
  function renderAnalysis(result){
    show($('analysis-empty'),false);show($('analysis-content'),true);show($('visual-intent'),true);show($('vision-panel'),true);
    show($('results-controls'),true);show($('rating-explainer'),true);
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
    $('visual-context-copy').textContent=result.entity
      ?`Prioritising photos that fit this ${result.entity} story, with real settings and technology as alternatives.`
      :'Prioritising real-world scenes rather than generic lock and hacker pictures.';
    $('newsroom-angle').textContent=`Angle: ${result.angle}`;
    $('newsroom-subject').textContent=`Subject: ${result.visualSubject}`;
    $('editorial-warning').textContent=result.editorialWarning;
    $('headline-source-note').textContent=result.headlineSource+' · Check every fact before publishing.';
    activeMode=result.recommendedMode;
    document.querySelectorAll('[data-photo-mode]').forEach(el=>{
      const yes=el.dataset.photoMode===activeMode;el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));
    });
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
    const base=window.CyberPulseRelevance.estimate(item,query,analysis);
    const visual=item.vision;
    if(visual) return {...item,match:{...base,score:window.CyberPulseVision.combineScore(base.score,visual.affinity),tier:'Pixel AI reviewed',reason:`CLIP relative visual match ${visual.affinity}% (photo pixels inspected); ${base.reason.toLowerCase()}`}};
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
    $more.textContent=value?'Searching free image libraries…':'↻ Find more new photos';}
  function toggleSaved(){onlySaved=!onlySaved;$('saved-toggle').setAttribute('aria-pressed',String(onlySaved));
    $('saved-toggle').classList.toggle('active',onlySaved);renderGrid();}
  function renderGrid(){
    const data=onlySaved?Object.values(favorites).map(x=>rated(x,currentQuery||analysis?.stockSearches?.[0]||'')):allImages;
    const minMatch=Number(matchFilter.value)||0;
    const filtered=data.filter(x=>x.match.score>=minMatch&&(sourceFilter.value==='all'||x.source===sourceFilter.value)&&acceptedLicense(x));
    filtered.sort((a,b)=>sortFilter.value==='resolution'?(b.width*b.height-a.width*a.height)||(b.match.score-a.match.score):
      sortFilter.value==='visual'?(Number(!!b.vision)-Number(!!a.vision))||(b.match.score-a.match.score):
      (b.match.score-a.match.score)||(b.width*b.height-a.width*a.height));
    if(filtered.length){grid.replaceChildren(...filtered.map(renderCard));show(grid,true);show(state,false);}
    else if(!pending){resetState(onlySaved?'No saved photos for these filters':'No photos match the selected filters',
      onlySaved?'Save a photo by tapping the star, or adjust your match/source filters.':'Try All rated, All sources and Eligible licences; then search again.');}
    $('result-counter').textContent=`${filtered.length} displayed · ${allImages.length} discovered`;
    show($('load-more-wrap'),Boolean(analysis)&&!onlySaved);
    $('load-more-status').textContent=batch?`Batch ${batch} explored · duplicates hidden · ${allImages.length} unique photos found`:'Each click explores additional results and avoids duplicates';
    updateSavedCount();
  }
  async function runSearch(q,{append=false}={}){
    const query=short(q);if(!query){toast('Enter search keywords first.');return;}
    if(pending)return;
    if(!analysis){toast('Please analyse an article first.');return;}
    if(!append||query!==activeQuery){
      pendingController?.abort();activeQuery=query;batch=0;seen=new Set();allImages=[];
      resetState('Finding photos for your story…','Checking Openverse and Wikimedia Commons. No login or API key needed.');
      $('result-counter').textContent='';
    }
    currentQuery=query;queryInput.value=query;updateLinks();
    pendingController?.abort();const pendingNow=new AbortController();pendingController=pendingNow;setPending(true);
    const next=batch+1;
    const choices=[...new Set([query,...(analysis.searchModes?.[activeMode]||[]),...(analysis.stockSearches||[]),...(analysis.editorialSearches||[])].map(short).filter(Boolean))].slice(0,12);
    // Two distinct pages per phrase, then rotate to the next story-specific direction.
    // This avoids repeatedly showing one stale/unrelated topic on Refresh.
    const block=Math.floor((next-1)/2);
    const phrase=choices[block%choices.length];
    const page=(Math.floor(block/choices.length)*2)+(next-1)%2+1;
    const jobs=sourceJobs(phrase,page,pendingNow.signal);
    try{
      const settled=await Promise.allSettled(jobs.map(job=>job.promise));
      if(pendingNow.signal.aborted)return;
      const collected=[],failures=[];
      settled.forEach((result,i)=>{
        if(result.status==='fulfilled')collected.push(...result.value.map(item=>({...item,_query:phrase})));
        else failures.push(jobs[i].name);
      });
      // On the first empty batch try a short, broader article topic once, automatically.
      // This recovers from extremely specific headlines without forcing the editor to retry.
      if(next===1&&!collected.some(isPhoto)&&!pendingNow.signal.aborted){
        const fallback=short([...(analysis?.searchModes?.context||[]),...(analysis?.searchModes?.concept||[]),...(analysis?.editorialSearches||[]),analysis?.topic,'cybersecurity computers'].find(term=>term&&short(term).toLowerCase()!==phrase.toLowerCase())||'cybersecurity computers');
        if(fallback&&fallback.toLowerCase()!==phrase.toLowerCase()){
          const retry=await Promise.allSettled(sourceJobs(fallback,1,pendingNow.signal).map(job=>job.promise));
          if(pendingNow.signal.aborted)return;
          retry.forEach((result,i)=>{
            if(result.status==='fulfilled')collected.push(...result.value.map(item=>({...item,_query:fallback})));
            else if(!failures.includes(jobs[i].name))failures.push(jobs[i].name);
          });
        }
      }
      let added=0;
      for(const item of collected){
        if(!isPhoto(item))continue;
        const key=item.imageUrl||item.id;
        if(seen.has(key))continue;
        seen.add(key);
        allImages.push(rated(item,item._query));added++;
      }
      batch=next;
      $('results-subtitle').textContent=`“${query}” · ${batch} ${batch===1?'batch':'batches'} · Openverse + Wikimedia Commons · check source licence`;
      if(!added&&!allImages.length){
        resetState(failures.length===jobs.length?'Image libraries temporarily unavailable':'No photos found in this batch',
          'Try Fresh results again or choose another suggested keyword. You can also open the photo libraries below.');
      }else if(!added){toast('No new photos in this batch. Click again for the next page or try another keyword.');}
      else if(failures.length){toast(`${added} new photos found. One image library was unavailable; other results are shown.`);}
      renderGrid();show($('more-search'),true);
    }catch(err){
      if(!pendingNow.signal.aborted){
        if(allImages.length)toast('A photo source could not load. Previously found photos are still available.');
        else resetState('Unable to load this batch','Try a new keyword or use the source links below.');
      }
    }finally{if(!pendingNow.signal.aborted){setPending(false);renderGrid();}}
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
      toast(`WordPress-ready ${w}×${h} JPG exported. Check original licence and attribution.`);
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
    const breakdown=txt('div','score-breakdown');
    breakdown.append(txt('span','',`Topic ${item.match.topic}/70`),txt('span','',`Quality ${item.match.quality}/20`),txt('span','',`Banner ${item.match.banner}/10`));
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
      startNewSearch(analysis.primaryQuery||analysis.stockSearches?.[0]);
    }catch(err){console.error(err);resetState('Article analysis failed','Check that analysis.js and relevance.js are present.',true);}
  }
  function count(){$('char-count').textContent=`${formatNum(titleInput.value.length+bodyInput.value.length)} characters`;}
  function clear(){
    pendingController?.abort();setPending(false);analysis=null;currentQuery='';activeQuery='';activeMode='context';batch=0;allImages=[];seen=new Set();onlySaved=false;
    form.reset();matchFilter.value='0';sourceFilter.value='all';sortFilter.value='match';licenseFilter.value='all';count();
    show($('analysis-empty'),true);show($('analysis-content'),false);show($('visual-intent'),false);
    show($('results-controls'),false);show($('rating-explainer'),false);show($('load-more-wrap'),false);show($('more-search'),false);show($('vision-panel'),false);show($('upload-vision-result'),false);
    grid.replaceChildren();resetState('Your article image options will appear here','Paste an article to see image suggestions with estimated match scores.');
    $('result-counter').textContent='';$('results-subtitle').textContent='Find relevant free-licence photographs, ranked by estimated editorial suitability.';
    $('saved-toggle').classList.remove('active');$('saved-toggle').setAttribute('aria-pressed','false');
  }
  form.addEventListener('submit',e=>{e.preventDefault();analyseNow();});
  $('refresh-search').addEventListener('click',()=>queryInput.value.trim()===activeQuery?runSearch(activeQuery,{append:true}):startNewSearch(queryInput.value));
  queryInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();startNewSearch(queryInput.value);}});
  $more.addEventListener('click',()=>runSearch(activeQuery||queryInput.value,{append:true}));
  $deep.addEventListener('click',deepSearch);
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
  $('crop-card').addEventListener('click',()=>setCrop('card'));
  $('crop-feature').addEventListener('click',()=>setCrop('feature'));
  $('vision-upload').addEventListener('change',e=>scanUploadedFile(e.target.files?.[0]));
  $('saved-toggle').addEventListener('click',toggleSaved);
  [matchFilter,sourceFilter,sortFilter,licenseFilter].forEach(el=>el.addEventListener('change',renderGrid));
  $('clear-button').addEventListener('click',clear);
  $('close-banner').addEventListener('click',()=>$('banner-dialog').close());
  bodyInput.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();analyseNow();}});
  $('banner-download').addEventListener('click',()=>{if(selectedItem)downloadImage(selectedItem);});
  $('download-crop').addEventListener('click',()=>{if(selectedItem)exportWordPressCrop(selectedItem);});
  titleInput.addEventListener('input',count);bodyInput.addEventListener('input',count);
  $('category-list').replaceChildren(...window.CyberPulseAnalyzer.categories.map(x=>txt('span','',x.name)));
  updateSavedCount();count();
})();
