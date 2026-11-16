/**
 * OPTIONAL Cloudflare Worker for high-quality professional stock search.
 * Set secret(s): PIXABAY_API_KEY and/or PEXELS_API_KEY. Do NOT place keys in GitHub.
 * Public endpoint only accepts short keywords, NOT article content.
 * Recommended: set ALLOWED_ORIGIN to your GitHub Pages site and configure rate limits.
 */
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    const allowed=env.ALLOWED_ORIGIN||'https://msaizah21.github.io';
    const common={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300','Vary':'Origin'};
    if(origin===allowed)common['Access-Control-Allow-Origin']=origin;
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...common,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
    if(request.method!=='GET')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:common});
    if(origin && origin!==allowed)return new Response(JSON.stringify({error:'Origin blocked'}),{status:403,headers:common});
    const url=new URL(request.url);
    const q=(url.searchParams.get('q')||'').trim().slice(0,110).replace(/[^a-zA-Z0-9\s\-]/g,' ');
    const page=Math.max(1,Math.min(20,Number.parseInt(url.searchParams.get('page')||'1',10)||1));
    if(q.length<3 || q.length>110)return new Response(JSON.stringify({error:'Enter a short search phrase'}),{status:400,headers:common});
    const tasks=[];
    if(env.PEXELS_API_KEY)tasks.push((async()=>{
      const api=new URL('https://api.pexels.com/v1/search');
      api.searchParams.set('query',q);api.searchParams.set('orientation','landscape');api.searchParams.set('size','large');api.searchParams.set('per_page','30');api.searchParams.set('page',String(page));
      const r=await fetch(api.href,{headers:{Authorization:env.PEXELS_API_KEY},cf:{cacheTtl:300,cacheEverything:true}});
      if(!r.ok)throw Error(`Pexels ${r.status}`);
      const data=await r.json();return (data.photos||[]).map(photo=>({
        id:`pexels:${photo.id}`,source:'Pexels',title:photo.alt||'Professional stock photograph',
        description:photo.alt||'',tags:photo.alt||'',creator:photo.photographer||'Pexels contributor',
        thumbnail:photo.src?.medium,imageUrl:photo.src?.original||photo.src?.large2x,
        sourceUrl:photo.url,width:photo.width,height:photo.height,license:'Pexels License',licenseUrl:'https://www.pexels.com/license/'
      }));
    })());
    if(env.PIXABAY_API_KEY)tasks.push((async()=>{
      const api=new URL('https://pixabay.com/api/');
      api.searchParams.set('key',env.PIXABAY_API_KEY);api.searchParams.set('q',q);
      api.searchParams.set('image_type','photo');api.searchParams.set('orientation','horizontal');
      api.searchParams.set('safesearch','true');api.searchParams.set('min_width','1280');api.searchParams.set('per_page','30');api.searchParams.set('page',String(page));
      const r=await fetch(api.href,{cf:{cacheTtl:300,cacheEverything:true}});
      if(!r.ok)throw Error(`Pixabay ${r.status}`);
      const data=await r.json();return (data.hits||[]).map(photo=>({
        id:`pixabay:${photo.id}`,source:'Pixabay',title:photo.tags||'Professional stock photograph',
        tags:photo.tags||'',creator:photo.user||'Pixabay contributor',
        thumbnail:photo.webformatURL||photo.previewURL,imageUrl:photo.largeImageURL||photo.webformatURL,
        sourceUrl:photo.pageURL,width:photo.imageWidth,height:photo.imageHeight,
        license:'Pixabay Content License',licenseUrl:'https://pixabay.com/service/license-summary/'
      }));
    })());
    if(!tasks.length)return new Response(JSON.stringify({error:'No stock API keys configured'}),{status:503,headers:common});
    const results=await Promise.allSettled(tasks);
    const images=results.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
    const errors=results.filter(x=>x.status==='rejected').map(x=>String(x.reason?.message||'Provider unavailable'));
    return new Response(JSON.stringify({images,errors}),{status:images.length||!errors.length?200:502,headers:common});
  }
};
