import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
const base=process.env.UX_BASE_URL||'http://127.0.0.1:4173/';
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},locale:'pt-BR'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(base,{waitUntil:'networkidle'});
 assert.match(await page.title(),/^ContaGil/,'título com marca correta');
 assert.equal(await page.locator('.studio-logo-asset img.brand-logo-light').getAttribute('alt'),'ContaGil');
 assert.ok(await page.locator('.studio-logo-asset img.brand-logo-light').evaluate(img=>img.complete&&img.naturalWidth>0),'logo renderizou');
 assert.match(await page.locator('h1').first().innerText(),/Organize os fechamentos/);
 for(const path of ['assets/brand/wordmark-light.svg','assets/brand/wordmark-dark.svg','assets/brand/icon.svg','assets/brand/favicon.ico','assets/brand/icon-180.png','assets/brand/icon-192.png','assets/brand/icon-512.png','site.webmanifest']){
   const req=await page.evaluate(async path=>{const response=await fetch(path);return {status:response.status,bytes:(await response.arrayBuffer()).byteLength}},path);
   assert.equal(req.status,200,path+' acessível');
   assert.ok(req.bytes>200,path+' conteúdo não vazio');
 }
 assert.equal((await page.locator('link[rel="icon"]').count())>=2,true);
 assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'),'./site.webmanifest');
 const mark=await page.evaluate(async()=>await (await fetch('assets/brand/wordmark-light.svg')).text());
 assert.match(mark,/#231719/,'Conta e l em preto');
 assert.match(mark,/#df366b/,'Gi em rosa');

 await page.locator('[data-act="demo"]').click();
 assert.equal(await page.locator('.studio-rail-top [data-act^="nav-area:"]').count(),4,'quatro áreas');
 assert.equal(await page.locator('.studio-product-menu .nav-group').count(),1,'uma única área por vez');
 assert.equal(await page.locator('.studio-product-menu .nav-link').count(),4,'navegação contextual de escrituração');
 assert.equal(await page.locator('.studio-workspace [data-context="company"]').isVisible(),true);
 assert.equal(await page.locator('.studio-workspace [data-context="period"]').isVisible(),true);
 assert.equal(await page.locator('.studio-header [data-act="backup"]').count(),0,'backup apenas em configurações');

 const go=async(area,route)=>{
  await page.locator('[data-act="nav-area:'+area+'"]').click();
  await page.locator('.studio-items [data-page="'+route+'"]').click();
 };
 await page.keyboard.press('Control+k');
 assert.equal(await page.locator('.studio-search-sheet').count(),1,'busca global em sheet');
 await page.locator('#nav-search-input').fill('lançamentos');
 assert.equal(await page.locator('#nav-search-results [data-page="entries"]').count(),1);
 await page.locator('#nav-search-results [data-page="entries"]').click();
 assert.equal(await page.locator('.sheet-panel').count(),0,'busca fecha na navegação');
 assert.equal(await page.locator('.studio-product-title h2').innerText(),'Escrituração');

 await page.locator('[data-act="toggle-sidebar"]').click();
 assert.equal(await page.locator('.shell.is-collapsed').count(),1);
 const railWidth=await page.locator('.studio-navigation').evaluate(e=>Math.round(e.getBoundingClientRect().width));
 assert.ok(railWidth<=58,'rail compacta de 56 px, encontrado '+railWidth);
 assert.ok(await page.locator('.studio-workspace [data-context="company"]').isVisible(),'empresa visível no menu recolhido');
 await page.locator('[data-act="toggle-sidebar"]').click();
 assert.equal(await page.locator('.shell.is-collapsed').count(),0);

 const original=await page.locator('.studio-workspace [data-context="company"]').inputValue();
 await go(2,'companies');
 await page.locator('[data-act="new-company"]').click();
 assert.equal(await page.locator('.sheet-panel').count(),1,'cadastro em sheet');
 await page.locator('#editor input[name="name"]').fill('Empresa Secundária Exemplo');
 await page.locator('#editor button[type="submit"]').click();
 const created=await page.locator('.studio-workspace [data-context="company"]').inputValue();
 assert.notEqual(original,created,'segregação de empresas');
 await go(1,'movements');
 assert.match(await page.locator('main').innerText(),/Nenhum registro/);
 await page.locator('.studio-workspace [data-context="company"]').selectOption(original);
 await go(1,'movements');
 assert.match(await page.locator('main').innerText(),/PIX fornecedor de serviços/);
 await page.locator('.studio-workspace [data-context="period"]').fill('2026-10');
 assert.match(await page.locator('main').innerText(),/2026-10/);
 await page.locator('.studio-workspace [data-context="period"]').fill('2026-11');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('.studio-workspace [data-context="company"]').inputValue(),original);
 assert.equal(await page.locator('.studio-workspace [data-context="period"]').inputValue(),'2026-11');
 await page.locator('.studio-header [data-act="theme-toggle"]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','tema persistido');
 assert.ok(await page.locator('.studio-logo-asset img.brand-logo-dark').isVisible());
 await page.locator('.studio-rail [data-page="settings"]').click();
 assert.ok(await page.locator('main [data-act="backup"]').count()>0,'backup em configurações');
 assert.ok(await page.locator('.ui-icon use').count()>10,'ícones Lucide locais');
 assert.equal(await page.locator('.modal-layer').count(),0,'nenhum modal central');

 const mobile=await context.newPage();
 await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(base,{waitUntil:'networkidle'});
 assert.ok(await mobile.locator('.studio-workspace').isVisible(),'contexto no celular');
 await mobile.locator('[data-act="mobile-nav"]').click();
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),1);
 assert.ok(await mobile.locator('.studio-nav-close').isVisible(),'fechar visível');
 await mobile.locator('.studio-nav-close').click();
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),0);
 await mobile.locator('[data-act="mobile-nav"]').click();
 await mobile.locator('[data-act="nav-area:3"]').click();
 await mobile.locator('.studio-items [data-page="reports"]').click();
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),0);
 assert.match(await mobile.locator('.studio-subheader').innerText(),/Relatórios/);
 await mobile.locator('[data-act="mobile-nav"]').click();
 await mobile.keyboard.press('Escape');
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),0);
 const dimensions=await mobile.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.client+2,'sem overflow horizontal no celular');
 assert.deepEqual(errors,[],'sem erros JS');
 console.log('ContaGil Studio: logo, favicon, header, busca Ctrl+K, empresa/competência, rail, sheets, tema, mobile e assets aprovados.');
 await mobile.close();await context.close();
}catch(error){console.error('ADMIN E2E FAIL:',error);process.exitCode=1}
finally{await browser.close()}
