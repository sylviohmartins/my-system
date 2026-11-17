export const KEY='contabil.local.pages.v1';
export const TYPES={asset:'Ativo',liability:'Passivo',equity:'Patrimônio líquido',revenue:'Receita',expense:'Despesa'};
export const DEFAULTS=[
 ['1.1.01','Banco conta movimento','asset'],
 ['1.1.02','Caixa','asset'],
 ['1.1.03','Clientes a receber','asset'],
 ['2.1.01','Fornecedores a pagar','liability'],
 ['2.1.02','Tributos a recolher','liability'],
 ['3.1.01','Capital social','equity'],
 ['4.1.01','Receita de serviços','revenue'],
 ['4.1.02','Receita de vendas','revenue'],
 ['5.1.01','Despesa com serviços','expense'],
 ['5.1.02','Despesas administrativas','expense'],
 ['5.1.03','Tarifas bancárias','expense']];
export const newDB=()=>({version:1,companies:[],accounts:[],parties:[],titles:[],movements:[],entries:[],templates:[],rules:[],audit:[]});
export const uid=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now();
export const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const fmt=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
export const decimal=c=>(c/100).toFixed(2).replace('.',',');
export function cents(value){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 if(typeof value==='number')return Number.isFinite(value)&&Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):null;
 let s=String(value).trim().replace(/R\$/gi,'').replace(/[\s\u00a0]/g,'');let sign=1;
 if(/^\(.*\)$/.test(s)){sign=-1;s=s.slice(1,-1)}
 if(s.startsWith('-')){sign=-1;s=s.slice(1)}
 if(s.endsWith('-')){sign=-1;s=s.slice(0,-1)}
 if(s.startsWith('+'))s=s.slice(1);
 if(!/^\d[\d.,]*$/.test(s))return null;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.'),last=Math.max(comma,dot);
 let whole=s,part='';
 if(last>=0){
  const places=s.length-last-1,decimalSeparator=comma>=0&&dot>=0 || places===1||places===2;
  if(decimalSeparator){whole=s.slice(0,last);part=s.slice(last+1);if(!/^\d{1,2}$/.test(part))return null}
 }
 whole=whole.replace(/[,.]/g,'');if(!/^\d+$/.test(whole))return null;
 const result=Number(whole)*100+Number(part.padEnd(2,'0')||0);
 return Number.isSafeInteger(result)?sign*result:null;
}
export function dateISO(value){
 if(typeof value==='number' && Number.isInteger(value) && value>=1 && value<=80000){
   const d=new Date(Date.UTC(1899,11,30)+value*86400000);return d.toISOString().slice(0,10);
 }
 const s=String(value??'').trim();let m;
 if(m=s.match(/^(\d{4})-(\d\d)-(\d\d)$/))return validDate(+m[1],+m[2],+m[3]);
 if(m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))return validDate(+m[3],+m[2],+m[1]);
 return null;
}
function validDate(y,m,d){const date=new Date(Date.UTC(y,m-1,d));return y>=1900&&y<=2100&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.toISOString().slice(0,10):null}
export function csvParse(src){
 const text=String(src).replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/).find(Boolean)||'';
 const sep=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 let out=[],row=[],cell='',quotes=false;
 for(let i=0;i<text.length;i++){
  let ch=text[i];
  if(quotes){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')quotes=false;else cell+=ch;continue}
  if(ch==='"'){quotes=true;continue}
  if(ch===sep){row.push(cell);cell='';continue}
  if(ch==='\n'||ch==='\r'){row.push(cell);if(row.some(x=>String(x).trim()))out.push(row);row=[];cell='';if(ch==='\r'&&text[i+1]==='\n')i++;continue}
  cell+=ch;
 }
 if(quotes)throw Error('Aspas não fechadas no CSV');
 row.push(cell);if(row.some(x=>String(x).trim()))out.push(row);
 return out;
}
export function csvExport(head,rows){
 const safe=v=>{let s=String(v??'');if(/^\s*[=+@\-\t\r]/.test(s)&&!/^[-+]?\d+(?:[.,]\d+)?$/.test(s.trim()))s="'"+s;return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 return '\uFEFF'+[head,...rows].map(r=>r.map(safe).join(';')).join('\r\n')+'\r\n';
}
const NAMES={
 date:['data','dt mov','dt movimento','data movimento','data lancamento','data da transacao','dt'],
 description:['descricao','historico','historico movimento','historico da operacao','narrativa','detalhe','lancamento','transacao'],
 amount:['valor','valor r','movimento','valor movimento','valor em r'],
 deposit:['entrada','entradas','credito','valor credito','recebimento','creditos'],
 withdrawal:['saida','saidas','debito','valor debito','pagamento','debitos'],
 document:['documento','identificador','referencia','numero','id transacao','identificacao'],
 party:['favorecido','cliente','fornecedor','contraparte','nome']};
export function detect(header){let map={};for(let i=0;i<header.length;i++){const h=norm(header[i]);for(const [k,values] of Object.entries(NAMES))if(map[k]===undefined&&values.includes(h))map[k]=i}return map}
export function mapMovements(rows,map,firstRow=2){
 const at=(r,k)=>map[k]===undefined?'':r[map[k]];
 const items=[];for(let n=0;n<rows.length;n++){
  const r=rows[n];if(!r?.some(v=>String(v??'').trim()))continue;
  const dt=dateISO(at(r,'date'));const desc=String(at(r,'description')??'').trim();
  let amount=map.amount!==undefined?cents(at(r,'amount')):null;
  if(map.amount===undefined&&map.deposit!==undefined&&map.withdrawal!==undefined){
    const deposit=cents(at(r,'deposit'))||0,withdrawal=cents(at(r,'withdrawal'))||0;
    amount=deposit-Math.abs(withdrawal);
  }
  const errors=[];if(!dt)errors.push('Data inválida');if(!desc)errors.push('Histórico obrigatório');
  if(amount===null||amount===0)errors.push('Valor ausente ou zerado');
  if(amount!==null&&Math.abs(amount)>9e13)errors.push('Valor acima do limite');
  items.push({rowNumber:firstRow+n,date:dt||'',description:desc,document:String(at(r,'document')??'').trim(),party:String(at(r,'party')??'').trim(),amount:amount??0,errors});
 }
 return items;
}
export function suggestion(movement,rules,accounts,companyId){
 const text=norm(movement.description+' '+movement.party);
 const matching=rules.filter(r=>r.companyId===companyId&&r.term&&text.includes(norm(r.term)));
 matching.sort((a,b)=>b.term.length-a.term.length);
 return matching.length?accounts.find(a=>a.id===matching[0].accountId&&a.companyId===companyId)||null:null;
}
export function createEntry(movement,bankAccountId,counterpartId,companyId){
 if(!movement||!Number.isSafeInteger(movement.amount)||!movement.amount)throw Error('Movimentação sem valor válido');
 if(!bankAccountId||!counterpartId||bankAccountId===counterpartId)throw Error('Selecione duas contas diferentes');
 const outgoing=movement.amount<0;return {id:uid(),companyId,movementId:movement.id,date:movement.date,description:movement.description,document:movement.document||'',amount:Math.abs(movement.amount),debitAccountId:outgoing?counterpartId:bankAccountId,creditAccountId:outgoing?bankAccountId:counterpartId,status:'approved',createdAt:new Date().toISOString()};
}
export function bankEffect(entry,bankAccountId){return (entry.debitAccountId===bankAccountId?entry.amount:0)-(entry.creditAccountId===bankAccountId?entry.amount:0)}
const NORM={asset:1,expense:1,liability:-1,equity:-1,revenue:-1};
export function report(accounts,entries,end,month){
 const map=new Map(accounts.map(a=>[a.id,{...a,debit:0,credit:0,balance:0,monthlyDebit:0,monthlyCredit:0}]));
 for(const e of entries){
  if(e.status!=='approved'||e.date>end)continue;
  const debit=map.get(e.debitAccountId),credit=map.get(e.creditAccountId);
  if(debit){debit.debit+=e.amount;if(e.date.startsWith(month))debit.monthlyDebit+=e.amount}
  if(credit){credit.credit+=e.amount;if(e.date.startsWith(month))credit.monthlyCredit+=e.amount}
 }
 const rows=[...map.values()].sort((a,b)=>a.code.localeCompare(b.code,'pt-BR',{numeric:true}));
 for(const a of rows)a.balance=(a.debit-a.credit)*(NORM[a.type]||1);
 const sum=type=>rows.filter(x=>x.type===type).reduce((s,a)=>s+a.balance,0);
 const revenue=rows.filter(x=>x.type==='revenue').reduce((s,a)=>s+a.monthlyCredit-a.monthlyDebit,0);
 const expense=rows.filter(x=>x.type==='expense').reduce((s,a)=>s+a.monthlyDebit-a.monthlyCredit,0);
 return {rows,assets:sum('asset'),liabilities:sum('liability'),equity:sum('equity'),profit:sum('revenue')-sum('expense'),monthlyProfit:revenue-expense,revenue,expense,totalDebits:rows.reduce((s,a)=>s+a.debit,0),totalCredits:rows.reduce((s,a)=>s+a.credit,0)};
}

export function titleOutstanding(title,end){
 if(!title||!dateISO(title.date)||title.date>end)return 0;
 const paid=(Array.isArray(title.payments)?title.payments:[]).filter(p=>dateISO(p.date)&&p.date<=end).reduce((sum,p)=>sum+p.amount,0);
 return Math.max(0,title.amount-paid);
}
export function controlTotals(titles,end){
 return {receivable:titles.filter(t=>t.type==='receivable').reduce((sum,t)=>sum+titleOutstanding(t,end),0),
 payable:titles.filter(t=>t.type==='payable').reduce((sum,t)=>sum+titleOutstanding(t,end),0)};
}
