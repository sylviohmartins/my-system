# ContaGil · Plano de auditoria, homologação e evolução

## Critérios de sucesso
O produto deve permitir escolher empresa e competência, ler e conferir extratos bancários de formatos diferentes, salvar o mapeamento por empresa, registrar partidas dobradas após revisão, reconciliar movimentos e consultar controles e relatórios sem confundir movimentação financeira com fato contábil.

**Não assumir certificação profissional**: as telas, os lançamentos e os relatórios simplificados não substituem escrituração fiscal, obrigações legais, SPED/ECD, fechamento ou validação profissional.

## Matriz de qualidade

| Área | O que verificar | Testes/gates | Status |
|---|---|---|---|
| Navegação admin | grupos, recolhimento, contexto da empresa e competência, tema, mobile, Escape | `tests/admin-e2e.mjs`, `design-audit.mjs` | Implementado e automatizado |
| Design system | cores Rose/Onyx, uma escala espacial, cards com ações alinhadas, ícones compartilhados, tabelas, sheets | `ui.mjs`, `admin-shell.css`, Impeccable, capturas | Implementado; revisão humana complementar |
| Acessibilidade | foco, labels, semântica, aria, menus, tabelas, modo escuro, contraste, teclado | axe-core em 72 estados e 6 de importação | Automatizado, sem substituir teste manual com leitor de tela |
| Funcionamento básico | empresas independentes, plano de contas, títulos, diário, balancete, relatórios | `core.test.mjs`, `smoke.mjs`, `admin-e2e.mjs` | Implementado |
| Importação Excel | XLSX, XLS, múltiplas abas, header deslocado, entradas e saídas, dados sem cabeçalho, mapeamento | `importers.test.mjs`, `import-e2e.mjs` | Implementado para casos de teste; ampliar biblioteca de formatos reais |
| Importação PDF | texto selecionável, múltiplas páginas, coordenadas XY, regex por empresa, linhas rejeitadas | `create_pdf.py`, `import-e2e.mjs` e `import-a11y.mjs` | Implementado para dois modelos sintéticos; OCR pendente |
| Integridade | valores em centavos, datas, débitos e créditos, reimportação, não contabilizar sem revisão | testes unitários/E2E | Parcial; faltam travas de períodos e auditoria imutável |
| Resiliência | arquivo vazio/grande, arquivo corrompido, PDF sem texto, parser falho, cota de storage, aba concorrente | testes de exceção + validação funcional | Parcial; não há persistência transacional |
| Performance | Web Vitals, grandes lotes, memória, parse sem travar UI, exportação, responsividade | medição real em dispositivos e CI | A aprofundar |
| Segurança | LGPD, processamento local, XSS, injeção de fórmulas em CSV, dependências versionadas, backup | review, testes, controle de dependências | Parcial: não indicado para dados sensíveis reais |

## Estratégia de importação e critérios de aceite

1. **Selecionar origem**: arquivo por cliente, banco, conta e competência. Verificar extensão, tamanho e integridade. Limites da versão: arquivo até 10 MB; planilha até 12 mil linhas, PDF até 35 páginas.
2. **Extrair**: Excel/CSV/TSV em tabelas preservando ordem e células; PDF textual por página e coordenadas. Não inferir texto de imagem como se houvesse OCR.
3. **Identificar estrutura**: procurar cabeçalho nas primeiras linhas; detectar aba, data, histórico, valor assinado ou colunas de entrada/saída; permitir sobrescrever todos os mapeamentos.
4. **Normalizar**: centavos inteiros, data ISO, histórico, documento e terceiro; rastrear linha/página/origem. Não descartar dados sem rastreio.
5. **Conferir**: mostrar contagens de linhas válidas/pendentes, prévia, motivo de erro, texto PDF original e relatório CSV das pendências. Não esconder erros em linhas não reconhecidas.
6. **Salvar layout**: modelo por empresa e estrutura de origem; PDF pode usar expressão de captura `date/description/amount`; novos extratos da mesma empresa devem reaplicar sugestão revisável.
7. **Persistir com deduplicação**: arquivo SHA256 + aba/linha e empresa; confirmar antes de importar; não gerar partidas contábeis automaticamente.
8. **Contabilizar**: cada saída credita conta banco e exige débito de contrapartida; entradas debitam banco e exigem crédito de contrapartida. Usuária revisa e confirma.
9. **Conciliar**: verificar livros, documentos, contas-controle e saldo bancário; títulos auxiliares não são lançamentos autossuficientes.

