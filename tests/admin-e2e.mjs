import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
const base=process.env.UX_BASE_URL||'http://127.0.0.1:4173/';
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},locale:'pt-BR'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('[data-act="demo"]').click();
 assert.equal(await page.locator('.nav-group').count(),4,'menu agrupado');
 const original=await page.locator('.context-sidebar [data-context="company"]').inputValue();
 assert.ok(original,'empresa selecionada');
 assert.equal(await page.locator('.topbar [data-act="backup"]').count(),0,'backup removido da topbar');
 assert.equal(await page.locator('.workspace-selector.context-sidebar').count(),1);

 await page.locator('[data-act="toggle-sidebar"]').click();
 assert.equal(await page.locator('.shell.is-collapsed').count(),1);
 const width=await page.locator('aside.sidebar').evaluate(e=>e.getBoundingClientRect().width);
 assert.ok(width<=74,'rail de ícones dentro de 74 px: '+width);
 assert.ok(await page.locator('.topbar-context').isVisible(),'empresa e competência acessíveis no rail');
 await page.locator('[data-act="toggle-sidebar"]').click();
 assert.equal(await page.locator('.shell.is-collapsed').count(),0);

 await page.locator('[data-page="companies"]').click();
 await page.locator('[data-act="new-company"]').click();
 assert.equal(await page.locator('.sheet-panel').count(),1);
 await page.locator('#editor input[name="name"]').fill('Empresa Secundária Exemplo');
 await page.locator('#editor button[type="submit"]').click();
 const created=await page.locator('.context-sidebar [data-context="company"]').inputValue();
 assert.notEqual(original,created,'duas empresas independentes');
 await page.locator('[data-page="movements"]').click();
 assert.match(await page.locator('main').innerText(),/Nenhum registro/);
 await page.locator('.context-sidebar [data-context="company"]').selectOption(original);
 await page.locator('[data-page="movements"]').click();
 assert.match(await page.locator('main').innerText(),/PIX fornecedor de serviços/,'empresa anterior preservada');
 await page.locator('.context-sidebar [data-context="period"]').fill('2026-10');
 assert.match(await page.locator('main').innerText(),/2026-10/);
 await page.locator('.context-sidebar [data-context="period"]').fill('2026-11');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('.context-sidebar [data-context="company"]').inputValue(),original,'empresa persistida');
 assert.equal(await page.locator('.context-sidebar [data-context="period"]').inputValue(),'2026-11');

 await page.locator('.sidebar-footer [data-act="theme-toggle"]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','tema preservado');
 await page.locator('[data-page="settings"]').click();
 assert.ok(await page.locator('main [data-act="backup"]').count()>0,'backup em configurações');
 assert.ok((await page.locator('.ui-icon use').count())>10,'ícones Lucide locais');

 const mobile=await context.newPage();
 await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(base,{waitUntil:'networkidle'});
 assert.ok(await mobile.locator('.topbar-context').isVisible());
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),0);
 await mobile.locator('[data-act="mobile-nav"]').click();
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),1);
 await mobile.locator('.sidebar-scroll [data-page="reports"]').click();
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),0,'menu fecha ao navegar');
 await mobile.locator('[data-act="mobile-nav"]').click();
 await mobile.keyboard.press('Escape');
 assert.equal(await mobile.locator('.shell.mobile-nav-open').count(),0,'menu fecha por Escape');
 const w=await mobile.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 assert.ok(w.document<=w.viewport+2,'sem transbordamento de página');
 assert.equal(errors.length,0,'sem erros JavaScript: '+errors.join('; '));
 console.log('Admin: contexto, 2 empresas, competência, persistência, rail, tema, backup e navegação mobile passaram.');
 await mobile.close();await context.close();
}catch(e){console.error('ADMIN E2E FAIL:',e);process.exitCode=1;}finally{await browser.close()}
