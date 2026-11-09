"""Prepare the source-reviewed 2022 Mathematics IX papers, without database writes."""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'
DEST = ROOT/'public/materials/ssc/mathematics/ssc-1'
OUT = ROOT/'data/mathematics'
REVIEW = ROOT/'output/mathematics-ix-2022'
FILES = {'p1':('Mathematics-IX-Paper-I-2022.pdf','mathematics-ix-2022-paper-i.pdf'),'key':('Mathematics-IX-Keys-2022.pdf','mathematics-ix-2022-keys.pdf')}

MCQS = [
(r'If $Z,W,N,Q$ denote the sets of integers, whole numbers, natural numbers and rational numbers, which statement is CORRECT?', [r'$N\cup Q=N$',r'$Z\cap Q=Q$',r'$W\cup Z=Z$',r'$W\cap N=\varnothing$'],'3.2.2',9,'Whole numbers are a subset of integers, so their union is Z.','C'),
(r'The symmetric difference $A\Delta B$ is',[r'$(A\cup B)\cup(A\cap B)$',r'$(A\cup B)\cap(A\cap B)$',r'$(A\cup B)-(A\cap B)$',r'$(A\cup B)^c-(A\cap B)^c$'],'3.2.2',9,'Symmetric difference removes the intersection from the union.','C'),
(r'If $P(2x+1,8)$ and $Q(7,3x-1)$ have the same abscissa, the ordinate of Q is',['2','5','7','8'],'7.1.2',9,'Solve 2x+1=7 to obtain x=3. Then 3x−1=8.','D'),
('The distributive law of union over intersection is',[r'$A\cup(B\cap C)=(A\cup B)\cap(A\cup C)$',r'$A\cup(B\cap C)=(A\cup B)\cup(A\cup C)$',r'$A\cap(B\cup C)=(A\cap B)\cap(A\cap C)$',r'$A\cap(B\cup C)=(A\cap B)\cup(A\cap C)$'],'3.3.1',9,'Union distributes over intersection as in A.','A'),
(r'If $U=\{a,b,c,d,e,f,g,h\}$ and $A^c\cup B^c=\{a,b,g,h\}$, then $A\cap B$ is',[r'$\varnothing$',r'$\{c,d,e,f\}$',r'$\{a,b,g,h\}$',r'$\{a,b,c,d,e,f,g,h\}$'],'3.2.2',9,'By De Morgan, A∩B is the complement of Aᶜ∪Bᶜ in U.','B'),
(r'The shaded region in the Venn diagram represents\nI. $A^c\cup B^c$\nII. $A^c\cap B^c$\nIII. $(A\cup B)^c$',['I only','II only','I and III','II and III'],'3.4.2',9,'The region outside both sets is Aᶜ∩Bᶜ=(A∪B)ᶜ.','D'),
(r'If $A\cap B=\{2,4,6\}$ and $A\Delta B=\{1,3\}$, then $A\cup B$ is',[r'$\varnothing$',r'$\{1,3\}$',r'$\{2,4,6\}$',r'$\{1,2,3,4,6\}$'],'3.2.2',9,'Combine the disjoint intersection and symmetric difference to recover the union.','D'),
(r'Let $X=\{1,2,3,4\}$, $Y=\{a,b,c\}$ and $f=\{(1,a),(2,b),(3,c)\}$ be a relation from X to Y. Then f is a/an\nI. binary relation\nII. into function\nIII. one-one function',['I only','III only','I and II','I and III'],'4.1.1',9,'The element 4 of the stated domain X has no image. Thus f is a binary relation but is not a function from X to Y. Printed D is corrected to A.','A'),
('Which diagram DOES NOT represent a function from M to N?',['Diagram A','Diagram B','Diagram C','Diagram D'],'4.1.1',9,'In A, a has several images and other domain elements have none. The other diagrams assign exactly one image per element.','A'),
(r'The common notation of $1.0034216\times10^6$ is',['0.00000010034216','0.0000010034216','1003421.6','10034216'],'2.1.1',9,'Move the decimal point six places to the right.','C'),
(r'If $\log_a125=-3$, then a is',[r'$-5$',r'$-\frac15$',r'$\frac15$','5'],'2.2.2',9,'a⁻³=125 implies a³=1/125, giving a=1/5, a valid logarithmic base.','C'),
(r'The expression $\log3x-\log x^2+\log(x-y)$ is equal to',[r'$\log(4x-x^2-y)$',r'$\log[3x^3(x-y)]$',r'$\log\frac{3x-x^2}{x-y}$',r'$\log\frac{3x(x-y)}{x^2}$'],'2.4.1',9,'Apply the product and quotient logarithm laws on the original domain x>0 and x−y>0.','D'),
(r'The logarithmic form of $(1/9)^{1/2}=1/3$ is',[r'$\log_{1/2}(1/9)=1/3$',r'$\log_{1/9}(1/3)=1/2$',r'$\log_{1/3}(1/9)=1/2$',r'$\log_{1/9}(1/2)=1/3$'],'2.2.1',9,'For bᵖ=q, log_b(q)=p.','B'),
(r'If $\log2=0.30103$ and $\log5=0.69897$, then $\log(32/10)$ is',['−3.78235','0.50515','1.50515','1.10721'],'2.4.1',9,'32/10=16/5, so 4log2−log5=1.20412−0.69897=0.50515. Printed C is corrected to B.','B'),
('Which row correctly identifies a rational expression and a polynomial, respectively?',[r'$\sqrt{2x^2+1}$ ; $1/(2x^2+1)$',r'$1/(2x^2+1)$ ; $2x^2+1$',r'$2x^2+1/\sqrt{x}$ ; $2x^2+1/x$',r'$2x^2+1/x$ ; $2x^2+1/\sqrt{x}$'],'6.2.1',9,'B has a quotient of polynomials followed by a polynomial. Expressions involving reciprocal powers are not polynomials.','B'),
(r'The product of $12a/5$ and $a^3b^4/(a^4\times4b^2)$ is',[r'$5b^2/(48a^2)$',r'$48a^2/(5b^2)$',r'$3b^2/5$',r'$b^2/(4a)$'],'6.2.2',9,'Cancel a⁴ and b² in the product to obtain 3b²/5, with the original nonzero denominators.','C'),
(r'If $(b-2c)/a=d$, $b=3$, $d=5$ and $c=-1$, then a is',['0',r'$1/5$','1','5'],'7.1.2',9,'(3+2)/a=5 gives a=1.','C'),
(r'If $a-1/a=1$, then $1/a^3-a^3$ is',['−4','−1','1','4'],'5.1.1',9,'a³−a⁻³=(a−a⁻¹)³+3(a−a⁻¹)=4. Reverse the order to obtain −4.','A'),
(r'The sum of $\sqrt{a-2}$, $\sqrt a$ and $\sqrt{a-1}$ is',[r'$\sqrt{3a}-3$',r'$\sqrt{3a-3}$',r'$3\sqrt{a-3}$',r'$\sqrt{a-2}+\sqrt a+\sqrt{a-1}$'],'1.5.1',9,'For a≥2 these real half-powers have different radicands and cannot generally be combined.','D'),
(r'The product $(a-1)(a^3+1)(a^2+a+1)$ is',[r'$(a^3+1)^2$',r'$(a^3-1)^2$',r'$a^6-1$',r'$a^6+1$'],'5.1.1',9,'The first and third factors give a³−1; multiply by a³+1 to get a⁶−1.','C'),
(r'If $s^2+(-2t)^2+(u^2)^2=16$ and $su^2-2st-2tu^2=10$, then $(s-2t+u^2)^2$ is',[r'$\sqrt{26}$','6','26','36'],'5.1.1',9,'The square is the sum of squares plus twice the pairwise products: 16+2(10)=36.','D'),
(r'The factorised form of $(x-3)^2-2(3-x)+(x-3)$ is',[r'$-x(x-3)$',r'$x(x-3)$',r'$(x+4)(x-3)$',r'$(x-4)(x-3)$'],'5.2.1',9,'Since −2(3−x)=2(x−3), take out x−3: (x−3)[x−3+2+1]=x(x−3).','B'),
(r'The factorised form of $5+50r+125r^2$ is',[r'$(1+5r)^2$',r'$(5+25r)^2$',r'$5(1+5r)^2$',r'$5(5+10r+25r^2)$'],'5.2.1',9,'Take out 5 and recognise the perfect square 1+10r+25r².','C'),
(r'The factorised form of $p^2-(h^2-2h+1)$ is',[r'$(p+h-1)(p-h-1)$',r'$(p+h-1)(p-h+1)$',r'$(p+h+1)(p-h-1)$',r'$(p-h+1)(p+h+1)$'],'5.2.1',9,'Write p²−(h−1)² and apply difference of squares.','B'),
(r'A zero of $2x^3-x-1$ is',['−1','0','1','2'],'5.4.1',9,'At x=1, 2−1−1=0; none of the other offered values is a zero.','C'),
(r'A factor of $x^3-2x+1$ is',[r'$x-2$',r'$x-1$',r'$x+1$',r'$x+2$'],'5.4.1',9,'p(1)=1−2+1=0, so x−1 is a factor.','B'),
(r'The factorised form of $1/27+27a^3$ is',[r'$(3a+1/3)(9a^2+a+1/9)$',r'$(3a+1/3)(9a^2-a+1/9)$',r'$3(a+1/3)(9a^2-a+1/9)$',r'$3(a+1/3)(9a^2+a+1/9)$'],'5.2.1',9,'Use the sum-of-cubes identity for (3a)³+(1/3)³.','B'),
(r'The factorised form of $1+4c^4$ is',[r'$(2c^2+2c+1)(2c^2-2c+1)$',r'$(2c^2-2c+1)^2$',r'$(2c^2+2c-1)(2c^2-2c+1)$',r'$(2c^2+2c+1)(2c^2-2c-1)$'],'5.2.1',9,'Complete a square: (2c²+1)²−(2c)², then apply difference of squares.','A'),
(r'If $x-1$ is a factor of $p(x)=x^3-ax^2+1$, then a is',['−2','−1','1','2'],'5.4.1',9,'p(1)=2−a=0, so a=2.','D'),
(r'Which grouping helps factorise $(x-2)(x-1)(x+2)(x+3)+15$?\nI. $(x-1)(x-2)$ and $(x+2)(x+3)$\nII. $(x-1)(x+2)$ and $(x-2)(x+3)$\nIII. $(x-1)(x+3)$ and $(x-2)(x+3)$',['I only','II only','I and III','II and III'],None,9,'II gives (x²+x−2)(x²+x−6)+15. Substitute t=x²+x to factor t²−8t+27. This preparatory factorisation task is not itself the quadratic equation specified by current 15.3.1; retain as historical. III repeats x+3 in the printed source.','B'),
(r'The matrix $\begin{bmatrix}5&0\\0&-5\end{bmatrix}$ is a/an\nI. diagonal matrix\nII. symmetric matrix\nIII. identity matrix',['I only','II only','I and II','I and III'],'18.2.1',10,'The matrix is diagonal and equal to its transpose, but not the identity.','C'),
(r'If the additive inverse of $\begin{bmatrix}-a&5\\0&0\end{bmatrix}$ is $\begin{bmatrix}-3&-5\\0&0\end{bmatrix}$, then a is',['−5','−3','3','5'],'18.3.7',10,'The inverse has first entry a, so a=−3. Printed C is corrected to B.','B'),
(r'For $A=\begin{bmatrix}1&0\\2&0\end{bmatrix}$, $B=\begin{bmatrix}1\\0\end{bmatrix}$ and $C=\begin{bmatrix}0&2\end{bmatrix}$, which products are possible?\nI. AB\nII. AC\nIII. BA',['I only','II only','I and II','II and III'],'18.4.2',10,'Only AB has matching inner dimensions: (2×2)(2×1).','A'),
(r'The determinant of $\begin{bmatrix}a&-a\\1&0\end{bmatrix}$ is',[r'$-a$','0',r'$a$',r'$2a$'],'18.5.2',10,'ad−bc=a·0−(−a)·1=a.','C'),
(r'The adjoint of $\begin{bmatrix}-1&-a\\0&1\end{bmatrix}$ is',[r'$\begin{bmatrix}1&0\\a&-1\end{bmatrix}$',r'$\begin{bmatrix}1&a\\0&-1\end{bmatrix}$',r'$\begin{bmatrix}-1&a\\0&1\end{bmatrix}$',r'$\begin{bmatrix}1&-a\\0&-1\end{bmatrix}$'],'18.5.5',10,'Swap the diagonal entries and negate the off-diagonal entries.','B'),
(r'The matrix form of $1-x+y=0$ and $x-3=0$ is',[r'$\begin{bmatrix}1&-1\\1&-3\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}0\\0\end{bmatrix}$',r'$\begin{bmatrix}-1&1\\1&-3\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}1\\0\end{bmatrix}$',r'$\begin{bmatrix}-1&1\\1&0\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}1\\-3\end{bmatrix}$',r'$\begin{bmatrix}1&-1\\1&0\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}1\\3\end{bmatrix}$'],'18.6.2',10,'Rearrange to x−y=1 and x+0y=3.','D'),
(r'For $x+y=1$ and $x-y=3$, Cramer’s rule gives y as',[r'$\begin{vmatrix}1&1\\1&3\end{vmatrix}$',r'$\frac{\begin{vmatrix}1&1\\1&3\end{vmatrix}}{\begin{vmatrix}1&1\\1&-1\end{vmatrix}}$',r'$\begin{vmatrix}1&1\\3&-1\end{vmatrix}$',r'$\frac{\begin{vmatrix}1&1\\3&-1\end{vmatrix}}{\begin{vmatrix}1&1\\1&-1\end{vmatrix}}$'],'18.6.2',10,'Replace the y coefficient column with the constants and divide by the coefficient determinant.','B'),
(r'If square matrices X and Y satisfy $XY=YX=I$, then X and Y are',['multiplicative inverses','additive inverses','transposes','singular matrices'],'18.5.8',10,'Each matrix is the multiplicative inverse of the other.','A'),
(r'The inverse of $\begin{bmatrix}2&6\\-1&-3\end{bmatrix}$ is',[r'$\begin{bmatrix}-3&-6\\1&2\end{bmatrix}$',r'$-\frac1{12}\begin{bmatrix}-3&-6\\1&2\end{bmatrix}$',r'$\frac1{12}\begin{bmatrix}-3&-6\\1&2\end{bmatrix}$','does not exist'],'18.5.7',10,'The determinant is −6+6=0, so the matrix has no inverse.','D'),
(r'In the right triangle ABC, $\angle C=90^\circ$, $\angle A=45^\circ$ and $AC=5\sqrt2$ cm. The length BC is',['5 cm','6 cm','10 cm',r'$5\sqrt2$ cm'],'14.3.1',9,'tan45°=BC/AC=1, so BC=AC=5√2 cm.','D'),
(r'In $\triangle ABC\leftrightarrow\triangle DFE$, if the triangles are congruent, the value of x is',['4','5','9','10'],None,9,'AB corresponds to DF: 2x−5=15 gives x=10. Standalone congruence matching has no direct current IX–X outcome.','D'),
(r'In $\triangle ABC\leftrightarrow\triangle EFD$, $AB=EF$, $BC=FD$ and $\angle ABC=\angle EFD$. The value of x is',['50°','61°','69°','119°'],None,9,'By SAS congruence A corresponds to E, so x=61°. No direct current IX–X outcome.','B'),
(r'In $\triangle ABC\leftrightarrow\triangle DEF$, if the triangles are congruent, the length of DF is',['6 cm','7 cm','10 cm','14 cm'],None,9,'AB=DE gives 2x−2=12 and x=7. DF corresponds to AC=x+3=10 cm. No direct current congruence outcome.','C'),
(r'The medians CD and BE intersect at O. If $OB=6$ cm and $OE=(x-1)$ cm, the value of x is',['3','4','6','7'],None,9,'A centroid divides a median 2:1 from the vertex: OE=3, giving x=4. Current median-concurrency construction does not specify this ratio; do not force that mapping.','B'),
(r'M and N are the midpoints of AB and AC. If $BC=14$ cm and $MN=(2x-1)$ cm, x is',['3 cm','4 cm','7 cm','7.5 cm'],'13.1.1',9,'The midpoint segment is 7 cm. Solve 2x−1=7 to get x=4.','B'),
(r'In parallelogram ABCD, $\angle A=(2a-10)^\circ$ and $\angle D=50^\circ$. The value of a is',['30','60','70','130'],'13.1.1',9,'Adjacent parallelogram angles sum to 180°: 2a−10+50=180, giving a=70.','C'),
('In the given diagram, BD bisects angle ABC into two 30° angles. Which statement is correct?',[r'$a=e$',r'$a=d$',r'$b=d$',r'$b=e$'],'10.1.3',9,'A point on an angle bisector has equal perpendicular distances to both sides, so a=e.','A'),
('In the given diagram, AD is the perpendicular bisector of BC. Which statement is correct?',[r'$AB=AD$',r'$AB=AC$',r'$BC=AB$',r'$AC=DC$'],'10.1.3',9,'A lies on the perpendicular bisector of BC and is therefore equidistant from B and C.','B'),
(r'In triangle RST, $\angle R=65^\circ$ and $\angle S=42^\circ$. Which statement is FALSE?',[r'$t>s$',r'$t>r$',r'$s>r$',r'$t>r>s$'],None,9,'T=73°, so the opposite sides satisfy t>r>s. Thus s>r is false. Angle-side inequalities have no direct current IX–X outcome.','C'),
('Which values of x, y and z can form the triangle shown?',['5, 5, 10','5, 6, 12','3, 1, 5','7, 7, 13'],None,9,'Only 7+7>13 satisfies the strict triangle inequality; the other choices are degenerate or impossible. No direct current IX–X outcome.','D'),
]
CROPS={'p1':{6:(2,(270,665,454,774)),9:(3,(99,379,555,736)),15:(5,(98,114,548,299)),40:(11,(170,105,533,266)),41:(11,(132,370,540,514)),42:(12,(108,136,511,246)),43:(12,(95,359,475,506)),44:(12,(138,604,503,752)),45:(13,(194,137,524,276)),46:(13,(136,378,526,501)),47:(14,(151,114,492,276)),48:(14,(215,394,541,538)),49:(15,(205,132,541,300)),50:(15,(157,402,522,555))}}

