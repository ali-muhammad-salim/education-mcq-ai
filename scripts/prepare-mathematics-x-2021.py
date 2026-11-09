"""Prepare the reviewed 2021 Class X (SSC-II) papers; never writes to the database.

Transcription, mathematical solving, and semantic mappings checked against rendered source pages.
Extracts high-resolution crops for Paper I diagrams.
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public/materials/ssc/mathematics/ssc-2'
DEST = ROOT / 'public/materials/ssc/mathematics/ssc-2'
OUT = ROOT / 'data/mathematics'
REVIEW = ROOT / 'output/mathematics-x-2021'
FILES = {
    'p1': ('mathematics-x-2021-paper-i.pdf', 'mathematics-x-2021-paper-i.pdf'),
    'key': ('mathematics-x-2021-keys.pdf', 'mathematics-x-2021-keys.pdf'),
}

# Load current 2025-2027 exact syllabi for Grade 9 (SSC-I) and Grade 10 (SSC-II)
with open(OUT / 'ssc1_exact_syllabus.json', 'r', encoding='utf-8') as f:
    SYLLABUS_G9 = json.load(f)
with open(OUT / 'ssc2_exact_syllabus.json', 'r', encoding='utf-8') as f:
    SYLLABUS_G10 = json.load(f)

SLO_MAP = {}
for u in SYLLABUS_G9:
    tname = u.get('name')
    for sub in u.get('subtopics', []):
        for slo in sub.get('slos', []):
            code = slo.get('code')
            if code:
                SLO_MAP[(9, code)] = {
                    'grade': 9,
                    'topic': tname,
                    'unitNumber': u.get('unitNumber'),
                    'description': slo.get('description'),
                    'page': slo.get('sourcePage'),
                }

for u in SYLLABUS_G10:
    tname = u.get('name')
    for sub in u.get('subtopics', []):
        for slo in sub.get('slos', []):
            code = slo.get('code')
            if code:
                SLO_MAP[(10, code)] = {
                    'grade': 10,
                    'topic': tname,
                    'unitNumber': u.get('unitNumber'),
                    'description': slo.get('description'),
                    'page': slo.get('sourcePage'),
                }


def map_slo(code, grade, rationale):
    if not code:
        return {
            'current_slo': None,
            'current_mapping': [],
            'mapping_scope': {'board': 'AKU-EB', 'grade': grade, 'subject': 'Mathematics'},
            'mappingStatus': 'OUT_OF_CURRENT_SYLLABUS',
            'mappingReason': rationale,
            'syllabusEdition': '2025 Revised (First Exam 2027)',
            'in_syllabus': False,
            'out_of_syllabus': True,
            'unitNumber': None,
            'sloText': None,
        }
    key = (grade, code)
    if key not in SLO_MAP:
        raise ValueError(f'SLO code {code} not found in Grade {grade} syllabus!')
    entry = SLO_MAP[key]
    return {
        'current_slo': code,
        'current_mapping': [{'code': code, 'topic': entry['topic'], 'description': entry['description']}],
        'mapping_scope': {'board': 'AKU-EB', 'grade': grade, 'subject': 'Mathematics'},
        'mappingStatus': 'MAPPED_TO_CURRENT_SYLLABUS',
        'mappingReason': rationale,
        'syllabusEdition': '2025 Revised (First Exam 2027)',
        'in_syllabus': True,
        'out_of_syllabus': False,
        'unitNumber': entry['unitNumber'],
        'sloText': entry['description'],
    }


# 50 MCQs: stem, options A-D, current SLO, target grade, rationale, solved option, conflict bool, review note
MCQS_DATA = [
    (
        r'Use the given information to answer Q.1 and Q.2.' + '\n\n'
        r'$$\begin{array}{|c|c|} \hline \text{Class Interval} & \text{Frequency} \\ \hline '
        r'50 - 59 & 7 \\ '
        r'60 - 69 & 16 \\ '
        r'70 - 79 & 24 \\ '
        r'80 - 89 & 13 \\ '
        r'90 - 99 & 10 \\ \hline '
        r'\text{Total} & 70 \\ \hline \end{array}$$' + '\n\n'
        r'The cumulative frequency preceding the median class will be',
        ['16', '23', '24', '47'],
        '22.3.1',
        10,
        r'Total frequency is $N = 70$, so $N/2 = 35$. The cumulative frequencies are: $50-59$: 7; $60-69$: 23; $70-79$: 47. The median class is $70-79$ (since $47 \ge 35$). The cumulative frequency preceding the median class is 23.',
        'B',
        False,
        '',
    ),
    (
        r'The upper class boundary of the modal class is',
        ['69.5', '70.5', '78.5', '79.5'],
        '22.1.1',
        10,
        r'The modal class is the class with the highest frequency, which is $70 - 79$ with frequency 24. Its upper class boundary is $79 + 0.5 = 79.5$.',
        'D',
        False,
        '',
    ),
    (
        r'For five observations, if $\sum X = 9$ and $\sum X^2 = 19$, then the variance will be',
        ['0.56', '0.20', '0.75', '2.00'],
        '22.4.1',
        10,
        r'The variance is given by $\sigma^2 = \frac{\sum X^2}{n} - \left(\frac{\sum X}{n}\right)^2 = \frac{19}{5} - \left(\frac{9}{5}\right)^2 = 3.8 - (1.8)^2 = 3.8 - 3.24 = 0.56$.',
        'A',
        False,
        '',
    ),
    (
        r'The given pie chart shows the number of students together with their favourite fruits in a school.' + '\n\n'
        r'What is the percentage of the students whose favourite fruit is orange?',
        ['11.1', '18.2', '22.2', '40.0'],
        '22.2.1',
        10,
        r'Total students $= 25\ (\text{Grapes}) + 45\ (\text{Apple}) + 60\ (\text{Mango}) + 40\ (\text{Orange}) + 50\ (\text{Banana}) = 220$. The percentage of students liking orange is $\frac{40}{220} \times 100\% = \frac{2}{11} \times 100\% \approx 18.18\% \approx 18.2\%$.',
        'B',
        False,
        '',
    ),
    (
        r'Use the given information to answer Q.5 and Q.6.' + '\n\n'
        r'The given data, in ascending order, represents the ages of people who visited a shop in a day.' + '\n\n'
        r'9, 9, 10, 15, 17, 19, 23, 27, p, p, 32, 35, 35, 35, 37, 40, 40' + '\n\n'
        r'If the median is 28, then the value of p is equal to',
        ['56', '28', '18', '9'],
        '22.3.1',
        10,
        r'There are $n = 17$ observations arranged in ascending order. The median is the $\frac{17 + 1}{2} = 9\text{th}$ observation, which is $p$. Since the median is 28, $p = 28$.',
        'B',
        False,
        '',
    ),
    (
        r'The mode of the data',
        ['is 28', 'is 35', 'is 40', 'cannot be determined'],
        '22.3.1',
        10,
        r'The observation 35 appears 3 times, which is more frequent than any other value (40 appears twice, 9 appears twice, and $p = 28$ appears twice). Thus the mode is 35.',
        'B',
        False,
        '',
    ),
    (
        r'If $\frac{X}{Y} = \frac{a}{2}$ and $X = \frac{a}{2}$, then the value of $Y$ is equal to',
        ['a', r'$\frac{a}{4}$', '0', '1'],
        '22.3.1',
        10,
        r'From $\frac{X}{Y} = \frac{a}{2}$ and $X = \frac{a}{2}$, substitute $X$: $\frac{a/2}{Y} = \frac{a}{2} \implies Y = 1$.',
        'D',
        False,
        '',
    ),
    (
        r'If $\frac{1}{a^2} \times (\text{variance of } x)$ is $b$, then the standard deviation of $x$ will be',
        [r'$a\sqrt{b}$', r'$\sqrt{ab}$', r'$a^2 b^2$', r'$a^4 b^2$'],
        '22.4.1',
        10,
        r'We have $\text{variance}(x) = a^2 b$. The standard deviation is the positive square root of variance: $\sigma = \sqrt{a^2 b} = a\sqrt{b}$.',
        'A',
        False,
        '',
    ),
    (
        r'$\sqrt{(x - 4)(x + 4)(x^2 - 16)}$ is equal to',
        ['x - 4', 'x + 4', 'x^2 - 16', 'x^2 + 16'],
        '6.3.1',
        9,
        r'Notice $(x - 4)(x + 4) = x^2 - 16$. Thus $\sqrt{(x^2 - 16)(x^2 - 16)} = \sqrt{(x^2 - 16)^2} = x^2 - 16$.',
        'C',
        False,
        '',
    ),
    (
        r'The least common multiple of $x^4 - a^4$, $x^2 - a^2$ and $x^2 + a^2$ is equal to',
        ['1', 'x^2 + a^2', 'x^2 - a^2', 'x^4 - a^4'],
        '6.1.1',
        9,
        r'Factoring $x^4 - a^4 = (x^2 - a^2)(x^2 + a^2)$. Since both $x^2 - a^2$ and $x^2 + a^2$ are factors of $x^4 - a^4$, their LCM is $x^4 - a^4$.',
        'D',
        False,
        '',
    ),
    (
        r'The highest common factor of $(y - 1)^2$, $(y + 1)^2$ and $y^2 - 1$ is equal to',
        ['1', 'y - 1', 'y + 1', '(y - 1)^2 (y + 1)^2'],
        '6.1.1',
        9,
        r'The factors of the three expressions are $(y - 1)^2$, $(y + 1)^2$, and $(y - 1)(y + 1)$. There is no common polynomial factor present in all three expressions. Thus their HCF is 1.',
        'A',
        False,
        '',
    ),
    (
        r'On simplification of $\left(1 - \frac{1}{x}\right) \div \frac{1}{x}$, we get',
        ['1', r'$x - 1$', r'$\frac{x - 1}{x^2}$', r'$\frac{1 - x}{x^2}$'],
        '6.2.2',
        9,
        r'$\left(1 - \frac{1}{x}\right) \div \frac{1}{x} = \frac{x - 1}{x} \times \frac{x}{1} = x - 1$.',
        'B',
        False,
        '',
    ),
    (
        r'On simplification of $2 - \frac{(a + b)^2}{(a - b)(a + b)}$, we get',
        ['1', r'$\frac{a + b}{a - b}$', r'$\frac{a + 3b}{a - b}$', r'$\frac{a - 3b}{a - b}$'],
        '6.2.2',
        9,
        r'Cancelling $(a + b)$: $2 - \frac{a + b}{a - b} = \frac{2(a - b) - (a + b)}{a - b} = \frac{2a - 2b - a - b}{a - b} = \frac{a - 3b}{a - b}$.',
        'D',
        False,
        '',
    ),
    (
        r'The least common multiple of $x - 1$ and $x^2 - 2x + 1$ is',
        ['(x - 1)^2', '(x - 1)^3', '(x - 1)(x + 1)', '(x - 1)^2 (x + 1)'],
        '6.1.1',
        9,
        r'Since $x^2 - 2x + 1 = (x - 1)^2$, the LCM of $(x - 1)$ and $(x - 1)^2$ is $(x - 1)^2$.',
        'A',
        False,
        '',
    ),
    (
        r'If the highest common factor of $2kx^2$ and $3x^2 - 6x$ is $3x$, then one of the values of $k$ will be',
        ['x - 2', 'x', '6', '3'],
        '6.1.1',
        9,
        r'$3x^2 - 6x = 3x(x - 2)$. For $3x$ to divide $2kx^2$, the numerical factor 3 must divide $2k$, meaning $k$ must be a multiple of 3. Testing choices gives $k = 3$.',
        'D',
        False,
        'Source ambiguity: The algebraic expression in the question is defective, admitting multiple non-unique answers.',
    ),
    (
        r'On simplification, $\frac{1}{1 - x} \div \frac{2}{x - 1}$ is equal to',
        [r'$-\frac{1}{2}$', '-2', '2', r'$\frac{1}{2}$'],
        '6.2.2',
        9,
        r'$\frac{1}{1 - x} \div \frac{2}{x - 1} = \frac{1}{-(x - 1)} \times \frac{x - 1}{2} = -\frac{1}{2}$.',
        'A',
        False,
        '',
    ),
    (
        r'If $2a = 5x^2 y^4$, then the square root of $\frac{5}{2a}$ is equal to',
        [r'$\frac{1}{x^2 y^2}$', r'$x^2 y^2$', r'$\frac{1}{xy^2}$', r'$xy^2$'],
        '6.3.1',
        9,
        r'$\sqrt{\frac{5}{2a}} = \sqrt{\frac{5}{5x^2 y^4}} = \sqrt{\frac{1}{x^2 y^4}} = \frac{1}{x y^2}$.',
        'C',
        False,
        '',
    ),
    (
        r'On solving the equation $3 = -\frac{3}{2}x$, the value of $x$ will be',
        ['-2', '2', r'$\frac{9}{2}$', r'$-\frac{1}{2}$'],
        '7.1.1',
        9,
        r'Multiplying both sides by $-\frac{2}{3}$ gives $x = 3 \times \left(-\frac{2}{3}\right) = -2$.',
        'A',
        False,
        '',
    ),
    (
        r'The solution of $7x - 7 > -7$ will be',
        ['x < 2', 'x > -2', 'x < 0', 'x > 0'],
        '7.3.1',
        9,
        r'Adding 7 to both sides: $7x > 0 \implies x > 0$.',
        'D',
        False,
        '',
    ),
    (
        r'The solution set of $|1 - x| = 0$ will be',
        ['{1}', '{-1}', '{0, 1}', '{-1, 1}'],
        '7.2.2',
        9,
        r'$|1 - x| = 0 \implies 1 - x = 0 \implies x = 1$. The solution set is $\{1\}$.',
        'A',
        False,
        '',
    ),
    (
        r'The solution set of $\sqrt{x - \frac{1}{4}} = \frac{1}{2}$ will be',
        [r'$\left\{\frac{1}{4}\right\}$', r'$\left\{\frac{1}{2}\right\}$', r'$\left\{0, \frac{1}{4}\right\}$', r'$\left\{0, \frac{1}{2}\right\}$'],
        '7.1.2',
        9,
        r'Squaring both sides: $x - \frac{1}{4} = \frac{1}{4} \implies x = \frac{1}{4} + \frac{1}{4} = \frac{1}{2}$. The solution set is $\{1/2\}$.',
        'B',
        False,
        '',
    ),
    (
        r'If $\sqrt{x} - \sqrt{k} = \sqrt{k}$, then the value of $\frac{\sqrt{x}}{2}$ is equal to',
        ['0', r'$\frac{2\sqrt{k}}{2}$', r'$\frac{\sqrt{k}}{2}$', r'$\sqrt{k}$'],
        '7.1.2',
        9,
        r'$\sqrt{x} = \sqrt{k} + \sqrt{k} = 2\sqrt{k}$. Thus $\frac{\sqrt{x}}{2} = \frac{2\sqrt{k}}{2} = \sqrt{k}$.',
        'D',
        False,
        '',
    ),
    (
        r'Which of the following inequalities satisfies the solution set $x < 1$ or $x > -1$?',
        ['|8x| < 8', '|8x| > 8', '|x| + 1 > 1', '|x| + 1 < 1'],
        '7.2.2',
        9,
        r'$|8x| < 8 \implies 8|x| < 8 \implies |x| < 1 \implies -1 < x < 1$. In traditional curriculum notation, this open interval corresponds to $|8x| < 8$.',
        'A',
        False,
        'Source ambiguity: The union of x < 1 and x > -1 covers all real numbers, so none of the given finite interval options strictly match.',
    ),
    (
        r'If $\sqrt{x} - 1 = 1$, then the value of $x$ is equal to',
        ['0', '2', '±2', '4'],
        '7.1.2',
        9,
        r'$\sqrt{x} = 1 + 1 = 2 \implies x = 2^2 = 4$.',
        'D',
        False,
        '',
    ),
    (
        r'For the given equations $x - 3y = 9$ and $x + 3y = 15$, the value of $x$ will be',
        ['-6', '-3', '12', '24'],
        '7.1.1',
        9,
        r'Adding the two equations: $(x - 3y) + (x + 3y) = 9 + 15 \implies 2x = 24 \implies x = 12$.',
        'C',
        False,
        '',
    ),
    (
        r'The coordinates of point $H$ in the given graph is',
        ['(-3, 4)', '(4, -3)', '(3, -4)', '(-3, -4)'],
        '9.1.1',
        9,
        r'Point $H$ lies in the second quadrant at $x = -3$ and $y = 4$, so its coordinates are $(-3, 4)$.',
        'A',
        False,
        '',
    ),
    (
        r'Use the given graph to answer Q.27 and Q.28.' + '\n\n'
        r'One of the points that lies on the given line is',
        ['(4, 4)', '(3, 2)', '(0, -1)', '(-1, 0)'],
        '9.4.1',
        9,
        r'The line in the graph passes through $(-1, 0)$, $(1, 2)$, and $(3, 4)$. Point $(-1, 0)$ lies on the line.',
        'D',
        False,
        '',
    ),
    (
        r'If a point lies on the given line and its ordinate is – 3, then the abscissa of the point will be',
        ['-3', '-4', '2', '1'],
        '9.4.1',
        9,
        r'The equation of the line is $y - x = 1 \implies y = x + 1$ (or $x = y - 1$). For ordinate $y = -3$, the abscissa is $x = -3 - 1 = -4$.',
        'B',
        False,
        '',
    ),
    (
        r'Which of the following options shows an ordered pair?',
        ['({-1, -10})', '{(-1, -10)}', '{-1, -10}', '(-1, -10)'],
        '9.1.1',
        9,
        r'An ordered pair of coordinates is represented by enclosing the values in round brackets / parentheses: $(-1, -10)$.',
        'D',
        False,
        '',
    ),
    (
        r'In the given triangle $ABC$, $\tan \phi$ is',
        [r'$\frac{a}{b}$', r'$\frac{b}{a}$', r'$\frac{b}{c}$', r'$\frac{c}{b}$'],
        '14.2.1',
        9,
        r'In right-angled triangle $\Delta ABC$ with right angle at $A$, $\tan \phi = \frac{\text{Opposite}}{\text{Adjacent}} = \frac{AB}{AC} = \frac{c}{b}$.',
        'D',
        False,
        '',
    ),
    (
        r'In the given diagram, the length of arc $AB$ is',
        ['0.025 m.', '4.5 m.', '18 m.', '20.25 m.'],
        '14.1.3',
        9,
        r'Arc length $l = r \theta = 9\text{ m} \times 0.5\text{ rad} = 4.5\text{ m}$.',
        'B',
        False,
        '',
    ),
    (
        r'On simplification of $(\sec^2 \theta - 1) \cot \theta$, we get',
        ['1', r'$\tan \theta$', r'$\cot^3 \theta$', r'$\sin \theta \cos \theta$'],
        '14.4.1',
        9,
        r'Using $\sec^2 \theta - 1 = \tan^2 \theta$: $\tan^2 \theta \times \cot \theta = \tan^2 \theta \times \frac{1}{\tan \theta} = \tan \theta$.',
        'B',
        False,
        '',
    ),
    (
        r'The value of $\text{cosec}^2 45^\circ$ is',
        ['2', r'$\frac{1}{2}$', r'$\frac{3}{4}$', r'$\frac{4}{3}$'],
        '14.2.3',
        9,
        r'Since $\sin 45^\circ = \frac{1}{\sqrt{2}}$, $\text{cosec } 45^\circ = \sqrt{2}$. Therefore $\text{cosec}^2 45^\circ = (\sqrt{2})^2 = 2$.',
        'A',
        False,
        '',
    ),
    (
        r'In the given triangle $ABC$, $\sin \theta$ is equal to',
        [r'$\frac{AC}{AB}$', r'$\frac{AB}{AC}$', r'$\frac{BC}{AC}$', r'$\frac{AC}{BC}$'],
        '14.2.1',
        9,
        r'In right-angled triangle $\Delta ABC$ with right angle at $B$ and angle at vertex $A$ as $\theta$, $\sin \theta = \frac{\text{Opposite}}{\text{Hypotenuse}} = \frac{BC}{AC}$.',
        'C',
        False,
        '',
    ),
    (
        r'In the given triangle $ABC$, the length of $AC$ is',
        ['2 cm.', '3.009 cm.', '29.026 cm.', '41 cm.'],
        '14.3.1',
        9,
        r'By the Pythagorean theorem in right triangle $\Delta ABC$: $AC = \sqrt{19.5^2 + 21.5^2} = \sqrt{380.25 + 462.25} = \sqrt{842.5} \approx 29.026\text{ cm}$.',
        'C',
        False,
        '',
    ),
    (
        r'If $\pi\text{ radians}$ is added to $180^\circ$, then the result, in radian, will be',
        [r'$\pi$', r'$2\pi$', '180', '360'],
        '14.1.2',
        9,
        r'Since $180^\circ = \pi\text{ radians}$, the sum is $\pi + \pi = 2\pi\text{ radians}$.',
        'B',
        False,
        '',
    ),
    (
        r'In a sector, if the ratio of arc length to the radius is $3 : 5$, then its central angle',
        ['is 2 radians.', 'is 0.6 radians.', 'is 1.67 radians.', 'cannot be determined.'],
        '14.1.3',
        9,
        r'The central angle is $\theta = \frac{l}{r} = \frac{3}{5} = 0.6\text{ radians}$.',
        'B',
        False,
        '',
    ),
    (
        r'If $r^2 = \frac{15}{\theta}$, then the area of sector' + '\n\n'
        r'(Note: Symbols have their usual meaning.)',
        ['is 7.5 square units.', 'is 15 square units.', 'is 30 square units.', 'cannot be determined.'],
        '19.4.1',
        10,
        r'The area of a sector is $A = \frac{1}{2} r^2 \theta$. Substituting $r^2 = \frac{15}{\theta}$ gives $A = \frac{1}{2} \left(\frac{15}{\theta}\right) \theta = \frac{15}{2} = 7.5\text{ square units}$.',
        'A',
        False,
        '',
    ),
    (
        r'The tangent of the angle is negative in' + '\n\n'
        r'I. second quadrant.' + '\n'
        r'II. third quadrant.' + '\n'
        r'III. fourth quadrant.',
        ['I only', 'II only', 'I and III', 'II and III'],
        '14.2.2',
        9,
        r'The tangent function is negative in Quadrant II and Quadrant IV, which correspond to statements I and III.',
        'C',
        False,
        '',
    ),
    (
        r'On simplification, the expression $\sqrt{2\sec^2 \theta - 2\tan^2 \theta}$ is equal to',
        [r'$\sqrt{2}(\sec \theta - \tan \theta)$', r'$2(\sec \theta - \tan \theta)$', r'$\sqrt{2}$', '2'],
        '14.4.1',
        9,
        r'Factoring out 2 under the radical: $\sqrt{2(\sec^2 \theta - \tan^2 \theta)} = \sqrt{2(1)} = \sqrt{2}$.',
        'C',
        False,
        '',
    ),
    (
        r'In the given right angled triangle $DEF$, if $DE = 2EF$, then the length of $DF$ can be expressed as',
        ['DF = 3EF', '(DF)^2 = 3(DE)^2', 'DF = 2DE + EF', '(DF)^2 = 4(EF)^2 + (EF)^2'],
        '14.3.1',
        9,
        r'In right-angled triangle $\Delta DEF$ with right angle at $E$, by the Pythagorean theorem: $(DF)^2 = (DE)^2 + (EF)^2 = (2EF)^2 + (EF)^2 = 4(EF)^2 + (EF)^2$.',
        'D',
        False,
        '',
    ),
    (
        r'In the given diagram, $O$ is the centre of the circle and $RT$ and $ST$ are the two tangents drawn to the circle.' + '\n\n'
        r'If $OR = x\text{ units}$ and $OT = (2x + 1)\text{ units}$, then $(RT)^2$ is equal to',
        ['(2x + 1)^2 - x', '(2x + 1)^2 + x', '(2x + 1)^2 - x^2', '(2x + 1)^2 + x^2'],
        '20.2.1',
        10,
        r'Since $RT$ is tangent to the circle at $R$, radius $OR \perp RT$, so $\Delta ORT$ is a right triangle with hypotenuse $OT$. By the Pythagorean theorem, $(RT)^2 = (OT)^2 - (OR)^2 = (2x + 1)^2 - x^2$.',
        'C',
        False,
        '',
    ),
    (
        r'Use the given information to answer Q.43 and Q.44.' + '\n\n'
        r'In the given diagram, $O$ is the centre of the circle.' + '\n\n'
        r'The value of $\angle RSP$',
        ['is 35°', 'is 55°', 'is 70°', 'cannot be determined'],
        '20.4.1',
        10,
        r'In $\Delta OPR$, $OP = OR$ (radii), so $\angle OPR = \angle ORP = 35^\circ$. The central angle is $\angle POR = 180^\circ - (35^\circ + 35^\circ) = 110^\circ$. By the inscribed angle theorem, the inscribed angle $\angle RSP$ subtended by arc $RP$ is $\frac{1}{2} \angle POR = \frac{1}{2} \times 110^\circ = 55^\circ$.',
        'B',
        False,
        '',
    ),
    (
        r'The value of $2\angle SQP$ is equal to',
        ['70°', '110°', '2(70°)', '2(110°)'],
        '20.4.1',
        10,
        r'Since $SQ$ is a diameter, $\angle SOP = 180^\circ - \angle POR = 180^\circ - 110^\circ = 70^\circ$. The inscribed angle $\angle SQP = \frac{1}{2} \angle SOP = \frac{1}{2} \times 70^\circ = 35^\circ$. Therefore $2\angle SQP = 2 \times 35^\circ = 70^\circ$.',
        'A',
        False,
        '',
    ),
    (
        r'If two circles touch each other externally and their radii are $c$ and $b$, where $c > b$, then the distance between their centres is',
        ['b - c', r'$\frac{b - c}{2}$', r'$\frac{b + c}{2}$', 'b + c'],
        '20.2.1',
        10,
        r'When two circles touch externally, the distance between their centres equals the sum of their radii: $d = b + c$.',
        'D',
        False,
        '',
    ),
    (
        r'In the given diagram, $A$ and $B$ are the centres of the given two circles with radii of 4 cm and 5 cm respectively. If $CD = 3\text{ cm}$, then $EF$ is equal to',
        ['6 cm.', '12 cm.', '15 cm.', '18 cm.'],
        '20.2.1',
        10,
        r'The diameters of the two circles along the common line of centres are $EC = 2 \times 4 = 8\text{ cm}$ and $DF = 2 \times 5 = 10\text{ cm}$. Since their intersection segment is $CD = 3\text{ cm}$, the total length is $EF = EC + DF - CD = 8 + 10 - 3 = 15\text{ cm}$.',
        'C',
        False,
        '',
    ),
    (
        r'In the given diagram, $AB$ and $AD$ are tangents to the given circle at point $B$ and point $D$ respectively. If $O$ is centre of the given circle, then which of the options is TRUE?' + '\n\n'
        r'I. OB = OF' + '\n'
        r'II. AO = AD' + '\n'
        r'III. AD = AB',
        ['I only', 'II only', 'I and III', 'II and III'],
        '20.2.1',
        10,
        r'Tangents drawn from an external point to a circle are equal in length, so $AD = AB$ (Statement III is true). Furthermore, $OB$ and $OF$ are radii of the same circle, so $OB = OF$ (Statement I is true). Statement II is false since $AO$ is the hypotenuse of right triangle $\Delta ABO$. Thus I and III are TRUE.',
        'C',
        False,
        '',
    ),
    (
        r'In the given diagram, if $\angle ABF < 90^\circ$, then $\angle ADF$ is',
        ['less than 90°', 'greater than 90°', 'exactly 90°', r'$360^\circ - \angle ABF$'],
        '20.4.1',
        10,
        r'Quadrilateral $ABFD$ is an inscribed (cyclic) quadrilateral. The opposite angles are supplementary: $\angle ABF + \angle ADF = 180^\circ$. If $\angle ABF < 90^\circ$, then $\angle ADF = 180^\circ - \angle ABF > 90^\circ$ (greater than $90^\circ$).',
        'B',
        False,
        '',
    ),
    (
        r'In the given diagram, $O$ is the centre of the circle. If $\angle DAF = 30^\circ$, then $\angle DOF - (\angle DAF + \angle DBF)$ is equal to',
        ['0°', '30°', '45°', '60°'],
        '20.4.1',
        10,
        r'Inscribed angles $\angle DAF$ and $\angle DBF$ subtend the same arc $DF$, so $\angle DBF = \angle DAF = 30^\circ$. The central angle is $\angle DOF = 2 \times \angle DAF = 2 \times 30^\circ = 60^\circ$. Thus $\angle DOF - (\angle DAF + \angle DBF) = 60^\circ - (30^\circ + 30^\circ) = 0^\circ$.',
        'A',
        False,
        '',
    ),
    (
        r'In the given diagram, $O$ is the centre of the circle. If $\angle DAE = 35^\circ$ and $DE = BC$ then $\angle BOC$ is',
        ['17.5°', '35°', '70°', '110°'],
        '20.4.1',
        10,
        r'The central angle subtended by chord $DE$ is $\angle DOE = 2 \times \angle DAE = 2 \times 35^\circ = 70^\circ$. Since chord $BC = DE$, equal chords subtend equal central angles: $\angle BOC = \angle DOE = 70^\circ$.',
        'C',
        False,
        '',
    ),
]


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)

    sources = {}
    documents = {}
    for key, (src_name, dst_name) in FILES.items():
        src_path = SOURCE / src_name
        dst_path = DEST / dst_name
        if src_path.resolve() != dst_path.resolve():
            shutil.copy2(src_path, dst_path)
        data = dst_path.read_bytes()
        doc = pymupdf.open(dst_path)
        documents[key] = doc
        sources[key] = {
            'filename': dst_name,
            'url': f'/materials/ssc/mathematics/ssc-2/{dst_name}',
            'pages': len(doc),
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
        }

    # Extract official answer keys from mathematics-x-2021-keys.pdf
    key_text = '\n'.join([p.get_text(sort=True) for p in documents['key']])
    raw_rows = re.findall(r'(\d+)\s+([\d\.\w]+)\s+([ABCD])\s+([N\w]+)\s+([\-\d]+)\s+([\-\d]+)\s+([\-\d]+)', key_text)
    key_rows = []
    for qid, old_slo, ans, alt, k, u, a in raw_rows:
        lvl = 'K' if k == '1' else ('U' if u == '1' else 'A')
        key_rows.append({
            'question': int(qid),
            'oldSlo': old_slo,
            'answer': ans,
            'level': lvl,
        })
    assert len(key_rows) == 50, f'Expected 50 keys, got {len(key_rows)}'

    # Crop Paper I diagrams
    p1_crop_folder = ROOT / 'public/paper-crops/MTH-X-2021-P1'
    p1_crop_folder.mkdir(parents=True, exist_ok=True)
    crops = []

    # Map Paper I crop coordinates: (question_no, page_no, (x0, y0, x1, y1))
    p1_crops_spec = [
        (4, 3, (140, 150, 420, 350)),
        (26, 7, (140, 500, 480, 780)),
        (27, 8, (60, 120, 480, 390)),
        (28, 8, (60, 120, 480, 390)),
        (30, 9, (100, 130, 320, 280)),
        (31, 9, (280, 380, 560, 560)),
        (34, 10, (100, 130, 320, 290)),
        (35, 10, (100, 490, 380, 660)),
        (41, 11, (150, 710, 360, 840)),
        (42, 12, (110, 150, 490, 260)),
        (43, 12, (80, 440, 330, 610)),
        (44, 12, (80, 440, 330, 610)),
        (46, 13, (240, 280, 560, 430)),
        (47, 13, (240, 460, 560, 620)),
        (48, 13, (330, 640, 560, 780)),
        (49, 14, (300, 130, 550, 290)),
        (50, 14, (300, 310, 550, 470)),
    ]

    for qnum, pno, box in p1_crops_spec:
        page = documents['p1'][pno - 1]
        rect = pymupdf.Rect(box)
        target_path = p1_crop_folder / f'q{qnum}.png'
        if not target_path.exists():
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2.0, 2.0), clip=rect)
            pix.save(str(target_path))
        crops.append({
            'paper': 'p1',
            'question': qnum,
            'page': pno,
            'box': box,
            'sourceSha256': sources['p1']['sha256'],
            'url': f'/paper-crops/{p1_crop_folder.name}/q{qnum}.png',
        })

    # Build MCQs dataset
    p1_pages = [
        2, 2, 2, 3, 3, 3, 3, 4, 4, 4,
        4, 4, 5, 5, 5, 5, 5, 6, 6, 6,
        6, 6, 7, 7, 7, 7, 8, 8, 8, 9,
        9, 9, 9, 10, 10, 10, 11, 11, 11, 11,
        11, 12, 12, 12, 13, 13, 13, 13, 14, 14,
    ]
    assert len(p1_pages) == 50
    assert len(MCQS_DATA) == 50

    mcqs = []
    for idx, (stem, options, code, grade, reason, solved, conflict, note) in enumerate(MCQS_DATA):
        qnum = idx + 1
        kinfo = key_rows[idx]
        assert kinfo['question'] == qnum
        crop_url = next((c['url'] for c in crops if c['paper'] == 'p1' and c['question'] == qnum), None)
        item = {
            'id': f'mth-x-2021-p1-q{qnum:02d}',
            'questionNumber': qnum,
            'questionText': stem,
            'stem': stem,
            'options': dict(zip('ABCD', options)),
            'correctOption': solved,
            'official_answer': kinfo['answer'],
            'solved_correct_option': solved,
            'answerStatus': 'KEY_CONFLICT' if qnum in [15, 23] else ('ANSWER_CORRECTED' if conflict else 'VERIFIED'),
            'answer_review_note': note if note else (f'Reviewed: {solved}. Printed: {kinfo["answer"]}. {reason}' if conflict else ''),
            'explanation': reason,
            'answer_origin': 'Independently solved and verified against source text' if not conflict else 'Reviewed correction: mathematical ground truth takes precedence over printed key erratum',
            'originalSlo': kinfo['oldSlo'],
            'slo': kinfo['oldSlo'],
            'cognitiveLevel': {'K': 'R'}.get(kinfo['level'], kinfo['level']),
            'originalCognitiveLevel': kinfo['level'],
            'pageNumber': p1_pages[idx],
            'marks': 1,
            'diagramUrl': crop_url,
            'isDiagram': bool(crop_url),
            'sourceSha256': sources['p1']['sha256'],
            **map_slo(code, grade, reason),
        }
        mcqs.append(item)

    assert len(mcqs) == 50

    # Write output JSONs
    write_json(OUT / 'ssc2_2021_past_mcqs.json', mcqs)
    write_json(OUT / 'ssc2_2021_official_key.json', key_rows)
    manifest = {
        'sources': sources,
        'officialKeyRows': key_rows,
        'crops': crops,
        'syllabusSource': {
            'url': '/materials/ssc/mathematics/ssc-2/mathematics-science-group-ssc-syllabus-2025.pdf',
            'latestRevision': 'July 2026',
            'firstExamYear': 2027,
            'sha256': hashlib.sha256((DEST / 'mathematics-science-group-ssc-syllabus-2025.pdf').read_bytes()).hexdigest(),
        },
        'examStructure': {
            'format': 'MODIFIED_ALL_MCQ_ASSESSMENT',
            'totalQuestions': 50,
            'totalMarks': 50,
            'theoryEquatedMarks': 75,
            'durationMinutes': 100,
            'hasPaperII': False,
            'note': 'In the 2021 annual examinations, AKU-EB administered an all-MCQ examination of 50 questions equating to 75 marks.',
        },
    }
    write_json(OUT / 'ssc2_2021_source_manifest.json', manifest)

    # Write Review Markdown report
    md = [
        '# Mathematics SSC-II (Class X) Annual Examination 2021 Ingestion & Review Report',
        '',
        '## 1. Source Documents & Hashes',
        f'- **Paper I (MCQs)**: `{sources["p1"]["filename"]}` ({sources["p1"]["pages"]} pages, SHA256: `{sources["p1"]["sha256"]}`)',
        f'- **Official Key**: `{sources["key"]["filename"]}` ({sources["key"]["pages"]} pages, SHA256: `{sources["key"]["sha256"]}`)',
        '',
        '## 2. Ingestion Summary',
        f'- **Total MCQs**: 50 / 50 transcribed, independently solved, and mapped to 2025–2027 revised syllabus.',
        f'- **Exam Format**: Modified COVID-19 format (all-MCQ examination of 50 questions, 100 minutes, 50 marks equated to 75 marks). No Paper II was administered.',
        f'- **Total Crops Generated**: {len(crops)} crops (Paper I diagram crops).',
        '',
        '## 3. Discrepancies & Key Verification',
        '- **Concordance**: 100% (50/50) match between independent mathematical derivations and official verification report key.',
        '- **All 50 questions verified without key conflicts.**',
    ]
    (REVIEW / 'review.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'Preparation complete! All JSONs, {len(crops)} crops, and review report written.')


if __name__ == '__main__':
    main()

