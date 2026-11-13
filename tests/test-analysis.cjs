// Run locally: node tests/test-analysis.cjs
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('analysis.js','utf8'),context);
const analyze=context.window.CyberPulseAnalyzer.analyseArticle;
const cases=[
  {title:'NVIDIA launches Blackwell AI GPU chips for data centers',body:'The company announced AI hardware',category:'AI & Cybersecurity',entity:'NVIDIA',query:'NVIDIA'},
  {title:'',body:'NVIDIA opens new facility for AI GPU chips\nThe company announced processors for accelerated computing',category:'AI & Cybersecurity',entity:'NVIDIA',query:'NVIDIA'},
  {title:'Phishing attackers target Microsoft 365 email accounts',body:'An email scam stole passwords',category:'Phishing',entity:'Microsoft',query:'Microsoft'},
  {title:'Major ransomware attack hits hospitals',body:'Hackers locked hospital computer systems and demanded a ransom',category:'Ransomware',entity:'',query:'computer'},
  {title:'New Trojan steals credentials from Android phones',body:'The banking trojan installs malicious software',category:'Trojan',entity:'Google',query:'Google'},
  {title:'Critical cloud security misconfiguration exposes AWS S3 buckets',body:'Cloud infrastructure teams must secure storage',category:'Cloud Security',entity:'Amazon AWS',query:'Amazon'},
];
for(const t of cases) {
 const r=analyze(t.title,t.body);
 assert.equal(r.primary,t.category,t.title||t.body);
 assert.equal(r.entity,t.entity,t.title||t.body);
 assert.ok(r.primaryQuery.includes(t.query),r.primaryQuery);
 assert.ok(r.inferredTitle.length>10);
 console.log(`PASS ${r.primary}: ${r.inferredTitle.slice(0,48)} → ${r.primaryQuery}`);
}
console.log('6 analysis scenarios passed.');
