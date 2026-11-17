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
const fail=(name,message)=>report.failures.push(name+': '+message);
try {
 for(const theme of ['light','dark']){
  for(const viewport of sizes){
   const name=theme+'/'+viewport.name;
   const ctx=await browser.newContext({viewport,acceptDownloads:true,locale:'pt-BR'});
   await ctx.addInitScript(choice=>localStorage.setItem('contabil.local.pages.v1.theme',choice),theme);
   const page=await ctx.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(base,{waitUntil:'networkidle'});
   assert.equal(await page.locator('html').getAttribute('data-theme'),theme,'tema inicial');
   if(viewport.name==='desktop')assert.match(await page.locator('h1').first().innerText(),/Organize os fechamentos/);
   await page.locator('[data-act="demo"]').first().click();
   for(const route of paths){
    await page.locator('[data-page="'+route+'"]').click();
    await page.waitForTimeout(35);
    const data=await page.evaluate(()=>{
     const root=document.documentElement;
     const buttons=[...document.querySelectorAll('main button.btn')].map(b=>({text:b.innerText.trim(),height:Math.round(b.getBoundingClientRect().height)}));
     const cards=[...document.querySelectorAll('main .card')].map(c=>({radius:getComputedStyle(c).borderRadius}));
     const metrics=[...document.querySelectorAll('main .metric')].map(e=>({top:Math.round(e.getBoundingClientRect().top),height:Math.round(e.getBoundingClientRect().height)}));
     return {width:root.clientWidth,scrollWidth:root.scrollWidth,buttons,cards,metrics};
    });
    await page.addScriptTag({content:axe.source});
    const violations=await page.evaluate(async()=>{
     const results=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
     return results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,160)})).slice(0,12)}));
    });
    report.views.push({theme,viewport:viewport.name,page:route,metrics:data,a11y:violations});
    const byRow=new Map();
    for(const m of data.metrics){const row=byRow.get(m.top)||[];row.push(m.height);byRow.set(m.top,row)}
    for(const heights of byRow.values())if(heights.length>1&&Math.max(...heights)-Math.min(...heights)>2)fail(name+'/'+route,'Alturas de KPI diferentes na mesma linha');
    if(new Set(data.cards.map(c=>c.radius)).size>1)fail(name+'/'+route,'Raios de cards inconsistentes');
    if(data.scrollWidth>data.width+2)fail(name+'/'+route,'Overflow '+data.scrollWidth+' > '+data.width);
    for(const button of data.buttons)if(button.height<34)fail(name+'/'+route,'Botão pequeno '+button.text+' '+button.height+'px');
    for(const v of violations)fail(name+'/'+route,'axe '+v.id+' ('+v.nodes.length+' nós)');
    if((route==='dashboard'||route==='movements'||route==='reports')&&(viewport.name==='desktop'||viewport.name==='mobile'))
     await page.screenshot({path:'evidence/ui/'+theme+'-'+viewport.name+'-'+route+'.png',fullPage:true});
   }
   await page.locator('[data-page="movements"]').click();
   await page.locator('[data-act^="post:"]').first().click();
   await page.addScriptTag({content:axe.source});
   const a11ySheet=await page.evaluate(async()=>{
    const results=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
    return results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target).slice(0,12)}));
   });
   report.views.push({theme,viewport:viewport.name,page:'sheet/post',a11y:a11ySheet});
   a11ySheet.forEach(v=>fail(name+'/sheet','axe '+v.id));
   const sheet=page.locator('.sheet-panel');
   if(await sheet.count()!==1)fail(name+'/sheet','Sheet lateral não encontrado');
   else {
    const bounds=await sheet.boundingBox();
    if(Math.abs((bounds.x+bounds.width)-viewport.width)>3)fail(name+'/sheet','Sheet não alinhado à direita');
    if(bounds.y>3)fail(name+'/sheet','Sheet deslocado do topo');
    if(Math.abs(bounds.height-viewport.height)>3)fail(name+'/sheet','Sheet não ocupa altura da viewport');
    const focusIsWithin=await page.evaluate(()=>!!document.activeElement?.closest('.sheet-panel'));
    if(!focusIsWithin)fail(name+'/sheet','Foco inicial está fora do sheet');
    await page.keyboard.press('Tab');
    if(!await page.evaluate(()=>!!document.activeElement?.closest('.sheet-panel')))fail(name+'/sheet','Tab saiu do sheet');
   }
   await page.screenshot({path:'evidence/ui/'+theme+'-'+viewport.name+'-sheet.png',fullPage:true});
   await page.keyboard.press('Escape');
   if(await sheet.count())fail(name+'/sheet','Escape não fechou');
   errors.forEach(e=>fail(name,'Erro em tempo de execução '+e));
   await ctx.close();
  }
 }
}finally{
 await browser.close();
 await writeFile('evidence/ui/audit.json',JSON.stringify(report,null,2));
}
console.log('ESTADOS',report.views.length,'FALHAS',report.failures.length);
for(const f of report.failures.slice(0,100))console.log('ISSUE',f);
if(status==='strict'&&report.failures.length)process.exitCode=1;
