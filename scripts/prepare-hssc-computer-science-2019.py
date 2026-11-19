"""Extract 2019 HSSC-I Computer Science questions and preserve the official key."""
from pathlib import Path
import json,re,pymupdf
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/materials/hssc/computer-science'
URL='/materials/hssc/computer-science/'
def table(headers,rows):
 return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
def crop(doc,n,page,rect):
 folder=ROOT/'public/paper-crops/CS-XI-2019-P1';folder.mkdir(parents=True,exist_ok=True)
 name=f'diagram-{n}.png';doc[page-1].get_pixmap(clip=pymupdf.Rect(rect),matrix=pymupdf.Matrix(2,2)).save(folder/name)
 return '/paper-crops/CS-XI-2019-P1/'+name
key={}
with pymupdf.open(BASE/'computer-science-xi-2019-keys.pdf') as doc:
 for n,answer,level in re.findall(r'(\d+)\s+([A-D](?:,[A-D])?|\*)\s+([UKA])',doc[0].get_text()):key[int(n)]=('',answer,level)
assert len(key)==30
questions=[]
with pymupdf.open(BASE/'computer-science-xi-2019-paper-i.pdf') as doc:
 for p in list(doc)[1:]:
  starts=sorted([w for w in p.get_text('words') if 30<w[0]<80 and 85<w[1]<755 and re.fullmatch(r'\d+\.',w[4])],key=lambda w:w[1])
  lines=[l for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) if l['dir']==(1.,0.)]
  for i,w in enumerate(starts):
   n=int(w[4][:-1]);end=starts[i+1][1]-2 if i+1<len(starts) else 780
   stem=[];choices={};active=None
   for l in lines:
    x,y,_,_=l['bbox'];text=''.join(s['text'] for s in l['spans']).strip()
    if x<w[0]-1 or not w[1]-3<=y<end or not text or text==w[4] or re.match(r'H1901-|PLEASE TURN|END OF PAPER',text):continue
    m=re.match(r'^([A-D])\.\s*(.*)$',text)
    if m:active=m[1];choices[active]=m[2]
    elif active:choices[active]=(choices[active]+' '+text).strip()
    else:stem.append(text)
   old,official,level=key[n]
   questions.append(dict(number=str(n),page=p.number+1,stem=' '.join(stem).replace('\uf0b7','\n- '),choices=choices,answer=official,officialAnswer=official,originalSlo=old,level=level,slo=None,grade=None))
assert len(questions)==30
qs=questions
qs[2]['stem']='Omar travels to Sukkur for a workshop. He must:\n\n- Show a presentation to 25 participants.\n- Play an audio clip.\n- Photograph the workshop.\n- Email the photographs to his manager.\n\nWhich set of devices, besides his laptop, supports all these tasks?'
qs[3]['stem']='Consider these features:\n\n- Short access time.\n- Temporary data storage.\n- Used for computer cache.\n\nWhich type of memory has these features?'
qs[4]['stem']='Which software performs all these functions?\n\n- File management.\n- Memory management.\n- Processor management.\n- Input and output device management.'
qs[7]['stem']=qs[7]['stem'].replace('RS-232','`RS-232`')
qs[8]['stem']='Which row correctly differentiates client–server and peer-to-peer network models?'
qs[8]['choices']={k:table(['Client–server','Peer-to-peer'],[r]) for k,r in zip('ABCD',[['Hard to manage','Easy to manage'],['Centralised','Decentralised'],['Inexpensive to implement','Expensive to implement'],['Suitable for few users','Suitable for many users']])}
qs[12]['stem']='Which row gives correct examples of the three data-communication modes?'
qs[12]['choices']={k:table(['Simplex','Half-duplex','Full-duplex'],[r]) for k,r in zip('ABCD',[['Radio broadcast','Walkie-talkie','Telephone'],['Telephone','Radio broadcast','Walkie-talkie'],['Walkie-talkie','Radio broadcast','Telephone'],['Radio broadcast','Telephone','Walkie-talkie']])}
qs[15]['stem']='Which row correctly differentiates conventional serial and parallel communication?'
qs[15]['choices']={k:table(['Serial','Parallel'],[r]) for k,r in zip('ABCD',[['Expensive to implement','Cheap to implement'],['Multiple bits at once','One bit at a time'],['Fast data communication','Slow data communication'],['Used over long distances','Used over short distances']])}
with pymupdf.open(BASE/'computer-science-xi-2019-paper-i.pdf') as doc:
 qs[14]['stem']='Which image has the lowest resolution?'
 for i,k in enumerate('ABCD'):
  rect=doc[4].get_image_info()[i]['bbox'];url=crop(doc,f'15-{k}',5,rect);qs[14]['choices'][k]=f'![Resolution sample {k}]({url})'
