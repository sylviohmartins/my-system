import test from 'node:test';
import assert from 'node:assert/strict';
import {cents,dateISO,csvParse,csvExport,detect,mapMovements,createEntry,bankEffect,report,suggestion} from '../core.js';
test('valores e datas',()=>{assert.equal(cents('1.234,56'),123456);assert.equal(cents('-50,10'),-5010);assert.equal(cents('(250,00)'),-25000);assert.equal(cents('=A1'),null);assert.equal(dateISO('31/02/2026'),null);assert.equal(dateISO('16/11/2026'),'2026-11-16')});
test('CSV import/export',()=>{const rows=csvParse('Data;Descrição;Valor\n16/11/2026;"PIX; fornecedor";-250,00\n');assert.equal(rows[1][1],'PIX; fornecedor');assert.ok(csvExport(['Teste'],[['=1+2']]).includes("'=1+2"))});
test('mapeamento do banco',()=>{const map=detect(['Data','Descrição','Entrada','Saída']);const results=mapMovements([['16/11/2026','Pagamento','','250,00']],map,2);assert.equal(results[0].amount,-25000);assert.deepEqual(results[0].errors,[])});
test('partidas corretas',()=>{
 const bank={id:'bank',code:'1',type:'asset'},expense={id:'expense',code:'5',type:'expense'},client={id:'clients',code:'1.2',type:'asset'},revenue={id:'revenue',code:'4',type:'revenue'};
 const out=createEntry({id:'m1',date:'2026-11-16',description:'Despesa',amount:-25000},'bank','expense','a');
 const income=createEntry({id:'m2',date:'2026-11-16',description:'Recebimento',amount:100000},'bank','clients','a');
 assert.equal(out.debitAccountId,'expense');assert.equal(out.creditAccountId,'bank');assert.equal(bankEffect(out,'bank'),-25000);
 assert.equal(income.debitAccountId,'bank');assert.equal(income.creditAccountId,'clients');
 const invoice={id:'invoice',companyId:'a',date:'2026-11-01',description:'NF emitida',amount:100000,debitAccountId:'clients',creditAccountId:'revenue',status:'approved'};
 const sum=report([bank,expense,client,revenue],[invoice,out,income],'2026-11-30','2026-11');
 assert.equal(sum.totalDebits,sum.totalCredits);assert.equal(sum.assets,75000);assert.equal(sum.expense,25000);
});
test('regra por palavra-chave',()=>{const a={id:'expense',companyId:'a'},r=[{companyId:'a',term:'CACAU',accountId:'expense'}];assert.equal(suggestion({description:'PIX CACAU'},r,[a],'a')?.id,'expense')});
