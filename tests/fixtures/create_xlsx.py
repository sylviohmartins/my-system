"""Gera uma planilha XLSX mínima, fictícia e compatível com Office Open XML."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

path = Path(__file__).parent / "extrato-teste.xlsx"
headers = ["Data", "Histórico", "Valor", "Documento"]
values = ["14/11/2026", "TARIFA TESTE XLSX", "-75,90", "XLSX-01"]

def row(number, values):
    cells = []
    for pos, value in enumerate(values):
        col = chr(65 + pos)
        cells.append(f'<c r="{col}{number}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
    return f'<row r="{number}">{"".join(cells)}</row>'

with ZipFile(path, "w", ZIP_DEFLATED) as zipf:
    zipf.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""")
    zipf.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")
    zipf.writestr("xl/workbook.xml", """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Extrato" sheetId="1" r:id="rId1"/></sheets>
</workbook>""")
    zipf.writestr("xl/_rels/workbook.xml.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""")
    zipf.writestr("xl/worksheets/sheet1.xml", f'''<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:D2"/><sheetData>{row(1, headers)}{row(2, values)}</sheetData>
</worksheet>''')
print(f"Criado {path} ({path.stat().st_size} bytes)")