qs[26]['choices']={k:'```text\n'+v+'\n```' for k,v in zip('ABCD',[r'D:\MyData\MyFiles\NewFile.xls',r'D:\MyFiles\MyData\NewFile.xls',r'D:\\MyData\MyFiles\NewFile.xls',r'D:\\MyFiles\MyData\NewFile.xls'])}
qs[26]['stem']='NewFile.xls is saved in MyFiles, which is inside MyData on drive D. Which path opens the file?'
qs[27]['stem']='Which sequence correctly inserts WordArt into an MS Word document?'
qs[27]['choices']={k:'\n'.join(f'{i+1}. {step}' for i,step in enumerate(steps)) for k,steps in zip('ABCD',[
 ['Click Insert','Click WordArt in the Text group','Select a character style','Type and format the text'],
 ['Click WordArt in the Text group','Click Insert','Select a character style','Type and format the text'],
 ['Select a character style','Click WordArt in the Text group','Click Insert','Type and format the text'],
 ['Type and format the text','Click Insert','Click WordArt in the Text group','Select a character style']])}
qs[28]['stem']='Consider the Excel sheet below.\n\n'+table(['Row','A','B','C'],[[str(i+1),str(5*(i+1)),str(4+2*i),str(1+2*i)] for i in range(6)])+'\n\nWhich formula sums cells A1, A2, A3, A4, A5 and B2 to give 81?'
qs[28]['choices']={k:'```text\n'+v+'\n```' for k,v in zip('ABCD',['=ADD(A1:A5:B2)','=ADD(A1:A5,B2)','=SUM(A1:A5:B2)','=SUM(A1:A5,B2)'])}
notes='''The conventional data-processing cycle has input, processing, output and storage: four stages. The other counts omit or add stages to this model.
Microsoft Access is a database-management application. PowerPoint is presentation software, Word is a word processor and Excel is primarily a spreadsheet.
A projector presents to the group, speakers play audio, a camera captures photographs and a network interface supports emailing. A microphone records input rather than playing audio; printers and scanners do not replace the required devices.
SRAM is volatile, fast working memory commonly used for cache. DRAM needs refresh and is normally slower; ROM and flash are nonvolatile.
An operating system manages files, memory, processors and I/O devices. Utilities perform narrower maintenance tasks, applications serve users and compilers/interpreters translate or execute code.
Maintenance changes an operational system to correct problems, adapt it or keep it effective. Testing checks behaviour, debugging locates/removes faults and initial problem analysis defines requirements.
A bridge, modem and a dedicated firewall appliance can be network hardware. A monitor or scanner is not a network-interconnection device. Firewalls can also be software; the answer assumes an appliance.
RS-232 specifies electrical/signalling/interface properties at the physical layer. It does not define data-link addressing, network routing or transport services.
A client–server design centralises services in servers; a peer-to-peer design distributes roles among peers. The other rows reverse the usual cost, scale or management comparison.
In a simple ring each node connects to its two neighbours. A star uses a central node, a bus a shared backbone and a tree a branching hierarchy.
The receiving computer encounters incoming signals at the physical layer first and then processes higher layers. Application, transport and network are not the first receiving layer.
The printed key withdraws this question with an asterisk, but the wording has a clear answer: B, an ordinary Ethernet switch, forwards frames at the data-link layer. A router primarily routes at the network layer; cables and connectors belong to the physical medium. This reviewed answer is supplied independently of the withdrawn board key.
Radio broadcast is one-way/simplex, a walkie-talkie alternates directions/half-duplex and a telephone permits simultaneous two-way/full-duplex speech. Other rows mismatch the examples.
The official key accepts both buffer and jacket. Both protect fibre at different structural levels: the buffer protects the fibre and the outer jacket protects the cable assembly. The broad wording does not select one uniquely, so this is excluded from single-answer scoring.
Image B has the coarsest visible pixel blocks and therefore the lowest spatial resolution among the supplied images. Judge resolution from pixel detail rather than printed image size alone.
D is the intended conventional comparison: serial links are suitable for longer distances, whereas traditional parallel buses are used over shorter distances because of skew/crosstalk. B reverses the bit-transfer definitions; A and C make unsupported universal cost/speed claims.
Bandwidth in this networking context means the maximum link data-transfer capacity. Baseband is a signalling concept, full duplex a direction mode and modulation a carrier-encoding process.
Coaxial cable is the conventional cable-TV distribution medium meant by this historical question. Modern networks may also use fibre in hybrid or all-fibre systems.
A spreadsheet can calculate percentages and graph numeric student marks. A word processor, graphics package or presentation application is less directly suited to the data calculations.
Compromise of privacy is the relevant online-banking risk among the listed choices, involving disclosure of personal/financial data. Cost, delay and availability are not the intended principal concern in this question.
CAD is used for engineering product designs such as cars. Maps are normally associated with GIS/cartography, posters with graphics/design and presentations with presentation tools.
An online buyer cannot physically inspect or try the product before delivery. Price comparisons and reviews are benefits; e-commerce still needs fulfilment/payment infrastructure.
The write control signal travels on the control bus. The data bus carries the data values; serial and parallel ports are peripheral interfaces rather than the requested control-signal path.
In the accumulator-based CPU model assumed by the paper, the arithmetic result is held in the accumulator. PC holds the next instruction address, IR the instruction and the data buffer stages memory transfers. Specific real architectures may use other result registers.
The fetched instruction is ultimately placed in the instruction register for decoding. It may pass through a memory/data buffer first; PC holds an address and flag registers hold status bits.
A Trojan disguises malicious functionality as useful/legitimate software. Self-replication is characteristic of worms or viruses, and a boot-sector infection is a particular virus behaviour rather than the Trojan definition.
A follows drive D, folder MyData, subfolder MyFiles and file NewFile.xls with single Windows path separators. B reverses the folders; C and D introduce an extra separator after the drive in the offered syntax.
Use Insert, then WordArt, choose a style, and enter/format the text. The other sequences attempt later actions before opening the required ribbon control.
SUM(A1:A5,B2) adds 5+10+15+20+25+6=81. Excel has no ordinary ADD function; the offered chained-colon reference is not the intended disjoint sum.
The printed key chooses spark, but spark is only a label within the email domain spark.edu. The full domain is not offered, and an email domain need not identify a unique mail-server hostname. The wording is technically incomplete, so this item is held out of scored quizzes.'''.splitlines()
assert len(notes)==30
maps={6:'1.4.1',10:'1.5.2',20:'1.7.2',26:'1.8.1'}
for q,note in zip(qs,notes):
 n=int(q['number']);q['explanation']=note
 if n==12:q['answer']='B'
 if n in [14,30]:q['answer']=None
 if n in maps:q.update(slo=maps[n],grade=11)
 q['feedback']=[dict(key=k,reason=('Correct. ' if k==q['answer'] else 'Not uniquely scorable. ' if not q['answer'] else f"Incorrect; the correct option is {q['answer']}. ")+note) for k in 'ABCD']
 assert q['stem'] and set(q['choices'])==set('ABCD') and all(q['choices'].values()),n
