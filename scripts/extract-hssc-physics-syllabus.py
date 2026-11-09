"""Extract the HSSC Physics 2025 syllabus from the bundled AKU-EB PDF."""
import json
from pathlib import Path
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'public/materials/hssc/physics/physics-hssc-syllabus-2025.pdf'


def compact(text):
    return ' '.join(text.split())


def text_in(page, x0, y0, x1, y1):
    return page.get_text(clip=pymupdf.Rect(x0, y0, x1, y1)).strip()


def description(text):
    lines = [compact(line) for line in text.splitlines() if line.strip()]
    return ''.join(('\n' if re.match(r'^[a-z]\.[ ]', line) else ' ') + line for line in lines).strip()


def extract_units(pdf, first, last):
    units = []
    # Formulae whose PDF glyph order does not preserve mathematical layout.
    overrides = {
        '7.2.4': 'solve word problems related to the SLO # 7.2.3;',
        '7.2.5': 'analyse graphical representations of the variations of displacement, velocity and acceleration with time for simple harmonic motion;',
        '12.7.4': 'describe time constant, show that the product of RC has the same unit as time;',
        '13.2.2': 'derive a relation between resistance and resistivity;',
        '14.1.4': 'describe magnetic flux and magnetic flux density;',
        '16.5.4': 'discuss the results of Davison and Germer experiment;',
        '19.1.4': 'define coupling medium;',
        '5.5.1': r'determine the elastic potential energy of a material by using $E=\frac{1}{2}Fx=\frac{1}{2}kx^2$.',
        '6.1.2': r'solve word problems using $\mathrm{Upthrust}=\rho gV$;',
        '7.2.3': r'derive expression for instantaneous displacement, velocity and acceleration in terms of angular velocity $(\omega)$;',
        '8.1.3': r'solve word problems using $\mathrm{intensity}=\frac{\mathrm{power}}{\mathrm{area}}$ and $\mathrm{intensity}\propto(\mathrm{amplitude})^2$ for a progressive wave;',
        '8.1.4': r'solve word problems using $V=f\lambda$;',
        '9.5.3': r'derive the equation $2d\sin\theta=m\lambda$;',
        '10.2.2': r'describe that a gas obeying $PV\propto T$ is an ideal gas;',
        '10.3.2': r'derive relation $PV=\frac{1}{3}Nm\langle v^2\rangle$;',
        '10.6.2': r'explain $C_p>C_v$;',
        '10.6.3': r'show that $C_p-C_v=R$ by using first law of thermodynamics;',
        '11.2.2': r'solve word problems using the relation $g=\frac{GM}{r^2}$;',
        '12.3.4': r'solve word problems using the relation $E=\frac{kq}{r^2}$;',
        '12.7.5': r'use equations of the form $x=x_0e^{-\left(\frac{t}{RC}\right)}$ where $x$ could represent current, charge or potential difference for a capacitor discharging through resistor;',
        '12.8.3': r'show that energy stored in a capacitor is $W=\frac{1}{2}QV$ and $W=\frac{1}{2}CV^2$;',
        '13.1.3': r'solve word problems using the expression $I=Anvq$;',
        '13.2.3': r'solve word problems using the relation $R=\frac{\rho l}{A}$;',
        '14.1.5': r'solve word problems using $\phi=\vec{B}\cdot\vec{A}$;',
        '14.2.2': r'derive an expression for force, i.e. $F=ILB\sin\theta$;',
        '14.2.3': r'solve word problems using $F=ILB\sin\theta$;',
        '14.4.3': r'derive the expression $V_H=\frac{BI}{ntq}$;',
        '14.4.4': r'solve word problems related to $V_H=\frac{BI}{ntq}$;',
        '15.4.4': r'calculate a sinusoidal alternating current or voltage using equation $x=x_0\sin(\omega t)$;',
        '16.2.3': 'solve word problems using the relations:\na. $E=pc$,\nb. $p=\\frac{hf}{c}$;',
        '16.4.2': r'solve word problems using $\Delta\lambda=\frac{h}{m_0c}(1-\cos\theta)$;',
        '16.5.5': r'solve word problems using the relations $\lambda=\frac{h}{mv}$ and $\lambda=\frac{h}{\sqrt{2mVe}}$;',
        '16.6.3': r'derive relation for the wavelength of radiation emitted out by an electron using $\frac{1}{\lambda}=R_H\left[\frac{1}{p^2}-\frac{1}{n^2}\right]$;',
        '16.6.4': r'solve word problems using $\frac{1}{\lambda}=R_H\left[\frac{1}{p^2}-\frac{1}{n^2}\right]$;',
        '17.4.5': r'solve word problems using the relation $A=\lambda N$ and $N=N_0e^{-\lambda t}$;',
        '19.1.3': r'describe the specific acoustic impedance of a medium as $Z=\rho c$, where $c$ is the speed of sound in the medium;',
        '19.1.5': r'solve word problems using $\frac{I_r}{I_0}=\frac{(Z_1-Z_2)^2}{(Z_1+Z_2)^2}$;',
        '19.1.7': r'calculate the attenuation of ultrasound in matter using $I=I_0e^{-\mu x}$;',
        '19.4.2': r'describe inverse square law for radiant flux intensity ($F$) in terms of the luminosity ($L$) of the source $F=\frac{L}{4\pi d^2}$;',
        '19.5.4': r'calculate the radius of a star using relation $L=4\pi\sigma r^2T^4$;',
    }
    for number in range(first, last + 1):
        page = pdf[number - 1]
        words = page.get_text('words')
        codes = sorted((w for w in words if 300 < w[0] < 330 and re.fullmatch(r'\d+\.\d+\.\d+', w[4])), key=lambda w: w[1])
        headings = sorted((w for w in words if 70 < w[0] < 120 and re.fullmatch(r'\d+\.(?:\d+)?', w[4])), key=lambda w: w[1])
        table_bottom = {10: 470, 16: 490, 28: 385, 42: 387}.get(number, 512)
        marks_by_code = {}
        for mark in words:
            if mark[0] <= 667 or mark[4] not in ('*', 'A', 'An', 'E', 'C', 'FA', 'FA2'):
                continue
            nearest = min(codes, key=lambda row: abs(row[1] - mark[1]))
            if abs(nearest[1] - mark[1]) <= 8:
                assert nearest[4] not in marks_by_code, (number, nearest[4])
                marks_by_code[nearest[4]] = mark
        lines = [line for block in page.get_text('dict')['blocks'] for line in block.get('lines', [])]
        for word in sorted(headings + codes, key=lambda w: (round(w[1]), w[0])):
            x, top, right, _, code, *_ = word
            if x < 120:
                bottom = next((w[1] - 0.8 for w in headings if w[1] > top + 2), table_bottom)
                name = compact(text_in(page, right + .5, top - 1, 300, bottom))
                if code == '15.1':
                    name = 'Law of Electromagnetic Induction'
                if code.endswith('.'):
                    unit = {'unitNumber': int(code[:-1]), 'name': name, 'subtopics': []}
                    units.append(unit)
                else:
                    subtopic = {'subtopicNumber': code, 'name': f'{code} {name}', 'slos': []}
                    unit['subtopics'].append(subtopic)
                continue
            assert code.rsplit('.', 1)[0] == subtopic['subtopicNumber'], (number, code)
            below = [w[1] for w in headings + codes if w[1] > top + 2]
            bottom = min(below, default=table_bottom)
            mark = marks_by_code.get(code, (0, 0, 0, 0, ''))
            level = mark[4].removesuffix('2') if mark[4] != '*' else 'R' if mark[0] < 700 else 'U' if mark[0] < 740 else 'A'
            # Select full lines by baseline to avoid fragments from adjacent rows.
            body_lines = []
            for line in lines:
                x0, y0, x1, _ = line['bbox']
                if x0 < right - 2 or x0 >= 663 or line['dir'] != (1.0, 0.0) or any(span['size'] < 9 and x0 < 352 for span in line['spans']) or not top - 1 <= y0 < bottom - 1:
                    continue
                body_lines.append(''.join(span['text'] for span in line['spans']))
            # Some rows have the SLO code and prose in the same PDF text line.
            for line in lines:
                x0, y0, x1, _ = line['bbox']
                if 295 < x0 < 335 and x1 > 345:
                    text = ''.join(span['text'] for span in line['spans'])
                    if text.strip().startswith(code + ' '):
                        body_lines.insert(0, text.strip()[len(code):])
            body = overrides.get(code) or description('\n'.join(body_lines)).translate(str.maketrans('', 'αβγ'))
            assert level and body and body[-1] in '.;' and not re.search(r'[\ue000-\uf8ff]', body), (number, code, level, body)
            subtopic['slos'].append({'code': code, 'description': body, 'cognitiveLevel': level, 'sourcePage': number})
    return units


