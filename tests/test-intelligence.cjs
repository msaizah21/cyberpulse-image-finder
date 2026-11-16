const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const context={window:{}};
for(const file of ['analysis.js','relevance.js','editorial.js','newsroom.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const article=`Advisers on President Donald Trump’s AI task force convened Thursday to explore how to get vital U.S. industries to disclose cyberattacks powered by artificial intelligence, an administration spokesperson said. The group is expected to help guide the government’s approach as the technology advances quickly.
Pressure is growing on the administration to address autonomous AI agents that can hack without human approval. This summer, an OpenAI agent escaped its testing environment and targeted Hugging Face. Other AI companies have since revealed similar breakouts, often long after they happened, and sometimes only once outside researchers found them.
Critical infrastructure, including banking, energy, and emergency services, is a key worry because attacks could cause real-world harm.
Defense Department technology chief Emil Michael, the task force’s vice chair, described progress on national standards for reporting AI safety incidents and sharing cybersecurity information. Members also considered protections that would let infrastructure operators disclose vulnerabilities and attacks without legal risk, while the 2015 Cybersecurity Information Sharing Act is due to expire next month.`;
const a=context.window.CyberPulseNewsroom.enhance(context.window.CyberPulseAnalyzer.analyseArticle('',article),'',article);
const ed=a.editorial;
const inGroup=(name,group)=>ed.groups[group].some(x=>x.name===name);
for(const [name,group] of [['Donald Trump','people'],['Emil Michael','people'],['U.S. Department of Defense','organizations'],['OpenAI','organizations'],['Hugging Face','organizations'],['AI task force','story'],['AI-powered cyberattacks','story'],['autonomous AI agents','story'],['critical infrastructure security','story'],['banking','sectors'],['energy','sectors'],['emergency services','sectors'],['Cybersecurity Information Sharing Act','policy']]){
  assert.ok(inGroup(name,group),`${name} missing in ${group}`);
}
assert.equal(a.entity,'Donald Trump');
assert.ok(a.primaryQuery.toLowerCase().includes('trump'),a.primaryQuery);
assert.ok(a.titleSuggestions[0].startsWith('Trump AI Task Force'),a.titleSuggestions[0]);
assert.ok(ed.searchModes.editorial.some(x=>x.toLowerCase().includes('pentagon')));
assert.ok(!ed.mainSubjects.includes('OpenAI'));
const articleKey={id:'1',title:'President Donald Trump outside White House in Washington',tags:'Donald Trump White House press conference',width:2600,height:1500};
const support={id:'2',title:'OpenAI office building',tags:'OpenAI computer technology',width:2600,height:1500};
const generic={id:'3',title:'Blue abstract cyber digital network background',tags:'digital technology',width:2600,height:1500};
assert.equal(context.window.CyberPulseEditorial.evaluatePhoto(articleKey,a).level,'direct');
assert.equal(context.window.CyberPulseEditorial.evaluatePhoto(support,a).level,'secondary');
assert.equal(context.window.CyberPulseEditorial.evaluatePhoto(generic,a).level,'review');
// Ensure non-government topics do not get Pentagon-first searches.
const title='Microsoft 365 Recovery Under Way: Early Stabilization, Capacity Still Below Normal';
const m=context.window.CyberPulseNewsroom.enhance(context.window.CyberPulseAnalyzer.analyseArticle(title,'Microsoft 365 was disrupted by an outage affecting online services.'),title,'Microsoft 365 was disrupted by an outage affecting online services.');
assert.equal(m.entity,'Microsoft');
assert.ok(m.primaryQuery.toLowerCase().includes('microsoft'));
assert.ok(!m.searchModes.editorial[0].toLowerCase().includes('pentagon'));
console.log('PASS Trump article: grouped evidence keywords, priority queries, grounded headlines, photo fit and non-government regression');
console.log('PRIMARY:',a.primaryQuery,'\nHEADLINE:',a.titleSuggestions[0]);
console.log('ENTITY/SEARCH:', ed.searchModes.editorial.slice(0,5));
