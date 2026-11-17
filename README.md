# ContaGi — gestão contábil de extratos e lançamentos

**ContaGi** é uma aplicação estática com interfaces Rose Light e Onyx Dark para receber extratos, conferir linhas, mapear layouts recorrentes de cada empresa, registrar lançamentos em partidas dobradas e revisar composições e relatórios.

**Site:** https://sylviohmartins.github.io/my-system/  
**Código:** https://github.com/sylviohmartins/my-system

## Fluxo de operação
1. Escolha **empresa** e **competência** no contexto do menu administrativo (também acessível na barra superior quando o menu está recolhido ou em dispositivos móveis).
2. Acesse **Importar arquivos** e selecione Excel XLSX/XLS, CSV/TSV ou PDF com texto selecionável.
3. Confira a aba, a linha de cabeçalho e o mapeamento para data, histórico, valor (com sinal ou colunas separadas), documento e favorecido.
4. Para PDF, veja a extração por linha e página e, se necessário, configure uma expressão regular com grupos nomeados `date`, `description` e `amount`.
5. Revise a prévia: linhas válidas, pendências e seus motivos. Exporte as pendências quando necessário. Salve o **layout por empresa** para reutilizar em extratos futuros.
6. Importe os movimentos. A reimportação do mesmo arquivo usa identificação de origem e evita repetir linhas.
7. Em **Movimentações**, confirme a conta contábil da contrapartida antes de gerar a partida dobrada. Importar extratos **não** significa contabilizar automaticamente.
8. Acompanhe lançamentos, composição de clientes e fornecedores, conciliação e relatórios preliminares. Exporte CSV/JSON quando necessário.

## Interface e identidade
- **Marca ContaGi**, dois temas rosa claro e preto com rosa, tokens em `styles.css` e `admin-shell.css`.
- **Admin inspirado no Supabase:** menu com grupos, recolhimento para rail de ícones, seleção de contexto, indicador de pendências, versão móvel off-canvas e tema em Configurações/rodapé.
- **Componentes compartilhados** em `ui.mjs`: botões, cabeçalhos, cards, métricas, tabelas, navegação e seletor de empresa/competência. Ícones Lucide em sprite local.
- **Sheets laterais**, não modais centralizados; foco, Escape e rodapé de ações fixo.
- Especificação em [DESIGN.md](DESIGN.md); plano de QA em [docs/QA-PLAN.md](docs/QA-PLAN.md).

## Executar localmente
Requisitos: navegador atualizado, Python 3 ou servidor HTTP estático e, para executar testes, Node.js 24.

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Abra http://127.0.0.1:4173/. Não utilize `file://`: o código usa módulos ES e Worker.

## Testes
```bash
npm run verify
npm run design:scan
# Os testes E2E precisam de Playwright, axe-core e Chromium instalados:
node tests/smoke.mjs
node tests/admin-e2e.mjs
node tests/import-e2e.mjs
node tests/import-a11y.mjs
node tests/design-audit.mjs
```

O workflow `.github/workflows/browser-smoke.yml` prepara as fixtures sintéticas (`tests/fixtures/create_xlsx.py` e `tests/fixtures/create_pdf.py`), executa testes reais no Chromium e bloqueia alterações com falhas. GitHub Pages publica somente os arquivos estáticos aprovados da `main`.

## Dependências e direitos de uso
- Ícones: Lucide Static 0.468.0 (MIT), sprite `assets/icons.svg`; licença em `vendor/licenses/LUCIDE-MIT.txt`.
- Excel: SheetJS CE 0.20.3, distribuição incluída em `vendor/xlsx/` (Apache-2.0).
- PDF: Mozilla PDF.js 4.10.38, distribuída em `vendor/pdfjs/` (Apache-2.0).
- Sem CDN em tempo de execução para ler Excel e PDF; arquivos são processados no navegador.

## Limites de segurança e operação
**Ainda não é uma solução corporativa homologada para documentos contábeis reais.** Não possui autenticação, controle de acesso, criptografia dos dados armazenados, sincronização, backup automático ou trilha imutável. O `localStorage` é frágil e pode ser apagado. O repositório público não recebe arquivos dos clientes, mas usar uma instância sem proteção com dados pessoais sensíveis ainda exige avaliação LGPD e controles adicionais.

Limites por importação: 10 MB, até 12 mil linhas de tabela; PDF até 35 páginas. **PDF escaneado não é reconhecido sem OCR**. Alguns layouts exigem mapeamento manual e homologação com o contador. Os relatórios são preliminares, não substituem SPED/ECD, cálculo fiscal, fechamento ou parecer técnico. Antes de uso profissional, migrar para armazenamento transacional seguro, implementar acessos, auditoria imutável, indicadores de execução e reprocessamento seguro.

A chave de armazenamento legada `contabil.local.pages.v1` foi mantida para preservar dados criados antes da mudança de nome para ContaGi. Faça regularmente backup JSON em um dispositivo seguro.
