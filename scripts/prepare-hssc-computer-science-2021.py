"""Digitise the combined 2021 theory/ATP paper and preserve its verification key."""
from pathlib import Path
import json,re,pymupdf
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/materials/hssc/computer-science'
DATA=ROOT/'data/computer-science'
def table(headers,rows):
 return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
key={}
with pymupdf.open(BASE/'computer-science-xi-2021-keys.pdf') as doc:
 for p in doc:
  for n,old,a,alt,k,u,app in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+)\s+([A-D])\s+(?:([A-D])\s+)?N\s+([-1])\s+([-1])\s+([-1])',p.get_text()):
   key[int(n)]=(old,a+(','+alt if alt else ''),'K' if k=='1' else 'A' if app=='1' else 'U')
assert len(key)==65
questions=[]
with pymupdf.open(BASE/'computer-science-xi-2021-paper-i.pdf') as doc:
 for p in list(doc)[1:]:
  starts=sorted([w for w in p.get_text('words') if 30<w[0]<80 and 85<w[1]<755 and re.fullmatch(r'\d+\.',w[4])],key=lambda w:w[1])
  lines=[l for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) if l['dir']==(1.,0.)]
  for i,w in enumerate(starts):
   n=int(w[4][:-1]);end=starts[i+1][1]-2 if i+1<len(starts) else 780
   stem=[];choices={};active=None
   for l in lines:
    x,y,_,_=l['bbox'];text=''.join(s['text'] for s in l['spans']).strip()
    if x<w[0]-1 or not w[1]-1<=y<end or not text or text==w[4] or re.match(r'H2101-|PLEASE TURN|END OF PAPER|ALTERNATE TO PRACTICAL',text):continue
    m=re.match(r'^([A-D])(?:\.\s*(.*)|$)',text)
    if m:active=m[1];choices[active]=m[2] or ''
    elif active:choices[active]=(choices[active]+' '+text).strip()
    else:stem.append(text)
   old,official,level=key[n]
   questions.append(dict(number=str(n),page=p.number+1,stem=' '.join(stem).replace('\uf0b7','\n- '),choices=choices,answer=official,officialAnswer=official,originalSlo=old,level=level,slo=None,grade=None,section='THEORY' if n<=50 else 'ALTERNATE_TO_PRACTICAL'))
 for n,page in [(30,7),(43,10),(55,13),(57,14)]:
  p=doc[page-1];folder=ROOT/'public/paper-crops/CS-XI-2021-P1';folder.mkdir(parents=True,exist_ok=True)
  p.get_pixmap(clip=pymupdf.Rect(p.get_image_info()[0]['bbox']),matrix=pymupdf.Matrix(2,2)).save(folder/f'diagram-{n}.png')
  questions[n-1]['diagramUrl']=f'/paper-crops/CS-XI-2021-P1/diagram-{n}.png'
