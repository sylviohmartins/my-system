import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import axe from 'axe-core';

const base=process.env.UX_BASE_URL || 'http://127.0.0.1:4173/';
const chrome=process.env.UX_CHROME_PATH;
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});
const report={base,createdAt:new Date().toISOString(),views:[],failures:[]};
const paths=['dashboard','companies','accounts','parties','import','movements','entries','reconcile','reports','settings'];
const sizes=[{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}];
const status=process.env.UX_AUDIT_REPORT_ONLY==='1'?'report':'strict';
await mkdir('evidence/ui',{recursive:true});
try{
 for(const viewport of sizes){
  const ctx=await browser.newContext({viewport,acceptDownloads:true,locale:'pt-BR'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(base,{waitUntil:'networkidle'});
  if(viewport.name==='desktop')assert.match(await page.locator('h1').first().innerText(),/Organize os fechamentos/);
  await page.locator('[data-act="demo"]').first().click();
  for(const name of paths){
   await page.locator('[data-page="'+name+'"]').click();
   await page.waitForTimeout(90);
   const data=await page.evaluate(()=>{
    const root=document.documentElement;
    const hasOverflow=root.scrollWidth>root.clientWidth+2;
    const buttons=[...document.querySelectorAll('main button.btn')].map(b=>({text:b.innerText.trim(),height:Math.round(b.getBoundingClientRect().height),fontSize:parseFloat(getComputedStyle(b).fontSize)}));
    const cards=[...document.querySelectorAll('main .card')].map(c=>({width:Math.round(c.getBoundingClientRect().width),radius:getComputedStyle(c).borderRadius}));
    const metrics=[...document.querySelectorAll('main .metric')].map(e=>({top:Math.round(e.getBoundingClientRect().top),height:Math.round(e.getBoundingClientRect().height)}));
    return {width:root.clientWidth,scrollWidth:root.scrollWidth,overflow:hasOverflow,buttons,cards,metrics};
   });
   await page.addScriptTag({content:axe.source});
   const a11y=await page.evaluate(async()=>{
    const results=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
    return results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,200)})).slice(0,12)}));
   });
   report.views.push({viewport:viewport.name,page:name,metrics:data,a11y});
   if(data.overflow)report.failures.push(viewport.name+'/'+name+': overflow '+data.scrollWidth+' > '+data.width);
   for(const b of data.buttons){if(b.height<34)report.failures.push(viewport.name+'/'+name+': botão pequeno '+b.text+' '+b.height+'px')}
   for(const v of a11y){report.failures.push(viewport.name+'/'+name+': axe '+v.id+' ('+v.nodes.length+' nós)')}
   if((name==='dashboard'||name==='movements'||name==='reports')&&(viewport.name==='desktop'||viewport.name==='mobile')){
    await page.screenshot({path:'evidence/ui/'+viewport.name+'-'+name+'.png',fullPage:true});
   }
  }
  await page.locator('[data-page="movements"]').click();
  await page.locator('[data-act^="post:"]').first().click();
  await page.addScriptTag({content:axe.source});
  const a11yModal=await page.evaluate(async()=>{
   const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
   return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target).slice(0,12)}));
  });
  report.views.push({viewport:viewport.name,page:'modal/post',a11y:a11yModal});
  a11yModal.forEach(v=>report.failures.push(viewport.name+'/modal: axe '+v.id));
  await page.screenshot({path:'evidence/ui/'+viewport.name+'-modal.png',fullPage:true});
  errors.forEach(e=>report.failures.push(viewport.name+': runtime '+e));
  await ctx.close();
 }
}finally{await browser.close();await writeFile('evidence/ui/audit.json',JSON.stringify(report,null,2));}
console.log('VIEWS',report.views.length,'FALHAS',report.failures.length);
for(const f of report.failures.slice(0,100))console.log('ISSUE',f);
if(status==='strict'&&report.failures.length)process.exitCode=1;
