import {dateISO,detect,norm,cents} from './core.js';

export const PDF_COLUMNS=['Data','Histórico','Valor','Página','Texto original'];
const fields={
 date:['data','dt lanc','dt oper','dt movimento','data operacao','data oper','data da movimentacao','dt postagem','data do lancamento','data contabil','dia'],
 description:['descricao da transacao','historico bancario','detalhes','detalhes do movimento','descricao da operacao','descricao do lancamento','memo','description','narrativa','historico','lancamentos','descricao'],
 amount:['valor da transacao','valor liquido','vl movimento','movimentacao r','valor r','amount','montante','valor total','valor'],
 deposit:['creditos r','valor creditado','valor entrada','deposito','entradas r','recebimentos','credito r','cred'],
 withdrawal:['debitos r','valor debitado','valor saida','saidas r','despesas','debito r','pagto','deb'],
 document:['doc','nsu','id','transacao id','autenticacao','numero do documento','numero lancamento'],
 party:['nome favorecido','origem destino','titular','beneficiario','nome cliente','nome fornecedor','contraparte']
};
export function mappingFromHeaders(headers){
 const mapping=detect(headers);
 for(let i=0;i<headers.length;i++){
  const h=norm(headers[i]);
  if(!h)continue;
  for(const [field,aliases] of Object.entries(fields)){
   if(mapping[field]===undefined&&(aliases.includes(h)||aliases.some(a=>h.startsWith(a+' ')||h.endsWith(' '+a)))) mapping[field]=i;
  }
 }
 // Prefer separate debit/credit columns if the single "valor" is actually a balance.
 if(mapping.amount!==undefined && /saldo|balance|debito|debitado|credito|creditado|saida|entrada/.test(norm(headers[mapping.amount])))delete mapping.amount;
 return mapping;
}
function scoreLayout(mapping){return (mapping.date!==undefined?4:0)+(mapping.description!==undefined?4:0)+(mapping.amount!==undefined?4:(mapping.deposit!==undefined?2:0)+(mapping.withdrawal!==undefined?2:0))+(mapping.document!==undefined?1:0)+(mapping.party!==undefined?1:0)}
export function inferTableLayout(rows,maxHeaders=30){
 if(!Array.isArray(rows)||!rows.length)return{header:1,mapping:{},confidence:0,headless:false};
 const max=Math.min(rows.length,maxHeaders),candidates=[];
 for(let n=0;n<max;n++){
  const mapping=mappingFromHeaders(rows[n]||[]);
  candidates.push({header:n+1,mapping,score:scoreLayout(mapping),headless:false});
 }
 candidates.sort((a,b)=>b.score-a.score||a.header-b.header);
 if(candidates[0]?.score>=10)return{...candidates[0],confidence:Math.min(1,candidates[0].score/14)};
 // No headers? Detect a date, narrative and amount in the first 6 non-empty columns.
 for(let r=0;r<Math.min(rows.length,6);r++){
  const row=rows[r]||[];
  const dt=row.findIndex(v=>dateISO(v));
  const amount=row.findIndex((v,i)=>i!==dt&&typeof v!=='undefined'&&/-|,/.test(String(v))&&cents(v)!==null);
  const desc=row.findIndex((v,i)=>i!==dt&&i!==amount&&String(v??'').trim().length>=5);
  if(dt>=0&&amount>=0&&desc>=0)return{header:r,mapping:{date:dt,description:desc,amount},confidence:.62,score:9,headless:true};
 }
 return{...(candidates[0]||{header:1,mapping:{},score:0}),confidence:Math.min(1,(candidates[0]?.score||0)/14)};
}
export function signature(headers){return headers.map(norm).join('|')}
export function signedCents(value){
 if(value===null||value===undefined)return null;
 if(typeof value==='number')return cents(value);
 const v=String(value).trim();
 const debit=/\s+D(?:E?B(?:ITO)?)?\.?$/i.test(v);
 const credit=/\s+C(?:R(?:E?D(?:ITO)?)?)?\.?$/i.test(v);
 const stripped=v.replace(/\s+[DC](?:[A-Z]*)\.?$/i,'').replace(/[−–]/g,'-');
 const amount=cents(stripped);
 if(amount===null)return null;
 return debit?-Math.abs(amount):credit?Math.abs(amount):amount;
}
export function normalizeRows(rows,mapping,firstRow=2){
 const get=(r,k)=>mapping[k]===undefined?'':r[mapping[k]];
 const mapped=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i]||[];
  if(!row.some(x=>String(x??'').trim()))continue;
  const date=dateISO(get(row,'date'));
  const description=String(get(row,'description')||'').trim();
  let amount=null;
  if(mapping.amount!==undefined)amount=signedCents(get(row,'amount'));
  else if(mapping.deposit!==undefined||mapping.withdrawal!==undefined){
   const incoming=signedCents(get(row,'deposit'));
   const outgoing=signedCents(get(row,'withdrawal'));
   if((incoming===null||incoming===0)&&(outgoing===null||outgoing===0))amount=null;
   else amount=(incoming||0)-Math.abs(outgoing||0);
  }
  if(mapping.sign!==undefined&&amount!==null){
   const type=norm(get(row,'sign'));
   if(/^(d|debito|saida)$/.test(type))amount=-Math.abs(amount);
   else if(/^(c|credito|entrada)$/.test(type))amount=Math.abs(amount);
  }
  const errors=[];
  if(!date)errors.push('Data inválida');
  if(!description)errors.push('Histórico obrigatório');
  if(amount===null||amount===0)errors.push('Valor inválido ou zerado');
  if(amount!==null&&Math.abs(amount)>9e13)errors.push('Valor fora do limite');
  mapped.push({
   rowNumber:firstRow+i,date:date||'',description,document:String(get(row,'document')??'').trim(),
   party:String(get(row,'party')??'').trim(),amount:amount??0,errors,
   original:row
  });
 }
 return mapped;
}
const DATE='(?:\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})';
const MONEY='(?:\\(?\\s*[-−–]?\\s*(?:R\\$\\s*)?\\d[\\d.,]*\\s*\\)?\\s*[DC]?|\\d[\\d.,]*\\s*[-−–]?)';
const standard=[
 new RegExp('^(?<date>'+DATE+')\\s+(?<description>.+?)\\s+(?<amount>'+MONEY+')\\s*$','i'),
 new RegExp('^(?<date>'+DATE+')\\s+(?<amount>'+MONEY+')\\s+(?<description>.+?)\\s*$','i'),
 new RegExp('^(?<date>'+DATE+')\\s*[;|]\\s*(?<description>.+?)\\s*[;|]\\s*(?<amount>'+MONEY+')\\s*$','i')
];
export function checkPdfPattern(pattern){
 if(!pattern)return null;
 if(pattern.length>500)throw Error('Regex do PDF acima de 500 caracteres');
 if(/\(\?<=|\(\?<!/.test(pattern))throw Error('Lookbehind não é suportado no layout PDF');
 const r=new RegExp(pattern,'i');
 for(const field of ['date','description','amount'])if(!r.exec('')?.groups?.[field]&&!pattern.includes('?<'+field+'>'))throw Error('A expressão precisa conter os grupos: date, description e amount');
 return r;
}
export function parsePDFLines(lines,customPattern=''){
 const custom=checkPdfPattern(customPattern);
 const parsed=[];
 for(const [i,line] of lines.entries()){
  const text=String(line.text||'').replace(/\s+/g,' ').trim();
  if(!text)continue;
  let found=null;
  const patterns=custom?[custom]:standard;
  for(const pattern of patterns){pattern.lastIndex=0;const match=pattern.exec(text);if(match?.groups){found=match.groups;break}}
  const valid=found&&dateISO(found.date)&&signedCents(found.amount)!==null&&String(found.description||'').trim();
  parsed.push({
   page:line.page||1,lineNumber:line.lineNumber??(i+1),text,
   row:valid?[found.date,found.description,signedCents(found.amount)/100,line.page||1,text]:
    ['',text,'',line.page||1,text],
   recognized:!!valid
  });
 }
 return {headers:PDF_COLUMNS,rows:[PDF_COLUMNS,...parsed.map(x=>x.row)],items:parsed,recognized:parsed.filter(x=>x.recognized).length,unrecognized:parsed.filter(x=>!x.recognized).length};
}
export function extractPdfLines(pageItems,page){
 // PDF.js textContent.items contains fragments with x/y positions in page coordinates.
 const groups=[];
 for(const item of pageItems){
  if(!item?.str||!item.str.trim())continue;
  const x=Number(item.transform?.[4]||0),y=Number(item.transform?.[5]||0);
  let group=groups.find(g=>Math.abs(g.y-y)<2.5);
  if(!group){group={y,fragments:[]};groups.push(group)}
  group.fragments.push({x,text:item.str.trim()});
 }
 groups.sort((a,b)=>b.y-a.y);
 return groups.map((g,i)=>({page,lineNumber:i+1,text:g.fragments.sort((a,b)=>a.x-b.x).map(f=>f.text).join(' ')}));
}
