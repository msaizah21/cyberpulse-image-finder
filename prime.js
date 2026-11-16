/* CyberPulse PRIME v11: article-oriented multi-strategy research and honest fallback.
 * Pure planner: never claims that a free-library result documents a real incident.
 */
(function(root){
 'use strict';
 const txt=s=>String(s||'').replace(/\s+/g,' ').trim();
 const uniq=a=>[...new Set(a.map(txt).filter(Boolean))];
 const fitWeight={direct:4,context:3,secondary:1,review:0};
 const quality=item=>Number(item?.match?.score)||0;
 function needsResearch(items){
   const eligible=(items||[]).filter(x=>x.editorialFit?.level!=='secondary'&&x.editorialFit?.level!=='review');
   return eligible.filter(x=>quality(x)>=65).length<2;
 }
 function plan(article,mode,query,used=new Set(),learning){
   if(!article)return [];
   const ed=article.editorial||{};
   const heads=ed.searchModes?.editorial||[];
   const context=ed.searchModes?.context||article.searchModes?.context||[];
   const concepts=ed.searchModes?.concept||article.searchModes?.concept||[];
   const names=(ed.mainSubjects||[]).slice(0,3);
   const loc=(ed.groups?.locations||[]).map(x=>x.name);
   const sectors=(ed.groups?.sectors||[]).map(x=>x.name);
   const story=(ed.groups?.story||[]).map(x=>x.name);
   const subjects=names.flatMap(n=>[`${n} official portrait`,`${n} building photograph`,`${n} public event photograph`]);
   const related=sectors.flatMap(s=>[`${s} infrastructure photograph`]);
   const locations=loc.flatMap(s=>[`${s} government building photograph`]);
   const focus=story.slice(0,2).map(s=>`${s} real world photograph`);
   // Explicit subjects and their physical context rank ahead of generic visual concepts.
   const candidates=uniq([query,...heads.slice(0,12),...subjects,...context.slice(0,8),...locations,...related,...focus,...concepts.slice(0,5)]).slice(0,44);
   const priorities=[];
   for(const q of candidates){
     const normal=q.toLowerCase();
     const providerKey=root.CyberPulseSearchPlan?.providerQuery?.(q,'Openverse')?.toLowerCase()||normal;
     if(used.has(normal)||used.has(providerKey))continue;
     const strong=names.some(s=>normal.includes(s.toLowerCase()))?60:0;
     const physical=/\b(office|building|campus|portrait|pentagon|capitol|white house|data center|power|event|chip|server|infrastructure|meeting)\b/i.test(q)?12:0;
     const generic=/\b(abstract|digital network|padlock|robot|cybersecurity technology|futuristic)\b/i.test(q)?-25:0;
     const pref=learning?.phraseBoost?.(q,article)||0;
     priorities.push({phrase:q,priority:strong+physical+generic+pref,reason:strong?'Named article subject':physical?'Real-world story setting':'Related visual context'});
   }
   // Rotate distinct provider searches first: multiple phrasings of the same name
   // can collapse to the same query in Openverse/Commons.
   priorities.sort((a,b)=>b.priority-a.priority);
   const result=[],duplicates=[],seen=new Set();
   for(const item of priorities){
     const providerKey=root.CyberPulseSearchPlan?.providerQuery?.(item.phrase,'Openverse')?.toLowerCase()||item.phrase.toLowerCase();
     if(seen.has(providerKey))duplicates.push(item);
     else {seen.add(providerKey);result.push(item);}
   }
   // No duplicate provider searches in a single Prime research action.
   return result;
 }
 function choose(items,preferences=()=>0){
   const ranked=[...(items||[])].filter(x=>x?.match && x?.editorialFit && x.editorialFit.level!=='secondary');
   ranked.sort((a,b)=>{
     const fa=fitWeight[a.editorialFit.level]||0,fb=fitWeight[b.editorialFit.level]||0;
     return (fb-fa)*100+(quality(b)+preferences(b))-(quality(a)+preferences(a));
   });
   const choices=[],memo=new Set();
   for(const item of ranked){
     if(quality(item)<27)continue;
     const tokens=(String(item.title||'').toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>!['photo','picture','photograph','image','official'].includes(w));
     const sig=tokens.slice(0,4).join('-');
     if(sig&&memo.has(sig))continue;
     memo.add(sig);
     choices.push(item);
     if(choices.length>=3)break;
   }
   const verified=choices.filter(x=>quality(x)>=65 && ['direct','context'].includes(x.editorialFit.level));
   const type=verified.length>=2?'strong':choices.length?'alternatives':'none';
   return {items:choices,type,verified:verified.length,
     headline:type==='strong'?'Prime Research · top banner candidates':type==='alternatives'?'Prime Research · best available alternatives':'No suitable candidates yet',
     note:type==='strong'?'These are article-aligned candidates from licensed libraries; verify visual subject and rights before publishing.':
       'No confidently matched news photograph was identified. These are illustrative options only; verify or use the original newsroom/source photograph.'};
 }
 root.CyberPulsePrime={needsResearch,plan,choose};
})(typeof window!=='undefined'?window:globalThis);
