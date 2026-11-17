# Contábil Local — extrato → lançamento → conciliação

Aplicação web estática e experimental de apoio a rotinas contábeis brasileiras. **Nome do produto provisório.**

## Por que existe
O escritório recebe mensalmente planilhas de extratos bancários e transforma as movimentações em lançamentos por partidas dobradas, usando plano de contas por empresa. O sistema separa **movimentação bancária**, **lançamento contábil** e **conciliação** para não confundir uma transferência com receita/despesa.

## Funcionalidades
- Empresas e planos de contas independentes; contas personalizáveis.
- Importação de XLSX e CSV, com mapeamento de colunas, prévia, validação e layouts reutilizáveis por empresa.
- Importação de PDF com texto em formato simples, em caráter experimental (não OCR).
- Movimentos importados não geram lançamentos sem aprovação.
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
