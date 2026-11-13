/**
 * OPTIONAL Cloudflare Worker — enables polished Pixabay photos in the public interface.
 * 1. Make a Cloudflare Worker (Dashboard > Workers & Pages > Create Worker).
 * 2. Paste this Worker script.
 * 3. In its Settings > Variables and Secrets add PIXABAY_API_KEY as a SECRET.
 * 4. Deploy; copy your workers.dev URL into config.js -> pixabayWorkerUrl.
 * Keep API keys OUT of GitHub. Search phrases only are sent to Pixabay.
 * Pixabay Content License applies. Requires an existing or newly approved API key.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = origin === 'https://msaizah21.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : 'https://msaizah21.github.io',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept',
      'Vary':'Origin', 'Content-Type':'application/json',
      'Cache-Control':'no-store'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:cors});
    if (request.method !== 'GET') return new Response(JSON.stringify({error:'Method not allowed'}), {status:405,headers:cors});
    if (!env.PIXABAY_API_KEY) return new Response(JSON.stringify({error:'PIXABAY_API_KEY secret not configured'}),{status:503,headers:cors});
    const q=String(url.searchParams.get('q')||'').trim().slice(0,100);
    if(q.length<2) return new Response(JSON.stringify({error:'Query must be at least two characters'}),{status:400,headers:cors});
    const remote = new URL('https://pixabay.com/api/');
    const opts = {key:env.PIXABAY_API_KEY,q,image_type:'photo',orientation:'horizontal',safesearch:'true',min_width:'1200',per_page:'24',order:'popular'};
    Object.entries(opts).forEach(([key,value])=>remote.searchParams.set(key,value));
    try {
      const result=await fetch(remote.toString(),{headers:{Accept:'application/json'}});
      if(!result.ok)return new Response(JSON.stringify({error:'Image service unavailable',status:result.status}),{status:502,headers:cors});
      const data=await result.json();
      // Share only the fields needed for editorial selection, never the API key.
      const hits=(data.hits||[]).map(hit=>({
        id:hit.id,tags:hit.tags,user:hit.user,pageURL:hit.pageURL,
        previewURL:hit.previewURL,webformatURL:hit.webformatURL,largeImageURL:hit.largeImageURL,
        imageWidth:hit.imageWidth,imageHeight:hit.imageHeight
      }));
      return new Response(JSON.stringify({hits}),{status:200,headers:cors});
    } catch {
      return new Response(JSON.stringify({error:'Image provider unavailable'}),{status:502,headers:cors});
    }
  }
};
