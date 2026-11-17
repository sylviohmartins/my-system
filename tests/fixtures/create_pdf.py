"""Gera PDFs reais e textuais para testes de extratos heterogêneos, sem dependências."""
from pathlib import Path

here=Path(__file__).resolve().parent

def pdf_escape(s):
    return s.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')

def create_pdf(path, pages):
    catalog=b'<< /Type /Catalog /Pages 2 0 R >>'
    kids=' '.join(f'{4+2*i} 0 R' for i in range(len(pages)))
    page_tree=f'<< /Type /Pages /Kids [ {kids} ] /Count {len(pages)} >>'.encode()
    font=b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    objs=[catalog,page_tree,font]
    for i,lines in enumerate(pages):
        page_id=4+2*i
        content_id=page_id+1
        stream='BT /F1 11 Tf 48 765 Td 14 TL\n'
        stream+=''.join(f'({pdf_escape(text)}) Tj T*\n' for text in lines)
        stream+='ET\n'
        raw=stream.encode('latin-1')
        page=f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>'.encode()
        content=b'<< /Length '+str(len(raw)).encode()+b' >>\nstream\n'+raw+b'endstream'
        objs.extend([page,content])
    parts=[b'%PDF-1.4\n']
    offsets=[0]
    for i,obj in enumerate(objs,1):
        offsets.append(sum(map(len,parts)))
        parts.append(f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n')
    xref_offset=sum(map(len,parts))
    xref=f'xref\n0 {len(objs)+1}\n0000000000 65535 f \n'
    xref+=''.join(f'{n:010d} 00000 n \n' for n in offsets[1:])
    trailer=f'trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n'
    parts.extend([xref.encode(),trailer.encode()])
    path.write_bytes(b''.join(parts))
    print(path.name,path.stat().st_size)

create_pdf(here/'extrato-banco-a.pdf',[
 ['BANCO EXEMPLO A - EXTRATO DE NOVEMBRO',
  '16/11/2026 PIX CLIENTE 120,00 C',
  '17/11/2026 COMPRA SUPERMERCADO 45,90 D'],
 ['18/11/2026 TARIFA MENSAL 9,90 D',
  'RODAPE BANCO A']
])
create_pdf(here/'extrato-banco-b.pdf',[
 ['BANCO EXEMPLO B',
  '2026-11-16 | TRANSFERENCIA RECEBIDA | 300,00',
  '2026-11-17 | DESPESA DE MANUTENCAO | -30,00']
])
create_pdf(here/'extrato-banco-b-mes-seguinte.pdf',[
 ['BANCO EXEMPLO B',
  '2026-11-20 | NOVA TRANSFERENCIA | 75,00',
  '2026-11-21 | NOVA TAXA | -15,10']
])
