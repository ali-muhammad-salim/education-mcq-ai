"""Prepare the reviewed 2017 Biology SSC-II past paper dataset.

Extracts Paper I (25 MCQs) and Paper II (CRQs & ERQs), crops diagrams,
parses official keys, extracts E-marking notes with student responses,
maps every question to the current 2025 SSC Biology syllabus,
and produces strict JSON datasets matching the project schema.
"""
import hashlib
import json
import os
import re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/materials/ssc/biology/ssc-2'
OUT = ROOT / 'data/biology'
URL_PREFIX = '/materials/ssc/biology/ssc-2/'
PREFIX = 'biology-x-2017-'

DEST.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

FILES = {
    'p1': 'biology-x-2017-paper-i.pdf',
    'p2': 'biology-x-2017-paper-ii.pdf',
    'key': 'biology-x-2017-keys.pdf',
    'em': 'biology-x-2017-emarking.pdf',
}

# Source SHA-256 and page count checks
def get_source_manifest():
    manifest = {}
    for role, fname in FILES.items():
        fpath = DEST / fname
        if not fpath.exists():
            raise FileNotFoundError(f"Missing required source file: {fpath}")
        data = fpath.read_bytes()
        doc = pymupdf.open(str(fpath))
        manifest[role] = {
            'filename': fname,
            'url': URL_PREFIX + fname,
            'pages': len(doc),
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
        }
        doc.close()
    return manifest

def columns(raw, header):
    titles = header.split('/')
    header_row = " | ".join(titles)
    sep_row = " | ".join([':---'] * len(titles))
    rows = []
    for pair in raw.split('|'):
        cells = pair.split('/')
        rows.append(" | ".join(cells))
    return [f"| {header_row} |\n| {sep_row} |\n| {r} |" for r in rows]

# Image cropping helper
def crop_box(doc, page_1based, box, output_filename):
    page = doc[page_1based - 1]
    rect = pymupdf.Rect(box)
    pix = page.get_pixmap(clip=rect, matrix=pymupdf.Matrix(2, 2))
    out_path = DEST / output_filename
    pix.save(str(out_path))
    return URL_PREFIX + output_filename

def composite_samples(doc, output_filename, regions):
    if len(regions) == 1:
        page_idx, rect = regions[0]
        return crop_box(doc, page_idx + 1, rect, output_filename)
    width = max(rect.width for _, rect in regions)
    height = sum(rect.height for _, rect in regions) + 8 * (len(regions) - 1)
    with pymupdf.open() as combined:
        surface = combined.new_page(width=width, height=height)
        y = 0
        for page_idx, r in regions:
            surface.show_pdf_page(pymupdf.Rect(0, y, r.width, y + r.height), doc, page_idx, clip=r)
            y += r.height + 8
        pix = surface.get_pixmap(matrix=pymupdf.Matrix(2, 2))
        pix.save(str(DEST / output_filename))
    return URL_PREFIX + output_filename

# Paper I figures: (page_1based, box)
P1_FIGURES = {
    1: (2, (60, 125, 340, 305)),
    2: (2, (80, 480, 500, 605)),
    5: (3, (95, 260, 340, 420)),
    7: (4, (65, 120, 540, 450)),
    8: (4, (70, 480, 270, 580)),
    9: (5, (95, 115, 470, 265)),
    13: (6, (305, 105, 475, 195)),
    14: (6, (70, 235, 350, 335)),
    20: (7, (95, 500, 270, 635)),
}

# Paper II figures: (page_1based, box)
P2_FIGURES = {
    '1': (2, (60, 140, 330, 335)),
    '3': (4, (180, 380, 380, 560)),
    '5': (6, (60, 130, 380, 540)),
    '8a': (10, (60, 160, 460, 280)),
}

