# DESIGN.md — Sistema de design e critérios de UX/UI

Versão: 2.0 · Produto: Contábil Local · Idioma: português do Brasil.

## Princípio do produto
Interface para operador contábil: **legibilidade > decoração**, **segurança de decisões > automação indiscriminada**, **padrões consistentes > exceções visuais**. A identidade visual é sóbria: navegação azul-marinho, superfícies claras, ênfase azul e cores semânticas para situações financeiras e de validação. A interface deve funcionar com teclado, ampliação, celular e monitor.

O projeto toma as decisões arquiteturais do VitraLibre como referência (núcleo estático, validação, persistência local e testes), mas mantém um domínio contábil próprio.

## Contratos mensuráveis

| Dimensão | Critério |
|---|---|
| Grid | Escala múltipla de 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 48 |
| Tipografia | Corpo 14 px; conteúdo tabular 13 px; rótulos e botões 12–13 px; títulos de tela 26–30 px |
| Botões principais | Altura mínima 44 px; botões compactos de tabela >= 38 px, com espaçamento entre alvos |
| Inputs e selects | Altura mínima 44 px; rótulo explícito; foco visível |
| Raios | Controles 9 px; cards 14 px; diálogos 18 px |
| Paleta | Variáveis CSS sem cores arbitrárias por componente; verde para positivo, vermelho para negativo, sem cor como única pista |
| Contraste | WCAG 2.2 AA como meta: texto comum >= 4,5:1, texto grande e ícones relevantes >= 3:1 |
| Tabelas | Cabeçalhos identificáveis; overflow horizontal apenas na tabela; região focável por teclado |
| Modais | Título acessível, aria-modal, Escape para fechar, foco inicial e ciclo de Tab interno |
| Responsividade | Testar 390, 768 e 1440 px; não permitir scroll horizontal do documento |
| KPIs | Cards da mesma linha com altura uniforme e alinhamento no mesmo grid |
| Estados | Vazio, erro, sucesso, pendente, aprovado, sem empresa e reimportação devem ser legíveis |
| Conteúdo financeiro | Alinhamento coerente, centavos sempre explícitos, conta contábil + código, datas em formato compreensível |

Os tokens de implementação são definidos no topo de `styles.css`. É proibido inserir um novo valor avulso quando já houver token equivalente. Breakpoints: 1380, 1024, 900 e 650 px; qualquer alteração deve preservar os estados cobertos.

## PROMPT OPERACIONAL para revisões futuras por agentes de IA

> Atue como engenheiro frontend sênior, designer de sistemas, especialista UX para operações financeiras e engenheiro de acessibilidade. Antes de editar uma tela, examine `DESIGN.md`, o CSS existente, a navegação, os estados e as consequências para outros componentes. Faça a menor alteração consistente, reutilizando tokens e padrões. Conserve a semântica das operações contábeis; nunca trate sugestões automáticas como lançamentos aprovados. Cubra estados vazios e preenchidos; teste teclado, leitores de tela e responsividade. Execute o Impeccable, axe-core, testes do núcleo e o fluxo E2E, compare métricas e capturas visuais. Se surgir uma violação, corrija-a e reexecute as verificações. Descreva qualquer limitação com evidência, sem atribuir conformidade apenas por haver uma regra escrita.

### Hierarquia e alinhamento
- Navegação, seletor de empresa e competência são persistentes em todas as telas.
- Todos os títulos de página alinham com a borda dos cards, tabelas e KPIs.
- Ações primárias aparecem consistentemente à direita da página em desktop e após o subtítulo no celular.
- Não centralizar tabelas ou formulários; a centralização é reservada ao primeiro uso e aos estados vazios.
- Usar um único nível de cards; evitar cartões dentro de cartões e efeitos supérfluos.

### Segurança e conteúdo
- O GitHub Pages publica só **código e demonstrações fictícias**. Não adicionar extratos reais, backups, tokens, CPF/CNPJ de clientes ou relatórios com dados pessoais.
- `localStorage` não é um banco corporativo; o backup JSON continua obrigatório e o processamento de dados reais não é homologado.
- Recomendações contábeis são sugestões sujeitas a confirmação de conta de débito/crédito e documentos.

## Quality gates reproduzíveis

1. `npm run verify`: sintaxe e testes de partidas dobradas / importação.
2. `npm run design:scan`: Impeccable CLI 4.9.2 no código, sem achados primários.
3. `npx impeccable@4.9.2 detect --json http://127.0.0.1:4173/`: varredura na UI renderizada (o navegador deve estar instalado).
4. `node tests/design-audit.mjs`: 10 telas + modal em 3 viewports, usando axe-core, medidas de botões e overflow. Requer Playwright e axe-core instalados; o CI executa esse passo.
5. `node tests/smoke.mjs`: cadastro fictício, lançamento revisado, importação CSV/XLSX, modelo, persistência e exportação.
6. Inspecionar capturas `evidence/ui/` geradas pelos testes; aprovação visual manual complementar continua necessária.

**Impeccable é um detector de padrões, não uma garantia universal de simetria ou conformidade.** O conjunto de testes automatizados e inspeção visual fornece cobertura mais confiável. Não ocultar achados em configurações sem justificativa técnica registrada.
