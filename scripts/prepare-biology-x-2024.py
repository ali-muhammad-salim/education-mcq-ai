"""Prepare the reviewed 2024 Biology SSC-II past paper dataset.

Extracts Paper I (40 MCQs) and Paper II (CRQs & ERQs), crops diagrams,
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
PREFIX = 'biology-x-2024-'

DEST.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

FILES = {
    'p1': 'biology-x-2024-paper-i.pdf',
    'p2': 'biology-x-2024-paper-ii.pdf',
    'key': 'biology-x-2024-keys.pdf',
    'em': 'biology-x-2024-emarking.pdf',
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

# Helper for formatted tables
def table(headers, *rows):
    header_line = '| ' + ' | '.join(headers) + ' |'
    sep_line = '| ' + ' | '.join([':---'] * len(headers)) + ' |'
    row_lines = ['| ' + ' | '.join(row) + ' |' for row in rows]
    return '\n'.join([header_line, sep_line] + row_lines)

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

# Paper I figures
P1_FIGURES = {
    3: (2, (70, 328, 440, 535)),
    19: (6, (40, 345, 520, 525)),
    20: (7, (80, 110, 320, 270)),
    23: (7, (90, 545, 510, 710)),
    24: (8, (40, 115, 520, 480)),
    34: (11, (100, 310, 420, 510)),
}

# Paper II figures
P2_FIGURES = {
    '3': (3, (58, 138, 525, 346)),
}

# E-marking candidate samples: (better_regions, weaker_regions)
# Each region is (page_0based, rect)
def get_emarking_samples(em_doc):
    samples = {}
    
    # Q1: Better on p2, Weaker on p3
    p2_imgs = [im['bbox'] for im in em_doc[1].get_image_info()]
    p3_imgs = [im['bbox'] for im in em_doc[2].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['1'] = (
        [(1, pymupdf.Rect(b)) for b in sorted(p2_imgs, key=lambda b: b[1])],
        [(2, pymupdf.Rect(b)) for b in sorted(p3_imgs, key=lambda b: b[1])],
    )
    
    # Q2: Better on p4 (4 parts), Weaker on p5 (4 parts)
    p4_imgs = [im['bbox'] for im in em_doc[3].get_image_info()]
    p5_imgs = [im['bbox'] for im in em_doc[4].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['2'] = (
        [(3, pymupdf.Rect(b)) for b in sorted(p4_imgs, key=lambda b: b[1])],
        [(4, pymupdf.Rect(b)) for b in sorted(p5_imgs, key=lambda b: b[1])],
    )
    
    # Q3: Better on p6 (idx 3 & 4), Weaker on p7
    p6_imgs = [im['bbox'] for im in em_doc[5].get_image_info() if im['bbox'][1] > 300]
    p7_imgs = [im['bbox'] for im in em_doc[6].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['3'] = (
        [(5, pymupdf.Rect(b)) for b in sorted(p6_imgs, key=lambda b: b[1])],
        [(6, pymupdf.Rect(b)) for b in sorted(p7_imgs, key=lambda b: b[1])],
    )
    
    # Q4: Better on p8 (3 parts), Weaker on p9 (3 parts)
    p8_imgs = [im['bbox'] for im in em_doc[7].get_image_info()]
    p9_imgs = [im['bbox'] for im in em_doc[8].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['4'] = (
        [(7, pymupdf.Rect(b)) for b in sorted(p8_imgs, key=lambda b: b[1])],
        [(8, pymupdf.Rect(b)) for b in sorted(p9_imgs, key=lambda b: b[1])],
    )
    
    # Q5a: Better on p10, Weaker on p11
    p10_imgs = [im['bbox'] for im in em_doc[9].get_image_info()]
    p11_imgs = [im['bbox'] for im in em_doc[10].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['5a'] = (
        [(9, pymupdf.Rect(b)) for b in sorted(p10_imgs, key=lambda b: b[1])],
        [(10, pymupdf.Rect(b)) for b in sorted(p11_imgs, key=lambda b: b[1])],
    )
    
    # Q5b: Better on p12, Weaker on p13
    p12_imgs = [im['bbox'] for im in em_doc[11].get_image_info()]
    p13_imgs = [im['bbox'] for im in em_doc[12].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['5b'] = (
        [(11, pymupdf.Rect(b)) for b in sorted(p12_imgs, key=lambda b: b[1])],
        [(12, pymupdf.Rect(b)) for b in sorted(p13_imgs, key=lambda b: b[1])],
    )
    
    # Q6a: Better on p14, Weaker on p15
    p14_imgs = [im['bbox'] for im in em_doc[13].get_image_info()]
    p15_imgs = [im['bbox'] for im in em_doc[14].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['6a'] = (
        [(13, pymupdf.Rect(b)) for b in sorted(p14_imgs, key=lambda b: b[1])],
        [(14, pymupdf.Rect(b)) for b in sorted(p15_imgs, key=lambda b: b[1])],
    )
    
    # Q6b: Better on p16, Weaker on p17
    p16_imgs = [im['bbox'] for im in em_doc[15].get_image_info()]
    p17_imgs = [im['bbox'] for im in em_doc[16].get_image_info() if not (400 < im['bbox'][0] < 415)]
    samples['6b'] = (
        [(15, pymupdf.Rect(b)) for b in sorted(p16_imgs, key=lambda b: b[1])],
        [(16, pymupdf.Rect(b)) for b in sorted(p17_imgs, key=lambda b: b[1])],
    )
    
    return samples

# Custom formatting for tabular MCQs
def format_mcq_content(n, stem, choices):
    if n == 3:
        choices = columns('12/12|12/6|6/6|6/12', 'X/Y')
    elif n == 4:
        choices = columns('homologous/non-sister|homologous/sister|non-homologous/non-sister|non-homologous/sister', 'Nature of Chromosomes/Crossing Over Between Chromatids')
    elif n == 9:
        stem = ("The given table shows the distribution of the number of stomata in the leaves of four different plant species (A, B, C and D).\n\n" +
                table(
                    ['Plant Species', 'Upper Surface of Leaf', 'Lower Surface of Leaf'],
                    ['A', '500', '0'],
                    ['B', '400', '400'],
                    ['C', '300', '600'],
                    ['D', '0', '300']
                ) +
                "\n\nThe plant species that represents the aquatic plant (hydrophyte) with floating leaves is")
        choices = ['Plant species A.', 'Plant species B.', 'Plant species C.', 'Plant species D.']
    elif n == 13:
        choices = columns('outer layer/central portion|central portion/outer layer|outer layer/outer layer|central portion/central portion', 'Brain/Spinal Cord')
    elif n == 14:
        choices = columns('contract/relax|relax/contract|contract/contract|relax/relax', 'Circular Muscles/Radial Muscles')
    elif n == 16:
        choices = columns('strong and short/small and sticky|slender and long/large feathery|pin-shaped/hanging outside|found in groups/coloured and scented', 'Stamen/Stigma')
    elif n == 18:
        stem = ("The given sequence of changes takes place in the pollen sac of a flowering plant.\n\n"
                r"Microspore mother cell $\xrightarrow{\text{Cell division I}}$ Microspores $\xrightarrow{\text{Cell division II}}$ Tube nucleus and generative nucleus" +
                "\n\nThe cell divisions I and II represent")
        choices = columns('mitosis/mitosis|mitosis/meiosis|meiosis/mitosis|meiosis/meiosis', 'Cell Division I/Cell Division II')
    elif n == 20:
        choices = ['II to I.', 'I to III.', 'II to IV.', 'III to IV.']
    elif n == 23:
        choices = ['P and S.', 'Q and S.', 'P and R.', 'Q and R.']
    elif n == 24:
        choices = ['Diagram A', 'Diagram B', 'Diagram C', 'Diagram D']
    elif n == 27:
        stem = ("The given table shows the result obtained in an experiment of breeding cattle with unknown genotype for their coat colour.\n\n"
                "(Note: The allele for black hair coat colour is completely dominant over the allele for red hair coat colour and these are represented as B and b, respectively.)\n\n" +
                table(
                    ['Cross', 'Cow', 'Bull', '% Black Hair Coat', '% Red Hair Coat'],
                    ['I', 'Black', 'Red', '50', '50'],
                    ['II', 'Black', 'Black', '75', '25'],
                    ['III', 'Black', 'Red', '100', '0']
                ) +
                "\n\nIf the parental black cow from cross III is bred with the parental black bull from cross II, then which of the following would be TRUE for the genotypes of their offspring?")
        choices = columns('0/100|25/75|50/50|75/25', 'Heterozygous Offspring/Homozygous Offspring')
    elif n == 28:
        stem = ("In pea plants, the allele (L) for long stem is dominant over the allele (l) for short stem. Similarly, the allele (P) for the purple flower colour is dominant over the allele (p) for white flower colour.\n\n" +
                table(
                    ['Long Purple', 'Long White', 'Short Purple', 'Short White'],
                    ['9', '3', '3', '1']
                ) +
                "\n\nThe genetic cross that is expected to produce phenotypic ratio as given in the table is")
        choices = ['LlPP × llpp', 'LLPP × LlPp', 'LlPp × LlPp', 'LLpp × llPP']
    elif n == 29:
        choices = columns('Yy/yellow|yy/green|yy/yellow|Yy/green', 'Genotype/Phenotype')
    elif n == 30:
        stem = ("The following table shows the relative biomass of organisms (X, Y and Z).\n\n" +
                table(
                    ['Organism', 'Relative Biomass in Gigatons (GT) of Carbon (C)'],
                    ['X', '450'],
                    ['Y', '1'],
                    ['Z', '0.002']
                ) +
                "\n\nBased on the given biomass, the organisms X, Y and Z can be")
        choices = columns('wild bird/plant/insect|insect/plant/wild bird|plant/wild bird/insect|plant/insect/wild bird', 'X/Y/Z')
    elif n == 34:
        choices = ['Label A', 'Label B', 'Label C', 'Label D']
    elif n == 39:
        choices = columns('Blocked/Alters|Unblocked/Alters|Blocked/Not changed|Unblocked/Not changed', 'Conduction of Nerve Impulse/Sensory Perception')
    return stem, choices

def main():
    print("Preparing Biology X 2024...")
    sources = get_source_manifest()
    
    # 1. Parse official keys
    key_doc = pymupdf.open(str(DEST / FILES['key']))
    key_text = key_doc[0].get_text()
    key_rows = re.findall(r'(\d+)\s+([0-9\.;\s]+)\s+([A-D•])\s+([KUA])\b', key_text)
    official_keys = {}
    for num, slo, ans, lvl in key_rows:
        slo_clean = re.sub(r'\s*,?\s+', ';', slo.strip())
        official_keys[int(num)] = (slo_clean, ans, lvl)
    assert len(official_keys) == 40, f"Expected 40 keys, got {len(official_keys)}"
    key_doc.close()
    
    # 2. Parse MCQ reviews (explanation, feedback, current SLO)
    review_lines = (OUT / 'ssc2_2024_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines()
    reviews = {}
    for line in review_lines:
        parts = [p.strip() for p in line.split('|')]
        head = parts[0]
        qnum_str, slo_code = head.split()
        expl = parts[1]
        fb = parts[2:]
        assert len(fb) == 4, f"Q{qnum_str} must have 4 feedback reasons"
        reviews[int(qnum_str)] = (slo_code, expl, fb)
    assert len(reviews) == 40, f"Expected 40 reviews, got {len(reviews)}"
    
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
    # Standard text extraction per page
    for p_idx in range(1, 12):
        page = p1_doc[p_idx]
        text = page.get_text()
        # Find question starts
        q_matches = list(re.finditer(r'(?:^|\n)(\d{1,2})\.\s+', text))
        for i, match in enumerate(q_matches):
            qnum = int(match.group(1))
            start_pos = match.end()
            end_pos = q_matches[i+1].start() if i+1 < len(q_matches) else len(text)
            q_block = text[start_pos:end_pos].strip()
            
            # Split into stem and options
            # Look for lines starting with A., B., C., D.
            opt_matches = list(re.finditer(r'(?:^|\n)([A-D])\.\s+', q_block))
            if len(opt_matches) == 4:
                stem_raw = q_block[:opt_matches[0].start()].strip()
                choices_raw = []
                for j in range(4):
                    o_start = opt_matches[j].end()
                    o_end = opt_matches[j+1].start() if j+1 < 4 else len(q_block)
                    choices_raw.append(re.sub(r'\s+', ' ', q_block[o_start:o_end]).strip())
            else:
                # Tabular or non-standard format
                stem_raw = q_block
                choices_raw = ['Choice A', 'Choice B', 'Choice C', 'Choice D']
            
            # Clean stem text
            stem_clean = re.sub(r'\s+', ' ', stem_raw).strip()
            stem_final, choices_final = format_mcq_content(qnum, stem_clean, choices_raw)
            
            orig_slo, orig_ans, orig_lvl = official_keys[qnum]
            curr_slo, explanation, feedback = reviews[qnum]
            
            # Special answer status handling
            if qnum == 18:
                answer = 'C'
                answer_status = 'ANSWER_CORRECTED'
                answer_origin = 'BIOLOGICAL_EVALUATION'
                answer_review_note = "Official key published a bullet pointgiving universal credit; biological cell division sequence is meiosis followed by mitosis (Choice C)."
            elif qnum == 27:
                answer = 'C'
                answer_status = 'ANSWER_CORRECTED'
                answer_origin = 'MENDELIAN_CROSS_VERIFIED'
                answer_review_note = "Official key published A, which erroneously gives 0% heterozygous / 100% homozygous. Cross of homozygous black cow (BB) with heterozygous black bull (Bb) produces 50% Bb (heterozygous) and 50% BB (homozygous), exactly matching Choice C."
            else:
                answer = orig_ans
                answer_status = 'OFFICIAL_CONFIRMED'
                answer_origin = 'OFFICIAL_KEY_VERIFIED'
                answer_review_note = None
                
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
                'originalSlo': orig_slo,
                'originalLevel': orig_lvl,
                'explanation': explanation,
                'feedback': feedback,
                'diagramUrl': p1_crops.get(qnum),
            })
            
    assert len(mcq_rows) == 40, f"Expected 40 extracted MCQs, got {len(mcq_rows)}"
    mcq_rows.sort(key=lambda r: int(r['number']))
    
    # Write MCQs JSON
    (OUT / 'ssc2_2024_past_mcqs.json').write_text(json.dumps(mcq_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print("Wrote ssc2_2024_past_mcqs.json.")
    
    # 7. Write Official Key JSON
    official_key_export = []
    for qnum in range(1, 41):
        orig_slo, orig_ans, orig_lvl = official_keys[qnum]
        curr_slo, _, _ = reviews[qnum]
        official_key_export.append({
            'questionNumber': qnum,
            'officialKey': orig_ans,
            'verifiedKey': 'C' if qnum in (18, 27) else orig_ans,
            'originalSlo': orig_slo,
            'currentSlo': curr_slo,
            'cognitiveLevel': orig_lvl,
            'hasDiscrepancy': qnum in (18, 27),
            'note': 'Official key printed •; verified answer is C' if qnum == 18 else (
                'Official key printed A; verified genetic answer is C' if qnum == 27 else None
            )
        })
    (OUT / 'ssc2_2024_official_key.json').write_text(json.dumps(official_key_export, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print("Wrote ssc2_2024_official_key.json.")
    
    # 8. Load and write Paper II written questions
    # [number, page, marks, code, originalSlo, notesPage, text, answer, notes]
    written_rows = json.load(open(OUT / 'ssc2_2024_written.json', encoding='utf-8'))
    assert len(written_rows) == 8, f"Expected 8 written rows, got {len(written_rows)}"
    print("Verified ssc2_2024_written.json.")
    
    # 9. Write Source Manifest
    all_crops = []
    for qnum, url in p1_crops.items():
        all_crops.append({'role': f'paper-i-q{qnum}', 'url': url})
    for qnum_str, url in p2_crops.items():
        all_crops.append({'role': f'paper-ii-q{qnum_str}', 'url': url})
    for role, url in em_crops.items():
        all_crops.append({'role': f'emarking-{role}', 'url': url})
        
    manifest = {
        'sources': sources,
        'crops': all_crops,
        'paperI': {
            'totalQuestions': 40,
            'totalMarks': 40,
            'durationMinutes': 70,
        },
        'paperII': {
            'printedQuestions': 6,
            'digitalEntriesIncludingAlternatives': 8,
            'totalMarks': 25,
            'durationMinutes': 110,
            'choiceGroups': {
                '5': {'choose': 1, 'of': ['5a', '5b'], 'marks': 6},
                '6': {'choose': 1, 'of': ['6a', '6b'], 'marks': 6},
            }
        }
    }
    (OUT / 'ssc2_2024_source_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print("Wrote ssc2_2024_source_manifest.json.")
    
    p1_doc.close()
    p2_doc.close()
    em_doc.close()
    print("Biology X 2024 preparation completed successfully!")

if __name__ == '__main__':
    main()
