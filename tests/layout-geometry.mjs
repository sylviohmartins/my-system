import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
const base=process.env.UX_BASE_URL||'http://127.0.0.1:4173/';
const report=[];
const label=process.env.GEOMETRY_LABEL||'after';
await mkdir('evidence/geometry',{recursive:true});
const targets={
header:'.studio-header',brand:'.studio-brandbar',logo:'.studio-brand-home',context:'.studio-workspace',company:'.studio-context .context-field:first-child',competence:'.studio-context .context-field:last-child',actions:'.studio-header-actions',
navigation:'.studio-navigation',rail:'.studio-rail',menu:'.studio-product-menu',title:'.studio-product-title',items:'.studio-items',firstMenuItem:'.studio-items .nav-link',railItem:'.studio-rail-item',
subheader:'.studio-subheader',breadcrumb:'.studio-location',work:'.studio-work',content:'#main-content',pageTitle:'#main-content .heading h1',card:'#main-content .card',
mainHeading:'#main-content .heading',metrics:'#main-content .metrics',search:'.studio-search-trigger',primary:'.studio-primary-action',theme:'.studio-theme-trigger'
};
try{
for(const w of [320,375,390,600,768,980,981,1024,1280,1440,1920]){
 const context=await browser.newContext({viewport:{width:w,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('[data-act="demo"]').click();
 const item=await page.evaluate((targets)=>{
  const entries={};
  for(const [key,sel] of Object.entries(targets)){
   const el=document.querySelector(sel),r=el?.getBoundingClientRect(),cs=el?getComputedStyle(el):null;
   entries[key]=r?{x:+r.x.toFixed(2),y:+r.y.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2),right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2),color:cs?.color,font:cs?.fontSize,display:cs?.display}:null;
  }
  return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,entries};
 },targets);
 report.push({requested:w,...item});
 console.log('GEO',w,'pageOverflow',item.scroll-item.viewport,'brand.right',item.entries.brand?.right,'nav.right',item.entries.navigation?.right,'work.x',item.entries.work?.x,'title.x',item.entries.pageTitle?.x,
 'companyY',item.entries.company?.y,'competenceY',item.entries.competence?.y,'actionsY',item.entries.actions?.y,'navWidth',item.entries.navigation?.width);
 if(w===320||w===768||w===981||w===1440)await page.screenshot({path:'evidence/geometry/'+label+'-'+w+'.png',fullPage:false});
 await context.close();
}
 await writeFile('evidence/geometry/'+label+'.json',JSON.stringify(report,null,2));
}finally{await browser.close()}
