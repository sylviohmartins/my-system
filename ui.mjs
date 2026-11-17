/* Componentes compartilhados do ContaGi. Funções puras: nenhum estado global. */
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allow=new Set(['layout-dashboard','building-2','calendar-days','file-up','arrow-left-right','notebook-pen','scale','users-round','list-tree','chart-column','settings','panel-left-close','panel-left-open','menu','chevron-down','moon','sun','shield-check','download','plus','search','circle-help','circle-check','circle-alert','file-spreadsheet','file-text','database','cloud-upload','scan-line','book-open','receipt','history','ellipsis','check','x','folder-open','arrow-up-right','circle-dot','rotate-ccw','sliders-horizontal']);
export const NAV_GROUPS=[
 {label:'VISÃO GERAL',items:[{id:'dashboard',name:'Painel',icon:'layout-dashboard'}]},
 {label:'ESCRITURAÇÃO',items:[{id:'import',name:'Importar arquivos',icon:'file-up'},{id:'movements',name:'Movimentações',icon:'arrow-left-right'},{id:'entries',name:'Lançamentos',icon:'notebook-pen'},{id:'reconcile',name:'Conciliação',icon:'scale'}]},
 {label:'CADASTROS',items:[{id:'companies',name:'Empresas',icon:'building-2'},{id:'accounts',name:'Plano de contas',icon:'list-tree'},{id:'parties',name:'Clientes e fornecedores',icon:'users-round'}]},
 {label:'ANÁLISES',items:[{id:'reports',name:'Relatórios',icon:'chart-column'}]}
];
export function Icon(name,extra=''){
 const id=allow.has(name)?name:'circle-dot';
 return '<svg class="ui-icon '+escapeHTML(extra)+'" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><use href="./assets/icons.svg#'+id+'"></use></svg>';
}
export function Button(action,label,kind=''){
 const classes=('btn '+kind).trim().replace(/[^a-zA-Z0-9 _-]/g,'');
 return '<button type="button" class="'+classes+'" data-act="'+escapeHTML(action)+'">'+escapeHTML(label)+'</button>';
}
export function Card(title,body,actions=''){
 return '<section class="card ui-card"><div class="card-head"><h2>'+title+'</h2></div><div class="card-content">'+body+'</div>'
  +(actions?'<div class="card-footer">'+actions+'</div>':'')+'</section>';
}
export function MetricCard(label,value,hint=''){
 return '<article class="metric"><span>'+escapeHTML(label)+'</span><strong>'+escapeHTML(value)+'</strong><small>'+escapeHTML(hint)+'</small></article>';
}
export function PageHeader(title,subtitle,actions='',context=''){
 return '<div class="heading"><div>'+(context?'<p class="overline">'+escapeHTML(context)+'</p>':'')+'<h1>'+escapeHTML(title)+'</h1><p class="muted">'+escapeHTML(subtitle)+'</p></div>'
  +(actions?'<div class="page-actions">'+actions+'</div>':'')+'</div>';
}
export function DataTable(headers,rows){
 return '<div class="table-scroll" role="region" tabindex="0" aria-label="Tabela de dados, use a navegação horizontal se necessário"><table class="data-cols-'+headers.length+(['Ação','Ações'].includes(headers.at(-1))?' table-with-actions':'')+'"><thead><tr>'
 +headers.map(h=>'<th scope="col">'+escapeHTML(h)+'</th>').join('')+'</tr></thead><tbody>'
 +(rows||'<tr><td colspan="'+headers.length+'" class="muted">Nenhum registro encontrado</td></tr>')
 +'</tbody></table></div>';
}
export function Nav(groups,active,pending){
 return groups.map(group=>'<section class="nav-group"><h2 class="nav-heading">'+escapeHTML(group.label)+'</h2>'
 +group.items.map(item=>'<button type="button" data-page="'+item.id+'" aria-label="'+escapeHTML(item.name)+'" '+(active===item.id?'aria-current="page"':'')
 +' class="nav-link '+(active===item.id?'active':'')+'">'+Icon(item.icon,'nav-icon')+'<span class="nav-label">'+escapeHTML(item.name)+'</span>'
 +(item.id==='movements'&&pending?'<span class="nav-count" aria-label="'+pending+' pendentes">'+pending+'</span>':'')+'</button>').join('')
 +'</section>').join('');
}
export function WorkspaceSelector(companies,active,month,optionRenderer,variant='sidebar'){
 return '<section class="workspace-selector '+escapeHTML(variant==='sidebar'?'context-sidebar':variant)+'" aria-label="Contexto de trabalho">'
 +'<label class="context-field"><span>'+Icon('building-2')+' Empresa</span><select data-context="company" aria-label="Empresa ativa">'+optionRenderer(companies.map(c=>[c.id,c.name]),active,'Selecione uma empresa')+'</select></label>'
 +'<label class="context-field"><span>'+Icon('calendar-days')+' Competência</span><input data-context="period" type="month" aria-label="Competência ativa" value="'+escapeHTML(month)+'"><span class="context-month-value" aria-hidden="true">'+escapeHTML(month.split('-').reverse().join('/'))+'</span></label>'
 +'</section>';
}
