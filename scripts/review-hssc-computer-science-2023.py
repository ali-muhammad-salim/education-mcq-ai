"""Reviewed transcription, source discrepancies and official response crops."""
from pathlib import Path
import json,re,pymupdf
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/computer-science'
BASE=ROOT/'public/materials/hssc/computer-science'
def table(headers,rows):
 return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
qs=json.loads((DATA/'hssc_xi_2023_mcqs.json').read_text(encoding='utf-8'))
explanations='''Processing executes instructions and transforms raw data; capture is input and presentation is output.
Compression is a maintenance utility; a driver controls hardware, an OS manages resources and productivity software creates user work.
Linux is open source; the other named products are proprietary in this question.
OCR recognises scanned characters; QR reads encoded symbols, MICR reads magnetic ink and OMR detects filled marks.
Installed apps reside in writable nonvolatile flash storage. RAM/cache are volatile, true ROM is not writable app storage and phones do not normally contain a hard disk. The printed key B uses ROM loosely; no precise option is supplied.
A mainframe handles large-scale concurrent bank transactions; a supercomputer targets intensive numerical calculation and a microcomputer is an individual system.
An operating system provides the user/system interface; a driver serves hardware, a translator converts code and entertainment software is an application.
Touchscreens and interactive whiteboards accept deliberate manual input; OCR and QR readers capture encoded/scanned data automatically.
The key selects A, but relative cost depends on implementation and date. The statement does not establish a universal comparison of infrared, capacitive and resistive screens.
Shareware permits trial use before payment; freeware is free to use, firmware is device software and open source refers to source-code licensing.
Registers are directly used within the CPU; optical discs and USB storage require input/output operations.
Secondary storage is reached through I/O controllers/channels; it is generally nonvolatile and lower cost per byte, and capacity is not always smaller.
The key selects DVD-RW, but the scenario needs 8 GB capacity and does not specify disc layers or overwriting. A suitable multisession DVD-R may also append data. No unique choice follows.
Cache placement depends on processor architecture; modern processors commonly integrate L1, L2 and L3. No processor is specified, so the historical motherboard split in key B is not universally correct.
One MiB is 1024 KiB, so four MiB is 4096 KiB; the other values use incorrect factors.
Using the explicitly intended binary convention, 1.5 times 1024 bytes times 8 bits per byte is 12288 bits. Modern unambiguous notation is 1.5 KiB.
An SD card uses solid-state flash; a hard disk is magnetic and the other two options are optical media.
PROM retains data without power; SRAM, DRAM and ordinary processor cache are volatile.
Under the textbook classification used here, RAM, ROM and cache are primary memory and flash storage is secondary. Flash can also implement firmware, so this classification is contextual.
A load/store transfers between registers and RAM; the other pairs describe peripheral/storage transfers rather than the intended CPU instruction.
PC initially contains 10110, which is copied to MAR; memory content 11010010 enters MDR and then IR. The next address must not be fetched prematurely.
LOAD transfers data, DIV performs arithmetic and LOOP controls program flow. Every other row misclassifies at least two instructions.
The system unit encloses the whole computer assembly; registers, control circuitry and internal buses are CPU components.
Base and counter registers can be general purpose in the textbook architecture; instruction register and MAR have dedicated roles.
Six opcode bits encode 2 to the power 6, or 64, different bit patterns; 6, 16 and 32 are not that count.
Casing, power supply and motherboard belong to the system unit; mouse, keyboard and monitor are external peripherals.
The round mini-DIN connector in the diagram is PS/2; serial, HDMI and FireWire connectors have different shapes.
Integrated graphics commonly shares system RAM; ROM, flash and magnetic storage are not the working display memory intended here.
No classification is specified: modems can be grouped by medium, form factor or service standard, with different counts. The printed answer Three is not a universal count.
Mobile data sent through different carriers traverses wide-area cellular networks even when the users are nearby. Proximity does not turn this path into a LAN, PAN or near-me network. Correct A replaces printed C.
In a full mesh every pair of nodes has a direct link; bus, star and ring do not provide every pairwise link.
Multiple star segments joined along a common backbone form the textbook tree topology; this is not a single bus, star or mesh.
TCP and UDP provide transport-layer services; ICMP and IGMP operate at the network/internet layer.
The data-link PDU is a frame. A segment is associated with transport, a packet with network and bits with physical transmission. Correct C replaces printed B.
WiMAX is the city/metropolitan wireless-access option among those listed; Bluetooth and infrared are short range and one ordinary Wi-Fi access point does not cover a city.
The intended answer is satellite communication, requiring a clear radio path to the satellite. Ordinary local Wi-Fi and Bluetooth can operate without a direct visual line of sight; obstructions still affect them.
Infrared is the only wireless medium listed; the other three require guided physical cabling. Infrared devices still need a suitable optical path.
Buildings, propagation distance and weather can attenuate radio links; guided media is a different transmission category, not an environmental attenuation condition as listed.
A handset first communicates over the air with its serving base station; switching and onward networks are reached through that station. Correct A replaces printed B.
A DBMS aims to reduce unnecessary redundancy while supporting consistency, recovery and security; duplicated data is not itself an advantage.
Normalisation decomposes tables to reduce redundant facts and update anomalies; modality/cardinality describe relationships rather than this design process.
The X end shows optional one (zero minimum, one maximum); the Y end shows mandatory many (one minimum, many maximum). Only row B matches both ends.
The intended textbook term is enterprise data modelling for organisation-wide business requirements; conceptual/logical/physical describe abstraction stages rather than that organisational scope.
The diagram is a parent-child tree, indicating a hierarchical model; network models permit more general connections and the object models are different representations.
The relationship is not determined by the entity names. One central authentication system serving many staff would make B plausible, but one account per staff or other designs also fit. Business rules are missing, so the printed B is retained only as provenance.
A comma-separated projection selects CarModel and CarPrice from Cars. Asterisks attached to names, AND between selected columns and the parenthesised starred expression are invalid here.
SELECT * FROM Clients WHERE City = 'Karachi' selects every column of the matching rows. Other options contain malformed literals or FROM/WHERE syntax.
B is the valid query for income strictly above 50000 and below 75000. If endpoints are meant to be inclusive use BETWEEN 50000 AND 75000; no printed option expresses that correctly. A misuses OR and numeric commas, C has invalid clauses and D uses =< instead of <=.
ALTER TABLE Stores ADD ContactNumber INT is the only valid listed column-addition statement. In practical database design a telephone number should normally be text to retain leading zeros and plus signs.
DROP TABLE Class removes the table definition and its data; ERASE TABLE and REMOVE TABLE are not these SQL commands, and DELETE removes rows rather than a table definition.'''.splitlines()
assert len(explanations)==50
for q,note in zip(qs,explanations):
 n=int(q['number']);q['stem']=q['stem'].replace('\ufffd',"'");q['explanation']=note
 if n in [5,9,13,14,29,45]:q['answer']=None
 if n in [30,39]:q['answer']='A'
 if n==34:q['answer']='C'
 if n in [31,32]:q.update(slo='1.5.2',grade=11)
 codes={40:'11.9.1',41:'11.10.1',46:'11.11.4',47:'11.11.4',48:'11.11.4',49:'11.11.2',50:'11.11.2'}
 if n in codes:q.update(slo=codes[n],grade=12)
 # Each choice gets the complete item-specific reasoning, including the correct alternative.
 q['feedback']=[dict(key=k,reason=('Correct. ' if k==q['answer'] else 'Not uniquely scorable. ' if not q['answer'] else f"Incorrect; the correct option is {q['answer']}. ")+note) for k in 'ABCD']
