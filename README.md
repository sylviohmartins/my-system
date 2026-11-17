# ContaGi — extrato → lançamento → conciliação

Aplicação web estática e experimental de apoio a rotinas contábeis brasileiras. **Nome oficial do produto: ContaGi.**

## Por que existe
O escritório recebe mensalmente planilhas de extratos bancários e transforma as movimentações em lançamentos por partidas dobradas, usando plano de contas por empresa. O sistema separa **movimentação bancária**, **lançamento contábil** e **conciliação** para não confundir uma transferência com receita/despesa.

## Funcionalidades
- Empresas e planos de contas independentes; contas personalizáveis.
- Importação de XLSX e CSV, com mapeamento de colunas, prévia, validação e layouts reutilizáveis por empresa.
- Importação de PDF com texto em formato simples, em caráter experimental (não OCR).
- Movimentos importados não geram lançamentos sem aprovação.
- Cadastro de clientes/fornecedores e títulos a receber/pagar, baixas datadas e confronto auxiliar com contas-controle padrão (1.1.03 e 2.1.01). Baixas auxiliares não alteram automaticamente o razão.
- Contabilização individual com escolha explícita da conta de contrapartida e débito/crédito calculados conforme o sinal bancário.
- Regras locais por palavra-chave que **sugerem** contas, nunca aprovam lançamentos sozinhas.
- Conferência de lançamentos, conciliação por movimento, resumo mensal e balancete simplificado, CSVs e backup/restauração JSON.
- Dados processados no navegador; sem backend, conta ou API de IA.

## Uso e publicação
Execute um servidor estático na pasta: `python -m http.server 8080`, abra `http://localhost:8080`.
No GitHub Pages, use a URL do projeto apenas com dados **fictícios** e não como infraestrutura corporativa. O código publicado não contém dados de empresas ou credenciais. Arquivos importados são processados localmente e não enviados ao GitHub.

## Limites e segurança
Ferramenta de prototipação, **não** ERP contábil, ECD/SPED nem substituto do contador. Não há autenticação, criptografia de dados armazenados, controle de acesso, sincronização entre aparelhos ou auditoria inviolável. `localStorage` pode ser apagado e tem cota pequena. Backup JSON fora do dispositivo é obrigatório para evitar perda. Não processe documentos reais sensíveis em aparelhos compartilhados. Importações devem ser conferidas; PDF escaneado não é suportado.

Para uso profissional, migrar a IndexedDB/banco de dados corporativo, implantar acessos, criptografia, trilhas de aprovação, conciliação completa por títulos, fechamento e normas aplicáveis. O VitraLibre foi referência de decisões arquiteturais, não origem de código copiado.

## Licença
MIT. Dependências de importação de arquivos são entregues por CDNs externas com versões fixadas; revisar avisos/licenças e política de rede ao distribuir.

## Ativação do GitHub Pages
O repositório inclui o workflow .github/workflows/pages.yml que executa os testes antes de publicar os arquivos estáticos. O GitHub Pages foi ativado administrativamente via Desktop Commander em 16/11/2026 (horário de São Paulo), com `build_type=workflow`. O workflow `.github/workflows/pages.yml` publica a demonstração ao receber um push na branch `main`. Endereço configurado: https://sylviohmartins.github.io/my-system/ . A URL só deve ser considerada operacional após o resultado positivo do deployment e um teste HTTP.

**Privacidade:** não publique extratos, backups, dados de clientes, CPFs, CNPJs reais ou segredos no repositório público. GitHub Pages hospeda o código da aplicação, não os dados locais de quem a usa.

## Qualidade visual e acessibilidade
O projeto possui [design system e prompt operacional](DESIGN.md) com grade de 4 px, tipografia, contraste, tamanhos e padrões de responsividade. O CI executa **Impeccable 4.9.2**, testes contábeis e auditoria com **axe-core + Playwright** em 72 estados da interface (10 telas e dois sheets, nos temas claro/escuro em desktop, tablet e celular), além dos fluxos de importação CSV/XLSX e lançamento revisado. Execução local: `npm run design:verify` e `node tests/design-audit.mjs` (com servidor estático na porta 4173 e dependências de teste). Detectores automatizados não substituem revisão visual e homologação do domínio contábil.

## Aparência e formulários
O aplicativo possui os temas **Rose Light** (superfícies claras e rosa profundo) e **Onyx Dark** (preto e rosa luminoso), alternáveis no cabeçalho e preservados localmente. Os formulários, revisões e confirmações utilizam **sheets laterais** (não janelas centralizadas nem alertas nativos), com foco gerenciado, teclado e área de ações fixa. A implementação é em JavaScript nativo e reproduz o padrão de interação do Sheet do shadcn/ui, sem depender de React. A paleta, a inspiração visual e as regras de componentes constam em [DESIGN.md](DESIGN.md).