def write(path,value): path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def prepare():
 for folder in [DEST,OUT,REVIEW]:folder.mkdir(parents=True,exist_ok=True)
 docs,sources,crops={},{},[]
 for key,(name,target) in FILES.items():
  p=SOURCE/name;docs[key]=pymupdf.open(p);shutil.copyfile(p,DEST/target)
  sources[key]={'filename':name,'url':f'/materials/ssc/mathematics/ssc-1/{target}','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pages':len(docs[key])}
 for key,regions in CROPS.items():
  folder=ROOT/f'public/paper-crops/MTH-IX-2022-{key.upper()}';folder.mkdir(parents=True,exist_ok=True)
  for number,(page,box) in regions.items():
   url=f'/paper-crops/{folder.name}/q{number}.png'
   docs[key][page-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(box)).save(str(folder/f'q{number}.png'))
   # Remove clipped fragments of the preceding sentence from the crop margin;
   # these rectangles are outside the actual diagram and all of its labels.
   excluded={39:(138,500,190,515),44:(78,115,180,120)}.get(number) if key=='p1' else None
   if excluded:
    im=Image.open(folder/f'q{number}.png').convert('RGB')
    im.paste('white',tuple(round((v-box[i%2])*3) for i,v in enumerate(excluded)));im.save(folder/f'q{number}.png')
   crops.append({'paper':key,'question':str(number),'page':page,'box':box,'excludedMarginTextBox':excluded,'url':url,'sourceSha256':sources[key]['sha256']})
 keys=[]
 for page in docs['key']:
  for line in page.get_text(sort=True).splitlines():
   m=re.match(r'^\s*(\d+)\s+(.+?)\s+([A-D])\s+N\s+([1-])\s+([1-])\s+([1-])\s*$',line)
   if m:
    n,old,answer,k,u,a=m.groups();keys.append({'question':n,'oldSlo':old,'answer':answer,'level':dict(zip(['K','U','A'],[k,u,a]))})
 assert len(keys)==50 and len({k['question'] for k in keys})==50
 for k in keys:k['level']=next(level for level,v in k['level'].items() if v=='1')
 by_number={int(k['question']):k for k in keys}
 outcomes={}
 for grade in [9,10]:
  for unit in json.loads((OUT/f'ssc{1 if grade==9 else 2}_exact_syllabus.json').read_text(encoding='utf-8')):
   for sub in unit['subtopics']:
    for slo in sub['slos']:outcomes[grade,slo['code']]={**slo,'topic':unit['name'],'unitNumber':unit['unitNumber']}
 def mapping(code,grade,reason):
  slo=outcomes.get((grade,code));assert code is None or slo is not None,(grade,code)
  return {'current_slo':code,'currentSlo':code,'current_mapping':[] if not slo else [{'code':code,'description':slo['description'],'topic':slo['topic'],'grade':grade}], 'mapping_scope':{'board':'AKU-EB','grade':grade,'subject':'Mathematics'},'mappingStatus':'NO_DIRECT_OUTCOME' if not slo else 'MOVED_TO_GRADE_X' if grade==10 else 'IN_SCOPE','mappingReason':reason,'in_syllabus':bool(slo and grade==9),'out_of_syllabus':not bool(slo and grade==9),'current_syllabus_reviewed':True,'syllabusEdition':'2025; latest revision July 2026; first examined 2027','unitNumber':slo['unitNumber'] if slo else None,'unitName':slo['topic'] if slo else 'Historical syllabus / no direct current outcome','sloText':slo['description'] if slo else ''}
 def diagram(key,number):return next((c['url'] for c in crops if c['paper']==key and c['question']==str(number)),None)
 mcqs=[]
 assert len(MCQS)==50
 for n,(stem,options,code,grade,reason,solved) in enumerate(MCQS,1):
  k=by_number[n];page=next(p for p,start,end in [(2,1,6),(3,7,9),(4,10,14),(5,15,18),(6,19,24),(7,25,29),(8,30,33),(9,34,36),(10,37,39),(11,40,41),(12,42,44),(13,45,46),(14,47,48),(15,49,50)] if start<=n<=end)
  assert (solved==k['answer']) == (n not in [8,14,32]), (n,solved,k)
  crop=diagram('p1',n)
  mcqs.append({'questionNumber':n,'stem':stem.replace('\\n','\n'),'options':dict(zip('ABCD',options)),'correctOption':solved,'official_answer':k['answer'],'solved_correct_option':solved,'answerStatus':'ANSWER_CORRECTED' if n in [8,14,32] else 'VERIFIED','answer_review_note':reason if n in [8,14,32] else '','explanation':reason,'answer_origin':'Official key cross-checked independently by Codex; explanations are supplementary','originalSlo':k['oldSlo'],'slo':k['oldSlo'],'cognitiveLevel':{'K':'R'}.get(k['level'],k['level']),'originalCognitiveLevel':k['level'],'pageNumber':page,'marks':1,'diagramUrl':crop,'isDiagram':bool(crop),'sourceSha256':sources['p1']['sha256'],**mapping(code,grade,reason)})
 write(OUT/'ssc1_2022_past_mcqs.json',mcqs)
 write(OUT/'ssc1_2022_source_manifest.json',{'sources':sources,'officialKeyRows':keys,'crops':crops,'paperI':{'totalMarks':50,'durationMinutes':100,'equatedTheoryMarks':75,'note':'The source states that the 50 raw marks are equated to 75 theory marks.'},'answerCorrections':{str(q['questionNumber']):{'printed':q['official_answer'],'corrected':q['correctOption'],'reason':q['explanation']} for q in mcqs if q['answerStatus']=='ANSWER_CORRECTED'}})
 (REVIEW/'review.md').write_text('# Mathematics IX 2022 source review\n\n50 MCQs, 50 raw marks, 100 minutes. Source says raw marks are equated to 75 theory marks. Only Paper I and its key were supplied.\n\n'+ '\n'.join(f"Q{q['questionNumber']}: original SLO {q['originalSlo']}; current {q['current_slo'] or 'no direct outcome'}; {q['mappingStatus']}. {q['explanation']}" for q in mcqs),encoding='utf-8')
 print(json.dumps({'questions':len(mcqs),'crops':len(crops),'mappingCounts':{s:sum(q['mappingStatus']==s for q in mcqs) for s in ['IN_SCOPE','MOVED_TO_GRADE_X','NO_DIRECT_OUTCOME']}},indent=2))

if __name__=='__main__':prepare()
