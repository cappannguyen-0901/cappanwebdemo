from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

src = Path(r'D:\Projectweb\docs\BAO-CAO-VAN-HANH-CAPPAN.md')
out = Path(r'D:\Projectweb\CAPPAN-BAO-CAO-VAN-HANH.docx')
lines = src.read_text(encoding='utf-8').splitlines()

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(1.8)
sec.bottom_margin = Cm(1.8)
sec.left_margin = Cm(2.0)
sec.right_margin = Cm(2.0)

normal = doc.styles['Normal']
normal.font.name = 'Arial'
normal.font.size = Pt(10.5)
normal.paragraph_format.space_after = Pt(5)
normal.paragraph_format.line_spacing = 1.25

# Cover
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('CAPPAN')
r.font.name = 'Arial'
r.font.size = Pt(34)
r.font.bold = True
r.font.color.rgb = RGBColor(0x6F, 0x4E, 0x37)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('BÁO CÁO VẬN HÀNH')
r.font.size = Pt(20)
r.font.bold = True
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Bản đồ vận hành trước khi code — phiên bản demo')
r.font.size = Pt(12)
r.font.italic = True
r.font.color.rgb = RGBColor(0x6B, 0x5B, 0x4E)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Khách hàng · Nhân viên · Chủ quán · 4 service mode · Order Board · Runner View · Owner Cockpit')
r.font.size = Pt(9)
r.font.color.rgb = RGBColor(0x8B, 0x71, 0x60)
doc.add_page_break()

i = 0
in_code = False
while i < len(lines):
    line = lines[i].rstrip()
    if line.strip().startswith('```'):
        in_code = not in_code
        i += 1
        continue
    if in_code:
        p = doc.add_paragraph()
        r = p.add_run(line if line else ' ')
        r.font.name = 'Consolas'
        r.font.size = Pt(9)
        p.paragraph_format.left_indent = Cm(0.5)
        p.paragraph_format.space_after = Pt(1)
        i += 1
        continue
    if line.startswith('|') and i + 1 < len(lines) and lines[i+1].lstrip().startswith('|'):
        rows = []
        while i < len(lines) and lines[i].lstrip().startswith('|'):
            raw = lines[i].strip().strip('|')
            if not set(raw.replace('|', '').replace('-', '').replace(':', '').strip()):
                i += 1
                continue
            rows.append([c.strip() for c in raw.split('|')])
            i += 1
        if rows:
            ncol = max(len(r) for r in rows)
            table = doc.add_table(rows=len(rows), cols=ncol)
            table.style = 'Light Grid Accent 1'
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            for ri, row in enumerate(rows):
                for ci in range(ncol):
                    cell = table.cell(ri, ci)
                    cell.text = row[ci] if ci < len(row) else ''
                    for p in cell.paragraphs:
                        for r in p.runs:
                            r.font.size = Pt(8.5)
                            if ri == 0:
                                r.font.bold = True
            doc.add_paragraph()
        continue
    if line.startswith('# '):
        p = doc.add_heading(line[2:].strip(), level=1)
        for r in p.runs:
            r.font.name = 'Arial'
            r.font.color.rgb = RGBColor(0x6F, 0x4E, 0x37)
    elif line.startswith('## '):
        p = doc.add_heading(line[3:].strip(), level=2)
        for r in p.runs:
            r.font.name = 'Arial'
            r.font.color.rgb = RGBColor(0x6F, 0x4E, 0x37)
    elif line.startswith('### '):
        p = doc.add_heading(line[4:].strip(), level=3)
        for r in p.runs:
            r.font.name = 'Arial'
    elif line.startswith('> '):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.7)
        r = p.add_run(line[2:].strip())
        r.italic = True
        r.font.color.rgb = RGBColor(0x6B, 0x5B, 0x4E)
    elif line.startswith('- '):
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(line[2:].strip())
    elif line.strip() == '---':
        doc.add_paragraph()
    elif line.strip():
        p = doc.add_paragraph()
        # basic bold **text**
        parts = line.split('**')
        for idx, part in enumerate(parts):
            if not part:
                continue
            r = p.add_run(part)
            r.bold = (idx % 2 == 1)
    i += 1

doc.save(out)
print(out, 'pages?', len(doc.paragraphs), 'paragraphs')
