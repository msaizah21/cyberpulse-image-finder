/* CyberPulse Learning Newsroom v10 — local, explicit-feedback preference reranker.
 * No model training or server: it learns team preferences from editorial decisions.
 * Only compact photo-description tokens and story tags are stored, never article text.
 */
(function(root){
  'use strict';
  const KEY='cyberpulse-newsroom-learning-v10';
  const MAX_EVENTS=350,MAX_BYTES=250000;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const allowed=new Set(['pick','reject','used']);
  const stop=new Set('photo photograph image images stock picture photos picture photography file uploaded original jpg png the and with for from by page view recent pictures technology cyber cybersecurity computer official portrait background generic'.split(' '));
  const str=(x,n=90)=>typeof x==='string'?x.slice(0,n):'';
  const tok=(v)=>[...new Set((String(v||'').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[]).filter(s=>!stop.has(s)))].slice(0,25);
  function story(a){return [str(a?.directionKey,40)||'general',str(a?.entity,60)||'',str(a?.primary,60)||''].join('|').toLowerCase();}
  function event(item,article,kind,now){
    const key=str(item.id||item.imageUrl,160);
    if(!key)throw Error('Photo identifier missing');
    return {id:key,story:story(article),category:str(article?.primary,70),entity:str(article?.entity,70),angle:str(article?.directionKey,50),
      kind,terms:tok(`${item.title||''} ${item.tags||''}`).slice(0,16),source:str(item.source,40),
      at:now};
  }
  function validate(raw){
    if(!raw||typeof raw!=='object'||!Array.isArray(raw.events)||raw.version!==1)throw Error('Not a CyberPulse learning profile');
    const events=[];
    for(const x of raw.events.slice(-MAX_EVENTS)){
      if(!x||typeof x!=='object'||!allowed.has(x.kind)||typeof x.id!=='string'||!x.id||typeof x.story!=='string')continue;
      events.push({id:str(x.id,160),story:str(x.story,180),category:str(x.category,70),entity:str(x.entity,70),angle:str(x.angle,50),kind:x.kind,
        terms:Array.isArray(x.terms)?[...new Set(x.terms.map(t=>str(t,30).toLowerCase()).filter(t=>/^[a-z0-9-]{3,30}$/.test(t)&&!stop.has(t)))].slice(0,16):[],
        source:str(x.source,40),at:clamp(Number(x.at)||0,0,Date.now()+86400000)});
    }
    // Last editorial decision wins for each image/story pair.
    const map=new Map();for(const e of events)map.set(`${e.id}::${e.story}`,e);
    return {version:1,enabled:raw.enabled!==false,events:[...map.values()].sort((a,b)=>a.at-b.at).slice(-MAX_EVENTS)};
  }
  function create(storage,clock=()=>Date.now()){
    let data={version:1,enabled:true,events:[]};
    try{const v=storage?.getItem(KEY);if(v)data=validate(JSON.parse(v));}catch{/* Private browsing and bad storage: fail open */}
    const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}};
    const get=()=>({version:1,enabled:data.enabled,events:data.events.map(x=>({...x,terms:[...x.terms]}))});
    function add(item,article,kind){
      if(!allowed.has(kind))throw Error('Invalid feedback');
      const entry=event(item,article,kind,clock());
      data.events=data.events.filter(e=>!(e.id===entry.id&&e.story===entry.story));
      data.events.push(entry);data.events=data.events.slice(-MAX_EVENTS);persist();return entry;
    }
    function decision(item,article){return data.events.findLast(e=>e.id===str(item.id||item.imageUrl,160)&&e.story===story(article))?.kind||'';}
    function preference(item,article){
      if(!data.enabled||!article||!data.events.length)return {points:0,note:'No local preference history'};
      const content=tok(`${item.title||''} ${item.tags||''}`);
      const it=new Set(content);
      const thisStory=story(article);
      let weighted=0,evidence=0;
      for(const e of data.events){
        const direct=e.story===thisStory;
        const sameAngle=e.angle&&e.angle===article.directionKey;
        const sameEntity=e.entity&&e.entity.toLowerCase()===String(article.entity||'').toLowerCase();
        const sameCategory=e.category&&e.category===article.primary;
        const relevance=direct?1:sameEntity?.8:sameAngle?.58:sameCategory?.25:.09;
        const overlap=e.terms.filter(t=>it.has(t)).length;
        const union=Math.max(2,Math.min(8,e.terms.length));
        const similarity=clamp(overlap/union,0,1);
        // A direct image decision can hide/reward the exact same photo; cross-story learning
        // requires some photo-description evidence rather than only a generic category.
        if(!direct&&similarity===0)continue;
        const age=Math.max(0,(clock()-e.at)/(86400000));
        const freshness=Math.max(.25,Math.exp(-age/140));
        const sign=e.kind==='used'?3:e.kind==='pick'?1.5:-3;
        const exactId=e.id===str(item.id||item.imageUrl,160);
        const weight=exactId&&direct?1.8:similarity*relevance;
        weighted+=sign*weight*freshness;evidence+=Math.abs(weight)*freshness;
      }
      if(evidence===0)return {points:0,note:'No similar photo choices yet'};
      // Saturating points, so even 350 signals cannot override article-first relevance.
      const points=Math.round(clamp(14*Math.tanh(weighted/3.5),-14,14));
      return {points,note:points>0?'Similar past choices preferred':points<0?'Similar past choices declined':'Balanced past feedback'};
    }
    function phraseBoost(q,a){
      if(!data.enabled||!data.events.length)return 0;
      const terms=new Set(tok(q));let v=0;
      for(const e of data.events){
        if(e.angle!==a?.directionKey&&e.entity?.toLowerCase()!==String(a?.entity||'').toLowerCase())continue;
        const shared=e.terms.filter(t=>terms.has(t)).length;
        if(shared)v+=clamp(shared,0,3)*(e.kind==='reject'?-1:e.kind==='used'?1.5:0.8);
      }
      return clamp(v,-9,9);
    }
    function stats(){
      const events=data.events;const counts={used:0,pick:0,reject:0};
      for(const e of events)counts[e.kind]++;
      return {...counts,total:events.length,enabled:data.enabled};
    }
    function enable(value){data.enabled=Boolean(value);persist();return data.enabled;}
    function reset(){data.events=[];persist();}
    function undo(item,article){data.events=data.events.filter(e=>!(e.id===str(item.id||item.imageUrl,160)&&e.story===story(article)));persist();}
    function exportProfile(){return JSON.stringify({...get(),exportedAt:new Date(clock()).toISOString()},null,2);}
    function importProfile(input){
      if(typeof input!=='string'||input.length>MAX_BYTES)throw Error('Learning file too large (max 250 KB)');
      const imported=validate(JSON.parse(input));
      // Merge newest decisions and retain existing enabled setting.
      const map=new Map();for(const e of [...data.events,...imported.events].sort((a,b)=>a.at-b.at))map.set(`${e.id}::${e.story}`,e);
      data.events=[...map.values()].sort((a,b)=>a.at-b.at).slice(-MAX_EVENTS);
      persist();return stats();
    }
    return {add,decision,preference,phraseBoost,stats,enable,reset,undo,get,exportProfile,importProfile,storyKey:story};
  }
  root.CyberPulseLearning={create,storyKey:story};
})(typeof window!=='undefined'?window:globalThis);