### Arquivos sintéticos de regressão
- PDF A multipágina com linhas de operações e rodapé: detectar as operações e preservar rejeições.
- PDF B com delimitadores e captura personalizada: salvar e reaplicar ao importar novo arquivo.
- XLSX com aba de capa e cabeçalho na terceira linha, separando entradas e saídas.
- XLS binário BIFF8 com estrutura equivalente.
- CSV com prefácio, vírgulas entre aspas, data e valor; campos de dois dígitos e fuso/horário.
- Reimportação do mesmo arquivo com contagem e tratamento de duplicados.
- Dois cadastros empresariais com isolamento dos registros, plano de contas e modelos.

### Casos pendentes para homologação com arquivos reais
- PDFs escaneados e OCR, PDF protegido por senha, PDF com colunas alinhadas apenas visualmente, extrato com tabela quebrada em páginas, PDF com saldo separado e colunas para D/C, documentos de diversos bancos.
- Excel com células mescladas, fórmulas, formatos personalizados de datas, serial 1904, múltiplas moedas, XLSM, múltiplas contas no mesmo arquivo, linhas de saldo inicial/final, UTF-16 e OFX.
- Importações grandes: 1 mil, 10 mil e 12 mil linhas; interrupção abrupta, retomada, medição de memória e taxa de erros.
- Verificação financeira independente com amostras conferidas por contador; variação de competência, débitos/créditos reversos, estornos, transferências entre contas, pagamento de obrigação já reconhecida, título parcial.

## Performance e robustez (próximas metas)
- Medir LCP e INP com Lighthouse em mobile e desktop usando o Pages real; configurar limites depois de estabelecer baseline.
- Instrumentar tempo de parser por tipo/tamanho; em lotes grandes, mover extração/normalização para Web Worker, evitar re-render integral em cada input e oferecer paginação/virtualização.
- Migrar `localStorage` para IndexedDB/SQLite e cópia de segurança autenticada antes de operar dados profissionais.
- Adicionar indicador de importação em andamento, cancelamento, políticas de retenção, trilha de auditoria que não possa ser alterada no cliente e alertas contra perda de dados.
- Ter testes de contraste, foco, redimensionamento de texto (200%-400%), leitores de tela NVDA/VoiceOver e uso apenas com teclado.

## Rotina de quality gates
- `npm run verify`: sintaxe e testes de contabilidade/importação.
- `npm run design:scan`: Impeccable no fonte; complementa, não substitui revisão visual.
- `node tests/smoke.mjs`: fluxo clássico de contabilização e XLSX/CSV.
- `node tests/admin-e2e.mjs`: contexto e navegação administrativa.
- `node tests/import-e2e.mjs`: PDF A/B, XLSX, XLS, layouts e dedup.
- `node tests/import-a11y.mjs`: importação em light/dark nos três viewports.
- `node tests/design-audit.mjs`: 72 estados de todas as telas e sheets; screenshot e axe.
- CI GitHub Actions deve impedir merge com build/testes vermelhos. Deployment Pages só após gate de `main`.

## Restrições de segurança
Esta instalação é **estática e local ao navegador**. Sem autenticação, banco corporativo, backups automáticos e ACL, ela **não está homologada para dados contábeis reais ou documentos pessoais sensíveis**. Não publicar dados de clientes, extratos, PDFs de bancos ou tokens no repositório GitHub. Versões fixas de Lucide, SheetJS e PDF.js são distribuídas com suas licenças, sem dependência de CDN em runtime.

## Gate de geometria de layout (ContaGil Studio)

O fluxo de PR executa `node tests/layout-gates.mjs` antes da auditoria geral. Os 22 estados de largura/tema (320–1920 px) verificam alinhamento entre header, marca, rail, submenu, breadcrumb e conteúdo com tolerância aproximada de 1–1,5 px, além de colunas de ação acessíveis, competência não duplicada, menu recolhido e fechamento móvel. Evidências ficam em `evidence/geometry/`; detalhes e medidas anteriores/posteriores em [UI-GRID-CONTRACT.md](UI-GRID-CONTRACT.md).