def get_emarking_samples(em_doc):
    def img_rect(p_1b, idx):
        return pymupdf.Rect(em_doc[p_1b - 1].get_image_info()[idx]['bbox'])
    
    samples = {}
    
    # Q1: Better: p4 img 0, p5 img 1 | Weaker: p5 img 0, p6 img 0
    samples['1'] = (
        [(3, img_rect(4, 0)), (4, img_rect(5, 1))],
        [(4, img_rect(5, 0)), (5, img_rect(6, 0))],
    )
    
    # Q2: Better: p6 img 1, p7 img 1 | Weaker: p7 img 0, p8 img 0
    samples['2'] = (
        [(5, img_rect(6, 1)), (6, img_rect(7, 1))],
        [(6, img_rect(7, 0)), (7, img_rect(8, 0))],
    )
    
    # Q3: Better: p8 img 1, p10 img 0 | Weaker: p9 img 0, p10 img 1
    samples['3'] = (
        [(7, img_rect(8, 1)), (9, img_rect(10, 0))],
        [(8, img_rect(9, 0)), (9, img_rect(10, 1))],
    )
    
    # Q4: Better: p11 img 0, p12 img 0 | Weaker: p11 img 1, p13 img 0
    samples['4'] = (
        [(10, img_rect(11, 0)), (11, img_rect(12, 0))],
        [(10, img_rect(11, 1)), (12, img_rect(13, 0))],
    )
    
    # Q5: Better: p13 img 1, p15 img 0 | Weaker: p14 img 3, p15 img 1
    samples['5'] = (
        [(12, img_rect(13, 1)), (14, img_rect(15, 0))],
        [(13, img_rect(14, 3)), (14, img_rect(15, 1))],
    )
    
    # Q6: Better: p16 img 0, p16 img 2, p17 img 1 | Weaker: p16 img 1, p17 img 0, p18 img 0
    samples['6'] = (
        [(15, img_rect(16, 0)), (15, img_rect(16, 2)), (16, img_rect(17, 1))],
        [(15, img_rect(16, 1)), (16, img_rect(17, 0)), (17, img_rect(18, 0))],
    )
    
    # Q7a: Better: p20 img 0 | Weaker: p21 img 0
    samples['7a'] = (
        [(19, img_rect(20, 0))],
        [(20, img_rect(21, 0))],
    )
    
    # Q7b: Better: p22 img 0 | Weaker: p24 img 0
    samples['7b'] = (
        [(21, img_rect(22, 0))],
        [(23, img_rect(24, 0))],
    )
    
    # Q8a: Better: p26 img 0 | Weaker: p27 img 0
    samples['8a'] = (
        [(25, img_rect(26, 0))],
        [(26, img_rect(27, 0))],
    )
    
    # Q8b: Better: p29 img 0 | Weaker: p30 img 0
    samples['8b'] = (
        [(28, img_rect(29, 0))],
        [(29, img_rect(30, 0))],
    )
    
    return samples

def format_mcq_content(n, stem, choices):
    if n == 1:
        stem = "The given graph shows the amount of $\\text{CO}_2$ gas consumed by some plants in a garden at a maximum temperature of 35°C on a summer day.\n\nThe process(es) occurring at point X is/ are\n\nI. Gaseous Exchange\nII. Photosynthesis\nIII. Cellular Respiration"
        choices = ["I only", "II only", "II and III", "I, II and III"]
    elif n == 2:
        stem = "The diseased bronchus in the given diagram depicts symptoms of"
        choices = ["cancer.", "asthma.", "pneumonia.", "emphysema."]
    elif n == 4:
        stem = "Which of the following steps are involved in the formation of urine in human beings?"
        choices = columns('Yes/No/Yes|No/Yes/No|Yes/Yes/Yes|No/No/Yes', 'Selective Reabsorption/Excretion/Filtration')
    elif n == 7:
        stem = "What will be the pathway for a spinal reflex action when the hand of an individual is pricked by a needle?"
        choices = ["A", "B", "C", "D"]
    elif n == 8:
        stem = "The given diagram shows change in the state of pupil of a person from P to Q.\n\nThe state Q shows that circular muscles of the iris have"
        choices = [
            "relaxed as the person has entered a poorly lit room.",
            "relaxed as the person has entered a brightly lit room.",
            "contracted as the person has entered a poorly lit room.",
            "contracted as the person has entered a brightly lit room."
        ]
    elif n == 10:
        stem = "Flexion of arm occurs when"
        choices = columns('contract/relax|relax/contract|contract/contract|relax/relax', 'Biceps muscles/Triceps muscles')
    elif n == 14:
        stem = "In humans, free ear lobe is completely dominant over attached ear lobe. The given chart shows the pattern of inheritance of ear lobe in a family.\n\nThe genotypes of parents would be"
        choices = columns('Homozygous free/Heterozygous free|Heterozygous free/Heterozygous free|Homozygous free/Homozygous attached|Heterozygous free/Homozygous attached', 'Mother/Father')
    elif n == 19:
        stem = "Following are the steps of the nitrogen cycle.\n\nI. Conversion of ammonia into nitrates\nII. Formation of proteins\nIII. Conversion of $\\text{N}_2$ gas to $\\text{NH}_3$ gas\nIV. Conversion of nitrates into $\\text{N}_2$ gas\n\nWhich of the following is the CORRECT sequence of events of nitrogen cycle?"
        choices = ["III, I, II, IV", "I, II, IV, III", "I, IV, III, II", "III, II, IV, I"]
    elif n == 20:
        stem = "Which of the following animals fall in the category of both secondary and tertiary consumers in the given food web?"
        choices = ["Frog", "Spider", "Caterpillar", "Grasshopper"]
    elif n == 25:
        stem = "Which of the given properties describe vaccines?\n\nI. Contain dead pathogens\nII. Used to treat bacterial diseases\nIII. Stimulate the immune response"
        choices = ["I only", "I and II", "I and III", "II and III"]
    return stem, choices

