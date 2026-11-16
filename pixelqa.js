/* Local photo quality diagnostics. Pixel statistics, NOT semantic AI.
   Uses a separate CORS probe so a rejected canvas read cannot hide the gallery photo. */
(function(root){
  'use strict';
  async function check(url){
    const probe=new Image();probe.crossOrigin='anonymous';probe.referrerPolicy='no-referrer';
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Timed out')),7000);
      probe.onload=()=>{clearTimeout(timer);resolve();};probe.onerror=()=>{clearTimeout(timer);reject(Error('Photo host blocked pixel inspection'));};
      probe.src=url;
    });
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('Canvas unsupported');
    ctx.drawImage(probe,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,96,64).data;
    let total=0,squares=0,dif=0,detail=0,n=0;
    const prior=[];
    for(let y=0;y<64;y++)for(let x=0;x<96;x++){
      const idx=(y*96+x)*4; const l=.2126*pixels[idx]+.7152*pixels[idx+1]+.0722*pixels[idx+2];
      total+=l;squares+=l*l;n++;
      if(x>0)detail+=Math.abs(l-prior[x-1]);
      prior[x]=l;
      if(l<28||l>230)dif++;
    }
    const brightness=total/n,contrast=Math.sqrt(Math.max(0,squares/n-brightness*brightness));
    const edge=detail/(n-64);
    const ratio=probe.naturalWidth/probe.naturalHeight;
    let notes=[];
    if(brightness<54)notes.push('very dark'); else if(brightness>208)notes.push('very bright');
    if(contrast<27)notes.push('low contrast');
    if(edge<5)notes.push('limited detail');
    if(ratio<1.30)notes.push('tight 3:2 crop');
    return {width:probe.naturalWidth,height:probe.naturalHeight,brightness:Math.round(brightness),contrast:Math.round(contrast),ratio:Math.round(ratio*100)/100,edge:Math.round(edge),notes,summary:notes.length?`Review: ${notes.join(', ')}`:'Balanced brightness and contrast'};
  }
  root.CyberPulsePixelQA={check};
})(typeof window!=='undefined'?window:globalThis);