assert [q['number'] for q in questions]==list(map(str,range(1,66)))
qs=questions
qs[14]['stem']='The number of kibibytes in 0.50 gibibyte is'
qs[5]['stem']='Which row correctly categorises manual and automatic data-capture devices?'
qs[5]['choices']={k:table(['Manual data capture','Automatic data capture'],[r]) for k,r in zip('ABCD',[['Scanner','Mouse'],['Keyboard','Magnetic card reader'],['Barcode reader','Graphics tablet'],['QR code reader','Optical character reader']])}
qs[10]['stem']='Read the printer statements.\n\nI. These printers use paper feed.\nII. These printers use dry powder ink.\nIII. These printers print the whole page in one go.\nIV. Their print head consists of nozzles.\n\nWhich row correctly categorises the statements?'
qs[10]['choices']={k:table(['Inkjet printer','Laser printer'],[r]) for k,r in zip('ABCD',[['I and II','III and IV'],['I and IV','II and III'],['III and IV','I and II'],['II and III','I and IV']])}
qs[12]['stem']='Which row shows the conventional textbook ordering of computer classes from low speed to high speed?'
qs[12]['choices']={k:table(['Low','Intermediate','High'],[r]) for k,r in zip('ABCD',[['Mainframe','Minicomputer','Microcomputer'],['Microcomputer','Minicomputer','Mainframe'],['Minicomputer','Microcomputer','Mainframe'],['Microcomputer','Mainframe','Minicomputer']])}
qs[35]['stem']='Which row correctly categorises protocols by the given OSI layers?'
qs[35]['choices']={k:table(['Application','Transport','Presentation'],[r]) for k,r in zip('ABCD',[['UDP','FTP','SSL'],['FTP','UDP','SSL'],['SSL','FTP','UDP'],['SSL','UDP','FTP']])}
qs[37]['choices']={k:v for k,v in zip('ABCD',['It consists of seven layers; it was developed by ISO.','It consists of four layers; it is an implementation of the OSI model.','It consists of four layers; it is a reference model.','It consists of seven layers; it is a layer-based model.'])}
qs[39]['choices']['D']='III and IV.'
employee='An employee table has `Employee_ID` as primary key and these fields:\n\nI. `Employee_ID`\nII. `Employee_Name`\nIII. `Employee_National_ID_Card_Number`\nIV. `Employee_Age`\nV. `Employee_Gender`\nVI. `Employee_Address`\n\n'
for n in [41,42]:qs[n-1]['stem']=employee+qs[n-1]['stem']
teacher=table(['TeacherID','FullName','JoiningDate','Salary'],[['TID230','Umer Abdullah','29/03/2016','55000'],['TID231','Sana Fatima','17/12/2019','60000'],['TID232','Mushtaq Ahmed','7/05/2017','52000']])
for n in range(52,57):qs[n-1]['stem']='Use the Teacher table.\n\n'+teacher+'\n\n'+qs[n-1]['stem']
qs[51]['stem']+='\n\nSpecifications: TeacherID is the primary key, text length 6 and cannot be empty; FullName is text length 75 and cannot be empty; JoiningDate is date; Salary is numeric.'
qs[51]['choices']={k:v for k,v in zip('ABCD',[
 'CREATE TABLE Teacher (\n  TeacherID text(6) PRIMARY KEY,\n  FullName text(75),\n  JoiningDate date,\n  Salary int\n);',
 'CREATE TABLE Teacher (\n  TeacherID text(6) NOT NULL PRIMARY KEY,\n  FullName text(75) NOT NULL,\n  JoiningDate date,\n  Salary int\n);',
 'CREATE Teacher TABLE (\n  TeacherID text() NOT NULL PRIMARY KEY,\n  FullName text() NOT NULL,\n  JoiningDate date,\n  Salary int\n);',
 'CREATE Teacher TABLE (\n  TeacherID text(6) NOT NULL PRIMARY KEY,\n  JoiningDate date,\n  FullName text(75) NOT NULL,\n  Salary int\n);'])}
store=table(['StoreID','StoreName','PhoneNumber','City'],[['S150','Super Store','11223344','Hyderabad'],['S151','Best Store','22334455','Karachi'],['S152','Galaxy Store','33445566','Lahore'],['S153','Diamond Store','44556677','Karachi'],['S154','Lucky Store','55667788','Gilgit']])
for n in range(58,63):qs[n-1]['stem']='Use the Store table.\n\n'+store+'\n\n'+qs[n-1]['stem']
headers=['Grid row','StoreID','StoreName','PhoneNumber','City']
base=[['Table','Store','Store','Store','Store']]
def select(show,criteria=None,other=None):
 return table(headers,[*base,['Sort','','','',''],['Show',*['Yes' if x else 'No' for x in show]],['Criteria',*(criteria or ['']*4)],['Or',*(other or ['']*4)]])
qs[57]['choices']={k:select(show) for k,show in zip('ABCD',[[0,0,0,0],[1,1,0,0],[1,1,1,1],[0,0,1,1]])}
qs[58]['choices']={
 'A':select([1,1,0,0],['','','','"Karachi"']),
 'B':select([1,1,1,1],['','','','"Karachi"']),
 'C':select([1,1,0,0],['','"Karachi"','','']),
 'D':select([1,1,1,1],other=['','"Karachi"','',''])}
qs[59]['choices']={
 'A':select([1,1,1,1],['< "S150"','','',''],['> "S153"','','','']),
 'B':select([1,1,1,1],['> "S150"','','',''],['< "S153"','','','']),
 'C':select([1,1,1,1],['> "S150" & < "S153"','','','']),
 'D':select([1,1,1,1],['> "S150" And < "S153"','','',''])}
