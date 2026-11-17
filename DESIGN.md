# DESIGN.md — Rose & Onyx · Sistema de design v3

Produto: **ContaGi** · Idioma: português brasileiro · Interfaces: Web desktop, tablet e mobile.

## Direção visual

**Light — Rose:** creme rosado, branco, bordas suaves e rosa profundo apenas em ações, foco, números de etapas e navegação. **Dark — Onyx:** fundos quase pretos, superfícies grafite com subtom ameixa, texto claro e rosa luminoso em elementos interativos. Verde e vermelho permanecem semânticos para entradas/saídas, sucesso/erro. Os números e códigos contábeis precisam permanecer mais importantes que a decoração.

Referências de linguagem (inspiração, sem reprodução de design proprietário):
- Dribbble — [MoneyGram Dashboard](https://dribbble.com/shots/14413135-MoneyGram-Dashboard): suavidade de superfícies pastel.
- Behance — [Finance Dashboard App](https://www.behance.net/gallery/123248073/Finance-Dashboard-App): organização de KPIs e cartões financeiros.
- Behance — [Analytics Dashboard](https://www.behance.net/gallery/179894161/Analytics-Dashboard): contraste preto/rosa.
- Dribbble — [Financial Web App](https://dribbble.com/shots/18018508-Financial-Web-App-Dashboard-page-concept): hierarquia dark e acento rosa.
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/radix/sheet): anatomia de painel lateral, cabeçalho, conteúdo e rodapé.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): critérios de contraste, foco, semântica, teclado e alvos.

## Paleta semântica: CSS como fonte única

Os tokens base estão em `styles.css`, e `admin-shell.css` define os aliases e sobrescritas do layout administrativo. O sistema usa tokens semânticos compartilhados em ambos os temas. Não inserir cores isoladas quando já existir um token.

| Token | Light Rose | Dark Onyx |
|---|---|---|
| `--canvas` | `#FAF8FA` | `#0D0B0E` |
| `--surface` | `#FFFFFF` | `#1B161D` |
| `--surface-interactive` | `#F9EAF1` | `#30212B` |
| `--text` | `#282329` | `#F7EFF4` |
| `--text-secondary` | `#504950` | `#E2D4DF` |
| `--brand` | `#A72A60` | `#EF9ABF` |
| `--brand-foreground` | `#FFFFFF` | `#2F1121` |
| `--sidebar` | `#271B25` | `#100E11` |
| `--border` | `#E4DDE4` | `#453843` |
| `--success` | `#146644` | `#83E8B2` |
| `--danger` | `#AB284A` | `#FF9AAA` |

**Contraste:** validar cada par real de cor de texto/fundo nos modos claro e escuro, incluindo componentes do menu, importação e sheets. A presença de tokens não comprova por si só conformidade WCAG; manter a auditoria automatizada e revisão manual.

## Layout, geometria e interação

- Grade espacial base de 4 px: tokens `--space-1` a `--space-12`.
- Card: raio 14 px; controle: 9 px; altura dos inputs e botões comuns: 44 px; botões compactos: pelo menos 38 px.
- Mesma margem de página para cabeçalho, resumo, formulários, tabelas e cards.
- KPIs na mesma linha precisam ter a mesma altura e padrão de destaque.
- Links e botões devem ter estado de foco visível e alvo acionável. Cor não é o único indicador financeiro.
- A navegação e os relatórios não podem causar rolagem horizontal na página; tabelas largas rolam dentro da própria região tabulável.
- Testar 390, 768, 1440 px, teclado, Escape, foco, modo de movimento reduzido e ambos os temas.

### Formulários: somente Sheet

**Não usar modal centralizado.** O formulário abre um **sheet lateral à direita**, inspirado na anatomia visual do shadcn/ui, com:

1. `sheet-layer` + backdrop para isolar a interação.
2. `sheet-panel` com largura máxima de 550 px no desktop e 100% no celular.
3. `sheet-header`: título, descrição e botão de fechar.
4. `sheet-scroll`: área central rolável que não move o cabeçalho nem as ações.
5. `sheet-actions`: cancelar/salvar ou revisar/confirmar, fixos na borda inferior.
6. Focus trap, Escape para fechar, fundo `inert`, restauração do foco e sem `window.alert/confirm`.

**Nota técnica:** o aplicativo é JavaScript/ES Modules sem React. Implementa **o padrão de comportamento e aparência** do Sheet do shadcn/ui, não seu componente React original. A semântica acessível usa `role="dialog"` e `aria-modal="true"` por compatibilidade com tecnologias assistivas; isso não transforma o painel visual em uma janela centralizada.

### Temas

- A alternância de tema fica no rodapé da sidebar, com rótulo acessível; o backup fica em **Configurações e dados**, não no cabeçalho. Quando o menu está recolhido ou no celular, empresa e competência continuam disponíveis no contexto do topo.
- Para manter os dados e a preferência de aparência dos navegadores existentes após a mudança de marca, preservamos a chave técnica de armazenamento legada. A preferência é gravada em `localStorage` na chave `contabil.local.pages.v1.theme`, separada dos lançamentos.
- Na primeira visita, respeitar `prefers-color-scheme`, sem substituir uma escolha explícita.
- Atributo de tema: `<html data-theme="light|dark">`. O tema é aplicado antes de carregar a folha de estilo para reduzir o flash de tema incorreto.
- Nunca copiar cores do light para dark sem validar contraste. Cor de marca, superfície, borda, alerta, tabela, focus ring e sheet são tokens específicos de cada tema.

## Shell administrativo e componentes reutilizáveis

- Estrutura Supabase Studio: marca e recolhimento no cabeçalho da sidebar; empresa/competência na região de contexto; navegação central rolável com quatro grupos; configurações, aparência e status no rodapé.
- Ícones Lucide compartilhados em `assets/icons.svg`, produzidos por `tools/build-icons.py`.
- Componentes sem estado duplicado em `ui.mjs`: `Button`, `Card`, `MetricCard`, `PageHeader`, `DataTable`, `Nav`, `WorkspaceSelector`.
- Ações de cards na mesma linha mantêm rodapés ancorados na base. Verificações geométricas em `tests/design-audit.mjs`.
- Importação com estrutura heterogênea usa `importers.mjs`, mapeamento revisável, linhas inválidas exportáveis, PDF textual com regex e templates por empresa.
- Plano de testes de todas as funcionalidades em [docs/QA-PLAN.md](docs/QA-PLAN.md).

## Prompt operacional para evolução por agentes

> Aja como engenheiro frontend sênior, designer de sistemas e especialista UX de produtos financeiros. Antes de editar qualquer componente, leia `DESIGN.md`, tokens de `styles.css`, `app.js` e os testes. Preserve o estilo Rose & Onyx, proporções e semântica de lançamentos contábeis. Nenhuma nova tela deve usar modal central ou alert/confirm nativo; use o Sheet existente. Reutilize tokens e mantenha compatibilidade com light e dark. Revise entrada, validação, erro, sucesso, estados vazios, rolagem e teclado. Execute testes unitários, Impeccable no código/UI, axe-core em todos os estados, smoke CSV/XLSX e inspeção de screenshots. Não considere uma função validada apenas porque o código foi escrito. Em caso de violação, corrija e reexecute antes do merge. Não introduza backend nem envie dados de clientes à hospedagem pública.

## Quality gates

- `npm run verify`: sintaxe, regras e testes do núcleo contábil.
- `npm run design:scan`: Impeccable 4.9.2 (código).
- `npx impeccable@4.9.2 detect --json http://127.0.0.1:4173`: Impeccable na interface renderizada.
- `node tests/design-audit.mjs`: **72 estados**, 10 telas + sheet de classificação + sheet de confirmação em 3 larguras x 2 temas, usando Playwright/axe-core e verificações geométricas.
- `node tests/smoke.mjs`: criação de empresa fictícia, contabilização, confirmação pelo sheet, importação CSV/XLSX, layouts, persistência, exportação e tema salvo.
- Capturas produzidas em `evidence/ui/` (não publicadas no GitHub Pages).

**Limite da auditoria:** Impeccable e axe-core são diagnósticos automatizados, não comprovantes universais de usabilidade ou conformidade. Revisão visual e testes com usuária real permanecem necessários. Não usar dados contábeis reais no GitHub Pages experimental.
