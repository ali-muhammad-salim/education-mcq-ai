"""Render the project-authored 2024 marking guide as a downloadable PDF."""
from pathlib import Path
import json,re
from html import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Preformatted,Table,TableStyle,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/computer-science/hssc_xi_2024_written.json').read_text(encoding='utf-8'))
styles=getSampleStyleSheet();styles['BodyText'].spaceAfter=6;styles['BodyText'].leading=14
out=ROOT/'public/materials/hssc/computer-science/computer-science-xi-2024-project-marking-guide.pdf'
flow=[Paragraph('Computer Science Class XI · Annual 2024',styles['Title']),Paragraph('PROJECT-AUTHORED MARKING GUIDE',styles['Heading1']),Paragraph('Prepared for the supplied Paper II. This document is a project-created study and marking resource. It is not an official AKU-EB e-marking publication. No official examiner observations or candidate response images were supplied.',styles['BodyText']),Paragraph('Paper II carries 35 marks. Answer Questions 1–6 and one alternative each from Questions 7 and 8. Both alternatives are covered below. The rubrics are proposed allocations and allow equivalent correct responses.',styles['BodyText'])]
def body(text):
 parts=re.split(r'(```[\s\S]*?```)',text)
 for part in parts:
  if part.startswith('```'):
   content=part.split('\n',1)[1].rsplit('```',1)[0].strip('\n').replace('─','-')
   flow.append(Preformatted(content,styles['Code']))
  elif part.strip().startswith('|'):
   lines=[line for line in part.strip().splitlines() if not re.match(r'^\|[\s:|\-]+\|$',line)]
   cells=[[Paragraph(escape(c.strip()),styles['BodyText']) for c in line.strip('|').split('|')] for line in lines]
   t=Table(cells,colWidths=[(A4[0]-88)/len(cells[0])]*len(cells[0]),repeatRows=1)
   t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e4f1eb')),('GRID',(0,0),(-1,-1),.4,colors.grey),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),7)]));flow.append(t)
  else:
   for para in part.split('\n\n'):
    if para.strip():flow.append(Paragraph(escape(para.strip()).replace('\n','<br/>'),styles['BodyText']))
for q in rows:
 start=len(flow)
 flow.append(Paragraph(f"Question {q['number']} · {q['marks']} marks",styles['Heading1']))
 body(q['stem']);flow.append(Paragraph('Worked answer',styles['Heading2']));body(q['answer']);flow.append(Paragraph('Proposed marking allocation',styles['Heading2']))
 for item in q['rubric']:body('• '+item)
 flow.append(Spacer(1,12))
 section=flow[start:]
 flow[start:]=[KeepTogether(section)]
flow.append(Paragraph('Technical references',styles['Heading1']))
for title,url in [('Intel Pentium 4 introduction','https://www.intel.com/pressroom/archive/releases/2000/dp112000.htm'),('Microsoft Access ALTER TABLE syntax','https://learn.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/alter-table-statement-microsoft-access-sql'),('HPE Wi-Fi terminology','https://www.hpe.com/us/en/what-is/wi-fi.html.html')]:
 flow.append(Paragraph('<link href="'+url+'">'+escape(title)+'</link>',styles['BodyText']))
def footer(canvas,doc):
 canvas.saveState();canvas.setFont('Helvetica',8);canvas.drawString(44,24,'Project-authored marking guide · Computer Science XI 2024');canvas.drawRightString(A4[0]-44,24,str(doc.page));canvas.restoreState()
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=42,bottomMargin=42).build(flow,onFirstPage=footer,onLaterPages=footer)
print(out)
