import test from 'node:test';
import assert from 'node:assert/strict';
import {inferTableLayout,mappingFromHeaders,signature,normalizeRows,signedCents,parsePDFLines,extractPdfLines,checkPdfPattern} from '../importers.mjs';

test('detecta cabeçalho na terceira linha sem importar capa',()=>{
 const rows=[
  ['Extrato bancário fictício de novembro de 2026'],
  ['Agência 0001 / Conta 123'],
  ['Dt. Mov.','Narrativa','Entrada','Saída','Referência'],
  ['16/11/2026','PIX cliente A','1.500,00','','NF-02'],
  ['17/11/2026','Pagamento fornecedor','','430,90','NF-03']
 ];
 const layout=inferTableLayout(rows);
 assert.equal(layout.header,3);
 assert.equal(layout.mapping.date,0);
 assert.equal(layout.mapping.description,1);
 const records=normalizeRows(rows.slice(layout.header),layout.mapping,layout.header+1);
 assert.deepEqual(records.map(x=>x.amount),[150000,-43090]);
 assert.ok(records.every(r=>!r.errors.length));
});
test('aceita valores sinalizados com letras de débito e crédito',()=>{
 assert.equal(signedCents('230,00 D'),-23000);
 assert.equal(signedCents('1.005,01 C'),100501);
 assert.equal(signedCents('(20,00)'),-2000);
});
test('cabeçalhos alternativos e saldo não classificado como valor',()=>{
 const m=mappingFromHeaders(['Data da operação','Descrição da transação','Valor debitado','Valor creditado','Saldo']);
 assert.equal(m.date,0);assert.equal(m.description,1);
 assert.equal(m.withdrawal,2);assert.equal(m.deposit,3);
 assert.equal(m.amount,undefined);
});
test('usa assinatura estável mesmo se planilha muda nome e data no título',()=>{
 assert.equal(signature(['Data','Histórico','Valor']),signature(['DATA','Histórico ','VALOR']));
});
test('reconhece linhas PDF de bancos diferentes sem descartar linhas',()=>{
 const lines=[
  {page:1,text:'BANCO EXEMPLO - EXTRATO DE NOVEMBRO'},
  {page:1,text:'16/11/2026 Compra supermercado 127,99 D'},
  {page:1,text:'17/11/2026 PIX cliente 1.000,00 C'},
  {page:2,text:'18/11/2026 -20,00 Tarifa mensal'}
 ];
 const data=parsePDFLines(lines);
 assert.equal(data.items.length,4);
 assert.equal(data.rows.length,5);
 assert.equal(data.recognized,3);
 assert.equal(data.unrecognized,1);
 assert.equal(data.rows[1][1],lines[0].text);
 const records=normalizeRows(data.rows.slice(1),{date:0,description:1,amount:2},2);
 assert.equal(records.filter(r=>!r.errors.length).length,3);
 assert.deepEqual(records.filter(r=>!r.errors.length).map(r=>r.amount),[-12799,100000,-2000]);
});
test('mapeamento customizado por captura de grupos PDF',()=>{
 const lines=[{page:1,text:'2026-11-16 | RECEBIMENTO XPTO | 99,90'},{page:2,text:'2026-11-17 | PAGAMENTO XYZ | -20,50'}];
 const re='^(?<date>\\d{4}-\\d{2}-\\d{2}) \\| (?<description>.+?) \\| (?<amount>-?[\\d.,]+)$';
 const data=parsePDFLines(lines,re);
 assert.equal(data.recognized,2);
 assert.deepEqual(normalizeRows(data.rows.slice(1),{date:0,description:1,amount:2},2).map(r=>r.amount),[9990,-2050]);
 assert.throws(()=>checkPdfPattern('('));
 assert.throws(()=>checkPdfPattern('(.+)'),/grupos/);
});
test('agrupa fragmentos PDF pelo eixo Y e preserva páginas e linhas',()=>{
 const fragments=[
  {str:'PIX',transform:[1,0,0,1,130,500]},{str:'16/11/2026',transform:[1,0,0,1,30,500]},
  {str:'100,00',transform:[1,0,0,1,240,500]},
  {str:'18/11/2026',transform:[1,0,0,1,30,480]}
 ];
 const rows=extractPdfLines(fragments,4);
 assert.equal(rows.length,2);
 assert.equal(rows[0].text,'16/11/2026 PIX 100,00');
 assert.equal(rows[0].page,4);
});
test('planilha sem cabeçalho identificável não assume um layout errado',()=>{
 const rows=[['16/11/2026','Loja ABC','-150,00'],['17/11/2026','Loja DEF','-10,00']];
 const inferred=inferTableLayout(rows);
 assert.equal(inferred.header,0);
 assert.equal(inferred.headless,true);
 assert.deepEqual(inferred.mapping,{date:0,description:1,amount:2});
});