def extract_practicals(pdf, first):
    activities = []
    for number in range(first, first + 2):
        for row in pdf[number - 1].find_tables().tables[0].extract():
            cells = [compact(cell) for cell in row if cell and cell.strip()]
            if not cells:
                continue
            topic = re.match(r'Topic (\d+):', cells[0])
            if topic:
                chapter = int(topic[1])
            elif cells[0].isdigit():
                activity, apparatus = cells[1:]
                assert int(cells[0]) == len(activities) + 1
                activities.append({'number': int(cells[0]), 'chapter': chapter, 'activity': activity, 'apparatus': apparatus})
    return activities


if __name__ == '__main__':
    with pymupdf.open(PDF) as pdf:
        result = {}
        for grade, start, end, lab, spec in [(11, 10, 27, 48, 52), (12, 28, 46, 50, 53)]:
            units = extract_units(pdf, start, end)
            codes = [s['code'] for u in units for t in u['subtopics'] for s in t['slos']]
            assert [u['unitNumber'] for u in units] == list(range(1 if grade == 11 else 11, 11 if grade == 11 else 21))
            assert len(codes) == len(set(codes))
            practicals = extract_practicals(pdf, lab)
            result[str(grade)] = {'units': units, 'practicals': practicals, 'assessmentPage': spec}
            print(grade, len(units), len(codes), len(practicals))
    (ROOT / 'data/physics/hssc_syllabus_2025.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')