def update(values,criteria,other=None):
 return table(headers,[*base,['Update To',*values],['Criteria',*criteria],['Or',*(other or ['']*4)]])
qs[60]['choices']={
 'A':update(['','"Silver Store"','',''],['','"S151"','','']),
 'B':update(['','"Silver Store"','',''],['"S151"','','','']),
 'C':update(['"Silver Store"','','',''],['','','',''],['"S151"','','','']),
 'D':select([1,1,1,1],['','"Silver Store"','',''],['"S151"','','',''])}
def delete(criteria,other=None):
 return table(headers,[*base,['Delete','Where','Where','Where','Where'],['Criteria',*criteria],['Or',*(other or ['']*4)]])
qs[61]['choices']={
 'A':delete(['"S151"','','',''],['','"S152"','','']),
 'B':delete(['"S151" And "S152"','','','']),
 'C':delete(['','','22334455 And 33445566','']),
 'D':delete(['','','22334455',''],['','','33445566',''])}
notes='''Dot-matrix and chain printers strike an inked ribbon; inkjet and laser printers do not use impact printing.
A scanner captures the diary page as an image; OCR/handwriting recognition may additionally convert the captured handwriting into editable text. A mouse or touchpad does not scan text and a printer outputs it.
A touchpad is the usual built-in laptop pointing device; a mouse is normally external and a trackball/light pen is not the common built-in device.
Linux is open source; the other named software products are proprietary in this question.
The ALU performs arithmetic and logical operations during processing, rather than the input, output or storage stages.
A keyboard is manual input and a magnetic-card reader automatically captures encoded data. Other rows reverse categories or put an automatic reader in the manual column.
A router contains processing, memory and software for forwarding traffic; the other choices are primarily input peripherals under the textbook classification.
The intended historical textbook answer is minicomputers, traditionally used for industrial process control. Modern systems commonly use microcontrollers, PLCs and industrial PCs; the answer is not a universal statement about current installations.
File compression is a utility function. Drivers control devices, an OS manages resources and productivity applications support user tasks.
A microphone transduces sound to an analogue signal that needs analogue-to-digital conversion for processing. A speaker is output; keyboard and touchpad provide digital input. USB microphones may contain their own converter.
B is the intended comparison: inkjets use nozzles and lasers use toner with page-based imaging. Statement I is not exclusive to inkjets: both technologies feed paper. The table should not be read as saying lasers do not use paper feed.
The temporary user-selected defrost duration is held in RAM. The appliance's persistent control firmware can reside in ROM/flash; that is different from a current user setting.
B is the conventional historical microcomputer–minicomputer–mainframe hierarchy assumed by the paper. Actual speed depends on specific hardware and workload, so the category names alone do not establish a modern performance ranking.
A microcomputer such as a laptop/desktop is suitable for showing a video through a projector; a supercomputer or mainframe is unnecessary.
One GiB is 1024 MiB and each MiB is 1024 KiB. Half a GiB is 524288 KiB, not 128, 512 or 131072 KiB.
RAM is readable and writable working memory; true ROM is not writable working storage and discs are secondary devices accessed through controllers.
SRAM offers low-latency access and needs no periodic refresh, making it suitable for cache. It is more expensive and uses more transistors per bit than DRAM.
Cache and ROM are primary memory in the textbook classification. The other pairs each include an optical, magnetic or removable secondary-storage device.
The key chooses DVD-RW, but 8 GB capacity requires a suitable disc format and no overwriting is stated. A suitable multisession DVD-R can append data too. The disc layers/capacity and write mode are unspecified, so the original wording has no unique answer.
Registers are directly used inside the CPU; CD-ROM, DVD-ROM and USB flash storage require I/O operations.
POST is firmware traditionally stored in ROM and now commonly rewritable flash. Registers and cache are working storage and a hard disk is not the intended firmware location.
A single processor register has the smallest normal capacity among a register, cache, RAM and compact disc.
A conventional DRAM cell uses a transistor and a capacitor. A processor is not a memory-cell component and modern DRAM does not use vacuum tubes.
Using decimal SI prefixes, 2 PB equals 2 times 1000000 GB, or 2000000 GB. Binary PiB and GiB are different units.
Secondary storage is accessed through I/O controllers/channels; it is normally nonvolatile and less costly per byte and is not invariably smaller.
The official verification key accepts A and C. Cache placement is architecture-dependent; many modern processors integrate L1, L2 and L3, but no option lists all three. A unique single-answer key cannot be established without a processor specification.
In historical classful addressing a first octet of 192 falls in class C (192–223). Modern routing uses CIDR rather than classful allocation.
A default class A mask has an 8-bit network portion and 24 host bits. The question asks about that historical classful scheme.
The conventional textbook mapping places OSI session and presentation functions alongside application functions in the TCP/IP application layer; physical/network and transport are not the requested pair.
The diagram branches hierarchically from a root through intermediate nodes, so it is a tree topology rather than a common bus, single central star or mesh.
Broadcast TV reception is simplex: the station transmits and the home antenna receives. Duplex would require communication in both directions; serial/parallel describe a different classification.
Synchronous transmission sends a synchronised continuous bit stream/blocks rather than adding start and stop bits around each individual asynchronous character. D is the intended comparison, not a claim that frame boundaries never exist.
A PAN normally covers a person's immediate surroundings, smaller than a LAN or WAN. IAN is not a consistently defined size class in this comparison.
A wireless keyboard connected to its nearby computer forms a personal-area network; the other labels do not describe the ordinary peripheral link.
The paper's intended term is a near-me-area network: a logical proximity-oriented network over existing infrastructure. A LAN/WAN is classified by network scope and a PAN usually concerns a person's nearby devices.
FTP is an application protocol and UDP is transport. SSL is placed at the presentation layer in the textbook analogy, although real TLS/SSL sits above transport and is not a native OSI presentation protocol. Only B preserves the intended ordering.
The textbook tree combines star segments with a bus/backbone; the other pairings do not describe that construction.
Correct C replaces printed B. The conventional TCP/IP reference model has four layers; it is not an implementation of the OSI protocol suite. A and D incorrectly specify seven layers.
Under the broad SQL/Access classification in this paper, retrieving, inserting and deleting records are data manipulation; deleting database objects is DDL. Some curricula classify SELECT separately as DQL; the current mapping records this terminology difference.
A tuple is a record/row, a collection of related field values. Attribute and column describe fields, not rows.
A national identity-card number is the best candidate among the offered fields, assuming one unique valid number per employee. Name, age and gender do not uniquely identify a person. A candidate key must be both unique and minimal.
Employee_Age is numeric. Name, gender and address are textual; a national identity number should generally be text to preserve formatting and leading zeros.
The endpoint shows optional one: cardinality (maximum) one and modality (minimum) zero. Zero is not a maximum cardinality in this notation.
A comma-separated SELECT list projects CarModel and CarPrice from Cars. The other choices use malformed stars, AND or parentheses in the projection.
SELECT * FROM Clients WHERE City = 'Karachi' returns all columns of matching rows. The other options have invalid literal or clause syntax.
B is the only valid listed query for income strictly greater than 50000 and less than 75000. If the endpoints are intended to be inclusive use BETWEEN 50000 AND 75000; no printed option expresses that. A misuses OR, C has invalid clauses and D uses =< instead of <=.
ALTER TABLE Stores ADD ContactNumber INT is the valid offered column-addition syntax. In practical design telephone numbers should normally be text to preserve plus signs and leading zeros.
No printed option is a complete correct validation rule. The key C contains only the string "J???"; Access needs Like "J???" for a four-character pattern beginning J (ANSI-89 mode). Without Like it tests equality with that literal, not the intended pattern. Use Like "J___" for the corresponding ANSI-92 wildcard mode.
A SELECT query retrieves rows; DELETE, UPDATE and APPEND modify stored rows.
An append query inserts records into an existing table. SELECT retrieves, DROP removes an object and make-table creates a new table.
Making both linked fields primary keys enforces uniqueness at both ends and is a sufficient method for the proposed one-to-one relationship. Unique candidate-key indexes can also achieve one-to-one; both fields need not always be primary keys.
B has correct CREATE TABLE order, lengths and required NOT NULL constraints. A omits the required FullName constraint; C and D reverse CREATE TABLE syntax, and C omits text lengths.
C has the intended comma-separated SET assignments and quoted key. For portable Access date handling prefer a parameter or an explicit date literal: UPDATE Teacher SET JoiningDate = #04/29/2016#, Salary = 65000 WHERE TeacherID = 'TID230';. The printed date string relies on locale conversion. A and B misuse SET/AND; D has an invalid key literal.
Descending JoiningDate gives 17/12/2019, 7/05/2017, 29/03/2016: Sana, Mushtaq, Umer. Descending salary, name or ID would give a different order.
The checkbox column represents a Yes/No Boolean field, not memo text, a hyperlink or an OLE object.
DROP TABLE Teacher removes the table. DELETE is for rows and the other statements put TABLE in the wrong position.
The form displays one record with labels and inputs stacked vertically, which is a columnar layout; it is not a multirow datasheet/tabular form.
Only C checks Show for all four fields and has no filtering criteria. A hides all fields, B shows only ID/name and D shows only phone/city.
A checks Show only for StoreID and StoreName and applies the Karachi criterion to City. B shows extra fields; C and D put Karachi in StoreName.
D uses AND to require StoreID greater than S150 and less than S153. It returns S151/S152 and excludes the endpoints. If between is intended inclusively, use Between "S150" And "S153"; no printed option does that. A selects outside the range, B ORs two inequalities and C uses string concatenation instead of logical AND.
B updates StoreName to Silver Store only where StoreID is S151. A tests the ID in StoreName, C changes the primary-key field and D is a SELECT rather than an UPDATE query.
Correct D replaces printed B for the supplied table: its two PhoneNumber values are on separate OR rows and match exactly the S151 and S152 records. B requires one StoreID to equal two different strings simultaneously and matches none. A applies S152 to StoreName and C ANDs distinct phone numbers. The more robust intended ID filter is StoreID In ("S151", "S152") or two OR rows under StoreID.
Access reports obtain their data from tables and/or queries; forms and relationship definitions are not the intended report record sources.
Design View is the expected table-structure editor. Some newer Access versions also allow limited type changes from Datasheet View; the question follows the design-view workflow.
SELECT * FROM Cars selects all attributes and rows. The other choices misuse ALL or the TABLE keyword in the FROM clause.'''.splitlines()
assert len(notes)==65,len(notes)
xi={30:'1.5.2',37:'1.5.2'}
xii={39:'11.11.2',41:'11.9.4',44:'11.11.4',45:'11.11.4',46:'11.11.4',47:'11.9.5',49:'11.11.2',50:'11.11.3',51:'11.9.4',52:'11.9.5',53:'11.11.3',54:'11.11.4',56:'11.9.5',58:'11.11.4',59:'11.11.4',60:'11.11.4',61:'11.11.3',62:'11.11.3',65:'11.11.4'}
for q,note in zip(qs,notes):
 n=int(q['number']);q['explanation']=note
 if n in [19,26,48]:q['answer']=None
 if n==38:q['answer']='C'
 if n==62:q['answer']='D'
 if n in xi:q.update(slo=xi[n],grade=11)
 if n in xii:q.update(slo=xii[n],grade=12)
 q['feedback']=[dict(key=k,reason=('Correct. ' if k==q['answer'] else 'Not uniquely scorable. ' if not q['answer'] else f"Incorrect; the correct option is {q['answer']}. ")+note) for k in 'ABCD']
 if n in [44,45,46,47,48,52,53,56,65]:q['choices']={k:'```sql\n'+v+'\n```' for k,v in q['choices'].items()}
 for k,v in q['choices'].items():
  if any(t in v for t in ['CD-ROM','DVD-R','I/O']):q['choices'][k]='`'+v+'`'
 q['stem']=q['stem'].replace('TCP/ IP','`TCP/IP`')
 assert q['stem'] and set(q['choices'])==set('ABCD') and all(q['choices'].values()),n
(DATA/'hssc_xi_2021_mcqs.json').write_text(json.dumps(qs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('65 MCQs reviewed: 62 scored, 3 held; 50 theory + 15 ATP; 4 diagram crops.')
