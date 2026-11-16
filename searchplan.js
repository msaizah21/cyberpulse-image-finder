
/* CyberPulse Search Planner v9 — no network and no dependencies. Testable in Node. */
(function(root){
 'use strict';
 const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
 const unique=arr=>[...new Set(arr.map(clean).filter(Boolean))];
 const scrub=q=>clean(q).replace(/\b(?:high resolution|royalty free|free stock|professional stock|authentic|real-world|official photograph|photograph|photography|stock photo|editorial photo|real photo|photo|pictures?|image|exterior photograph)\b/gi,' ').replace(/\s+/g,' ').trim();
 function providerQuery(phrase,source){
   const p=scrub(phrase);
   if(!p)return 'technology';
   const known=[/Donald Trump/i,/Emil Michael/i,/Jensen Huang/i,/Satya Nadella/i];
   for(const rx of known){const match=p.match(rx);if(match)return match[0];}
   if(/\b(?:Pentagon|U\.?S\.? Department of Defense|Department of Defense)\b/i.test(p))return 'Pentagon';
   if(/\bWhite House\b/i.test(p)&&!/\b(?:Microsoft|NVIDIA|Google)\b/i.test(p))return 'White House';
   if(/\bMicrosoft\b/i.test(p))return 'Microsoft '+(/\b(?:office|headquarters|building|campus)\b/i.test(p)?'headquarters':'');
   if(/\bNVIDIA\b/i.test(p))return 'NVIDIA '+(/\b(?:GPU|graphics card|chip)\b/i.test(p)?'GPU':'');
   const tokens=p.split(' ').filter(Boolean);
   return tokens.slice(0,source==='Wikimedia Commons'?4:5).join(' ');
 }
 function fingerprint(q){
   const s=clean(q).toLowerCase();
   if(/trump/.test(s))return 'trump';
   if(/emil michael/.test(s))return 'emil-michael';
   if(/pentagon|defense department|department of defense/.test(s))return 'pentagon';
   if(/white house/.test(s))return 'white-house';
   if(/microsoft/.test(s))return 'microsoft';
   if(/nvidia/.test(s))return 'nvidia';
   if(/hugging face/.test(s))return 'hugging-face';
   return clean(s.replace(/\b(?:photo|photograph|official|exterior|building|close up|real)\b/g,'')).split(' ').slice(0,3).join(' ');
 }
 function prioritised(analysis,mode,query){
   const editorial=analysis?.editorial?.searchModes?.[mode]||[];
   const modes=analysis?.searchModes?.[mode]||[];
   const supporting=analysis?.editorial?.searchOrder||[];
   const fallback=analysis?.editorialSearches||[];
   const context=analysis?.searchModes?.context||[];
   const base=unique([query,...editorial,...modes,...supporting,...fallback,...context]);
   // Distinct named subject/setting directions appear before repeated portraits.
   const first=[],later=[],used=new Set();
   for(const q of base){const key=fingerprint(q);if(!used.has(key)){first.push(q);used.add(key);}else later.push(q);}
   return unique([...first,...later]).slice(0,24);
 }
 function batchPlan(analysis,mode,query,batch){
   const phrases=prioritised(analysis,mode,query);
   if(!phrases.length)return [];
   const n=Math.max(1,Number(batch)||1);
   const perBatch=2;
   const out=[];
   for(let i=0;i<perBatch;i++){
     const slot=(n-1)*perBatch+i;
     const phrase=phrases[slot%phrases.length];
     const page=Math.floor(slot/phrases.length)+1;
     out.push({phrase,page,angle:fingerprint(phrase)});
   }
   return out;
 }
 root.CyberPulseSearchPlan={providerQuery,prioritised,batchPlan,fingerprint};
})(typeof window!=='undefined'?window:globalThis);
