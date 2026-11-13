/* CyberPulse Image Finder v2 — resilient, static GitHub Pages client.
 * Article analysis stays in browser; image search sends only short queries.
 * No API secrets are stored in the frontend. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('article-form');
  const titleInput = $('article-title');
  const bodyInput = $('article-body');
  const queryInput = $('search-query');
  const grid = $('image-grid');
  const state = $('result-state');
  const licenseFilter = $('license-filter');
  const shapeFilter = $('shape-filter');
  let analysis = null;
  let mode = 'editorial';
  let currentQuery = '';
  let controller = null;
  let selectedItem = null;
  let toastTimer;

  const show = (el, on=true) => { if(el) el.hidden = !on; };
  const safeUrl = value => { try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const txt = (tag, cls, content='') => { const el=document.createElement(tag); if(cls)el.className=cls; el.textContent=content; return el; };
  const short = str => String(str||'').replace(/\s+/g,' ').trim().slice(0,120);

  function toast(message) {
    const element=$('toast'); element.textContent=message; element.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),3800);
  }
  function loading(message) {
    grid.replaceChildren();show(grid,false);show(state,true);show($('more-search'),true);
    state.classList.remove('error');
    state.replaceChildren(txt('div','loader-icon'), txt('h3','',message),txt('p','','Searching the original subject and checking photo dimensions.'));
    $('result-counter').textContent='';updateLinks();
  }
  function message(title,description,error=false) {
    grid.replaceChildren();show(grid,false);show(state,true);show($('more-search'),true);
    state.classList.toggle('error',error);
    state.replaceChildren(txt('div','result-placeholder-icon',error?'!':'▧'),txt('h3','',title),txt('p','',description));
    $('result-counter').textContent='';updateLinks();
  }
  function updateLinks() {
    const q=currentQuery||analysis?.primaryQuery||'technology';
    $('open-openverse').href=`https://openverse.org/search/image?q=${encodeURIComponent(q)}`;
    $('open-pexels').href=`https://www.pexels.com/search/${encodeURIComponent(q)}/`;
    $('open-unsplash').href=`https://unsplash.com/s/photos/${encodeURIComponent(q.replaceAll(' ','-'))}`;
    $('open-pixabay').href=`https://pixabay.com/images/search/${encodeURIComponent(q)}/`;
  }
  function renderChips(id, phrases) {
    const dest=$(id);dest.replaceChildren();
    for(const q of [...new Set(phrases)].slice(0,8)) {
      const button=txt('button','query-chip',q);button.type='button';
      button.addEventListener('click',()=>{queryInput.value=q;searchImages(q);});
      dest.appendChild(button);
    }
  }
  function currentPhrases() {
    return mode==='editorial' ? analysis?.editorialSearches||[] : analysis?.stockSearches||[];
  }
  function selectMode(next,search=true) {
    mode=next;
    for(const key of ['editorial','stock']) {
      const button=$(key+'-mode');button.classList.toggle('active',key===mode);
      button.setAttribute('aria-pressed',String(key===mode));
    }
    if(!analysis)return;
    const phrases=currentPhrases();
    renderChips('query-chips',phrases);
    renderChips('more-chips',phrases.slice(1));
    const q=phrases[0]||analysis.primaryQuery;
    queryInput.value=q;
    $('visual-context-title').textContent=mode==='editorial' ? 'Authentic subject / company photos' : 'Professional conceptual stock photography';
    $('visual-context-copy').textContent=mode==='editorial'
      ? (analysis.entity ? `Prioritising ${analysis.entity} and its actual products or offices. Verify that photos are authentic before using them as news illustrations.` : 'Searching photographs that closely represent the topic of this story.')
      : 'Searching physical, photographic concepts appropriate for a cybersecurity news banner. Concept images do not necessarily show the actual event.';
    if(search)searchImages(q);
  }
  function renderAnalysis(result) {
    show($('analysis-empty'),false);show($('analysis-content'),true);
    show($('visual-intent'),true);show($('results-controls'),true);
    $('primary-category').textContent=result.primary;
    $('category-symbol').textContent=result.symbol;
    $('category-reason').textContent=result.reason;
    $('confidence-pill').textContent=result.confidence;
    $('secondary-categories').replaceChildren();
    (result.other.length?result.other:['No strong alternative']).forEach(name=>$('secondary-categories').appendChild(txt('span','category-chip',name)));
    selectMode(result.entity?'editorial':'stock',false);
    updateLinks();
  }
  function licenseQuery() {
    return licenseFilter.value==='no-credit'?'cc0,pdm':licenseFilter.value==='credit'?'by,by-sa':'cc0,pdm,by,by-sa';
  }
  function isPublicLicense(raw) {
    const key=String(raw||'').toLowerCase().replace(/\s+/g,'');
    return key.includes('cc0')||key.includes('pdm')||key.includes('publicdomain')||key==='pd';
  }
  function acceptedLicense(raw,source='') {
    if(source==='Pixabay') return licenseFilter.value!=='credit';
    const key=String(raw||'').toLowerCase().replace(/\s+/g,'');
    if(!key||key.includes('noncommercial')||key.includes('noderivatives')||key.includes('by-nc')||key.includes('by-nd')||key.includes('nc-')||key.includes('nd-')) return false;
    const good=isPublicLicense(key)||key==='by'||key==='by-sa'||key.startsWith('ccby')||key.startsWith('cc-by')||key.includes('attribution');
    if(!good)return false;
    if(licenseFilter.value==='no-credit')return isPublicLicense(key);
    if(licenseFilter.value==='credit')return !isPublicLicense(key);
    return true;
  }
  function normalizeOpenverse(data) {
    return {
      id:'ov:'+data.id,title:data.title||'Untitled photo',creator:data.creator||'Unknown creator',
      imageUrl:safeUrl(data.url),thumbnail:safeUrl(data.thumbnail)||safeUrl(data.url),
      sourceUrl:safeUrl(data.foreign_landing_url)||safeUrl(data.detail_url)||safeUrl(data.url),
      license:String(data.license||'').toLowerCase(),licenseUrl:safeUrl(data.license_url),
      attribution:data.attribution||'',source:'Openverse',width:Number(data.width)||0,height:Number(data.height)||0,
      tags:(data.tags||[]).slice(0,24).map(t=>typeof t==='string'?t:t.name||'').join(' '),
      mime:String(data.filetype||''),provider:'Openverse'
    };
  }
  async function searchOpenverse(query,signal) {
    const url=new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q',short(query));url.searchParams.set('page_size','20');
    url.searchParams.set('license',licenseQuery());url.searchParams.set('mature','false');url.searchParams.set('filter_dead','true');
    if(shapeFilter.value==='landscape')url.searchParams.set('aspect_ratio','wide');
    const response=await fetch(url.href,{signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(`Openverse returned ${response.status}`);
    const json=await response.json();
    if(!Array.isArray(json.results))throw Error('Invalid Openverse response');
    return json.results.map(normalizeOpenverse).filter(x=>x.imageUrl&&x.thumbnail&&acceptedLicense(x.license));
  }
  function stripHtml(html) {
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    return (doc.body.textContent||'').replace(/\s+/g,' ').trim();
  }
  function normalizeCommons(page) {
    const info=page.imageinfo?.[0];if(!info)return null;
    const data=info.extmetadata||{};
    const val=key=>stripHtml(data[key]?.value||'');
    const license=val('LicenseShortName')||val('UsageTerms');
    return {
      id:'wm:'+page.pageid,title:page.title.replace(/^File:/i,'').replace(/\.[^.]{2,6}$/,'').replaceAll('_',' '),
      creator:val('Artist').slice(0,110)||'Wikimedia contributor',
      thumbnail:safeUrl(info.thumburl)||safeUrl(info.url),imageUrl:safeUrl(info.url),
      sourceUrl:safeUrl(info.descriptionurl)||`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`,
      license,licenseUrl:safeUrl(data.LicenseUrl?.value),attribution:'',source:'Wikimedia Commons',
      width:Number(info.width)||0,height:Number(info.height)||0,tags:`${val('ImageDescription')} ${val('ObjectName')}`.slice(0,240),
      mime:String(info.mime||''),provider:'Wikimedia Commons'
    };
  }
  async function searchCommons(query,signal) {
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    const params={action:'query',generator:'search',gsrsearch:short(query)+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'24',
      prop:'imageinfo',iiprop:'url|size|extmetadata|mime',iiurlwidth:'720',format:'json',formatversion:'2',origin:'*'};
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    const response=await fetch(url.href,{signal});
    if(!response.ok)throw Error(`Wikimedia returned ${response.status}`);
    const data=await response.json();
    return (data.query?.pages||[]).map(normalizeCommons).filter(Boolean)
      .filter(x=>x.imageUrl&&x.thumbnail&&acceptedLicense(x.license));
  }
  async function searchPixabay(query,signal) {
    const configured=window.CyberPulseConfig?.pixabayWorkerUrl||'';
    const base=safeUrl(configured);if(!base)return [];
    const url=new URL(base);url.searchParams.set('q',short(query));
    const response=await fetch(url.href,{signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error(`Pixabay image service returned ${response.status}`);
    const json=await response.json();
    if(!Array.isArray(json.hits))throw Error('Invalid Pixabay image response');
    return json.hits.map(x=>({
      id:'px:'+x.id,title:x.tags||'Professional stock photo',creator:x.user||'Pixabay contributor',
      thumbnail:safeUrl(x.webformatURL)||safeUrl(x.previewURL),imageUrl:safeUrl(x.largeImageURL)||safeUrl(x.webformatURL),
      sourceUrl:safeUrl(x.pageURL),license:'Pixabay Content License',licenseUrl:'https://pixabay.com/service/license-summary/',
      attribution:'',source:'Pixabay',width:Number(x.imageWidth)||0,height:Number(x.imageHeight)||0,
      tags:String(x.tags||''),mime:'image/jpeg',provider:'Pixabay'
    })).filter(x=>x.imageUrl&&x.thumbnail&&acceptedLicense(x.license,x.source));
  }
  function imageScore(item,query) {
    const text=(`${item.title} ${item.tags}`).toLowerCase();
    const words=short(query).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!['and','the','with','stock','photo','technology','computer'].includes(w));
    let score=words.filter(w=>text.includes(w)).length*14;
    if(analysis?.entity&&mode==='editorial'&&text.includes(analysis.entity.toLowerCase().split(' ')[0])) score+=45;
    const ratio=item.width&&item.height?item.width/item.height:0;
    if(item.width>=2200)score+=22;else if(item.width>=1600)score+=16;else if(item.width>=1200)score+=10;
    if(ratio>=1.55&&ratio<=2.3)score+=24;else if(ratio>=1.3)score+=11;
    if(item.source==='Pixabay'&&mode==='stock')score+=12;
    if(item.width&&item.width<950)score-=35;
    if(/\b(logo|icon|screenshot|diagram|illustration|vector|symbol|poster|clipart|infographic|map|chart)\b/i.test(text))score-=32;
    if(/svg\b/i.test(item.mime||''))score-=90;
    if(isPublicLicense(item.license))score+=3;
    return score;
  }
  function uniqueRank(items,query) {
    const seen=new Set();
    return items.filter(item=>{
      if(!item.imageUrl||seen.has(item.imageUrl))return false;
      seen.add(item.imageUrl);
      if(shapeFilter.value==='landscape'&&item.width&&item.height&&item.width/item.height<1.35)return false;
      if(item.width&&item.width<700)return false;
      if(/svg/i.test(item.mime||''))return false;
      if(analysis?.entity && mode==='editorial') {
        const brand=analysis.entity.toLowerCase().split(' ')[0];
        const text=(item.title+' '+item.tags).toLowerCase();
        if(!text.includes(brand)&&!(brand==='nvidia'&&/geforce|rtx\s*\d|blackwell/i.test(text)))return false;
      }
      return true;
    }).sort((a,b)=>imageScore(b,query)-imageScore(a,query)).slice(0,15);
  }
  async function searchImages(queryRaw) {
    const query=short(queryRaw);if(!query){toast('Please enter a search phrase.');return;}
    currentQuery=query;queryInput.value=query;
    controller?.abort();const pending=new AbortController();controller=pending;
    loading(`Finding ${mode==='editorial'?'subject-specific':'professional stock'} banner images…`);
    const providers=[searchOpenverse(query,pending.signal),searchCommons(query,pending.signal)];
    if(window.CyberPulseConfig?.pixabayWorkerUrl)providers.push(searchPixabay(query,pending.signal));
    const settled=await Promise.allSettled(providers);
    if(pending.signal.aborted)return;
    let all=[];const errors=[];
    settled.forEach((r,i)=>{if(r.status==='fulfilled')all.push(...r.value);else errors.push(`${['Openverse','Wikimedia','Pixabay'][i]}: ${r.reason?.message||'unavailable'}`);});
    let matched=uniqueRank(all,query);
    // One short retry, only when no provider returned a suitable image.
    if(!matched.length && query.split(' ').length>1) {
      // Short topic/brand retries greatly improve older licensed-media catalogs.
      const fallback=analysis?.entity&&mode==='editorial'?analysis.entity:
        (query.toLowerCase().includes('gpu')?'graphics card':query.split(' ').find(w=>w.length>4&&!['close','technology','photo'].includes(w.toLowerCase()))||query.split(' ')[0]);
      const retry=await Promise.allSettled([searchOpenverse(fallback,pending.signal),searchCommons(fallback,pending.signal)]);
      if(pending.signal.aborted)return;
      for (const result of retry) {
        if(result.status==='fulfilled')all.push(...result.value);
        else errors.push(`Provider retry: ${result.reason?.message||'unavailable'}`);
      }
      matched=uniqueRank(all,fallback);
    }
    if(pending.signal.aborted)return;
    $('results-subtitle').textContent=`Image search: “${query}” · ${mode==='editorial'?'Exact subject':'Stock concept'} · review the licence of every image.`;
    if(matched.length) {
      show(state,false);show(grid,true);grid.replaceChildren(...matched.map(renderCard));
      $('result-counter').textContent=`${matched.length} images`;
      show($('more-search'),true);updateLinks();
      if(errors.length)toast('Some image sources were unavailable. Other results are shown.');
    } else {
      message(errors.length===providers.length?'Search providers are temporarily unavailable':'No suitable banner images found for this phrase',
        analysis?.entity&&mode==='editorial'?'Choose “Professional stock concept” to see illustrations of the subject, or use the original photo sites below.':'Try another suggested keyword. The search excludes small, portrait and incompatible-licence images.',errors.length===providers.length);
    }
  }
  const slug = s=>String(s||'image').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'image';
  function creditText(item) {
    if(item.source==='Pixabay')return `Photo: ${item.title}\nCreator: ${item.creator}\nSource: ${item.sourceUrl}\nLicence: ${item.licenseUrl}`;
    return item.attribution?`${item.attribution}\nOriginal source: ${item.sourceUrl}`:
      `Image: ${item.title}\nAuthor: ${item.creator}\nLicence: ${item.license}\nTerms: ${item.licenseUrl||'Check original source'}\nOriginal source: ${item.sourceUrl}`;
  }
  async function copyCredit(item) {
    const text=creditText(item);
    try {await navigator.clipboard.writeText(text);toast('Image attribution copied.');}
    catch {const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();toast(ok?'Image attribution copied.':'Please copy credit from the original source.');}
  }
  async function downloadImage(item) {
    // Many photo hosts block cross-origin downloads; a source-page fallback is required.
    const opened=window.open('about:blank','_blank');
    try {
      const response=await fetch(item.imageUrl,{mode:'cors'});
      if(!response.ok)throw Error('Image download blocked');
      const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('Invalid image');
      const objectUrl=URL.createObjectURL(blob), link=document.createElement('a');
      link.href=objectUrl;link.download=`cyberpulse-${slug(analysis?.inferredTitle||item.title)}.${blob.type.includes('png')?'png':blob.type.includes('webp')?'webp':'jpg'}`;
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),15000);
      opened?.close();toast('Download started. Check the image licence before publication.');
    } catch {
      if(opened)opened.location.replace(item.sourceUrl||item.imageUrl);else window.open(item.sourceUrl||item.imageUrl,'_blank','noopener,noreferrer');
      toast('Provider blocked direct download. Opened the original photo page instead.');
    }
  }
  function openPreview(item) {
    selectedItem=item;
    $('banner-preview-image').src=item.imageUrl;
    $('banner-preview-title').textContent=`${analysis?.inferredTitle||'CyberPulse news'} · ${item.width||'?'} × ${item.height||'?'} · ${item.source}`;
    $('banner-original').href=item.sourceUrl||item.imageUrl;
    const dialog=$('banner-dialog');if(typeof dialog.showModal==='function')dialog.showModal();else toast('Your browser does not support the banner preview.');
  }
  function renderCard(item) {
    const card=txt('article','image-card');
    const thumb=txt('div','image-thumb');
    const img=document.createElement('img');img.src=item.thumbnail;img.loading='lazy';img.alt=item.title;img.referrerPolicy='no-referrer';
    const fallback=txt('div','fallback','Image unavailable — open the original source');
    img.addEventListener('error',()=>{img.style.display='none';fallback.style.display='grid';});
    thumb.append(img,fallback);
    const badges=txt('div','image-badges');
    badges.append(txt('span','source-badge',item.source),txt('span','license-badge',item.license));
    thumb.appendChild(badges);
    const body=txt('div','image-body');body.appendChild(txt('h3','',item.title));
    const meta=txt('div','image-meta');meta.appendChild(txt('span','',`By ${item.creator}`));
    if(item.width&&item.height)meta.appendChild(txt('strong','',`${item.width} × ${item.height}`));
    body.appendChild(meta);
    const caption=txt('div','image-rights');
    caption.appendChild(txt('span','',item.source==='Pixabay'?'Pixabay Content License · review terms':
      isPublicLicense(item.license)?'CC0 / public domain label · verify original':'Attribution may be required · verify original'));
    if(item.licenseUrl){const link=txt('a','',' Licence ↗');link.href=item.licenseUrl;link.target='_blank';link.rel='noopener noreferrer';caption.appendChild(link);}
    body.appendChild(caption);
    const actions=txt('div','card-actions');
    const preview=txt('button','card-button primary','▧ Preview 16:9');preview.type='button';preview.addEventListener('click',()=>openPreview(item));
    const download=txt('button','card-button','↓ Download');download.type='button';download.addEventListener('click',()=>downloadImage(item));
    actions.append(preview,download);body.appendChild(actions);
    const foot=txt('div','source-foot');
    const source=txt('a','','View source & permissions ↗');source.href=item.sourceUrl||item.imageUrl;source.rel='noopener noreferrer';source.target='_blank';
    const copy=txt('button','card-button','Copy credit');copy.type='button';copy.addEventListener('click',()=>copyCredit(item));
    foot.append(source,copy);body.appendChild(foot);card.append(thumb,body);return card;
  }
  function analyzeNow() {
    const title=titleInput.value.trim(),body=bodyInput.value.trim();
    if((title+' '+body).trim().length<12){toast('Paste your article title or some article text to analyse.');bodyInput.focus();return;}
    try {
      analysis=window.CyberPulseAnalyzer.analyseArticle(title,body);
      renderAnalysis(analysis);
      searchImages(currentPhrases()[0]||analysis.primaryQuery);
    }catch(error){console.error('Article analysis failed:',error);message('Article analysis could not complete','Refresh the page and try again. Ensure both analysis.js and app.js were uploaded.',true);}
  }
  form.addEventListener('submit',event=>{event.preventDefault();analyzeNow();});
  $('editorial-mode').addEventListener('click',()=>selectMode('editorial'));
  $('stock-mode').addEventListener('click',()=>selectMode('stock'));
  $('refresh-search').addEventListener('click',()=>searchImages(queryInput.value));
  queryInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchImages(queryInput.value);}});
  licenseFilter.addEventListener('change',()=>{if(analysis)searchImages(currentQuery||queryInput.value);});
  shapeFilter.addEventListener('change',()=>{if(analysis)searchImages(currentQuery||queryInput.value);});
  $('sample-button').addEventListener('click',()=>{
    titleInput.value='NVIDIA announces next-generation Blackwell AI chips for data centers';
    bodyInput.value='NVIDIA has announced a new Blackwell artificial intelligence GPU designed for large language model training and inference in modern data centers. The new processor targets AI workloads and high-performance computing, and cybersecurity researchers are watching the technology.';
    count();analyzeNow();
  });
  $('clear-button').addEventListener('click',()=>{
    controller?.abort();analysis=null;currentQuery='';selectedItem=null;form.reset();count();
    show($('analysis-empty'),true);show($('analysis-content'),false);show($('visual-intent'),false);show($('results-controls'),false);
    grid.replaceChildren();show(grid,false);show($('more-search'),false);
    state.classList.remove('error');show(state,true);
    state.replaceChildren(txt('div','result-placeholder-icon','▧'),txt('h3','','Your image options will appear here'),txt('p','','Paste an article above to find authentic or conceptual banner images.'));
    $('result-counter').textContent='';$('results-subtitle').textContent='Search landscape, preferably high-resolution photos matched to your article.';
    titleInput.focus();
  });
  $('close-banner').addEventListener('click',()=>$('banner-dialog').close());
  $('banner-download').addEventListener('click',()=>{if(selectedItem)downloadImage(selectedItem);});
  function count(){$('char-count').textContent=`${(titleInput.value.length+bodyInput.value.length).toLocaleString()} characters`;}
  titleInput.addEventListener('input',count);bodyInput.addEventListener('input',count);
  $('category-list').replaceChildren(...window.CyberPulseAnalyzer.categories.map(x=>txt('span','',x.name)));
  count();
})();
