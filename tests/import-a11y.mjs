import {chromium} from 'playwright';
import axe from 'axe-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
const base=process.env.UX_BASE_URL||'http://127.0.0.1:4173/';
const problems=[];
await mkdir('evidence/import',{recursive:true});
try{
 for(const theme of ['light','dark']){
  for(const width of [390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'pt-BR'});
   await context.addInitScript(t=>localStorage.setItem('contabil.local.pages.v1.theme',t),theme);
   const page=await context.newPage();
   const runtime=[];page.on('pageerror',e=>runtime.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});
   await page.locator('[data-act="demo"]').click();
   if(width<901)await page.locator('[data-act="mobile-nav"]').click();
   await page.locator('[data-act="nav-area:1"]').click();
   await page.locator('.studio-items [data-page="import"]').click();
   await page.locator('#bankFile').setInputFiles('tests/fixtures/extrato-banco-a.pdf');
   await page.locator('#pdfPattern').waitFor({state:'visible',timeout:20000});
   await page.addScriptTag({content:axe.source});
   const violations=await page.evaluate(async()=>{
    const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
    return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target).slice(0,5)}));
   });
   for(const v of violations)problems.push(theme+'/'+width+': '+JSON.stringify(v));
   const measured=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
    fileInputFocusable:document.querySelector('#bankFile').tabIndex>=0,
    textareaHeight:document.querySelector('#pdfPattern').getBoundingClientRect().height,
    requiredMapped:['date','description','amount'].every(k=>document.querySelector('[data-map="'+k+'"]')?.value!=='')
   }));
   if(measured.scroll>measured.viewport+2)problems.push(theme+'/'+width+': overflow');
   if(!measured.fileInputFocusable)problems.push(theme+'/'+width+': input arquivo não focável');
   if(measured.textareaHeight<82)problems.push(theme+'/'+width+': editor PDF comprimido');
   if(!measured.requiredMapped)problems.push(theme+'/'+width+': campos obrigatórios não mapeados');
   for(const err of runtime)problems.push(theme+'/'+width+': '+err);
   if(width===390||width===1440)await page.screenshot({path:'evidence/import/'+theme+'-'+width+'-pdf-import.png',fullPage:true});
   await context.close();
  }
 }
 console.log('IMPORT A11Y',6,'estados; violações',problems.length);
 problems.forEach(p=>console.log('ISSUE',p));
 if(problems.length)process.exitCode=1;
}finally{await browser.close()}
