import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
let page;
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true,locale:'pt-BR'});
 page=await context.newPage();
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 assert.match(await page.locator('h1').first().innerText(),/Organize os fechamentos/i);
 assert.match(await page.title(),/^ContaGi/);
 assert.equal(await page.locator('.brand-wordmark').first().innerText(),'ContaGi');
 await page.locator('button[data-act="demo"]').first().click();
 assert.equal(await page.locator('button[data-act^="post:"]').count(),1);
 await page.locator('button[data-act^="post:"]').click();
 assert.match(await page.locator('.sheet-header h2').innerText(),/Classificar movimentação/);
 assert.equal(await page.locator('.modal-layer').count(),0,'não existem modais centralizados');
 const select=page.locator('#editor select[name="counterpartId"]');
 await select.selectOption({label:'5.1.01 · Despesa com serviços'});
 await page.locator('#editor button[type="submit"]').click();
 await page.locator('.sheet-panel [data-act="confirm-yes"]').click();
 await page.waitForTimeout(150);
 assert.equal(await page.locator('button[data-act^="post:"]').count(),0,'lançamento foi vinculado');
 await page.locator('button[data-page="entries"]').click();
 assert.match(await page.locator('main').innerText(),/Despesa com serviços/);
 assert.match(await page.locator('main').innerText(),/R\$\s*250,00/);

 await page.locator('button[data-page="import"]').click();
 await page.locator('#bankFile').setInputFiles({
  name:'extrato-mes.csv',mimeType:'text/csv',
  buffer:Buffer.from('Data;Histórico;Valor;Documento\n12/11/2026;PIX fornecedor X;-150,00;X-02\n','utf8')
 });
 await page.locator('#headerRow').waitFor({state:'visible',timeout:15000});
 assert.match(await page.locator('main').innerText(),/1 válidas/);
 await page.locator('#templateName').fill('Banco X — layout mensal');
 await page.locator('button[data-act="save-template"]').click();
 await page.locator('button[data-act="commit-import"]').click();
 await page.locator('.sheet-panel [data-act="confirm-yes"]').click();
 await page.waitForTimeout(100);
 assert.match(await page.locator('main').innerText(),/PIX fornecedor X/);
 await page.reload({waitUntil:'networkidle'});
 await page.locator('button[data-page="movements"]').click();
 assert.match(await page.locator('main').innerText(),/PIX fornecedor X/,'dados persistidos no navegador');
 await page.locator('button[data-page="import"]').click();
 await page.locator('#bankFile').setInputFiles('tests/fixtures/extrato-teste.xlsx');
 await page.locator('#headerRow').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('main').innerText(),/TARIFA TESTE XLSX/);
 assert.match(await page.locator('main').innerText(),/1 válidas/);
 await page.locator('button[data-act="commit-import"]').click();
 await page.locator('.sheet-panel [data-act="confirm-yes"]').click();
 await page.locator('button[data-page="movements"]').click();
 assert.match(await page.locator('main').innerText(),/TARIFA TESTE XLSX/,'XLSX importado com sucesso');

 await page.locator('button[data-page="settings"]').click();
 assert.match(await page.locator('main').innerText(),/Banco X — layout mensal/);
 await page.locator('button[data-page="movements"]').click();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('button[data-act="export-bank"]').click();
 const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/contagi-bank-/);
 await page.locator('[data-act="theme-dark"]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','preferência de aparência preservada');
 await page.locator('[data-act="theme-light"]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 console.log('Desktop: lançamentos, importações CSV/XLSX, persistência, exportação, sheets e temas passaram.');

 const mobile=await context.newPage();
 await mobile.setViewportSize({width:390,height:844});
 await mobile.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 assert.ok(await mobile.locator('nav button').count()>=8);
 const sizes=await mobile.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(sizes.scroll<=sizes.client+4,'layout sem overflow horizontal geral: '+JSON.stringify(sizes));
 console.log('Mobile: menu e dimensões passaram.');
 await mobile.close();
 await context.close();
}catch(error){
 console.error('Smoke E2E falhou:',error);
 if(page){try{await page.screenshot({path:'smoke-failure.png',fullPage:true})}catch{}}
 process.exitCode=1;
}finally{await browser.close()}