qs[13]['stem']='Which option gives the precise locations of L1, L2 and L3 cache memory?'
qs[13]['choices']={k:table(['Microprocessor chip','Motherboard'],[r]) for k,r in zip('ABCD',[['L1 and L2','L3'],['L1','L2 and L3'],['L2 and L3','L1'],['L3','L1 and L2']])}
qs[20]['stem']='Consider the following memory contents.\n\n'+table(['Memory address','Content'],[['10101','11000011'],['10110','11010010'],['10111','11011100'],['11000','10001001']])+'\n\nIf PC holds 10110 at the beginning of the fetch cycle, what contents are placed in MAR, MDR and IR?'
qs[20]['choices']={k:table(['MAR','MDR','IR'],[r]) for k,r in zip('ABCD',[['10110','11010010','11010010'],['10111','11011100','11011100'],['11010010','11010010','10110'],['11011100','11011100','10111']])}
qs[21]['stem']='Which row correctly categorises these CPU instructions?'
qs[21]['choices']={k:table(['Data transfer','Data processing','Program control'],[r]) for k,r in zip('ABCD',[['LOAD','DIV','LOOP'],['LOOP','DIV','LOAD'],['LOAD','LOOP','DIV'],['DIV','LOAD','LOOP']])}
qs[41]['stem']='Consider the entity-relationship diagram. Which row correctly interprets its modality (minimum) and cardinality (maximum) at Table X and Table Y?'
qs[41]['choices']={k:table(['X modality','X cardinality','Y modality','Y cardinality'],[r]) for k,r in zip('ABCD',[['One','Zero','Many','One'],['Zero','One','One','Many'],['One','Zero','One','Many'],['Zero','One','Many','One']])}
for n in range(46,51):qs[n-1]['choices']={k:'```sql\n'+v+'\n```' for k,v in qs[n-1]['choices'].items()}
for q in qs:
 for k,v in q['choices'].items():
  if any(t in v for t in ['PS/2','CD-ROM','DVD-ROM','DVD-RAM','Wi-Fi','I/O']):q['choices'][k]='`'+v+'`'
 assert set(q['choices'])==set('ABCD')
