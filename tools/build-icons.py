"""Gera um sprite SVG com subconjunto auditável dos ícones Lucide (MIT)."""
from pathlib import Path
import re, shutil

root=Path(__file__).resolve().parent.parent
icons=root/'node_modules/lucide-static/icons'
names=('layout-dashboard building-2 calendar-days file-up arrow-left-right notebook-pen scale '
'users-round list-tree chart-column settings panel-left-close panel-left-open menu chevron-down '
'moon sun shield-check download plus search circle-help circle-check circle-alert file-spreadsheet '
'file-text database cloud-upload scan-line book-open receipt history ellipsis check x folder-open '
'arrow-up-right circle-dot rotate-ccw sliders-horizontal').split()
symbols=[]
for name in names:
    path=icons/(name+'.svg')
    if not path.exists(): raise SystemExit('Missing Lucide icon: '+str(path))
    data=path.read_text(encoding='utf-8')
    match=re.search(r'<svg\b[^>]*>(.*)</svg>',data,flags=re.S)
    if not match: raise SystemExit('Broken Lucide SVG: '+str(path))
    body=match.group(1).strip()
    symbols.append(f'<symbol id="{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{body}</symbol>')
output='<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n'+'\n'.join(symbols)+'\n</svg>\n'
(root/'assets').mkdir(exist_ok=True)
(root/'assets/icons.svg').write_text(output,encoding='utf-8')
(root/'vendor/licenses').mkdir(parents=True,exist_ok=True)
shutil.copyfile(root/'node_modules/lucide-static/LICENSE',root/'vendor/licenses/LUCIDE-MIT.txt')
print('Generated',len(symbols),'Lucide symbols;',len(output),'bytes')
