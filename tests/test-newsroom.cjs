const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const context={window:{}};
for(const f of ['analysis.js','relevance.js','editorial.js','newsroom.js','vision.js']){
  vm.runInNewContext(fs.readFileSync(f,'utf8'),context,{filename:f});
}
function analyse(title,body){return context.window.CyberPulseNewsroom.enhance(context.window.CyberPulseAnalyzer.analyseArticle(title,body),title,body);}
const inputs=[
  ['Cybersecurity Concerns Rise Over Uncontrolled AI Adoption','Companies are adopting AI systems faster than security safeguards can keep pace.','Enterprise AI adoption','office professionals working on laptops'],
  ['B.C. University Application Portal Offline After Cyberattack Exposes Applicant Data','A university confirmed that applicant records were exposed when the online application portal was taken offline.','University cyber incident','university campus building exterior'],
  ['Trump’s AI Task Force Weighs Ways to Boost Reporting of AI-Driven Cyberattacks','Government advisors are considering policy guidance for AI threats.','AI policy and government','United States Capitol building photograph'],
  ['Tech Giants Recruit Former Spies as Nvidia Scandal Exposes Espionage Risks','Nvidia and industry recruiting face attention over espionage risks.','Technology espionage','NVIDIA headquarters building'],
  ['Microsoft 365 Recovery Under Way: Early Stabilization, Capacity Still Below Normal','Microsoft 365 was disrupted by an outage affecting online services.','Technology service disruption','Microsoft office building exterior'],
  ['AI Changes the Security Race','AI technology is changing how organizations defend their networks.','Cybersecurity news',''],
];
for(const [title,body,angle,query] of inputs){
  const r=analyse(title,body);
  assert.equal(r.angle,angle,title);
  assert.ok(r.searchModes[r.recommendedMode].length>=2,title);
  if(query)assert.ok(r.primaryQuery && r.primaryQuery.length>10,title);
  if(/Trump/i.test(title))assert.ok(/Trump/i.test(r.primaryQuery),title);
  if(/Nvidia/i.test(title))assert.ok(/NVIDIA/i.test(r.primaryQuery),title);
  if(/Microsoft/i.test(title))assert.ok(/Microsoft/i.test(r.primaryQuery),title);
  assert.ok(r.titleSuggestions.length,title);
  assert.ok(r.titleSuggestions.every(s=>s.length<=100),title);
  assert.ok(r.visualConcepts.length>=3,title);
  console.log('PASS',r.angle,'→',r.primaryQuery,'→',r.titleSuggestions[0]);
}
const missingTitle=analyse('', 'A ransomware attack disabled computer systems at hospitals. Hackers encrypted patient records and demanded payment.');
assert.ok(missingTitle.titleSuggestions[0].includes('ransomware')||missingTitle.titleSuggestions[0].includes('Ransomware'));
const vision=context.window.CyberPulseVision.candidates(missingTitle);
assert.ok(vision.labels.some(s=>s.includes('security')||s.includes('computer')));
console.log('PASS: empty title, bounded headline suggestions, article-aware vision prompts');
