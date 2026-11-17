import {KEY,TYPES,DEFAULTS,newDB,uid,norm,fmt,decimal,cents,dateISO,csvParse,csvExport,detect,mapMovements,suggestion,createEntry,bankEffect,report,titleOutstanding,controlTotals} from './core.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v?.version===1&&['companies','accounts','movements','entries','templates','rules','audit'].every(x=>Array.isArray(v[x])))return {...newDB(),...v}}catch{}return newDB()}
const THEME_KEY=KEY+'.theme';
let theme=(localStorage.getItem(THEME_KEY)||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'));
if(!['light','dark'].includes(theme))theme='light';
let focusReturnAction=null;
let sheetConfirmFn=null;
let db=load(),active=localStorage.getItem(KEY+'.company')||db.companies[0]?.id||'',period=localStorage.getItem(KEY+'.period')||localToday().slice(0,7),page='dashboard',importing=null,sheet=null,query='',notice='',warning='',stale=false;
if(!db.companies.some(x=>x.id===active))active=db.companies[0]?.id||'';
const co=()=>db.companies.find(x=>x.id===active);
const scoped=k=>db[k].filter(x=>x.companyId===active);
const ac=()=>scoped('accounts');
const bankRows=()=>scoped('movements');
const journal=()=>scoped('entries');
const account=id=>db.accounts.find(x=>x.id===id&&x.companyId===active);
const label=id=>{const a=account(id);return a?a.code+' · '+a.name:'Conta indisponível'};
const monthEnd=()=>period+'-31';
const opt=(arr,chosen,placeholder='Selecione')=>'<option value="">'+esc(placeholder)+'</option>'+arr.map(x=>'<option value="'+esc(x[0])+'" '+(x[0]===chosen?'selected':'')+'>'+esc(x[1])+'</option>').join('');
const accountOptions=(chosen='',exclude='')=>opt(ac().filter(a=>a.id!==exclude).map(a=>[a.id,a.code+' · '+a.name]),chosen,'Selecione a conta');
const notify=(text,error=false)=>{notice=text;warning=error?'error':'ok';render();setTimeout(()=>{const e=document.getElementById('feedback');if(e)e.remove()},5200)};
function requestConfirmation(title,message,callback,destructive=false){
 sheetConfirmFn=callback;
 sheet={kind:'confirm',title,message,destructive};
 render();
}
function save(action,detail){
 if(stale){notify('Outra aba alterou os dados. Atualize a página para evitar sobrescrita.',true);return false}
 if(action)db.audit.unshift({id:uid(),date:new Date().toISOString(),companyId:active,action,detail});
 db.audit=db.audit.slice(0,700);
 try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch{db=load();notify('Falha ao salvar: armazenamento cheio ou bloqueado. Verifique o backup.',true);return false}
}
function go(dest){page=dest;sheet=null;query='';render();window.scrollTo(0,0)}
const btn=(action,text,kind='')=>'<button type="button" class="btn '+kind+'" data-act="'+action+'">'+text+'</button>';
const card=(title,body,actions='')=>'<section class="card"><div class="card-head"><h2>'+title+'</h2><div>'+actions+'</div></div>'+body+'</section>';
function table(headers,rows){return '<div class="table-scroll" tabindex="0" role="region" aria-label="Tabela de dados, navegue horizontalmente se necessário"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows||'<tr><td colspan="'+headers.length+'" class="muted">Nenhum registro para exibir</td></tr>')+'</tbody></table></div>'}
function header(title,sub,action=''){return '<div class="heading"><div><p class="overline">'+esc(co()?.name||'AMBIENTE LOCAL')+' / '+esc(period)+'</p><h1>'+title+'</h1><p class="muted">'+sub+'</p></div><div class="inline">'+action+'</div></div>'}
function layout(content){
 const links=[['dashboard','Visão geral','◫'],['companies','Empresas','▣'],['accounts','Plano de contas','≡'],['parties','Terceiros e títulos','♧'],['import','Importar extrato','⇧'],['movements','Extratos','⇄'],['entries','Lançamentos','▤'],['reconcile','Conciliação','◎'],['reports','Relatórios','▥'],['settings','Backup e regras','⚙']];
 document.documentElement.dataset.theme=theme;
 document.getElementById('app').innerHTML='<a class="skip-link" href="#main-content">Pular para o conteúdo principal</a><div class="shell"><aside class="sidebar" aria-label="Menu lateral"><div class="brand"><span class="brand-mark" aria-hidden="true">Gi</span><div><strong class="brand-wordmark">Conta<span class="brand-wordmark-accent">Gi</span></strong><small>GESTÃO CONTÁBIL</small></div></div><div class="nav-heading">ESCRITÓRIO</div><nav aria-label="Navegação principal">'+links.map(([id,name,symbol])=>'<button type="button" class="nav-link '+(page===id?'active':'')+'" '+(page===id?'aria-current="page"':'')+' data-page="'+id+'"><span class="nav-icon" aria-hidden="true">'+symbol+'</span>'+name+'</button>').join('')+'</nav><div class="side-foot"><span class="dot" aria-hidden="true"></span> Seus dados ficam neste navegador</div></aside><div class="work"><header class="topbar"><div class="mobile-brand brand-wordmark">Conta<span class="brand-wordmark-accent">Gi</span></div><div class="top-right"><label>Empresa <select id="activeCompany">'+opt(db.companies.map(x=>[x.id,x.name]),active,'Sem empresa')+'</select></label><label>Competência <input id="month" type="month" value="'+esc(period)+'"></label><div class="top-actions"><div class="theme-toggle" role="group" aria-label="Aparência"><button type="button" data-act="theme-light" aria-pressed="'+(theme==='light')+'">Claro</button><button type="button" data-act="theme-dark" aria-pressed="'+(theme==='dark')+'">Escuro</button></div><button type="button" class="btn subtle" data-act="backup">Backup JSON</button></div></div></header><main class="content" id="main-content" tabindex="-1">'+(notice?'<div id="feedback" role="status" class="alert '+warning+'">'+esc(notice)+'</div>':'')+(stale?'<div class="alert error">Dados alterados em outra aba. Atualize esta página antes de editar.</div>':'')+content+'<footer>Rotinas contábeis com revisão e conferência profissional. <span>Dados locais, sem sincronização.</span></footer></main></div></div>'+sheetHTML();
 document.body.classList.toggle('has-sheet',!!sheet);
 document.querySelector('.shell')?.toggleAttribute('inert',!!sheet);
 document.querySelector('.skip-link')?.toggleAttribute('inert',!!sheet);
 if(sheet){const dialog=document.querySelector('[role="dialog"]');const target=dialog?.querySelector('form input:not([type="hidden"]), form select, form button, .icon-btn');target?.focus({preventScroll:true});}else if(focusReturnAction){const action=focusReturnAction;focusReturnAction=null;const element=[...document.querySelectorAll('[data-act]')].find(el=>el.dataset.act===action);(element||document.getElementById('main-content'))?.focus({preventScroll:true});}
}
function render(){document.title='ContaGi — Lançamentos e conciliação';if(!co()&&!['companies','settings'].includes(page))return layout('<div class="welcome"><div class="symbol">▣</div><h1>Organize os fechamentos de cada empresa.</h1><p>Cadastre seu primeiro cliente para importar extratos, classificar movimentações e gerar lançamentos contábeis.</p>'+btn('new-company','Cadastrar empresa','primary')+' '+btn('demo','Explorar com dados fictícios','subtle')+'</div>');
 const views={dashboard:dashboard,companies:companies,accounts:accounts,parties:partiesView,import:importView,movements:movements,entries:entries,reconcile:reconcile,reports:reports,settings:settings};
 layout((views[page]||dashboard)());
}
function dashboard(){
 const m=bankRows().filter(x=>x.date.startsWith(period)),posted=m.filter(x=>x.entryId),pending=m.filter(x=>!x.entryId),entries=journal().filter(x=>x.date.startsWith(period));
 const totalIn=m.filter(x=>x.amount>0).reduce((s,x)=>s+x.amount,0),totalOut=m.filter(x=>x.amount<0).reduce((s,x)=>s-x.amount,0);
 return header('Visão geral','Controle mensal de extratos e lançamentos, sem escrituração automática.',btn('import-page','Importar Excel','primary'))
 +'<div class="metrics">'+[['Movimentações',m.length,'Extratos importados'],['A contabilizar',pending.length,'Requer classificação'],['Contabilizados',posted.length,'Lançamentos vinculados'],['Entradas no banco',fmt(totalIn),'Total mensal'],['Saídas do banco',fmt(totalOut),'Total mensal']].map(([t,v,s])=>'<div class="metric"><span>'+t+'</span><strong>'+v+'</strong><small>'+s+'</small></div>').join('')+'</div>'
 +'<div class="cols">'+card('Seu fluxo de trabalho','<div class="steps"><div><b>01</b><strong>Receba o extrato</strong><span>CSV ou Excel do cliente</span></div><div><b>02</b><strong>Revise as colunas</strong><span>Layout salvo por empresa</span></div><div><b>03</b><strong>Classifique as contas</strong><span>Débito e crédito por operação</span></div><div><b>04</b><strong>Concilie e exporte</strong><span>Relatórios e CSV revisáveis</span></div></div>')
 +card('Prioridades deste mês','<div class="summaryline"><span>Movimentações sem lançamento</span><strong>'+pending.length+'</strong></div><div class="summaryline"><span>Lançamentos não vinculados</span><strong>'+entries.filter(x=>!x.movementId).length+'</strong></div><div class="summaryline"><span>Modelos cadastrados</span><strong>'+scoped('templates').length+'</strong></div><div class="section">'+btn('movements-page','Analisar pendências','outline')+'</div>')+'</div>';
}
function companies(){
 return header('Empresas','Cada cliente do escritório possui seu próprio plano de contas, layouts e dados.',btn('new-company','Nova empresa','primary'))
 +card('Clientes do escritório',table(['Empresa','Identificador','Contas','Extratos','Ações'],db.companies.map(c=>'<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.document||'—')+'</td><td>'+db.accounts.filter(a=>a.companyId===c.id).length+'</td><td>'+db.movements.filter(m=>m.companyId===c.id).length+'</td><td>'+btn('select-company:'+c.id,'Abrir','outline small')+'</td></tr>').join('')));
}
function accounts(){
 return header('Plano de contas','Códigos contábeis usados para classificar entradas e saídas; confira os códigos oficiais.',btn('new-account','Nova conta','primary')+' '+btn('export-accounts','Exportar CSV','outline'))
 +card('Contas da empresa',table(['Código','Conta contábil','Grupo','Ações'],ac().sort((a,b)=>a.code.localeCompare(b.code,'pt-BR',{numeric:true})).map(a=>'<tr><td><span class="mono">'+esc(a.code)+'</span></td><td>'+esc(a.name)+'</td><td>'+esc(TYPES[a.type])+'</td><td>'+btn('edit-account:'+a.id,'Editar','outline small')+'</td></tr>').join('')));
}
function importView(){
 let html=header('Importar extrato','Mapeie o arquivo do banco uma vez e reutilize o layout da empresa nos próximos meses.');
 html+='<div class="card pad"><div class="flow"><span class="step active">1. Arquivo</span><span class="step '+(importing?'active':'')+'">2. Mapeamento</span><span class="step '+(importing?'active':'')+'">3. Conferência</span></div><div class="upload"><strong>Arraste ou selecione o arquivo de extrato</strong><p>Excel .xlsx, CSV ou PDF textual (experimental) · até 10 MB · sem envio a servidor</p><label class="btn primary">Selecionar arquivo<input id="bankFile" type="file" accept=".xlsx,.csv,.pdf" hidden></label></div></div>';
 if(!importing)return html+card('Layouts salvos',scoped('templates').length?scoped('templates').map(t=>'<div class="summaryline"><span><b>'+esc(t.name)+'</b><small class="muted"> · '+esc(t.sheet)+'</small></span>'+btn('delete-template:'+t.id,'Excluir','ghost small')+'</div>').join(''):'<div class="pad muted">Nenhum modelo salvo. O primeiro mapeamento pode ser reutilizado depois.</div>');
 const s=importing.sheets[importing.sheet],headers=s.rows[importing.header-1]||[],preview=mapMovements(s.rows.slice(importing.header),importing.mapping,importing.header+1);
 const fieldNames={date:'Data *',description:'Histórico *',amount:'Valor com sinal',deposit:'Entradas',withdrawal:'Saídas',document:'Documento',party:'Favorecido / cliente'};
 const selects=Object.entries(fieldNames).map(([key,text])=>'<label class="field"><span>'+text+'</span><select data-map="'+key+'">'+opt(headers.map((v,i)=>[String(i),String.fromCharCode(65+i%26)+' · '+String(v).slice(0,45)]),importing.mapping[key]===undefined?'':String(importing.mapping[key]),'Não utilizado')+'</select></label>').join('');
 html+='<section class="card pad"><div class="form-layout"><label class="field"><span>Aba do Excel</span><select id="sheet">'+opt(importing.sheets.map((s,i)=>[String(i),s.name]),String(importing.sheet),'Selecione')+'</select></label><label class="field"><span>Linha do cabeçalho</span><input type="number" id="headerRow" min="1" max="40" value="'+importing.header+'"></label><label class="field"><span>Conta bancária</span><select id="bankAccount">'+accountOptions(importing.bankId)+'</select></label><label class="field"><span>Modelo de importação</span><select id="template">'+opt(scoped('templates').map(t=>[t.id,t.name]),importing.templateId||'','Detectar automaticamente')+'</select></label></div><div class="separator"></div><h2>Correspondência das colunas</h2><p class="muted">Escolha Data e Histórico. Informe Valor com sinal, ou Entradas e Saídas em colunas separadas.</p><div class="form-layout">'+selects+'</div><div class="form-layout form-bottom"><label class="field"><span>Nome do layout</span><input id="templateName" value="'+esc(importing.templateName||'')+'" placeholder="Ex.: Banco X · extrato mensal"></label><div class="inline end">'+btn('save-template','Salvar layout','outline')+'</div></div></section>';
 const valid=preview.filter(x=>!x.errors.length),errors=preview.filter(x=>x.errors.length);
 html+=card('Prévia de importação — '+preview.length+' linhas', '<div class="preview-head"><span class="pill good">'+valid.length+' válidas</span><span class="pill warn">'+errors.length+' com pendências</span><span class="muted">Arquivo: '+esc(importing.filename)+'</span></div>'
 +table(['Linha','Data','Histórico','Valor','Status'],preview.slice(0,60).map(x=>'<tr><td>'+x.rowNumber+'</td><td>'+esc(x.date||'—')+'</td><td>'+esc(x.description)+'</td><td class="'+(x.amount<0?'negative':'positive')+'">'+fmt(x.amount)+'</td><td>'+(x.errors.length?'<span class="pill warn">'+esc(x.errors.join(', '))+'</span>':'<span class="pill good">Válida</span>')+'</td></tr>').join(''))
 +'<div class="actions">'+btn('commit-import','Importar '+valid.length+' linhas válidas','primary')+' '+btn('cancel-import','Cancelar','outline')+'</div>');
 return html;
}
function movements(){
 const all=bankRows().filter(x=>x.date.startsWith(period)&&(!query||norm(x.description+' '+x.document).includes(norm(query))));
 const unposted=all.filter(x=>!x.entryId);
 const body=all.sort((a,b)=>a.date.localeCompare(b.date)).map(m=>{
  const suggested=suggestion(m,scoped('rules'),ac(),active);
  return '<tr><td>'+esc(m.date.split('-').reverse().join('/'))+'</td><td><b>'+esc(m.description)+'</b><div class="tiny muted">'+esc(m.document||m.source||'')+'</div></td><td class="'+(m.amount<0?'negative':'positive')+' nowrap">'+fmt(m.amount)+'</td><td>'+esc(label(m.bankAccountId))+'</td><td>'+(m.entryId?'<span class="pill good">Lançado</span>':'<span class="pill warn">Pendente</span>')+'</td><td>'+(!m.entryId?btn('post:'+m.id,suggested?'Revisar sugestão':'Contabilizar','primary small'):btn('entry:'+m.entryId,'Ver lançamento','outline small'))+'</td></tr>';
 }).join('');
 return header('Extratos bancários','Movimentações importadas. Cada linha exige uma conta de contrapartida para virar lançamento.',btn('manual-bank','Movimento manual','outline')+' '+btn('export-bank','Exportar CSV','outline'))
 +'<div class="metrics compact"><div class="metric"><span>Movimentos no mês</span><strong>'+all.length+'</strong></div><div class="metric"><span>Pendentes</span><strong>'+unposted.length+'</strong></div><div class="metric"><span>Contabilizados</span><strong>'+all.filter(x=>x.entryId).length+'</strong></div></div>'
 +card('Movimentações <span class="muted">('+all.length+')</span>','<div class="searchrow"><input id="query" placeholder="Pesquisar histórico ou documento" value="'+esc(query)+'"></div>'+table(['Data','Histórico','Valor','Conta bancária','Situação','Ação'],body));
}
function entries(){
 const es=journal().filter(x=>x.date.startsWith(period));
 return header('Lançamentos contábeis','Cada lançamento registra débito, crédito, valor, data e histórico.',btn('manual-entry','Lançamento manual','primary')+' '+btn('export-entries','Exportar CSV','outline'))
 +card('Diário do mês',table(['Data','Histórico','Débito','Crédito','Valor','Origem'],es.map(e=>'<tr><td>'+esc(e.date.split('-').reverse().join('/'))+'</td><td>'+esc(e.description)+'</td><td>'+esc(label(e.debitAccountId))+'</td><td>'+esc(label(e.creditAccountId))+'</td><td class="nowrap">'+fmt(e.amount)+'</td><td>'+esc(e.movementId?'Extrato':'Manual')+'</td></tr>').join('')));
}
function reconcile(){
 const ms=bankRows().filter(x=>x.date.startsWith(period)),es=journal().filter(x=>x.date.startsWith(period));
 const totalBank=ms.reduce((s,m)=>s+m.amount,0);
 const totalLedger=es.filter(e=>account(e.debitAccountId)||account(e.creditAccountId)).reduce((s,e)=>s+ac().filter(a=>a.type==='asset'&&/banco/i.test(a.name)).reduce((s,a)=>s+bankEffect(e,a.id),0),0);
 return header('Conciliação','Conferência de vínculos e movimentos; diferenças exigem investigação documental.')
 +'<div class="metrics compact"><div class="metric"><span>Extratos sem lançamento</span><strong>'+ms.filter(m=>!m.entryId).length+'</strong></div><div class="metric"><span>Vínculos confirmados</span><strong>'+ms.filter(m=>m.entryId).length+'</strong></div><div class="metric"><span>Movimentação bancária</span><strong>'+fmt(totalBank)+'</strong></div></div>'
 +card('Conferência das transações','<div class="notice">O vínculo criado na contabilização confirma apenas a correspondência daquele movimento. Para conciliação bancária integral, compare também saldos de abertura e encerramento e itens em trânsito.</div>'
 +table(['Data','Documento / histórico','Extrato','Lançamento','Status'],ms.map(m=>{const e=es.find(e=>e.id===m.entryId);return '<tr><td>'+esc(m.date)+'</td><td>'+esc(m.description)+'</td><td>'+fmt(m.amount)+'</td><td>'+esc(e?e.id.slice(0,8):'—')+'</td><td><span class="pill '+(e?'good':'warn')+'">'+(e?'Vinculado':'Pendente')+'</span></td></tr>'}).join('')))
  +controlsComparison()+'<p class="help">Referência informativa: soma de movimentos do extrato '+fmt(totalBank)+'; movimento do razão em contas bancárias identificadas por nome '+fmt(totalLedger)+'. Não equiparar esses totais à conciliação completa.</p>';
}
function reports(){
 const {rows,assets,liabilities,equity,profit,monthlyProfit,revenue,expense,totalDebits,totalCredits}=report(ac(),journal(),monthEnd(),period);
 const diff=assets-liabilities-equity-profit;
 return header('Relatórios preliminares','Balancete por partidas dobradas e DRE simplificada. Requer conferência do contador.',btn('export-trial','Exportar balancete','outline'))
 +'<div class="metrics"><div class="metric"><span>Receita do mês</span><strong>'+fmt(revenue)+'</strong></div><div class="metric"><span>Despesa do mês</span><strong>'+fmt(expense)+'</strong></div><div class="metric"><span>Resultado mensal</span><strong>'+fmt(monthlyProfit)+'</strong></div><div class="metric"><span>Diferença patrimonial</span><strong class="'+(diff?'negative':'positive')+'">'+fmt(diff)+'</strong></div></div>'
 +card('Balancete acumulado até '+esc(period),table(['Código','Conta','Débitos','Créditos','Saldo pela natureza'],rows.map(a=>'<tr><td class="mono">'+esc(a.code)+'</td><td>'+esc(a.name)+'</td><td>'+fmt(a.debit)+'</td><td>'+fmt(a.credit)+'</td><td>'+fmt(a.balance)+'</td></tr>').join(''))
 +'<div class="summaryline"><b>Total débitos</b><strong>'+fmt(totalDebits)+'</strong></div><div class="summaryline"><b>Total créditos</b><strong>'+fmt(totalCredits)+'</strong></div>')
 +card('Balanço simplificado','<div class="pad"><div class="summaryline"><span>Ativo</span><b>'+fmt(assets)+'</b></div><div class="summaryline"><span>Passivo</span><b>'+fmt(liabilities)+'</b></div><div class="summaryline"><span>Patrimônio líquido</span><b>'+fmt(equity)+'</b></div><div class="summaryline"><span>Resultado acumulado (sem encerramento)</span><b>'+fmt(profit)+'</b></div><div class="summaryline"><b>Diferença de consistência</b><b>'+fmt(diff)+'</b></div></div>');
}

function partiesView(){
 const parties=scoped('parties'),titles=scoped('titles').filter(t=>t.date<=monthEnd());
 const opens=titles.map(t=>({...t,outstanding:titleOutstanding(t,monthEnd())})).filter(t=>t.outstanding>0);
 return header('Clientes, fornecedores e títulos','Composição auxiliar por documento, data e terceiro. Baixas não geram lançamentos automaticamente.',btn('new-party','Novo terceiro','outline')+' '+btn('new-title','Novo título','primary')+' '+btn('export-titles','Exportar CSV','outline'))
 +'<div class="metrics compact"><div class="metric"><span>Terceiros cadastrados</span><strong>'+parties.length+'</strong></div><div class="metric"><span>Clientes a receber</span><strong>'+fmt(opens.filter(t=>t.type==='receivable').reduce((s,t)=>s+t.outstanding,0))+'</strong></div><div class="metric"><span>Fornecedores a pagar</span><strong>'+fmt(opens.filter(t=>t.type==='payable').reduce((s,t)=>s+t.outstanding,0))+'</strong></div></div>'
 +card('Composição dos títulos em aberto',table(['Terceiro','Documento','Tipo','Emissão','Vencimento','Saldo','Ações'],opens.map(t=>'<tr><td>'+esc(parties.find(p=>p.id===t.partyId)?.name||'—')+'</td><td>'+esc(t.document)+'</td><td>'+esc(t.type==='receivable'?'A receber':'A pagar')+'</td><td>'+esc(t.date)+'</td><td>'+esc(t.dueDate||'—')+'</td><td>'+fmt(t.outstanding)+'</td><td>'+btn('settle:'+t.id,'Registrar baixa','primary small')+'</td></tr>').join('')))
 +card('Cadastro de terceiros',table(['Nome','Tipo','Documento'],parties.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(p.kind==='customer'?'Cliente':'Fornecedor')+'</td><td>'+esc(p.document||'—')+'</td></tr>').join('')))
 +'<div class="notice">Os títulos são controles auxiliares. Para que o razão contábil reflita a obrigação ou o direito, registre os lançamentos correspondentes e confira a conciliação.</div>';
}
function controlsComparison(){
 const titles=scoped('titles'),totals=controlTotals(titles,monthEnd());
 const trial=report(ac(),journal(),monthEnd(),period);
 const findCode=code=>trial.rows.find(a=>a.code===code);
 const clients=findCode('1.1.03'),suppliers=findCode('2.1.01');
 const items=[['Clientes a receber',clients?.balance??null,totals.receivable],['Fornecedores a pagar',suppliers?.balance??null,totals.payable]];
 return card('Conciliação auxiliar de clientes e fornecedores','<div class="notice">Compare o saldo dos títulos com o razão. A comparação usa as contas-padrão 1.1.03 e 2.1.01; ajuste os códigos caso o plano da empresa seja diferente.</div>'
 +table(['Conta controle','Razão contábil','Composição auxiliar','Diferença'],items.map(([name,ledger,sub])=>'<tr><td>'+name+'</td><td>'+(ledger===null?'Conta não cadastrada':fmt(ledger))+'</td><td>'+fmt(sub)+'</td><td class="'+(ledger!==null&&ledger!==sub?'negative':'positive')+'">'+(ledger===null?'Não comparável':fmt(ledger-sub))+'</td></tr>').join('')));
}

function settings(){
 return header('Backup e regras','Regras são sugestões locais, não decisões contábeis automáticas.',btn('backup','Baixar backup JSON','primary'))
 +'<div class="cols">'+card('Regras por palavra-chave','<div class="pad"><p class="muted">Uma regra é aplicada apenas ao cliente atual e pode ser descartada sem afetar lançamentos existentes.</p>'+btn('new-rule','Nova regra','outline')+scoped('rules').map(r=>'<div class="summaryline"><span><b>'+esc(r.term)+'</b><small class="muted"> → '+esc(label(r.accountId))+'</small></span>'+btn('remove-rule:'+r.id,'Excluir','ghost small')+'</div>').join('')+'</div>')
 +card('Proteção dos dados','<div class="pad"><p>O conteúdo fica no armazenamento do navegador e não é enviado ao GitHub. Limpar dados do navegador pode apagá-lo permanentemente.</p><div class="actions"><label class="btn outline">Restaurar backup<input id="restore" type="file" accept=".json" hidden></label>'+btn('demo','Adicionar demonstração fictícia','outline')+'</div><div class="actions">'+btn('clear','Apagar todos os dados locais','danger')+'</div></div>')+'</div>'
 +card('Auditoria básica',table(['Data','Operação','Descrição'],db.audit.filter(x=>x.companyId===active).slice(0,50).map(a=>'<tr><td>'+esc(a.date.slice(0,16).replace('T',' '))+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.detail)+'</td></tr>').join('')));
}
function input(name,label,type='text',value='',required=true){return '<label class="field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>'}
function pick(name,label,options,required=true){return '<label class="field"><span>'+label+'</span><select name="'+name+'" '+(required?'required':'')+'>'+options+'</select></label>'}
function sheetHTML(){
 if(!sheet)return '';
 if(sheet.kind==='confirm'){
  return '<div class="sheet-layer"><button type="button" class="sheet-backdrop" data-act="close" aria-label="Cancelar confirmação"></button><section class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-heading" aria-describedby="sheet-description"><header class="sheet-header"><div class="sheet-heading"><h2 id="sheet-heading">'+esc(sheet.title)+'</h2><p class="sheet-description" id="sheet-description">Confira os detalhes antes de prosseguir.</p></div><button class="icon-btn" type="button" aria-label="Cancelar confirmação" data-act="close">×</button></header><div class="sheet-confirm-content"><p class="sheet-confirm-message">'+esc(sheet.message)+'</p></div><div class="sheet-actions">'+btn('close','Cancelar','outline')+'<button type="button" data-act="confirm-yes" class="btn '+(sheet.destructive?'danger':'primary')+'">Confirmar</button></div></section></div>';
 }
 const {kind,id}=sheet,m=bankRows().find(x=>x.id===id),a=ac().find(x=>x.id===id);
 let title='',body='',help='',action=kind;
 if(kind==='company'){title='Cadastrar empresa';body=input('name','Nome da empresa')+input('document','CNPJ ou identificação','text','',false)}
 if(kind==='account'||kind==='edit-account'){title=kind==='account'?'Nova conta':'Editar conta';body=input('code','Código contábil','text',a?.code||'')+input('name','Nome','text',a?.name||'')+pick('type','Grupo',opt(Object.entries(TYPES),a?.type||'asset','Grupo'))}
 if(kind==='manual-bank'){title='Movimentação bancária manual';body=input('date','Data','date',localToday())+input('description','Histórico')+input('document','Referência','text','',false)+input('amount','Valor com sinal (R$)','text','',true)+pick('bankAccountId','Conta do banco',accountOptions())}
 if(kind==='post'&&m){
   const sug=suggestion(m,scoped('rules'),ac(),active);
   title='Classificar movimentação';
   help='<div class="posting"><div><small>Movimentação de extrato</small><strong>'+esc(m.description)+'</strong><span class="'+(m.amount<0?'negative':'positive')+'">'+fmt(m.amount)+'</span></div><div><small>Conta bancária</small><strong>'+esc(label(m.bankAccountId))+'</strong></div><div><small>Lançamento proposto</small><strong>'+(m.amount<0?'D contrapartida · C banco':'D banco · C contrapartida')+'</strong></div></div>';
   body=pick('counterpartId','Conta de contrapartida',accountOptions(sug?.id||'',m.bankAccountId))
    +'<label class="check"><input type="checkbox" name="saveRule"> Salvar regra de sugestão para próximos meses</label>'
    +input('ruleTerm','Palavra-chave da regra (opcional)','text',m.description.split(/\s+/).slice(0,3).join(' '),false);
 }
 if(kind==='manual-entry'){title='Lançamento manual';body=input('date','Data','date',localToday())+input('description','Histórico')+input('document','Documento','text','',false)+input('amount','Valor (R$)')+pick('debit','Conta de débito',accountOptions())+pick('credit','Conta de crédito',accountOptions())}

 if(kind==='party'){title='Cadastrar terceiro';body=input('name','Nome do terceiro')+pick('kind','Tipo',opt([['customer','Cliente'],['supplier','Fornecedor']],'customer'))+input('document','CPF/CNPJ ou identificação','text','',false)}
 if(kind==='title'){
  title='Novo título a receber ou pagar';
  const third=scoped('parties').map(p=>[p.id,p.name+' · '+(p.kind==='customer'?'Cliente':'Fornecedor')]);
  body=pick('partyId','Cliente ou fornecedor',opt(third,'','Selecione'))+pick('type','Natureza do título',opt([['receivable','A receber'],['payable','A pagar']],'receivable'))+input('document','Documento / nota')+input('date','Data de emissão','date',localToday())+input('dueDate','Vencimento','date',localToday())+input('amount','Valor (R$)');
 }
 if(kind==='settle'){
  const titleRec=scoped('titles').find(t=>t.id===id);
  title='Registrar baixa de título';
  help='<div class="notice">Documento '+esc(titleRec?.document)+' · Saldo em aberto '+fmt(titleOutstanding(titleRec,monthEnd()))+'. A baixa atualiza o auxiliar, não a escrituração.</div>';
  body=input('date','Data da baixa','date',localToday())+input('amount','Valor pago/recebido (R$)');
 }
 if(kind==='rule'){title='Nova regra de sugestão';body=input('term','Palavra-chave')+pick('accountId','Conta sugerida',accountOptions())}
 const descriptions={company:'Cadastre uma empresa e inicie seu plano de contas.',account:'Defina código, descrição e classificação da conta.','edit-account':'Atualize os dados da conta contábil.','manual-bank':'Registre a movimentação da conta bancária.',post:'Confira débito, crédito e contrapartida antes de salvar.','manual-entry':'Informe os dados do lançamento por partidas dobradas.',party:'Identifique o cliente ou fornecedor.',title:'Cadastre o documento e a data de vencimento.',settle:'Registre a baixa no controle auxiliar.',rule:'Defina uma regra de sugestão para os próximos extratos.'};
 const description=descriptions[kind]||'Preencha e revise as informações.';
 return '<div class="sheet-layer"><button type="button" class="sheet-backdrop" data-act="close" aria-label="Fechar painel lateral"></button><section class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-heading" aria-describedby="sheet-description"><header class="sheet-header"><div class="sheet-heading"><h2 id="sheet-heading">'+esc(title)+'</h2><p class="sheet-description" id="sheet-description">'+esc(description)+'</p></div><button class="icon-btn" type="button" aria-label="Fechar painel lateral" data-act="close">×</button></header><form id="editor" class="sheet-form" data-kind="'+action+'" data-id="'+esc(id||'')+'"><div class="sheet-scroll">'+help+'<div class="form-layout pad">'+body+'</div></div><div class="sheet-actions">'+btn('close','Cancelar','outline')+'<button type="submit" class="btn primary">Salvar</button></div></form></section></div>';
}
function exportFile(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function exportCSV(kind){
 let head=[],rows=[];
 if(kind==='accounts'){head=['Código','Conta','Grupo'];rows=ac().map(x=>[x.code,x.name,TYPES[x.type]])}
 if(kind==='bank'){head=['Data','Histórico','Documento','Valor (R$)','Código banco','Status'];rows=bankRows().filter(x=>x.date.startsWith(period)).map(x=>[x.date,x.description,x.document,decimal(x.amount),account(x.bankAccountId)?.code,x.entryId?'Lançado':'Pendente'])}
 if(kind==='entries'){head=['Data','Histórico','Documento','Código débito','Código crédito','Valor (R$)'];rows=journal().filter(x=>x.date.startsWith(period)).map(x=>[x.date,x.description,x.document,account(x.debitAccountId)?.code,account(x.creditAccountId)?.code,decimal(x.amount)])}
 if(kind==='titles'){head=['Terceiro','Tipo','Documento','Emissão','Vencimento','Valor (R$)','Saldo (R$)'];rows=scoped('titles').filter(t=>t.date<=monthEnd()).map(t=>[scoped('parties').find(p=>p.id===t.partyId)?.name||'',t.type,t.document,t.date,t.dueDate,decimal(t.amount),decimal(titleOutstanding(t,monthEnd()))])}
 if(kind==='trial'){const r=report(ac(),journal(),monthEnd(),period);head=['Código','Conta','Tipo','Débitos (R$)','Créditos (R$)','Saldo (R$)'];rows=r.rows.map(x=>[x.code,x.name,TYPES[x.type],decimal(x.debit),decimal(x.credit),decimal(x.balance)])}
 exportFile('contagi-'+kind+'-'+period+'.csv',csvExport(head,rows),'text/csv;charset=utf-8');
}
function seed(){
 const id=uid();db.companies.push({id,name:'Empresa Exemplo Ltda. (FICTÍCIA)',document:''});db.accounts.push(...DEFAULTS.map(([code,name,type])=>({id:uid(),companyId:id,code,name,type})));
 active=id;localStorage.setItem(KEY+'.company',id);
 const bank=db.accounts.find(x=>x.companyId===id&&x.code==='1.1.01');
 const today=period+'-10';db.movements.push({id:uid(),companyId:id,date:today,description:'PIX fornecedor de serviços (exemplo)',document:'EX-01',amount:-25000,bankAccountId:bank.id,entryId:'',source:'DEMO',sourceId:uid()});
 save('DEMO','Empresa e movimento fictícios');go('movements');notify('Demonstração fictícia criada.');
}
async function readFile(file){
 if(!file||!co())return;
 if(file.size>10_000_000){notify('Arquivo maior que 10 MB.',true);return}
 try{
  let sheets=[],fingerprint='';const bytes=await file.arrayBuffer();
  if(globalThis.crypto?.subtle){const b=await crypto.subtle.digest('SHA-256',bytes);fingerprint=Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  else fingerprint=file.name+'-'+file.size+'-'+file.lastModified;
  if(/\.csv$/i.test(file.name)){
    let source;try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{source=new TextDecoder('windows-1252').decode(bytes)}
    sheets=[{name:'CSV',rows:csvParse(source)}];
  }else if(/\.xlsx$/i.test(file.name)){
    if(!window.XLSX){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';script.onload=resolve;script.onerror=()=>reject(Error('Falha ao carregar biblioteca XLSX'));document.head.append(script)})}
    const wb=window.XLSX.read(new Uint8Array(bytes),{type:'array',cellDates:false});
    sheets=wb.SheetNames.map(name=>({name,rows:window.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:false,defval:''})}));
  }else if(/\.pdf$/i.test(file.name)){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
    const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise;
    if(pdf.numPages>35)throw Error('PDF muito longo. Limite de 35 páginas.');
    const data=[['Data','Histórico','Valor']];for(let p=1;p<=pdf.numPages;p++){
      const content=await (await pdf.getPage(p)).getTextContent();
      const text=content.items.map(x=>x.str).join(' ');
      const pattern=/(\d{2}[\/.-]\d{2}[\/.-]\d{4})\s+(.+?)\s+(-?\d[\d.,]*)(?=\s+\d{2}[\/.-]\d{2}[\/.-]\d{4}|$)/g;
      for(const m of text.matchAll(pattern))data.push([m[1],m[2].trim(),m[3]]);
    }
    if(data.length===1)throw Error('O PDF não corresponde ao padrão textual suportado ou é escaneado. Exporte para Excel.');
    sheets=[{name:'PDF textual',rows:data}];
  }else throw Error('Formato não suportado. Use XLSX, CSV ou PDF com texto.');
  if(!sheets.length||sheets.every(x=>x.rows.length<2))throw Error('Arquivo sem registros tabulares.');
  if(sheets.some(s=>s.rows.length>12000))throw Error('Arquivo acima de 12 mil linhas. Separe por mês.');
  const first=sheets[0],headers=first.rows[0].map(norm).join('|');
  const template=scoped('templates').find(t=>t.fingerprint===headers&&t.sheet===first.name);
  importing={filename:file.name,fingerprint,sheets,sheet:0,header:template?.header||1,mapping:template?{...template.mapping}:detect(first.rows[0]),bankId:template?.bankId||ac().find(x=>/banco/i.test(x.name))?.id||'',templateId:template?.id||'',templateName:template?.name||''};
  go('import');notify(template?'Modelo de colunas reaplicado. Confira a prévia.':'Arquivo lido. Configure as colunas antes de importar.');
 }catch(e){notify('Não foi possível ler o arquivo: '+e.message,true)}
}
function saveTemplate(){
 if(!importing)return;
 const s=importing.sheets[importing.sheet],name=document.getElementById('templateName')?.value.trim();
 if(!name){notify('Informe o nome do modelo.',true);return}
 const fingerprint=s.rows[importing.header-1].map(norm).join('|');
 const t=scoped('templates').find(x=>x.id===importing.templateId||x.name===name);
 if(t)Object.assign(t,{name,sheet:s.name,header:importing.header,mapping:{...importing.mapping},bankId:importing.bankId,fingerprint});
 else{const item={id:uid(),companyId:active,name,sheet:s.name,header:importing.header,mapping:{...importing.mapping},bankId:importing.bankId,fingerprint};db.templates.push(item);importing.templateId=item.id}
 if(save('TEMPLATE','Layout de importação salvo: '+name))notify('Layout salvo para reutilização na próxima importação.');
}
function commitImport(){
 if(!importing||!importing.bankId||!account(importing.bankId))return notify('Selecione a conta bancária.',true);
 const m=importing.mapping;if(m.date===undefined||m.description===undefined||(m.amount===undefined&&(m.deposit===undefined||m.withdrawal===undefined)))return notify('Mapeie Data, Histórico e Valor ou Entrada/Saída.',true);
 const source=importing,tab=source.sheets[source.sheet],items=mapMovements(tab.rows.slice(source.header),m,source.header+1);
 const valid=items.filter(x=>!x.errors.length),bad=items.length-valid.length;
 if(!valid.length)return notify('Nenhuma linha válida. Confira o layout.',true);
 requestConfirmation('Revisar importação',valid.length+' movimentações serão importadas. '+bad+' linhas com erro serão ignoradas. Nenhum lançamento contábil será aprovado automaticamente.',()=>{
  let added=0,duplicates=0;
  for(const x of valid){
   const sourceId=source.fingerprint+'|'+tab.name+'|'+x.rowNumber;
   if(bankRows().some(m=>m.sourceId===sourceId)){duplicates++;continue}
   db.movements.push({id:uid(),companyId:active,date:x.date,description:x.description,document:x.document,party:x.party,amount:x.amount,bankAccountId:source.bankId,entryId:'',source:source.filename,sourceId});added++;
  }
  if(save('IMPORT','Importados '+added+' movimentos, '+duplicates+' duplicados, '+bad+' inválidos')){importing=null;go('movements');notify('Importação concluída: '+added+' novos, '+duplicates+' duplicados e '+bad+' inválidos.')}
 });
}
function restore(file){
 if(!file)return;
 if(file.size>8_000_000)return notify('O backup excede 8 MB.',true);
 file.text().then(t=>{
  const candidate=JSON.parse(t);
  if(candidate.version!==1||!['companies','accounts','movements','entries','templates','rules','audit'].every(x=>Array.isArray(candidate[x])))throw Error('Formato incompatível');
  requestConfirmation('Substituir dados locais','Todos os cadastros, movimentos e lançamentos atuais serão substituídos pelo backup selecionado. Faça backup antes de confirmar.',()=>{
   const old=db;db={...newDB(),...candidate};
   if(!save('RESTORE','Backup restaurado')){db=old;return}
   active=db.companies[0]?.id||'';localStorage.setItem(KEY+'.company',active);go('dashboard');notify('Backup restaurado');
  },true);
 }).catch(e=>notify('Backup inválido: '+e.message,true));
}
function onAction(action){
 if(action==='theme-light'||action==='theme-dark'){theme=action.slice(6);localStorage.setItem(THEME_KEY,theme);render();return}
 if(action==='close'){sheet=null;sheetConfirmFn=null;render();return}
 if(action==='confirm-yes'){const callback=sheetConfirmFn;sheetConfirmFn=null;sheet=null;render();callback?.();return}
 if(action==='demo')return seed();
 if(action==='new-company'){sheet={kind:'company'};render();return}
 if(action==='new-account'){sheet={kind:'account'};render();return}
 if(action==='new-party'){sheet={kind:'party'};render();return}
 if(action==='new-title'){if(!scoped('parties').length)return notify('Cadastre um cliente ou fornecedor antes do título.',true);sheet={kind:'title'};render();return}
 if(action.startsWith('settle:')){const t=scoped('titles').find(x=>x.id===action.split(':')[1]);if(!t)return;sheet={kind:'settle',id:t.id};render();return}
 if(action.startsWith('edit-account:')){sheet={kind:'edit-account',id:action.split(':')[1]};render();return}
 if(action==='manual-bank'){sheet={kind:'manual-bank'};render();return}
 if(action==='manual-entry'){sheet={kind:'manual-entry'};render();return}
 if(action==='new-rule'){sheet={kind:'rule'};render();return}
 if(action.startsWith('post:')){const m=bankRows().find(x=>x.id===action.split(':')[1]);if(!m||m.entryId)return notify('Movimento indisponível ou já contabilizado.',true);sheet={kind:'post',id:m.id};render();return}
 if(action.startsWith('entry:'))return go('entries');
 if(action==='import-page')return go('import');
 if(action==='movements-page')return go('movements');
 if(action==='cancel-import'){importing=null;render();return}
 if(action==='save-template')return saveTemplate();
 if(action==='commit-import')return commitImport();
 if(action==='backup')return exportFile('contagi-backup-'+localToday()+'.json',JSON.stringify(db,null,2),'application/json');
 if(action.startsWith('export-'))return exportCSV(action.slice(7));
 if(action.startsWith('select-company:')){active=action.split(':')[1];localStorage.setItem(KEY+'.company',active);go('dashboard');return}
 if(action.startsWith('delete-template:')){
  const id=action.split(':')[1];requestConfirmation('Excluir layout','O modelo de colunas será excluído apenas desta empresa. Os movimentos já importados permanecerão.',()=>{
   db.templates=db.templates.filter(x=>x.id!==id||x.companyId!==active);save('DELETE','Layout excluído');render();
  },true);return;
 }
 if(action.startsWith('remove-rule:')){
  const id=action.split(':')[1];requestConfirmation('Excluir regra','A sugestão de classificação será removida. Os lançamentos anteriores não serão alterados.',()=>{
   db.rules=db.rules.filter(x=>x.id!==id||x.companyId!==active);save('DELETE','Regra excluída');render();
  },true);return;
 }
 if(action==='clear'){
  requestConfirmation('Apagar dados locais','Esta ação exclui todos os cadastros, títulos, extratos, lançamentos e regras deste navegador. Não poderá ser desfeita. Exporte o backup JSON antes de continuar.',()=>{
   db=newDB();active='';localStorage.removeItem(KEY);localStorage.removeItem(KEY+'.company');go('dashboard');notify('Dados locais excluídos.');
  },true);return;
 }
}
function onSave(form){
 const fd=new FormData(form),v=k=>String(fd.get(k)||'').trim(),kind=form.dataset.kind,id=form.dataset.id;
 if(kind==='company'){
  if(!v('name'))return notify('Informe o nome da empresa.',true);
  const companyId=uid();db.companies.push({id:companyId,name:v('name'),document:v('document')});
  db.accounts.push(...DEFAULTS.map(([code,name,type])=>({id:uid(),companyId,code,name,type})));
  active=companyId;localStorage.setItem(KEY+'.company',active);
 }
 if(kind==='account'||kind==='edit-account'){
  if(!v('code')||!v('name')||!TYPES[v('type')])return notify('Informe código, nome e grupo.',true);
  if(ac().some(a=>a.code===v('code')&&a.id!==id))return notify('Código já cadastrado.',true);
  const old=ac().find(a=>a.id===id);
  if(old)Object.assign(old,{code:v('code'),name:v('name'),type:v('type')});
  else db.accounts.push({id:uid(),companyId:active,code:v('code'),name:v('name'),type:v('type')});
 }
 if(kind==='manual-bank'){
  const amount=cents(v('amount'));
  if(!dateISO(v('date'))||!amount||!v('description')||!account(v('bankAccountId')))return notify('Movimentação inválida.',true);
  db.movements.push({id:uid(),companyId:active,date:v('date'),description:v('description'),document:v('document'),amount,bankAccountId:v('bankAccountId'),entryId:'',source:'manual',sourceId:uid()});
 }
 if(kind==='post'){
  const m=bankRows().find(x=>x.id===id),counterpart=account(v('counterpartId'));
  if(!m||m.entryId||!counterpart||m.bankAccountId===counterpart.id)return notify('Selecione uma contrapartida válida.',true);
  const entry=createEntry(m,m.bankAccountId,counterpart.id,active);
  const storeRule=fd.get('saveRule')==='on',ruleTerm=v('ruleTerm').slice(0,100);
  requestConfirmation('Confirmar lançamento','Débito: '+label(entry.debitAccountId)+'\nCrédito: '+label(entry.creditAccountId)+'\nValor: '+fmt(entry.amount)+'\n\nO lançamento será registrado no diário desta empresa.',()=>{
   if(m.entryId)return notify('Movimentação já contabilizada.',true);
   db.entries.push(entry);m.entryId=entry.id;
   if(storeRule&&ruleTerm){
    const found=scoped('rules').find(r=>norm(r.term)===norm(ruleTerm));
    if(found)found.accountId=counterpart.id;
    else db.rules.push({id:uid(),companyId:active,term:ruleTerm,accountId:counterpart.id});
   }
   if(save('POST','Lançamento vinculado ao extrato')){go('movements');notify('Lançamento confirmado e vinculado ao extrato.')}
  });return;
 }
 if(kind==='manual-entry'){
  const amount=cents(v('amount'));
  if(!dateISO(v('date'))||!v('description')||!amount||amount<=0||!account(v('debit'))||!account(v('credit'))||v('debit')===v('credit'))return notify('Informe valor positivo e duas contas distintas.',true);
  db.entries.push({id:uid(),companyId:active,movementId:'',date:v('date'),description:v('description'),document:v('document'),amount,debitAccountId:v('debit'),creditAccountId:v('credit'),status:'approved'});
 }

 if(kind==='party'){
  if(!v('name')||!['customer','supplier'].includes(v('kind')))return notify('Informe nome e tipo do terceiro.',true);
  db.parties.push({id:uid(),companyId:active,name:v('name'),kind:v('kind'),document:v('document')});
 }
 if(kind==='title'){
  const amount=cents(v('amount')),party=scoped('parties').find(p=>p.id===v('partyId'));
  if(!party||!['receivable','payable'].includes(v('type'))||!v('document')||!dateISO(v('date'))||!dateISO(v('dueDate'))||amount===null||amount<=0)return notify('Documento, terceiro, datas e valor são obrigatórios.',true);
  db.titles.push({id:uid(),companyId:active,partyId:party.id,type:v('type'),document:v('document'),date:v('date'),dueDate:v('dueDate'),amount,payments:[]});
 }
 if(kind==='settle'){
  const titleRec=scoped('titles').find(t=>t.id===id),amount=cents(v('amount'));
  if(!titleRec||!dateISO(v('date'))||!amount||amount<=0)return notify('Informe uma data e valor positivo.',true);
  if(v('date')<titleRec.date)return notify('A baixa não pode anteceder a emissão.',true);
  const paid=titleRec.payments.reduce((s,p)=>s+p.amount,0);
  if(paid+amount>titleRec.amount)return notify('Baixa maior que o saldo do título.',true);
  titleRec.payments.push({id:uid(),date:v('date'),amount});
 }
 if(kind==='rule'){
  if(!v('term')||!account(v('accountId')))return notify('Informe a palavra-chave e a conta.',true);
  db.rules.push({id:uid(),companyId:active,term:v('term').slice(0,100),accountId:v('accountId')});
 }
 if(save(kind,'Registro salvo: '+kind)){sheet=null;render();notify('Alteração salva com sucesso.')}
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-page],[data-act]');if(!target)return;
 if(target.dataset.page){go(target.dataset.page);return}
 e.preventDefault();if(target.dataset.act&&/^(new-|manual-|post:|settle:|edit-account:)/.test(target.dataset.act))focusReturnAction=target.dataset.act;onAction(target.dataset.act);
});
document.addEventListener('submit',e=>{if(e.target.id!=='editor')return;e.preventDefault();onSave(e.target)});
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.id==='activeCompany'){active=t.value;localStorage.setItem(KEY+'.company',active);go('dashboard');return}
 if(t.id==='month'){if(!/^\d{4}-\d{2}$/.test(t.value))return;period=t.value;localStorage.setItem(KEY+'.period',period);render();return}
 if(t.id==='bankFile'){readFile(t.files[0]);return}
 if(t.id==='restore'){restore(t.files[0]);return}
 if(!importing)return;
 if(t.id==='sheet'){importing.sheet=Number(t.value);importing.header=1;importing.mapping=detect(importing.sheets[importing.sheet].rows[0]);importing.templateId='';render();return}
 if(t.id==='headerRow'){importing.header=Math.max(1,Math.min(40,Number(t.value)||1));importing.mapping=detect(importing.sheets[importing.sheet].rows[importing.header-1]||[]);render();return}
 if(t.id==='template'){
  const mod=scoped('templates').find(x=>x.id===t.value);
  if(mod){const s=importing.sheets.findIndex(s=>s.name===mod.sheet);if(s>=0)importing.sheet=s;importing.header=mod.header;importing.mapping={...mod.mapping};importing.bankId=mod.bankId;importing.templateId=mod.id;importing.templateName=mod.name}
  render();return;
 }
 if(t.id==='bankAccount'){importing.bankId=t.value;render();return}
 if(t.dataset.map){
  const key=t.dataset.map;if(t.value==='')delete importing.mapping[key];else importing.mapping[key]=Number(t.value);render();
 }
});
document.addEventListener('input',e=>{if(e.target.id!=='query')return;const pos=e.target.selectionStart;query=e.target.value;render();const t=document.getElementById('query');t?.focus();t?.setSelectionRange(pos,pos)});
document.addEventListener('keydown',event=>{if(!sheet)return;const dialog=document.querySelector('[role="dialog"]');if(!dialog)return;if(event.key==='Escape'){event.preventDefault();sheet=null;render();return}if(event.key!=='Tab')return;const nodes=[...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')].filter(el=>el.getClientRects().length>0);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}});
window.addEventListener('storage',e=>{if(e.key===KEY)stale=true});
render();
