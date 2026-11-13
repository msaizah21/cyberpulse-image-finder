/* CyberPulse Image Finder — static, public GitHub Pages edition. No secret API key. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('article-form');
  const titleInput = $('article-title');
  const bodyInput = $('article-body');
  const queryInput = $('search-query');
  const grid = $('image-grid');
  const state = $('result-state');
  const licenseFilter = $('license-filter');
  const shapeFilter = $('shape-filter');
  const cardsPerPage = 12;
  let currentAnalysis = null;
  let activeController = null;
  let lastResults = [];
  let currentQuery = '';
  let toastTimer;

  const show = (el, yes=true) => {el.hidden = !yes;};
  const safeUrl = (url) => {try {const parsed = new URL(url);return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';} catch {return '';}};
  const txt = (tag, className, value) => {const el=document.createElement(tag);if(className)el.className=className;el.textContent=value ?? '';return el;};

  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3900);
  }
  function setLoading(message) {
    grid.replaceChildren(); show(grid, false); show(state);show($('more-search'), false);
    state.classList.remove('error');
    state.replaceChildren(txt('div','loader-icon',''), txt('h3','',message || 'Searching openly licensed images…'), txt('p','','We’re comparing image options for this story.'));
    $('result-counter').textContent = '';
  }
  function showMessage(header, detail, isError=false) {
    grid.replaceChildren(); show(grid,false); show(state); state.classList.toggle('error',isError);
    state.replaceChildren(txt('div','result-placeholder-icon',isError ? '!' : '▧'),txt('h3','',header),txt('p','',detail));
    show($('more-search'), true);
    updateOpenverseLink();
  }
  function updateOpenverseLink() {
    const term = currentQuery || (currentAnalysis?.searches[0] || 'cybersecurity');
    $('open-openverse').href = `https://openverse.org/search/image?q=${encodeURIComponent(term)}`;
  }
  function renderChips(targetId, phrases) {
    const target = $(targetId);target.replaceChildren();
    for (const phrase of [...new Set(phrases)]) {
      const chip = txt('button','query-chip',phrase);
      chip.type='button'; chip.title=`Search: ${phrase}`;
      chip.addEventListener('click', () => {queryInput.value=phrase;searchImages(phrase);});
      target.appendChild(chip);
    }
  }
  function renderAnalysis(analysis) {
    show($('analysis-empty'), false);show($('analysis-content'),true);
    $('primary-category').textContent=analysis.primary;
    $('category-symbol').textContent=analysis.symbol;
    $('category-reason').textContent=analysis.reason;
    $('confidence-pill').textContent=analysis.confidence;
    $('secondary-categories').replaceChildren();
    const alternatives=analysis.other.length ? analysis.other : ['No strong alternative detected'];
    alternatives.forEach(name=>$('secondary-categories').appendChild(txt('span','category-chip',name)));
    queryInput.value=analysis.searches[0];
    renderChips('query-chips',analysis.searches);
    renderChips('more-chips',analysis.searches.slice(1).concat(['cybersecurity technology','data center servers']));
    show($('results-controls'),true);
    updateOpenverseLink();
  }

  // Openverse API offers anonymous browser access. These filters exclude non-commercial licenses.
  // Creative Commons BY and BY-SA still require attribution; BY-SA has additional share-alike obligations.
  function licenseQuery() {
    return licenseFilter.value === 'no-credit' ? 'cc0,pdm' :
           licenseFilter.value === 'credit' ? 'by,by-sa' : 'cc0,pdm,by,by-sa';
  }
  function acceptedLicense(value) {
    const raw=String(value || '').toLowerCase().replace(/\s+/g,'');
    if (!raw) return false;
    const isPublic=raw.includes('cc0')||raw.includes('publicdomain')||raw.includes('pdm')||raw.includes('pd-');
    const isBy=raw==='by'||raw.startsWith('ccby')||raw.startsWith('cc-by')||raw.startsWith('attribution');
    const hasNC=raw.includes('nc')||raw.includes('noncommercial');
    const hasND=raw.includes('nd')||raw.includes('noderivatives');
    if (hasNC||hasND||(!isPublic&&!isBy)) return false;
    if (licenseFilter.value==='no-credit') return isPublic;
    if (licenseFilter.value==='credit') return !isPublic;
    return true;
  }
  function normalizeOpenverse(record) {
    const url=safeUrl(record.url), thumbnail=safeUrl(record.thumbnail)||url;
    const license=String(record.license || '').toLowerCase();
    return {
      id:`ov:${record.id}`, title:record.title || 'Untitled image',
      creator:record.creator || 'Unknown creator',
      thumbnail, imageUrl:url,
      sourceUrl:safeUrl(record.foreign_landing_url) || safeUrl(record.detail_url) || url,
      license, licenseUrl:safeUrl(record.license_url),
      attribution:record.attribution || '', source:record.source || record.provider || 'Openverse',
      width:Number(record.width)||0, height:Number(record.height)||0,
      tags:(record.tags || []).slice(0,14).map(x => typeof x === 'object' ? x.name : x).join(' ').toLowerCase()
    };
  }
  async function searchOpenverse(query, signal) {
    const url=new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q',query.slice(0,180));url.searchParams.set('page_size','24');
    url.searchParams.set('license',licenseQuery());
    url.searchParams.set('mature','false');url.searchParams.set('filter_dead','true');
    if (shapeFilter.value==='landscape') url.searchParams.set('aspect_ratio','wide');
    const response=await fetch(url.href,{signal,headers:{Accept:'application/json'}});
    if (!response.ok) throw Error(`Openverse responded ${response.status}`);
    const data=await response.json();
    if (!Array.isArray(data.results)) throw Error('Unexpected image search response');
    return data.results.map(normalizeOpenverse).filter(item=>item.imageUrl&&item.thumbnail&&acceptedLicense(item.license));
  }

  // Wikimedia Commons is a second publicly accessible, browser-friendly provider.
  // It is only used as a fallback, and its metadata is inspected to exclude non-commercial terms.
  function stripTags(html) {
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    return (doc.body.textContent||'').replace(/\s+/g,' ').trim();
  }
  function normalizeWikimedia(page) {
    const info=page.imageinfo?.[0];if(!info) return null;
    const data=info.extmetadata||{};
    const val=(key)=>stripTags(data[key]?.value || '');
    const license=val('LicenseShortName') || val('UsageTerms');
    const creator=val('Artist').slice(0,120)||'Wikimedia Commons contributor';
    return {
      id:`wm:${page.pageid}`, title:page.title.replace(/^File:/i,'').replace(/\.[^.]{2,6}$/,'').replaceAll('_',' '),
      creator, thumbnail:safeUrl(info.thumburl)||safeUrl(info.url), imageUrl:safeUrl(info.url),
      sourceUrl:safeUrl(info.descriptionurl)||`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`,
      license, licenseUrl:safeUrl(data.LicenseUrl?.value || ''),
      attribution:'',source:'Wikimedia Commons',width:Number(info.width)||0,height:Number(info.height)||0,tags:''
    };
  }
  async function searchCommons(query, signal) {
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    const params={action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'24',prop:'imageinfo',
      iiprop:'url|size|extmetadata',iiurlwidth:'720',format:'json',formatversion:'2',origin:'*'};
    Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));
    const response=await fetch(url.href,{signal});
    if(!response.ok) throw Error(`Wikimedia Commons responded ${response.status}`);
    const json=await response.json();
    return (json.query?.pages||[]).map(normalizeWikimedia).filter(Boolean)
      .filter(item=>item.imageUrl&&item.thumbnail&&acceptedLicense(item.license));
  }
  function imageScore(item, phrase) {
    const text=`${item.title} ${item.tags}`.toLowerCase();
    const searchTokens=phrase.toLowerCase().split(/\W+/).filter(w=>w.length>=4&&!['computer','technology','security'].includes(w));
    let score=searchTokens.filter(word=>text.includes(word)).length*11;
    if (item.width>=1600) score+=12;
    if (item.height&&item.width/item.height>=1.3) score+=14;
    if (item.license.includes('cc0')||item.license.includes('pdm')||item.license.toLowerCase().includes('public domain')) score+=3;
    if (item.width&&item.width<900) score-=12;
    return score;
  }
  function uniqueAndRank(items, phrase) {
    const seen=new Set();
    return items.filter(item=>{
      if (!item.imageUrl||seen.has(item.imageUrl)) return false;
      seen.add(item.imageUrl);
      if(shapeFilter.value==='landscape'&&item.width&&item.height&&item.width/item.height<1.25)return false;
      return true;
    }).sort((a,b)=>imageScore(b,phrase)-imageScore(a,phrase)).slice(0,cardsPerPage);
  }
  async function searchImages(rawQuery) {
    const query=String(rawQuery||'').trim().slice(0,120);
    if(!query){toast('Enter a search phrase first.');queryInput.focus();return;}
    currentQuery=query;queryInput.value=query;
    if(activeController)activeController.abort();
    activeController=new AbortController();const controller=activeController;
    setLoading('Finding images that match your article…');
    $('results-subtitle').textContent=`Openly licensed image search for “${query}”. Check each image’s individual license.`;
    const shortQuery=query.split(' ').slice(0,3).join(' ');
    const queryList=[query];if(shortQuery!==query)queryList.push(shortQuery);
    let items=[];const errors=[];
    const searched=await Promise.allSettled(queryList.map(q=>searchOpenverse(q,controller.signal)));
    if(controller.signal.aborted)return;
    for (const result of searched) {
      if(result.status==='fulfilled')items.push(...result.value);
      else errors.push(result.reason?.message || 'Openverse search unavailable');
    }
    items=uniqueAndRank(items,query);
    if (items.length<4) {
      try {const commons=await searchCommons(shortQuery,controller.signal);items=uniqueAndRank(items.concat(commons),query);}
      catch (error) {errors.push(error?.message||'Wikimedia Commons unavailable');}
    }
    if(controller.signal.aborted)return;
    lastResults=items;
    if(items.length) {
      renderImages(items);
      if(errors.length)$('results-subtitle').textContent=`Showing ${items.length} available images. One provider was temporarily unavailable.`;
    } else {
      showMessage(errors.length?'Image providers could not return matching photos':'No matching images under these filters',
        errors.length?'Try a shorter phrase, change the license filter, or use the Openverse link below. Public image services may rate-limit requests.':'Try another suggested keyword or switch to All shapes.',!!errors.length);
    }
  }
  function renderImages(images) {
    show(state,false);show(grid,true);grid.replaceChildren();
    $('result-counter').textContent=`${images.length} found`;
    images.forEach(image=>grid.appendChild(renderCard(image)));
    show($('more-search'),true);updateOpenverseLink();
  }
  function cleanFileName(title) {
    return String(title||'image').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'image';
  }
  function creditText(item) {
    if(item.attribution)return `${item.attribution}\nOriginal source: ${item.sourceUrl}`;
    return `Image: ${item.title}\nCreator: ${item.creator}\nLicense: ${item.license}\nLicense terms: ${item.licenseUrl||'See original source'}\nOriginal source: ${item.sourceUrl}`;
  }
  async function copyCredit(image) {
    const message=creditText(image);
    try {await navigator.clipboard.writeText(message);toast('Image credit copied.');}
    catch {
      const field=document.createElement('textarea');field.value=message;field.style.position='fixed';field.style.opacity='0';
      document.body.appendChild(field);field.select();const copied=document.execCommand('copy');field.remove();
      toast(copied?'Image credit copied.':'Copy is blocked; use the original image source for credit details.');
    }
  }
  async function downloadImage(item) {
    // Most external image servers disable cross-origin downloads. If this fails, open the
    // creator's source page instead of pretending a file was downloaded.
    const opened=window.open('about:blank','_blank');
    try {
      const response=await fetch(item.imageUrl,{mode:'cors'});
      if(!response.ok)throw Error(`Image host responded ${response.status}`);
      const blob=await response.blob();
      if(!blob.type.startsWith('image/'))throw Error('Not an image');
      const objectURL=URL.createObjectURL(blob);const a=document.createElement('a');
      const extension=/png/.test(blob.type)?'png':/webp/.test(blob.type)?'webp':/gif/.test(blob.type)?'gif':'jpg';
      a.href=objectURL;a.download=`cyberpulse-${cleanFileName(item.title)}.${extension}`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),20000);
      if(opened)opened.close();toast('Image download started. Review the license before publishing.');
    }catch {
      if(opened)opened.location.replace(item.sourceUrl||item.imageUrl);
      else window.open(item.sourceUrl||item.imageUrl,'_blank','noopener,noreferrer');
      toast('Direct download was blocked by the provider. Opened the source page instead.');
    }
  }
  function renderCard(item) {
    const card=txt('article','image-card','');
    const thumb=txt('div','image-thumb','');
    const img=document.createElement('img');img.src=item.thumbnail;img.alt=item.title;
    img.loading='lazy';img.referrerPolicy='no-referrer';
    const fallback=txt('div','fallback','Preview unavailable — open the source to view');
    img.addEventListener('error',()=>{img.style.display='none';fallback.style.display='grid';});
    thumb.append(img,fallback);
    const badges=txt('div','image-badges','');
    badges.append(txt('span','source-badge',item.source),txt('span','license-badge',item.license.toUpperCase()));
    thumb.appendChild(badges);
    const content=txt('div','image-body','');
    content.appendChild(txt('h3','',item.title));
    const meta=txt('div','image-meta','');
    meta.appendChild(txt('span','',`By ${item.creator}`));
    if(item.width&&item.height)meta.appendChild(txt('strong','',`${item.width} × ${item.height}`));
    content.appendChild(meta);
    const rights=txt('div','image-rights','');
    const licensing=item.license.toLowerCase();
    rights.appendChild(txt('span','',licensing.includes('cc0')||licensing.includes('pdm')||licensing.includes('public domain')?'Public-domain / CC0 label · verify source':'Attribution required · review license'));
    if(item.licenseUrl){const link=txt('a','',' Terms ↗');link.href=item.licenseUrl;link.target='_blank';link.rel='noopener noreferrer';rights.appendChild(link);}
    content.appendChild(rights);
    const actions=txt('div','card-actions','');
    const download=txt('button','card-button primary','↓ Download');download.type='button';
    download.addEventListener('click',()=>downloadImage(item));
    const copy=txt('button','card-button','Copy credit');copy.type='button';copy.addEventListener('click',()=>copyCredit(item));
    actions.append(download,copy);content.appendChild(actions);
    const foot=txt('div','source-foot','');
    const source=txt('a','','Open original source ↗');source.href=item.sourceUrl;source.rel='noopener noreferrer';source.target='_blank';foot.appendChild(source);
    content.appendChild(foot);card.append(thumb,content);
    return card;
  }

  // App actions.
  form.addEventListener('submit',(event)=>{
    event.preventDefault();
    const title=titleInput.value.trim(),body=bodyInput.value.trim();
    if((title+' '+body).trim().length<20){toast('Paste an article title or at least a short summary first.');bodyInput.focus();return;}
    currentAnalysis=window.CyberPulseAnalyzer.analyseArticle(title,body);
    renderAnalysis(currentAnalysis);searchImages(currentAnalysis.searches[0]);
  });
  $('refresh-search').addEventListener('click',()=>searchImages(queryInput.value));
  queryInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchImages(queryInput.value);}});
  licenseFilter.addEventListener('change',()=>searchImages(currentQuery||queryInput.value));
  shapeFilter.addEventListener('change',()=>searchImages(currentQuery||queryInput.value));
  $('sample-button').addEventListener('click',()=>{
    titleInput.value='New ransomware campaign targets hospital backups and patient systems';
    bodyInput.value='Security researchers warned that a new ransomware campaign is targeting healthcare organizations. Attackers use stolen credentials to infiltrate hospital networks, encrypt patient files, and threaten to publish sensitive data. Experts recommend stronger access controls and secure offline backups.';
    updateCharacterCount();form.requestSubmit();
  });
  $('clear-button').addEventListener('click',()=>{
    if(activeController)activeController.abort();
    form.reset();updateCharacterCount();currentAnalysis=null;currentQuery='';lastResults=[];
    show($('analysis-empty'),true);show($('analysis-content'),false);show($('results-controls'),false);
    show(grid,false);grid.replaceChildren();show($('more-search'),false);
    state.classList.remove('error');show(state,true);
    state.replaceChildren(txt('div','result-placeholder-icon','▧'),txt('h3','','Your image options will appear here'),txt('p','','Paste an article above to explore photos and illustrations relevant to its topic.'));
    $('result-counter').textContent='';$('results-subtitle').textContent='Search free, openly licensed visuals matched to your article.';
    titleInput.focus();
  });
  function updateCharacterCount(){const count=titleInput.value.length+bodyInput.value.length;$('char-count').textContent=`${count.toLocaleString()} characters`;}
  titleInput.addEventListener('input',updateCharacterCount);bodyInput.addEventListener('input',updateCharacterCount);
  $('category-list').replaceChildren(...window.CyberPulseAnalyzer.categories.map(c=>txt('span','',c.name)));
  updateCharacterCount();
})();
