/* CyberPulse Vision — optional free, local zero-shot image classification.
 * Never transmits the article or images to a commercial AI inference API.
 * First use downloads pretrained CLIP weights from Hugging Face/CDN.
 * Remote source-image CORS restrictions are respected (no proxy bypass).
 */
(function(root) {
  'use strict';
  let modelPromise = null;
  const MODEL = 'Xenova/clip-vit-base-patch32';
  const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
  const fallback = [
    'a realistic photograph of mountains and a forest',
    'a realistic photograph of food served at a restaurant',
    'a realistic photograph of cars on a city street',
    'a realistic photograph of a beach and ocean'
  ];
  const clean = text=>String(text||'').replace(/[^a-z0-9 -]/gi,' ').replace(/\s+/g,' ').trim().slice(0,82);
  function candidates(analysis) {
    const searches = [...new Set([analysis?.topic,...(analysis?.stockSearches||[])].map(clean).filter(Boolean))];
    const positive = searches.slice(0,3).map(s=>`a realistic professional photograph of ${s}`);
    while(positive.length<2) positive.push('a professional photograph of cybersecurity computers');
    const other = fallback.filter(s=>!positive.some(v=>v.toLowerCase().includes(s.slice(0,18).toLowerCase())));
    return {labels:[...positive.slice(0,3),...other.slice(0,4)],positiveCount:positive.slice(0,3).length};
  }
  async function getModel(onProgress=()=>{}) {
    if(!modelPromise) {
      modelPromise = (async()=>{
        onProgress('Loading the free AI image-vision library…');
        const lib = await import(CDN);
        onProgress('Downloading CLIP vision model — first use can be large…');
        // Use a quantized model for resource-constrained browsers; WASM works without WebGPU.
        return lib.pipeline('zero-shot-image-classification',MODEL,{
          device:'wasm',dtype:'q8',progress_callback:evt=>{
            if(evt.status==='progress' && typeof evt.progress==='number')
              onProgress(`Downloading AI model: ${Math.round(evt.progress)}% of ${evt.file||'model file'}`);
            else if(evt.status==='ready') onProgress('AI vision model is ready.');
          }
        });
      })().catch(err=>{modelPromise=null;throw err;});
    }
    return modelPromise;
  }
  async function fetchImage(url) {
    const parsed = new URL(url);
    if(parsed.protocol!=='https:' && parsed.protocol!=='http:') throw Error('Unsafe image URL');
    const response=await fetch(parsed.href,{mode:'cors',redirect:'follow'});
    if(!response.ok) throw Error(`Image server returned ${response.status}`);
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.toLowerCase().startsWith('image/')) throw Error('Source did not return an image');
    const length=Number(response.headers.get('content-length'));
    if(length>12*1024*1024) throw Error('Image too large for browser vision');
    const blob=await response.blob();
    if(blob.size>12*1024*1024) throw Error('Image too large for browser vision');
    return blob;
  }
  function combineScore(metadata,visual) {
    return Math.min(99,Math.max(0,Math.round((Number(metadata)||0)*0.6+visual*0.4)));
  }
  async function scan(input,analysis,onProgress=()=>{}) {
    if(!analysis)throw Error('Analyse an article before using image vision.');
    const blob = input instanceof Blob ? input : await fetchImage(String(input));
    if(blob.size>12*1024*1024)throw Error('Select an image smaller than 12MB.');
    const model=await getModel(onProgress);
    onProgress('AI is comparing the image pixels with article concepts…');
    const {labels,positiveCount}=candidates(analysis);
    const result=await model(blob,labels);
    if(!Array.isArray(result)||!result.length)throw Error('Vision model returned no result');
    const values=new Map(result.map(item=>[item.label,Math.max(0,Math.min(1,Number(item.score)||0))]));
    const raw=labels.slice(0,positiveCount).reduce((sum,label)=>sum+(values.get(label)||0),0);
    const affinity=Math.max(0,Math.min(100,Math.round(raw*100)));
    const best=result.slice().sort((a,b)=>b.score-a.score)[0];
    return {affinity,bestLabel:best.label,visualTopic:labels.slice(0,positiveCount).map(x=>x.replace(/^a realistic professional photograph of /,'')),method:'CLIP browser vision; relative comparison of selected visual concepts'};
  }
  root.CyberPulseVision={scan,combineScore,candidates,modelName:MODEL};
})(window);