(ROOT/'data/computer-science/hssc_xi_2019_mcqs.json').write_text(json.dumps(qs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

written=[]
def add(n,page,marks,stem,answer,mapping=None):written.append(dict(number=n,page=page,marks=marks,stem=stem,answer=answer,mapping=mapping))
add('1',2,5,'a. CRT monitors are being replaced by LCD monitors in homes and offices. Give THREE reasons. (3 marks)\n\nb. Name TWO operating systems other than Windows. (2 marks)','a. LCD monitors are thinner/lighter, normally consume less power and produce less heat than comparable CRT displays. Each is a distinct practical advantage.\n\nb. Linux and macOS (other valid examples include Android and FreeBSD).')
add('2',2,5,'a. Identify each printer characteristic as dot matrix or laser. (2 marks)\n\n'+table(['No.','Characteristic'],[['1','Uses paper with holes along both sides for feeding'],['2','Non-impact printing'],['3','Page-based printing'],['4','Low-quality output at a slow print rate']])+'\n\nb. State true/false and show working for each statement. No marks without working. (3 marks)\n\n1. A 4 GB flash drive can store 130 sound files of 50 MB each.\n2. An 8 megabit/s link transfers 10 MB in 10 seconds.\n3. A 1.5 TB hard disk has 1500000 MB capacity.','a. 1: Dot matrix; 2: Laser; 3: Laser; 4: Dot matrix (the conventional printer types in the paper).\n\nb. Using decimal SI units consistently:\n\n1. False: 130 × 50 MB = 6500 MB = 6.5 GB, greater than 4 GB.\n2. True under the ideal no-overhead assumption: 10 MB × 8 = 80 Mb; 80 Mb ÷ 8 Mb/s = 10 s.\n3. True: 1.5 TB × 1000000 MB/TB = 1500000 MB.\n\nConvention note: the source examples mix decimal and binary conversion conventions. Under binary-sized equivalents, 4 GiB is 4096 MiB, the second transfer is 10.48576 s if MB means MiB but link rate is decimal, and 1.5 TiB is 1572864 MiB. State the convention rather than mixing factors.')
add('3',3,5,'Describe FIVE advantages of setting up a computer network in an office.','1. Share printers/storage to reduce duplicated equipment.\n2. Share authorised files and collaborate on common documents.\n3. Communicate through email or internal messaging.\n4. Centrally administer user permissions and software.\n5. Centrally back up shared data and simplify recovery.\n\nThese are advantages of connecting computers; security and reliable backup still require proper configuration.')
add('4',4,5,'Differentiate LAN and WAN on speed, security, setup cost, coverage area and transmission errors.',table(['Feature','Typical LAN','Typical WAN'],[['Speed','Often high local bandwidth and low latency','Performance depends on provider, link and distance; typically greater latency'],['Security','Usually one organisation administers local access','Crosses wider/shared infrastructure; needs suitable authentication and encryption'],['Setup cost','Usually lower within one site','Usually higher for connecting dispersed sites and leased/provider links'],['Coverage','Room, building or campus','Cities, countries or wider geographic regions'],['Transmission errors','Short controlled links may face fewer impairments','Longer/more complex paths can face more impairments; actual error rate depends on link technology']])+'\n\nThese are conventional comparisons, not absolute laws. A well-engineered WAN can be fast and secure, and a misconfigured LAN can be insecure.')
add('5',5,6,'Define bandwidth, modulation, guided media, baseband signal, serial transmission and synchronous transmission.','- Bandwidth: in the question’s networking usage, maximum data-transfer capacity, measured in bits per second; analogue frequency bandwidth is measured in hertz.\n- Modulation: varying a carrier property such as amplitude, frequency or phase according to information.\n- Guided media: physical transmission paths such as twisted pair, coaxial cable and optical fibre.\n- Baseband signal: the original/unshifted information signal; baseband transmission sends it without translating it to a higher-frequency carrier.\n- Serial transmission: sending the bits of a data stream sequentially on a channel.\n- Synchronous transmission: coordinated timing permits reception of a continuous stream or framed blocks without separate start/stop bits for each character.')
add('6',6,5,'CAD creates drawings/designs used by CAM to control machine tools. Describe FIVE CAD features relevant to this task.','1. Draw accurate two-dimensional geometry and three-dimensional models.\n2. Specify exact dimensions, units and tolerances.\n3. Edit, copy, rotate and scale design components efficiently.\n4. View, render and inspect models from different angles/sections.\n5. Export suitable model/design data for CAM toolpath planning.\n\nCAM uses geometry and manufacturing settings to generate machine instructions; a drawing alone does not specify every machining parameter.')
add('7',6,5,'Describe FIVE distinct word-processor features useful to a teacher.','1. Spell/grammar checking helps proofread worksheets and letters.\n2. Find and replace edits repeated terms efficiently.\n3. Mail merge creates personalised letters from a recipient list.\n4. Tables organise timetables or marks.\n5. Styles/templates apply consistent headings and layouts to tests and handouts.\n\nName and describe actual functions rather than generic claims such as fast or reliable.')
add('8',7,4,'Ahmed uses the keyboard in Word. Text box A contains upright “I love Pakistan”; B contains italic “I Love Pakistan”. Give shortcuts to:\n\na. Make A match B. (1 mark)\nb. Change B’s font size from 15 to 11. (1 mark)\nc. Underline B’s text. (1 mark)\nd. Restore accidentally deleted text. (1 mark)','Select the intended text before applying formatting.\n\na. Ctrl+I toggles italics and matches the intended visual difference. The source also changes lowercase love to Love; Ctrl+I does not change that spelling/capitalisation, which needs a separate edit if an exact text match is required.\nb. Ctrl+Shift+P, type 11, Enter sets the exact size. Alternatively press Ctrl+[ four times to decrease 15 → 14 → 13 → 12 → 11. The official single Ctrl+[ reduces by only one point and does not alone reach 11.\nc. Ctrl+U toggles underlining.\nd. Ctrl+Z undoes the deletion, assuming it is the most recent action.')
participants=[['3','Mubashir Ahmed','Bright Light School','M','32','MA'],['4','Rana Asad','New Horizon School','M','26','MA'],['5','Fatima Khan','Pure Pakistani School','F','29','BA'],['6','Shumaila Ali','The Best School','F','30','MA'],['7','Aqeel Ahmed','New Horizon School','M','28','BA'],['8','Amna Siddiqui','Bright Light School','F','27','MA'],['9','Javed Ahmed','The Best School','M','31','MA']]
add('9',8,5,'The spreadsheet has its title in row 1, column headings in row 2 and the following data in rows 3–9.\n\n'+table(['Row','A: Name','B: School','C: Gender','D: Age','E: Qualification'],participants)+'\n\nWrite Excel functions with ranges to calculate:\na. Total participants.\nb. Average age.\nc. Youngest age.\nd. Number qualified MA.\ne. Number aged at least 30.\n(1 mark each)','a.\n```text\n=COUNTA(A3:A9)\n```\nResult: 7. COUNT(A3:A9), printed in the source commentary, does not count these text names. COUNT(D3:D9) is also valid here because every participant has a numeric age.\n\nb.\n```text\n=AVERAGE(D3:D9)\n```\nResult: 29.\n\nc.\n```text\n=MIN(D3:D9)\n```\nResult: 26.\n\nd.\n```text\n=COUNTIF(E3:E9,"MA")\n```\nResult: 5.\n\ne.\n```text\n=COUNTIF(D3:D9,">=30")\n```\nResult: 3. The official commentary’s COUNT(D3:D9,">=30") does not apply a condition and is incorrect.')
add('10a',9,10,'i. Complete the blank block diagram, using these term numbers: 1 Control unit; 2 Memory unit; 3 ALU; 4 Register; 5 Input unit; 6 Output unit. Solid lines show data flow and dashed lines show control. (5 marks)\n\nii. Give TWO differences between RAM and ROM. (2 marks)\n\niii. Explain the data, address and control buses. (3 marks)','i. Diagram positions: upper-left 5 (Input), upper-middle 2 (Memory), upper-right 6 (Output), centre 3 (ALU), bottom 1 (Control). Term 4 (Register) is unused in the five-box diagram.\n\nii. RAM is normally read/write volatile working memory; ROM retains data without power and normally holds persistent firmware that is not changed during routine execution. Both can be read; EEPROM/flash-based firmware can be updated using appropriate procedures.\n\niii. Data bus carries data/instructions between components; address bus carries the address of the memory or I/O location to access; control bus carries operation/timing/status signals such as read, write and interrupts. A bus transports signals; it does not itself store data.')
add('10b',11,10,'i. Describe SIX different computer crimes. (6 marks)\n\nii. List FOUR data-protection rules to keep data safe. (4 marks)','i. Examples:\n\n1. Unauthorised access: entering a computer/account without permission.\n2. Phishing: deceptive messages/sites used to steal credentials or information.\n3. Deliberate malware distribution: deploying malicious software to damage or compromise systems.\n4. Data theft: taking confidential records without authorisation.\n5. Software piracy: unauthorised copying/distribution that infringes software copyright.\n6. Online fraud: using computer systems to deceive others into giving up money or assets.\n\nii. Apply least-privilege access and strong unique passwords with MFA; patch supported operating systems/apps; maintain tested backups with an offline/protected copy; use updated anti-malware and avoid untrusted downloads/attachments.\n\nThe question asks for six crimes and four protections. Examples of harmful conduct should not be confused with legitimate defensive tools. Password changes are warranted after compromise; forced frequent changes alone do not replace strong unique credentials.', '11:1.8.1,11:1.8.2')
# Crop only the real question diagram; its surrounding question is typed above.
with pymupdf.open(BASE/'computer-science-xi-2019-paper-ii.pdf') as doc:
 folder=ROOT/'public/paper-crops/CS-XI-2019-P2';folder.mkdir(parents=True,exist_ok=True)
 doc[8].get_pixmap(clip=pymupdf.Rect(73,168,564,344),matrix=pymupdf.Matrix(2,2)).save(folder/'diagram-10a.png')
written[-2]['diagramUrl']='/paper-crops/CS-XI-2019-P2/diagram-10a.png'

from PIL import Image,ImageDraw
em=pymupdf.open(BASE/'computer-science-xi-2019-emarking.pdf')
folder=ROOT/'public/paper-crops/CS-XI-2019-P2'
def response(n,kind,parts):
 images=[]
 for page,index in parts:
  p=em[page-1];pix=p.get_pixmap(clip=pymupdf.Rect(p.get_image_info()[index]['bbox']),matrix=pymupdf.Matrix(2,2));images.append(Image.frombytes('RGB',[pix.width,pix.height],pix.samples))
 canvas=Image.new('RGB',(max(i.width for i in images),sum(i.height for i in images)+16*(len(images)-1)),'white');y=0
 for im in images:canvas.paste(im,(0,y));y+=im.height+16
 name=f'q{n}-{kind}.png';canvas.save(folder/name)
 return '/paper-crops/CS-XI-2019-P2/'+name
crops=[
 ('1',[(2,0),(3,0)],[(2,1),(3,1)]),
 ('2',[(4,0),(5,0)],[(4,1),(6,0)]),
 ('3',[(7,0),(7,1)],[(7,2)]),
 ('4',[(8,0)],[(9,0)]),
 ('5',[(10,0)],[(10,1)]),
 ('6',[(11,0)],[(12,0),(12,1)]),
 ('7',[(12,2)],[(13,0)]),
 ('8',[(14,0),(14,1),(14,2),(14,3)],[(14,4),(14,5),(14,6),(15,0)]),
 ('9',[(15,2),(16,0),(16,1),(16,2),(16,3)],[(16,4),(16,5),(17,0),(17,1),(17,2)]),
 ('10a',[(19,0),(19,1),(19,2)],[(20,0),(20,1),(21,0)]),
 ('10b',[(21,1),(22,0),(23,0),(23,1)],[(22,1),(23,2)]),
]
alltext='\n'.join(p.get_text() for p in em)
# Capture genuine descriptive paragraphs, not the printed question boxes.
starts=list(re.finditer(r'Question\s+(\d+[ab]?)(?:\s*\([iv]+\))?\s*:',alltext))
for q,(n,strong,weak) in zip(written,crops):
 matching=[m.start() for m in starts if m.group(1).rstrip('ab')==n.rstrip('ab') and (n not in ['10a','10b'] or m.group(1)==n)]
 first=min(matching);end=next((m.start() for m in starts if m.start()>first and m.group(1).rstrip('ab')!=n.rstrip('ab')),len(alltext))
 if n=='10a':end=next(m.start() for m in starts if m.group(1)=='10b')
 section=alltext[first:end]
 flat=re.sub(r'\s+',' ',section)
 def commentary(kind):
  chunks=re.findall(kind+r' responses[, ]+(.*?)(?=Example|Weaker responses|Better responses|Question |Page \d+ of|\Z)',flat)
  return '\n\n'.join(kind+' responses '+c.strip() for c in chunks if c.strip())
 q['better']=commentary('Better');q['weaker']=commentary('Weaker')
 if n in ['8','9']:
  q['better']='```text\n'+q['better']+'\n```';q['weaker']='```text\n'+q['weaker']+'\n```'
 q['officialNotes']='The official 2019 notes provide qualitative response commentary and examples. Worked answers and explicit corrections here are project-reviewed; the original PDF is preserved.'
 q['betterImage']=response(n,'better',strong);q['weakerImage']=response(n,'weaker',weak)
 assert q['better'] and q['weaker'],n
 if n=='8':
  for shortcut in ['Ctrl+Shift+P','Ctrl+I','Ctrl+[','Ctrl+U','Ctrl+Z']:q['answer']=q['answer'].replace(shortcut,'`'+shortcut+'`')
(ROOT/'data/computer-science/hssc_xi_2019_written.json').write_text(json.dumps(written,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('30 MCQs (28 scored), 11 written entries, 4 visual choices, 1 question diagram and 22 response composites.')
