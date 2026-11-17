import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
const site=process.env.UX_BASE_URL||'http://127.0.0.1:4173/';
try{
 const context=await browser.newContext({viewport:{width:1366,height:900},locale:'pt-BR',acceptDownloads:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto(site,{waitUntil:'networkidle'});
 await page.locator('[data-act="demo"]').click();
 const go=async route=>page.locator('[data-page="'+route+'"]').first().click();
 const upload=async(path)=>{
  await go('import');
  await page.locator('#bankFile').setInputFiles(path);
  await page.locator('#templateName').waitFor({state:'visible',timeout:20000});
 };
 const confirm=async()=>{await page.locator('[data-act="commit-import"]').click();await page.locator('[data-act="confirm-yes"]').click();await page.locator('[data-page="movements"]').first().waitFor({state:'visible',timeout:10000})};
 await upload('tests/fixtures/extrato-banco-a.pdf');
 assert.equal(await page.locator('#pdfPattern').count(),1,'editor PDF presente');
 assert.match(await page.locator('main').innerText(),/3 válidas/,'leitura PDF em duas páginas');
 assert.match(await page.locator('main').innerText(),/2 pendentes/,'cabeçalho e rodapé preservados');
 await page.locator('#templateName').fill('Banco Exemplo A · PDF');
 await page.locator('[data-act="save-template"]').click();
 await confirm();
 assert.match(await page.locator('main').innerText(),/COMPRA SUPERMERCADO/);
 assert.match(await page.locator('main').innerText(),/TARIFA MENSAL/);
 console.log('PDF A multipágina: três lançamentos detectados, linhas não mapeadas preservadas.');

 await upload('tests/fixtures/extrato-banco-b.pdf');
 const expression='^(?<date>\\d{4}-\\d{2}-\\d{2})\\s*\\|\\s*(?<description>.+?)\\s*\\|\\s*(?<amount>-?[\\d.,]+)$';
 await page.locator('#pdfPattern').fill(expression);
 await page.locator('[data-act="apply-pdf-pattern"]').click();
 assert.match(await page.locator('main').innerText(),/2 válidas/);
 await page.locator('#templateName').fill('Banco Exemplo B · PDF customizado');
 await page.locator('[data-act="save-template"]').click();
 await confirm();
 assert.match(await page.locator('main').innerText(),/TRANSFERENCIA RECEBIDA/);
 await page.reload({waitUntil:'networkidle'});
 await go('import');
 assert.match(await page.locator('main').innerText(),/Banco Exemplo A/,'modelo PDF A persistente');
 assert.match(await page.locator('main').innerText(),/Banco Exemplo B/,'modelo PDF B persistente');
 await page.locator('#bankFile').setInputFiles('tests/fixtures/extrato-banco-b.pdf');
 await page.locator('#templateName').waitFor({state:'visible',timeout:20000});
 assert.equal(await page.locator('#pdfPattern').inputValue(),expression,'expressão PDF reaplicada');
 await confirm();
 assert.match(await page.locator('#feedback').innerText(),/duplicados/,'arquivo reimportado detecta duplicados');
 await upload('tests/fixtures/extrato-banco-b-mes-seguinte.pdf');
 assert.equal(await page.locator('#pdfPattern').inputValue(),expression,'layout PDF reaplicado em arquivo com transações diferentes');
 assert.match(await page.locator('main').innerText(),/NOVA TRANSFERENCIA/);
 await confirm();
 assert.match(await page.locator('main').innerText(),/NOVA TRANSFERENCIA/,'novo arquivo importado com layout anterior');
 console.log('PDF B: layout salvo, reuso com transações diferentes e deduplicação confirmados.');
 await page.addScriptTag({url:new URL('./vendor/xlsx/xlsx.full.min.js',site).href});
 async function makeWorkbook(type,description='COMPRA LOJA B'){
  const bytes=await page.evaluate(({type,description})=>{
   const ws=XLSX.utils.aoa_to_sheet([
    ['EXTRATO DE CONTA FICTICIA'],['RELATORIO MENSAL'],
    ['Dt. Movimento','Narrativa','Entrada','Saída','Referência'],
    ['16/11/2026','PIX CLIENTE XYZ','215,00','','R-101'],
    ['17/11/2026',description,'','38,40','P-102']
   ]);
   const cover=XLSX.utils.aoa_to_sheet([['CAPA DO EXTRATO'],['CONTA: 0000-1']]);
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,cover,'Capa');
   XLSX.utils.book_append_sheet(wb,ws,'Movimentos');
   return Array.from(new Uint8Array(XLSX.write(wb,{bookType:type,type:'array'})));
  },{type,description});
  return {name:'extrato-diferente.'+(type==='biff8'?'xls':'xlsx'),mimeType:'application/octet-stream',buffer:Buffer.from(bytes)};
 }
 await upload(await makeWorkbook('xlsx'));
 assert.equal(await page.locator('#headerRow').inputValue(),'3','cabeçalho deslocado detectado');
 assert.equal(await page.locator('#sheet').inputValue(),'1','aba correta detectada');
 assert.match(await page.locator('main').innerText(),/2 válidas/);
 await page.locator('#templateName').fill('Cliente XYZ · Excel mensal');
 await page.locator('[data-act="save-template"]').click();
 await confirm();
 assert.match(await page.locator('main').innerText(),/COMPRA LOJA B/);
 await upload(await makeWorkbook('biff8','PAGAMENTO LOJA C'));
 assert.match(await page.locator('main').innerText(),/PAGAMENTO LOJA C/);
 assert.match(await page.locator('main').innerText(),/2 válidas/);
 await confirm();
 assert.match(await page.locator('main').innerText(),/PAGAMENTO LOJA C/);
 console.log('XLSX com capa/cabeçalho na terceira linha e XLS binário: importados com mapeamento automático.');
 assert.equal(errors.length,0,'sem erros JavaScript: '+errors.join('; '));
 await context.close();
}catch(error){
 console.error('FAIL import PDF E2E:',error);
 process.exitCode=1;
}finally{await browser.close()}
