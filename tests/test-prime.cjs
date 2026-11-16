const assert = require('node:assert/strict');
const fs=require('fs'),vm=require('vm');
const window={};
for(const file of ['analysis.js','relevance.js','editorial.js','searchplan.js','newsroom.js','prime.js','learning.js']){
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{window,globalThis:window,Date,Map,Set,JSON,Math},{filename:file});
}
const full=`Advisers on President Donald Trump’s AI task force convened Thursday to explore how to get vital U.S. industries to disclose cyberattacks powered by artificial intelligence, an administration spokesperson said. The group is expected to help guide the government’s approach as the technology advances quickly.
Pressure is growing on the administration to address autonomous AI agents that can hack without human approval. An OpenAI agent escaped its testing environment and targeted Hugging Face.
Critical infrastructure, including banking, energy, and emergency services, is a key worry because attacks could cause real-world harm.
Defense Department technology chief Emil Michael described progress on national standards for reporting AI safety incidents and sharing cybersecurity information. Members considered protections to disclose vulnerabilities, while the 2015 Cybersecurity Information Sharing Act is due to expire next month.`;
const a=window.CyberPulseNewsroom.enhance(window.CyberPulseAnalyzer.analyseArticle('',full),'',full);
const learner=window.CyberPulseLearning.create({getItem(){return null},setItem(){}});
const queries=window.CyberPulsePrime.plan(a,'editorial',a.primaryQuery,new Set(),learner);
const provider=queries.map(x=>window.CyberPulseSearchPlan.providerQuery(x.phrase,'Openverse').toLowerCase());
assert.equal(provider.length,new Set(provider).size,`Duplicate source queries: ${JSON.stringify(provider)}`);
assert.ok(queries.some(x=>/Trump/i.test(x.phrase)));
assert.ok(queries.some(x=>/Pentagon|Defense/i.test(x.phrase)));
assert.ok(queries.some(x=>/Emil Michael/i.test(x.phrase)));
const mk=(id,score,level,title)=>({id,title,match:{score},editorialFit:{level,label:level},source:'Openverse'});
assert.equal(window.CyberPulsePrime.needsResearch([mk('1',45,'review','Background')]),true);
assert.equal(window.CyberPulsePrime.needsResearch([mk('1',90,'direct','Trump'),mk('2',70,'context','White House')]),false);
const onlyWeak=window.CyberPulsePrime.choose([mk('a',45,'review','Security operation room'),mk('b',41,'review','Electric grid')]);
assert.equal(onlyWeak.type,'alternatives');assert.ok(!onlyWeak.note.toLowerCase().includes('verified photo'));
const strong=window.CyberPulsePrime.choose([mk('a',81,'direct','Trump White House'),mk('b',72,'context','Pentagon building'),mk('c',34,'review','Security room')]);
assert.equal(strong.type,'strong');assert.equal(strong.items.length,3);
const storage=new Map();
const learning=window.CyberPulseLearning.create({getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)});
const good=mk('gp',85,'direct','Donald Trump official portrait US White House press conference'); good.tags='Trump USA president';
const bad=mk('bn',31,'review','Blue futuristic abstract cyber lock stock graphics'); bad.tags='cyber technology';
learning.add(good,a,'used');learning.add(bad,a,'reject');
assert.equal(learning.stats().used,1);assert.equal(learning.stats().reject,1);
assert.equal(learning.decision(bad,a),'reject');
const saved=learning.exportProfile();
const restored=window.CyberPulseLearning.create({getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)});
assert.equal(restored.stats().total,2);
restored.reset();restored.importProfile(saved);assert.equal(restored.stats().total,2);
console.log('PASS PRIME: diverse article searches, 45% auto-research trigger, honest top 3, local learning and team export/import');
console.log('PRIME SEARCH DIRECTIONS:',queries.slice(0,8).map(x=>x.phrase).join(' | '));
