import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

/* Testa explicitamente a geometria do ContaGil Studio em vários tamanhos. */
const base=process.env.UX_BASE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
const themes=['light','dark'],widths=[320,375,390,600,768,980,981,1024,1280,1440,1920],results=[];
const near=(x,y,reason,eps=1.5)=>assert.ok(Math.abs(x-y)<=eps,reason+': '+x+' !== '+y);
await mkdir('evidence/geometry',{recursive:true});
try{
 for(const theme of themes)for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},locale:'pt-BR',reducedMotion:'reduce'});
  await context.addInitScript(t=>localStorage.setItem('contabil.local.pages.v1.theme',t),theme);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('[data-act="demo"]').click();
  if(width<=980)await page.locator('[data-act="mobile-nav"]').click();
  await page.locator('[data-act="nav-area:1"]').click();
  await page.locator('.studio-items [data-page="movements"]').click();
  const g=await page.evaluate(()=>{
   const rect=(selector)=>{
    const node=document.querySelector(selector);if(!node)return null;
    const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,centerY:r.y+r.height/2,display:getComputedStyle(node).display};
   };
   const button=document.querySelector('main .table-with-actions [data-act^="post:"]')?.getBoundingClientRect();
   const region=document.querySelector('main .table-with-actions')?.closest('.table-scroll')?.getBoundingClientRect();
   return {
    width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
    header:rect('.studio-header'),brand:rect('.studio-brandbar'),mark:rect('.studio-mark-home'),
    wordmark:rect('.studio-brand-home'),nav:rect('.studio-navigation'),rail:rect('.studio-rail'),
    railFirst:rect('[data-act="nav-area:0"]'),menuTitle:rect('.studio-product-title'),
    work:rect('.studio-work'),subheader:rect('.studio-subheader'),breadcrumb:rect('.studio-location'),
    content:rect('#main-content'),pageTitle:rect('#main-content .heading h1'),
    company:rect('.studio-context .context-field:first-child'),
    competence:rect('.studio-context .context-field:last-child'),
    actions:rect('.studio-header-actions'),
    month:getComputedStyle(document.querySelector('.context-month-value')).display,
    tableAction:button?{x:button.x,right:button.right}:null,
    tableRegion:region?{x:region.x,right:region.right}:null
   };
  });
  assert.ok(g.scroll<=g.width+2,width+'px: page overflows');
  near(g.header.bottom,g.subheader.y,width+'px: header overlaps breadcrumb',1);
  near(g.subheader.bottom,g.content.y,width+'px: breadcrumb overlaps content',1);
  near(g.breadcrumb.x,g.pageTitle.x,width+'px: breadcrumb not aligned with page title',1.5);
  assert.ok(g.actions.right<=width+2,width+'px: top actions overflow');
  assert.ok(g.company.right<=g.competence.x+1,width+'px: company and competence overlap');
  if(width>980){
   near(g.brand.right,g.nav.right,width+'px: brand/nav vertical divider mismatch');
   near(g.nav.right,g.work.x,width+'px: sidebar/work vertical divider mismatch');
   near(g.mark.right,g.rail.right,width+'px: brand icon/rail mismatch');
   near(g.railFirst.centerY,g.menuTitle.centerY,width+'px: rail icon/submenu heading mismatch');
   assert.equal(g.month,'none',width+'px: duplicated month header text');
   assert.ok(g.competence.right<=g.actions.x+2,width+'px: context and actions overlap');
   await page.locator('[data-act="toggle-sidebar"]').click();
   const collapsed=await page.evaluate(()=>{
    const r=sel=>document.querySelector(sel).getBoundingClientRect();
    return {brand:r('.studio-brandbar').right,nav:r('.studio-navigation').right,work:r('.studio-work').x,
      wordmark:getComputedStyle(document.querySelector('.studio-brand-home')).display,
      mark:getComputedStyle(document.querySelector('.studio-mark-home')).display};
   });
   near(collapsed.brand,collapsed.nav,width+'px: collapsed brand/nav mismatch');
   near(collapsed.nav,collapsed.work,width+'px: collapsed rail/work mismatch');
   near(collapsed.nav,56,width+'px: collapsed rail size wrong');
   assert.equal(collapsed.wordmark,'none',width+'px: full wordmark in icon rail');
   assert.notEqual(collapsed.mark,'none',width+'px: collapsed icon disappeared');
  }else{
   assert.notEqual(g.month,'none',width+'px: abbreviated month missing');
   assert.ok(g.wordmark.right<=g.actions.x+2,width+'px: mobile logo/actions overlap');
   await page.locator('[data-act="mobile-nav"]').click();
   assert.ok(await page.locator('.studio-nav-close').isVisible(),width+'px: close menu missing');
   await page.locator('.studio-nav-close').click();
   assert.equal(await page.locator('.shell.mobile-nav-open').count(),0,width+'px: menu not closed');
  }
  if(g.tableAction&&g.tableRegion){
   assert.ok(g.tableAction.x>=g.tableRegion.x-2,width+'px: table action is off left');
   assert.ok(g.tableAction.right<=g.tableRegion.right+2,width+'px: table action is off right');
  }
  assert.equal(errors.length,0,width+'px/'+theme+': JS errors: '+errors.join(';'));
  results.push({width,theme,navWidth:g.nav.width,headerHeight:g.header.height});
  if([320,981,1440,1920].includes(width))await page.screenshot({path:'evidence/geometry/final-'+width+'-'+theme+'.png',fullPage:false});
  await context.close();
 }
 await writeFile('evidence/geometry/gates.json',JSON.stringify({passed:true,results},null,2));
 console.log('GEOMETRY PASSED: '+results.length+' theme/viewport states; header, rail, subnav, breadcrumb, content, month, tables.');
}catch(e){console.error('GEOMETRY FAILED:',e);process.exitCode=1;}
finally{await browser.close()}