(DATA/'hssc_xi_2023_mcqs.json').write_text(json.dumps(qs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

written=[]
def add(n,page,marks,stem,answer,mapping=None):
 written.append(dict(number=n,page=page,marks=marks,stem=stem,answer=answer,mapping=mapping))
add('1',2,6,'All devices that contain embedded, specialised computers are called computing devices. Identify any TWELVE computing devices used in daily life.','Examples: ATM, card-payment terminal, digital washing machine, microwave oven, digital camera, smart television, CCTV camera, car engine-control unit, traffic-light controller, digital thermostat, printer and digital weighing scale. Choose devices containing embedded processing, rather than merely naming passive components.','11:5.2.4')
add('2',2,3,'i. Describe the process of writing data on an optical disk. (2 marks)\n\nii. Write ONE advantage of optical storage over magnetic storage. (1 mark)','i. A recording laser changes a recording layer at selected positions to encode bits. On write-once discs it permanently changes the dye/material; on rewritable discs it changes the phase of the recording material. Different optical properties allow the encoded data to be read by a lower-power laser. Factory-pressed ROM discs use a manufacturing process rather than an ordinary disc writer.\n\nii. Optical storage is not erased by external magnetic fields that can affect magnetic media.')
add('3',3,3,'Write any THREE differences between CISC and RISC architectures.',table(['Typical CISC design','Typical RISC design'],[['Larger, more complex instruction repertoire','Smaller, simpler instruction repertoire'],['Often variable-length instruction encodings','Typically regular/fixed-length instruction encodings'],['May perform arithmetic directly on memory operands','Load/store design: arithmetic primarily operates on registers']])+'\n\nThese are conventional architectural tendencies; modern processor implementations can combine techniques.')
add('4',3,3,'USB is a plug-and-play port.\n\ni. Describe plug-and-play. (1 mark)\n\nii. Describe the computer response when a USB device is detected. (1 mark)\n\niii. Name TWO devices, other than a USB flash drive, that can connect through USB. (1 mark)','i. The system detects and configures a supported device with little or no manual resource configuration.\n\nii. It enumerates/identifies the attached device, loads or requests the appropriate driver and configures it for use. A compatible driver may still need installation.\n\niii. USB keyboard and USB printer (also accept mouse, camera or scanner).')
add('5',4,3,'Differentiate infrared and Bluetooth on bandwidth, range and number of devices.',table(['Characteristic','Infrared (representative IrDA link)','Bluetooth (representative classic link)'],[['Data rate (called bandwidth in the question)','Early IrDA about 115.2 kbit/s; faster versions differ','Classic basic rate about 1 Mbit/s; EDR up to 3 Mbit/s gross'],['Range','Typically about 1 m with a clear optical path','Typically about 10 m for a class-2 device; class and conditions change this'],['Devices','Normally a point-to-point link between two devices','One piconet: one central/master and up to seven active peripheral/slave devices']])+'\n\nThe question gives no technology version or device class. These are stated examples, not universal limits; Bluetooth LE has different arrangements.')
add('6',4,3,'Differentiate primary key and candidate key.',table(['Primary key','Candidate key'],[['One candidate key selected as the main row identifier','Any minimal set of attributes that uniquely identifies a row'],['One designated primary key per table (possibly composite)','A table may have several candidate keys'],['Selected candidate key is enforced as unique and not null','Unselected candidate keys are alternate keys and must still uniquely identify rows']])+'\n\nCorrection to the source commentary: uniqueness is essential for every candidate key; a non-unique field is not a candidate key.','12:11.9.4')
add('7a',5,7,'i. Define communication device. (1 mark)\n\nii. Describe hub, switch and gateway. (2 marks each)','A communication device is hardware that enables data transmission or interconnection between devices/networks.\n\nHub: a physical-layer multiport repeater; repeats received signals to other ports without selecting a destination using MAC addresses.\n\nSwitch: learns source MAC addresses and forwards Ethernet frames to the appropriate port; separates collision domains.\n\nGateway: connects systems/networks using different protocols or representations and translates between them when required. A default IP gateway routes between networks; not every gateway performs application-protocol conversion.\n\nSource terminology note: an Ethernet hub is not generally synonymous with a Token Ring multistation access unit (MAU).')
add('7b',5,7,'i. Define GPS. (1 mark)\n\nii. Describe its components. (4 marks)\n\niii. Mention TWO applications. (2 marks)','GPS is a satellite-based positioning, navigation and timing system.\n\nSpace segment: orbiting satellites transmit precise time and orbital information.\n\nControl segment: ground monitoring/control stations track satellites and maintain clock/orbit information.\n\nUser segment: receivers use satellite signals and timing measurements to calculate position and time.\n\nApplications: vehicle navigation and land surveying.\n\nMarking discrepancy: Paper II allocates two marks to applications; the official checking hints say one mark for two applications. The paper total is seven; retain the printed allocation and record this discrepancy rather than silently changing it.')
company=table(['Employees','Departments','Children of employees'],[['EmpID (primary key)','Dept_No (primary key)','Parent_Name (printed primary key)'],['Salary','Dept_Name','Age'],['Ph_No','Budget','']])
add('8a',6,7,'The company database contains these tables:\n\n'+company+'\n\nMany employees work in each department; each department is managed by an employee. Each child is identified by the employee’s name, and only one parent may work for the company. Draw an ERD.','Entities: Employees (EmpID, Salary, Ph_No), Departments (Dept_No, Dept_Name, Budget), Children_of_Employees (Parent_Name, Age). Underline the three printed primary keys when reproducing the source schema.\n\nRelationships:\n\n- Department — employs — Employee: one department to many employees, assuming each employee belongs to one department.\n- Employee — manages — Department: each department has one manager; an employee may manage a department or none. A maximum of one managed department per employee is an explicit modelling assumption, not established by the wording.\n- Employee — has dependent — Child: one employee may have many children; each child is associated with one employed parent.\n\nSchema defect: Parent_Name alone cannot uniquely identify multiple children of one parent; employee names are also not guaranteed unique. A sound implementation adds Child_ID, or uses a composite (EmpID, Child_Name/another child identifier), and uses EmpID as the parent foreign key. Preserve the printed schema for source comparison, but do not claim that its child primary key supports the stated one-to-many relationship.')
prof=table(['Prof_ID','First_Name','Last_Name','Age','Experience_in_Years','Specialisation'],[['P101','Dilawar','Khan','47','22','Accounting'],['P102','Sana','Ahmed','52','30','Marketing'],['P103','Faisal','Arbab','45','23','Finance']])
add('8b',7,7,'Consider the Professors table.\n\n'+prof+'\n\nWrite MS Access SQL to:\n\ni. Create the table, with Prof_ID as primary key; text lengths: Prof_ID 5, First_Name 20, Last_Name 15, Specialisation 25. (3 marks)\n\nii. Insert the last record. (1 mark)\n\niii. Remove Age. (1 mark)\n\niv. Add Gender of length 6. (1 mark)\n\nv. Change Specialisation to length 30. (1 mark)',"i.\n```sql\nCREATE TABLE Professors (\n  Prof_ID TEXT(5) NOT NULL PRIMARY KEY,\n  First_Name TEXT(20),\n  Last_Name TEXT(15),\n  Age INTEGER,\n  Experience_in_Years INTEGER,\n  Specialisation TEXT(25)\n);\n```\n\nii.\n```sql\nINSERT INTO Professors\n  (Prof_ID, First_Name, Last_Name, Age, Experience_in_Years, Specialisation)\nVALUES ('P103', 'Faisal', 'Arbab', 45, 23, 'Finance');\n```\n\niii.\n```sql\nALTER TABLE Professors DROP COLUMN Age;\n```\n\niv.\n```sql\nALTER TABLE Professors ADD COLUMN Gender TEXT(6);\n```\n\nv.\n```sql\nALTER TABLE Professors ALTER COLUMN Specialisation TEXT(30);\n```\n\nCorrection: the official e-marking INSERT example uses age 42 and experience 13, but the printed question specifies 45 and 23. The worked answer follows the question. The CREATE statement here also keeps every field inside its parentheses.",'12:11.9.5')

em=pymupdf.open(BASE/'computer-science-xi-2023-emarking.pdf')
alltext='\n'.join(p.get_text() for p in em)
sections={m.group(1):m.group(2) for m in re.finditer(r'Question No\.\s*(\d+[ab]?)\s*(.*?)(?=Question No\.|\Z)',alltext,re.S)}
folder=ROOT/'public/paper-crops/CS-XI-2023-P2';folder.mkdir(parents=True,exist_ok=True)
def response(n,kind,parts):
 images=[]
 for page,index in parts:
  p=em[page-1];rect=p.get_image_info()[index]['bbox'];pix=p.get_pixmap(clip=pymupdf.Rect(rect),matrix=pymupdf.Matrix(2,2));images.append(Image.frombytes('RGB',[pix.width,pix.height],pix.samples))
 canvas=Image.new('RGB',(max(i.width for i in images),sum(i.height for i in images)+12*(len(images)-1)),'white');y=0
 for im in images:canvas.paste(im,(0,y));y+=im.height+12
 name=f'q{n}-{kind}.png';canvas.save(folder/name)
 return '/paper-crops/CS-XI-2023-P2/'+name
crops=[('1',[(2,0)],[(3,0)]),('2',[(4,0)],[(4,1)]),('3',[(5,0)],[(6,0)]),('4',[(7,0)],[(7,1)]),('5',[(9,0)],[(9,1)]),('6',[(10,0)],[(10,1)]),('7a',[(12,0)],[(12,1)]),('7b',[(14,0)],[(14,1)]),('8a',[(16,0)],[(16,1)]),('8b',[(18,0),(19,0)],[(19,1)])]
for q,(n,strong,weak) in zip(written,crops):
 s=sections[n];flat=re.sub(r'\s+',' ',s)
 q['originalSlo']=re.search(r'SLO No\.\s*(\d+\.\d+\.\d+)',s).group(1)
 q['level']=re.search(r'Cognitive\s+Level\s+([UKA])',s).group(1)
 def extract(start,end):
  m=re.search(start+r'\s*(.*?)\s*(?:'+end+r')',flat);return m.group(1).strip() if m else ''
 q['officialNotes']=extract(r'Checking\s+Hints\\?',r'Overall\s+Performance')
 q['overall']=extract(r'Overall\s+Performance',r'Description\s+of\s+Better\s+Responses')
 q['better']=extract(r'Description\s+of\s+Better\s+Responses',r'Image\s+of\s+Better\s+Response')
 q['weaker']=extract(r'Description\s+of\s+Weaker\s+Responses',r'Image\s+of\s+Weaker\s+Response')
 q['betterImage']=response(n,'better',strong);q['weakerImage']=response(n,'weaker',weak)
 assert q['officialNotes'] and q['better'] and q['weaker'],n
(DATA/'hssc_xi_2023_written.json').write_text(json.dumps(written,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Reviewed 50 MCQs (44 scored; 6 ambiguous), 10 written alternatives, 20 official response images.')