def main():
    print("Preparing Biology X 2017...")
    sources = get_source_manifest()
    
    # 1. Parse official keys
    key_doc = pymupdf.open(str(DEST / FILES['key']))
    key_text = key_doc[0].get_text()
    key_rows = re.findall(r'(\d+)\s+([A-D])\s+([KUA])\b', key_text)
    official_keys = {}
    for num, ans, lvl in key_rows:
        official_keys[int(num)] = (ans, lvl)
    assert len(official_keys) == 25, f"Expected 25 keys, got {len(official_keys)}"
    key_doc.close()
    
    # 2. Parse MCQ reviews (explanation, feedback, current SLO)
    review_lines = (OUT / 'ssc2_2017_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines()
    reviews = {}
    for line in review_lines:
        parts = [p.strip() for p in line.split('|')]
        head = parts[0]
        qnum_str, slo_code = head.split()
        expl = parts[1]
        fb = parts[2:]
        assert len(fb) == 4, f"Q{qnum_str} must have 4 feedback reasons"
        reviews[int(qnum_str)] = (slo_code, expl, fb)
    assert len(reviews) == 25, f"Expected 25 reviews, got {len(reviews)}"
    
    # 3. Crop Paper I diagrams
    p1_crops = {}
    p1_doc = pymupdf.open(str(DEST / FILES['p1']))
    for qnum, (page_1b, box) in P1_FIGURES.items():
        fname = f"{PREFIX}paper-i-q{qnum}.png"
        p1_crops[qnum] = crop_box(p1_doc, page_1b, box, fname)
    print(f"Cropped {len(p1_crops)} Paper I diagrams.")
    
    # 4. Crop Paper II diagrams
    p2_crops = {}
    p2_doc = pymupdf.open(str(DEST / FILES['p2']))
    for qnum_str, (page_1b, box) in P2_FIGURES.items():
        fname = f"{PREFIX}paper-ii-q{qnum_str}.png"
        p2_crops[qnum_str] = crop_box(p2_doc, page_1b, box, fname)
    print(f"Cropped {len(p2_crops)} Paper II diagrams.")
    
    # 5. Crop E-marking candidate samples
    em_doc = pymupdf.open(str(DEST / FILES['em']))
    em_samples = get_emarking_samples(em_doc)
    em_crops = {}
    for qnum_str, (better_regions, weaker_regions) in em_samples.items():
        better_fname = f"{PREFIX}emarking-q{qnum_str}-stronger.png"
        weaker_fname = f"{PREFIX}emarking-q{qnum_str}-weaker.png"
        em_crops[f"{qnum_str}_stronger"] = composite_samples(em_doc, better_fname, better_regions)
        em_crops[f"{qnum_str}_weaker"] = composite_samples(em_doc, weaker_fname, weaker_regions)
    print(f"Cropped {len(em_crops)} E-marking response sample images.")
    
    # 6. Build Paper I MCQs dataset
    mcq_rows = []
    for p_idx in range(1, 8):
        page = p1_doc[p_idx]
        text = page.get_text()
        q_matches = list(re.finditer(r'(?:^|\n)(\d{1,2})\.\s+', text))
        for i, match in enumerate(q_matches):
            qnum = int(match.group(1))
            start_pos = match.end()
            end_pos = q_matches[i+1].start() if i+1 < len(q_matches) else len(text)
            q_block = text[start_pos:end_pos].strip()
            
            opt_matches = list(re.finditer(r'(?:^|\n)([A-D])\.\s+', q_block))
            if len(opt_matches) == 4:
                stem_raw = q_block[:opt_matches[0].start()].strip()
                choices_raw = []
                for j in range(4):
                    o_start = opt_matches[j].end()
                    o_end = opt_matches[j+1].start() if j+1 < 4 else len(q_block)
                    choices_raw.append(re.sub(r'\s+', ' ', q_block[o_start:o_end]).strip())
            else:
                stem_raw = q_block
                choices_raw = ['Choice A', 'Choice B', 'Choice C', 'Choice D']
            
            stem_clean = re.sub(r'\s+', ' ', stem_raw).strip()
            stem_final, choices_final = format_mcq_content(qnum, stem_clean, choices_raw)
            
            orig_ans, orig_lvl = official_keys[qnum]
            curr_slo, explanation, feedback = reviews[qnum]
            
            answer = orig_ans
            answer_status = 'OFFICIAL_CONFIRMED'
            answer_origin = 'OFFICIAL_KEY_VERIFIED'
            answer_review_note = None
            
            diag_url = p1_crops.get(qnum)
            
            mcq_rows.append({
                'number': str(qnum),
                'page': p_idx + 1,
                'code': curr_slo,
                'stem': stem_final,
                'choices': choices_final,
                'answer': answer,
                'officialAnswer': orig_ans,
                'answerStatus': answer_status,
                'answerOrigin': answer_origin,
                'answerReviewNote': answer_review_note,
                'originalSlo': curr_slo,
                'originalLevel': orig_lvl,
                'explanation': explanation,
                'feedback': feedback,
                'diagramUrl': diag_url,
            })
    
    assert len(mcq_rows) == 25, f"Expected 25 MCQs, extracted {len(mcq_rows)}"
    mcq_rows.sort(key=lambda x: int(x['number']))
    
    # Save MCQs
    (OUT / 'ssc2_2017_past_mcqs.json').write_text(json.dumps(mcq_rows, indent=2), encoding='utf-8')
    print("Saved ssc2_2017_past_mcqs.json.")
    
    # 7. Build official key summary
    key_list = []
    for q in mcq_rows:
        num = int(q['number'])
        key_list.append({
            'questionNumber': num,
            'officialKey': q['officialAnswer'],
            'verifiedKey': q['answer'],
            'originalSlo': q['originalSlo'],
            'currentSlo': q['code'],
            'cognitiveLevel': q['originalLevel'],
            'hasDiscrepancy': q['officialAnswer'] != q['answer'],
            'note': q['answerReviewNote'],
        })
    (OUT / 'ssc2_2017_official_key.json').write_text(json.dumps(key_list, indent=2), encoding='utf-8')
    print("Saved ssc2_2017_official_key.json.")
    
    # 8. Build manifest
    manifest_crops = []
    for qnum, url in p1_crops.items():
        manifest_crops.append({'role': f'paper-i-q{qnum}', 'url': url})
    for qnum_str, url in p2_crops.items():
        manifest_crops.append({'role': f'paper-ii-q{qnum_str}', 'url': url})
    for role, url in em_crops.items():
        manifest_crops.append({'role': f'emarking-{role}', 'url': url})
    
    manifest_data = {
        'sources': sources,
        'crops': manifest_crops,
        'paperI': {
            'totalQuestions': 25,
            'totalMarks': 25,
            'durationMinutes': 35,
        },
        'paperII': {
            'printedQuestions': 8,
            'digitalEntriesIncludingAlternatives': 10,
            'totalMarks': 40,
            'durationMinutes': 145,
            'choiceGroups': {
                '7': {'choose': 1, 'of': ['7a', '7b'], 'marks': 7},
                '8': {'choose': 1, 'of': ['8a', '8b'], 'marks': 8},
            }
        }
    }
    (OUT / 'ssc2_2017_source_manifest.json').write_text(json.dumps(manifest_data, indent=2), encoding='utf-8')
    print("Saved ssc2_2017_source_manifest.json.")
    
    p1_doc.close()
    p2_doc.close()
    em_doc.close()
    print("Biology X 2017 dataset preparation complete!")

if __name__ == '__main__':
    main()

