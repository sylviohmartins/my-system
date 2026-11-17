# Contrato geométrico de interface — ContaGil Studio

## Referência de arquitetura

A composição acompanha os princípios publicados pelo Supabase Studio:
- [Layout / Page Breadcrumbs, Page Header e Page Container](https://supabase.com/design-system/docs/ui-patterns/layout)
- [Sidebar / SidebarProvider, SidebarContent e SidebarRail](https://supabase.com/design-system/docs/components/sidebar)
- [Código-fonte do Supabase Studio](https://github.com/supabase/supabase/tree/master/apps/studio)

O ContaGil é uma implementação independente em JavaScript e CSS, sem necessidade de incorporar os componentes React do Supabase. A referência é estrutural (hierarquia de navegação, regiões persistentes, densidade, alinhamento), não uma cópia pixel a pixel.

## Invariantes verificáveis

| Área | Contrato geométrico | Fonte |
|---|---|---|
| Header desktop | Borda direita da marca = borda direita da sidebar = início da área de trabalho | `--studio-nav-width` |
| Coluna de áreas | Largura de 56 px; monograma alinha exatamente com o início da navegação | `--studio-rail-width` |
| Submenu desktop | Largura de 232 px, ou 218 px em resoluções intermediárias | `--studio-menu-width` |
| Título do submenu | Centro vertical coincide com o primeiro ícone da barra principal | `--studio-product-heading-height` |
| Conteúdo | Breadcrumb e títulos de página partem do mesmo eixo horizontal | `--studio-page-gutter` |
| Sidebar recolhida | Menu e área de trabalho usam a mesma largura efetiva de 56 px, nunca os 72 px do layout antigo | `--studio-nav-width` |
| Mobile | Altura efetiva do header = topo da barra de breadcrumb; breadcrumb termina exatamente no início do conteúdo | `--studio-header-height` |
| Empresa e competência | Campos permanecem acessíveis e sem sobreposição; competência compacta no celular | `ui.mjs` + `studio-shell.css` |
| Tabelas densas | Rolagem horizontal contida; coluna final de ação permanece visível e operável | `.table-with-actions` |
| Sheets | Posicionamento lateral, fechamento por Escape e foco controlado | Auditorias Playwright e axe |

### Medidas que motivaram a correção

- Antes: em 1440 px, a borda da marca ficava em **204 px**, enquanto a sidebar começava seu conteúdo em **288 px**.
- Depois: borda da marca, borda da sidebar e início do conteúdo coincidem em **288 px**.
- Antes: em 1920 px, o título de página começava em **374 px** e o breadcrumb em **316 px**, devido ao `max-width` e `margin:auto` do CSS legado.
- Depois: ambos começam em **316 px**.
- Antes: o cabeçalho móvel tinha ~117 px, mas o conteúdo começava em 112 px.
- Depois: a mesma variável `--studio-header-height` define o fim do cabeçalho e o início da página, sem interseção.
- Antes: ao recolher a sidebar, o menu tinha 56 px e o conteúdo continuava reservando 72 px.
- Depois: ambos usam 56 px.

## Como prevenir regressões

Executar `node tests/layout-gates.mjs` com Playwright instalado. A suíte percorre **22 estados de tema/resolução**: 320, 375, 390, 600, 768, 980, 981, 1024, 1280, 1440 e 1920 px, nos modos claro e escuro. Também exercita sidebar recolhida no desktop e menu móvel aberto/fechado.

O teste falha em desalinhamento além da tolerância de 1–1,5 px, sobreposições, overflow horizontal da página, desaparecimento de ações importantes e duplicação visual da competência. Capturas e medições ficam em `evidence/geometry/` e entram nos artefatos do CI quando há falhas.

Complementar com `node tests/design-audit.mjs` (todas as telas, contraste WCAG, sheets e cards) e `node tests/import-a11y.mjs` (seis estados do importador). As verificações são automatizadas; não substituem avaliação humana em dispositivos e navegadores diferentes.

**Regra de manutenção:** mudar uma coluna ou espaçamento global somente por token compartilhado. Não introduzir `margin-left` ou `max-width` local que altere o alinhamento sem atualizar contrato e testes.
