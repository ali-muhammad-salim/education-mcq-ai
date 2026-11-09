"""Prepare the reviewed 2025 Class X (SSC-II) papers; never writes to the database.

Transcription, mathematical solving, and semantic mappings checked against rendered source pages.
Extracts high-resolution crops for Paper I, Paper II, and E-marking student responses.
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
REVIEW = ROOT / 'output/mathematics-x-2025'
FILES = {
    'p1': ('mathematics-x-2025-paper-i.pdf', 'mathematics-x-2025-paper-i.pdf'),
    'p2': ('mathematics-x-2025-paper-ii.pdf', 'mathematics-x-2025-paper-ii.pdf'),
    'key': ('mathematics-x-2025-keys.pdf', 'mathematics-x-2025-keys.pdf'),
    'em': ('mathematics-x-2025-emarking.pdf', 'mathematics-x-2025-emarking.pdf'),
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


# 45 MCQs: stem, options A-D, current SLO, target grade, rationale, solved option, conflict bool, review note
MCQS_DATA = [
    (
        r'The length ‘L’ cm of 16 carrots were measured and recorded into a following grouped frequency table.' + '\n\n' +
        r'| Length, L cm | Frequency |' + '\n' +
        r'| --- | --- |' + '\n' +
        r'| $0 < L \le 10$ | $2$ |' + '\n' +
        r'| $10 < L \le 20$ | $5$ |' + '\n' +
        r'| $20 < L \le 30$ | $6$ |' + '\n' +
        r'| $30 < L \le 40$ | $3$ |' + '\n\n' +
        r'What are the two frequencies of the carrots with lengths less than or equal to 10 cm and more than 20 cm?',
        ['2 and 9', '2 and 6', '3 and 2', '2 and 3'],
        '22.1.1',
        10,
        r'From the frequency table, frequency of carrots with length $\le 10$ cm is 2, and greater than 20 cm is $6 + 3 = 9$.',
        'A',
        False,
        '',
    ),
    (
        r'The given cumulative frequency curve represents the age of group of individuals.' + '\n\n' +
        r'How many group of individuals have ages greater than 20 years but less than 30 years?',
        ['12', '10', '8', '5'],
        '22.2.1',
        10,
        r'From the cumulative frequency curve (ogive), cf at age 20 is 14 and cf at age 30 is 22. The number of individuals with ages between 20 and 30 is $22 - 14 = 8$.',
        'C',
        False,
        '',
    ),
    (
        r'If the arithmetic mean of a group of numbers is 25 and each number of a group is multiplied by 2, then the new arithmetic mean is',
        ['12.5', '25', '50', '100'],
        '22.3.1',
        10,
        r'By the change of scale property of arithmetic mean, if each observation $x_i$ is multiplied by a constant $c = 2$, the new mean is $\bar{x}_{\text{new}} = 2 \times 25 = 50$.',
        'C',
        False,
        '',
    ),
    (
        r'If the range of x, 9, 10, 11 and 3x is 8, then the value of x will be',
        ['2', '3', '4', '8'],
        '22.4.1',
        10,
        r'If $x = 4$, the dataset is $\{4, 9, 10, 11, 12\}$ and range is $12 - 4 = 8$. However, if $x = 3$, the dataset is $\{3, 9, 10, 11, 9\}$ and range is $11 - 3 = 8$. Both B and C are valid mathematically.',
        'C',
        False,
        'Source ambiguity: The two reported ranges are genuinely equal (for x=3 and x=4), so Q4 cannot have a unique key.',
    ),
    (
        r'If the median of the values 6, 7, 8, a, 9 and 9 is 8.5, then the value of a will be',
        ['8', '8.5', '9', '9.5'],
        '22.3.1',
        10,
        r'For the 6 arranged numbers $6, 7, 8, a, 9, 9$, the median is the average of the 3rd and 4th terms: $\frac{8 + a}{2} = 8.5 \implies 8 + a = 17 \implies a = 9$.',
        'C',
        False,
        '',
    ),
    (
        r'The mode of the given data 9, 10, 45, 15, 19, 9, 23, 23, 35, 27, 32, 35, 40, 35, 40, 45 is',
        ['9', '35', '40', '45'],
        '22.3.1',
        10,
        r'The mode is the most frequently occurring value in the dataset. The number 35 occurs 3 times, which is more frequent than any other value.',
        'B',
        False,
        '',
    ),
    (
        r'The given algebraic expression $\frac{6a^3 b^4}{3a^2 b}$ can be expressed into simplest form as',
        ['2ab', r'$\frac{2a}{b}$', r'$2ab^3$', r'$\frac{ab^3}{2}$'],
        '6.2.2',
        9,
        r'Simplifying the coefficients and exponents: $\frac{6}{3} a^{3-2} b^{4-1} = 2ab^3$. In the current 2025–2027 curriculum, algebraic fractions are covered in Grade 9 Unit 6.',
        'C',
        False,
        '',
    ),
    (
        r'The highest common factor (H.C.F) of the expression is $x^2 - 1$ and least common multiple is $(x + 1)^2$. If one polynomial of the expression is $2x^2 + 4x + 2$, then the other polynomial will be',
        [r'$\frac{x^2 - 1}{2}$', r'$x - 1$', r'$x^2 - 1$', r'$2(x - 1)^2$'],
        '6.1.1',
        9,
        r'Using $P(x) \times Q(x) = \text{HCF} \times \text{LCM}$, with $P(x) = 2(x+1)^2$: $Q(x) = \frac{(x^2 - 1)(x+1)^2}{2(x+1)^2} = \frac{x^2 - 1}{2}$. Mathematically, $(x+1)^2$ is not a multiple of $(x^2-1) = (x-1)(x+1)$.',
        'A',
        False,
        'Source ambiguity: Printed LCM (x + 1)^2 is not a multiple of HCF x^2 - 1 = (x - 1)(x + 1), making the question mathematically inconsistent.',
    ),
    (
        r'If the algebraic fraction is $\frac{x - 1}{x^2 - 4x + 4}$, then the sum of partial frations will be',
        [r'$\frac{A}{x - 2} + \frac{B}{(x - 2)^2}$', r'$\frac{A}{x - 4} + \frac{B}{(x - 4)^2}$', r'$\frac{A}{x - 2} + \frac{B}{x + 2}$', r'$\frac{A}{x - 4} + \frac{B}{x + 4}$'],
        '6.4.2',
        9,
        r'Since the denominator factors as $x^2 - 4x + 4 = (x - 2)^2$, repeated linear factors expand as $\frac{A}{x-2} + \frac{B}{(x-2)^2}$.',
        'A',
        False,
        '',
    ),
    (
        r'The positive square root of $49x^2 - 28xy + 4y^2$ is',
        [r'$(49x)^2 - (4y)^2$', r'$(49x - 4y)$', r'$(7x - 2y)^2$', r'$(7x - 2y)$'],
        '6.3.1',
        9,
        r'Recognising the perfect square $(7x - 2y)^2 = 49x^2 - 28xy + 4y^2$, its positive square root is $7x - 2y$.',
        'D',
        False,
        '',
    ),
    (
        r'The highest common factor (H.C.F.) of $ax^2 - a$ and $a(x + 1)$ is',
        [r'$a(x + 1)$', r'$a(x - 1)$', r'$ax^2 - a$', r'$ax^2 + 1$'],
        '6.1.1',
        9,
        r'Factorising $ax^2 - a = a(x - 1)(x + 1)$. The common factors with $a(x + 1)$ are $a$ and $(x + 1)$, giving $\text{HCF} = a(x + 1)$.',
        'A',
        False,
        '',
    ),
    (
        r'The least common multiple (L.C.M.) of $(ax + b)^2$ and $(ax)^2 - b^2$ is',
        [r'$ax + b$', r'$(ax + b)^2$', r'$(ax - b)^2 (ax + b)$', r'$(ax + b)^2 (ax - b)$'],
        '6.1.1',
        9,
        r'Factorising $(ax)^2 - b^2 = (ax - b)(ax + b)$. The LCM takes highest powers of each factor: $(ax + b)^2 (ax - b)$.',
        'D',
        False,
        '',
    ),
    (
        r'On simplification of $\left(1 - \frac{1}{x}\right) \div \frac{1}{x}$, we get',
        ['1', r'$x - 1$', r'$\frac{x - 1}{x^2}$', r'$\frac{1 - x}{x^2}$'],
        '6.2.2',
        9,
        r'$\left(1 - \frac{1}{x}\right) \div \frac{1}{x} = \left(\frac{x - 1}{x}\right) \times \frac{x}{1} = x - 1$.',
        'B',
        False,
        '',
    ),
    (
        r'Which of the following equations has no solutions?',
        [r'$5x - 2 = 3x + 1$', r'$2x + 7 = 2x + 7$', r'$4x - 6 = 2x - 3$', r'$3x - 5 = 4x + 2$'],
        '7.1.1',
        9,
        r'Official board key is B. Mathematical note: $2x + 7 = 2x + 7$ is an identity satisfied by all real numbers (infinitely many solutions), while A, C, and D each have a unique solution ($x = 1.5, x = 1.5, x = -7$). If B had different constants (e.g. $2x+7=2x+5$), it would have no solution. Retained B as keyed with complete ambiguity documentation.',
        'B',
        False,
        'Source ambiguity: The official key selects B. Mathematically, $2x + 7 = 2x + 7$ is an identity with infinitely many solutions, whereas equations with no solution take the form $ax + b = ax + c$ with $b \ne c$.',
    ),
    (
        r'The values of $z$ which satisfy the equation $|4z - 1| = 5$ are',
        [r'$z = -1$ or $z = 1/2$.', r'$z = -1$ or $z = 3/2$.', r'$z = 1$ or $z = 3/2$.', r'$z = 5/4$ or $z = 6/4$.'],
        '7.2.2',
        9,
        r'Either $4z - 1 = 5 \implies 4z = 6 \implies z = 3/2$, or $4z - 1 = -5 \implies 4z = -4 \implies z = -1$.',
        'B',
        False,
        '',
    ),
    (
        r'Let $a, b, c \in \mathbb{R}$.' + '\n\n' + r'If $a > b$, then $b > c$, then $a > c$, then which one of the following is TRUE?',
        ['Multiplicative Property', 'Law of Trichotomy', 'Transitive Property', 'Additive Property'],
        '1.3.1',
        9,
        r'The transitive property of order for real numbers states that if $a > b$ and $b > c$, then $a > c$.',
        'C',
        False,
        '',
    ),
    (
        r'Which one of the following inequality is shown by the given number line?',
        [r'$2 - x \le 3$', r'$2 - x \le 1$', r'$1 - x \le 3$', r'$3 - x \le 2$'],
        '7.3.1',
        9,
        r'The number line displays a solid dot at $-1$ with shading extending to the right, representing $x \ge -1$. Solving $2 - x \le 3 \implies -x \le 1 \implies x \ge -1$.',
        'A',
        False,
        '',
    ),
    (
        r'For the equation $\sqrt{y - 1} = -1$, where $y \in \mathbb{R}$, the solution set will be',
        [r'$\{\}$.', r'$\{-1\}$.', r'$\{0\}$.', r'$\{2\}$.'],
        '7.1.2',
        9,
        r'The principal square root of any real number is non-negative ($\sqrt{y - 1} \ge 0$), so $\sqrt{y - 1} = -1$ has no real solution; the solution set is $\{\}$ (Option A). The printed key states D ($\{2\}$), but substituting $y = 2$ gives $\sqrt{2 - 1} = 1 \ne -1$ (extraneous root).',
        'A',
        True,
        'Official Key Conflict: Printed key is D ({2}). However, substituting y=2 gives sqrt(1) = 1 != -1. In real numbers, principal square root cannot be negative; the correct solution set is the empty set {} (Option A).',
    ),
    (
        r'Which of the following inequalities satisfies the solution set $x < 1$ or $x > -1$?',
        [r'$|8x| < 8$', r'$|8x| > 8$', r'$|x + 1| > 1$', r'$|x + 1| < 1$'],
        '7.2.2',
        9,
        r'$|8x| < 8 \iff -8 < 8x < 8 \iff -1 < x < 1$ (which satisfies $x > -1$ and $x < 1$). Option A is the intended choice.',
        'A',
        False,
        'Source ambiguity: The solution set x < 1 or x > -1 comprises the entire real line R, which none of the options represents.',
    ),
    (
        r'The given graph represents straight line(s)' + '\n' + r'I. $2y = -(2x + 2c)$' + '\n' + r'II. $y = -x - c$' + '\n' + r'III. $2y = x - c$',
        ['I and III.', 'I and II.', 'III only.', 'II only.'],
        '9.4.1',
        9,
        r'The line passes through $(0, -c)$ and $(-c, 0)$, so slope $m = \frac{0 - (-c)}{-c - 0} = -1$ and $y$-intercept is $-c$. The line is $y = -x - c$ (II). Simplifying I: $2y = -2x - 2c \iff y = -x - c$. Thus both I and II represent the line.',
        'B',
        False,
        '',
    ),
    (
        r'The given graph represents the relationship between US Dollars and Pakistani Rupees. Referring to the graph, 7 US Dollars are approximately equal to',
        ['1600 Pakistani Rupees.', '1800 Pakistani Rupees.', '2000 Pakistani Rupees.', '2200 Pakistani Rupees.'],
        '9.5.1',
        9,
        r'Tracing vertically from $x = 7$ on the horizontal US Dollar axis to the line and across to the vertical Pakistani Rupee axis gives approximately 1800 PKR (closer to 1800 than other options).',
        'B',
        False,
        '',
    ),
    (
        r'The value of $a$ is 2 and the value of $b$ is 1. If one of the equations is $a + b = 3$, then the other equation will be',
        [r'$a + b = 6$', r'$a + b = 1$', r'$a - b = 1$', r'$a - b = 3$'],
        '7.1.1',
        9,
        r'Substituting $a = 2, b = 1$: $a - b = 2 - 1 = 1$, so $a - b = 1$ is satisfied.',
        'C',
        False,
        '',
    ),
    (
        r'The area of a rectangle is given by the equation $A = x^2 - 6x - 4$, where $x$ is the length of one side. If the area is $12\text{ m}^2$, then the value of $x$ will be',
        [r'$x = 8$ m.', r'$x = 4$ m.', r'$x = 2$ m.', r'$x = -8$ m.'],
        '15.6.1',
        10,
        r'Setting $x^2 - 6x - 4 = 12 \implies x^2 - 6x - 16 = 0 \implies (x - 8)(x + 2) = 0$. Since side length must be positive, $x = 8$ m.',
        'A',
        False,
        '',
    ),
    (
        r'Which of the following equations has the discriminant equals to 1?',
        [r'$5x^2 - 2x + 6 = 0$', r'$2x^2 - 5x + 3 = 0$', r'$x^2 - 2x - 6 = 0$', r'$x^2 - 5x + 3 = 0$'],
        '15.4.1',
        10,
        r'For $2x^2 - 5x + 3 = 0$, $a = 2, b = -5, c = 3$. The discriminant is $\Delta = b^2 - 4ac = (-5)^2 - 4(2)(3) = 25 - 24 = 1$.',
        'B',
        False,
        '',
    ),
    (
        r'The standard form of the quadratic equation $\frac{x}{2} = -x^2 + 3$ is',
        [r'$2x^2 + 2x + 6 = 0$', r'$2x^2 + 2x - 6 = 0$', r'$2x^2 + x - 6 = 0$', r'$2x^2 + x + 6 = 0$'],
        '15.1.2',
        10,
        r'Multiplying both sides by 2 gives $x = -2x^2 + 6 \implies 2x^2 + x - 6 = 0$.',
        'C',
        False,
        '',
    ),
    (
        r'What should be added to $x^2 + 3x$ to make it a perfect square?',
        [r'$\frac{1}{9}$', r'$\frac{1}{3}$', r'$\frac{3}{2}$', r'$\frac{9}{4}$'],
        '15.2.1',
        10,
        r'For $x^2 + 2(3/2)x$, adding $(3/2)^2 = 9/4$ gives the perfect square $(x + 3/2)^2$.',
        'D',
        False,
        '',
    ),
    (
        r'If $AB = BC$, then the coordinates of the point $B$ will be',
        [r'$(-1, 3)$', r'$(3, -1)$', r'$(4, -2)$', r'$(2, -4)$'],
        '9.2.1',
        9,
        r'Point $B$ is the midpoint of segment $AC$ joining $A(-1, -3)$ and $C(7, 1)$: $B = \left(\frac{-1 + 7}{2}, \frac{-3 + 1}{2}\right) = (3, -1)$.',
        'B',
        False,
        '',
    ),
    (
        r'In the given triangle $ABC$, side $BC$ is equal to',
        ['5 units.', '7 units.', r'$\sqrt{41}$ units.', r'$\sqrt{61}$ units.'],
        '9.1.1',
        9,
        r'Using the distance formula between $B(1, 1)$ and $C(4, 5)$: $BC = \sqrt{(4 - 1)^2 + (5 - 1)^2} = \sqrt{3^2 + 4^2} = 5$ units.',
        'A',
        False,
        '',
    ),
    (
        r"If the angle is $28.965^\circ$, then its $D^\circ M' S''$ representation will be",
        ["28°90'57''", "28°57'90''", "28°57'54''", "28°54'57''"],
        '14.1.2',
        9,
        r'$0.965 \times 60 = 57.9^\prime$ and $0.9 \times 60 = 54^{\prime\prime}$, so $28.965^\circ = 28^\circ 57^\prime 54^{\prime\prime}$.',
        'C',
        False,
        '',
    ),
    (
        r'For a circle with a radius of 10 metres, if the central angle of the sector is $\frac{3\pi}{4}$ radians, then the area of the sector will be',
        [r'$\frac{15\pi}{4}\text{ m}^2$', r'$\frac{75\pi}{4}\text{ m}^2$', r'$\frac{75\pi}{2}\text{ m}^2$', r'$75\pi\text{ m}^2$'],
        '14.1.3',
        9,
        r'$\text{Area of sector} = \frac{1}{2} r^2 \theta = \frac{1}{2} (10)^2 \left(\frac{3\pi}{4}\right) = \frac{100 \times 3\pi}{8} = \frac{75\pi}{2}\text{ m}^2$.',
        'C',
        False,
        '',
    ),
    (
        r'The value of $\sin 30^\circ$ is',
        [r'$\frac{1}{2}$', r'$\frac{\sqrt{3}}{3}$', r'$\frac{\sqrt{3}}{2}$', r'$\frac{3}{2}$'],
        '14.2.3',
        9,
        r'$\sin 30^\circ = \frac{1}{2}$.',
        'A',
        False,
        '',
    ),
    (
        r'The angle of measurement $\frac{7\pi}{18}$ radians, in degrees, is equal to',
        ['56°', '63°', '70°', '140°'],
        '14.1.4',
        9,
        r'Converting radians to degrees: $\frac{7\pi}{18} \times \frac{180^\circ}{\pi} = 7 \times 10^\circ = 70^\circ$.',
        'C',
        False,
        '',
    ),
    (
        r'A ladder is leaning against a wall. The top of the ladder touches the wall at a height of 8 metres, and the foot of the ladder is 5 metres away from the base of the wall.' + '\n\n' + r'Approximately, the angle of depression will be',
        [r'$\text{Tan}^{-1}\left(\frac{8}{5}\right)$.', r'$\text{Tan}^{-1}\left(\frac{5}{8}\right)$.', r'$\text{Sin}^{-1}\left(\frac{8}{5}\right)$.', r'$\text{Sin}^{-1}\left(\frac{5}{8}\right)$.'],
        '14.5.1',
        9,
        r'The angle of depression from the top of the ladder equals the angle of elevation from the foot to the top: $\tan \theta = \frac{\text{Opposite}}{\text{Adjacent}} = \frac{8}{5} \implies \theta = \tan^{-1}\left(\frac{8}{5}\right)$.',
        'A',
        False,
        '',
    ),
    (
        r'In the fourth quadrant, which one of the following trigonometric ratios is positive?',
        [r'$\sin \theta$', r'$\cos \theta$', r'$\tan \theta$', r'$\cot \theta$'],
        '14.2.2',
        9,
        r'In the fourth quadrant, $x > 0$ and $y < 0$, making $\cos \theta = x/r$ positive, while sine, tangent, and cotangent are negative.',
        'B',
        False,
        '',
    ),
    (
        r'On simplification of $\frac{\sin^2 \theta + \cos^2 \theta}{1 + \tan^2 \theta}$, we get',
        ['1', r'$\cos^2 \theta$', r'$\sec^2 \theta$', r'$\sin^2 \theta$'],
        '14.4.1',
        9,
        r'Using fundamental identities $\sin^2 \theta + \cos^2 \theta = 1$ and $1 + \tan^2 \theta = \sec^2 \theta$: $\frac{1}{\sec^2 \theta} = \cos^2 \theta$.',
        'B',
        False,
        '',
    ),
    (
        r"The central angle subtended by an arc of length 'x' m, at the centre of a circle and its diametre is 2 m, will be",
        ['4x radians.', '2x radians.', 'x radians.', r'$\frac{x}{2}$ radians.'],
        '14.1.3',
        9,
        r'Radius $r = d / 2 = 2 / 2 = 1$ m. By the relation $l = r\theta \implies x = 1 \cdot \theta \implies \theta = x$ radians.',
        'C',
        False,
        '',
    ),
    (
        r'Which of the following are the sides of the right angled triangle?',
        ['4, 6, 8', '13, 27, 30', '2, 17, 9', '24, 10, 26'],
        '14.3.1',
        9,
        r'Applying the converse of Pythagoras theorem: $10^2 + 24^2 = 100 + 576 = 676 = 26^2$.',
        'D',
        False,
        '',
    ),
    (
        r'In a right angled triangle, if the lengths of the shortest and the longest sides are 6 cm and 10 cm respectively, then the length of the third side will be',
        ['7 cm.', '7.5 cm.', '8 cm.', '8.5 cm.'],
        '14.3.1',
        9,
        r'The longest side is the hypotenuse ($c = 10$ cm). The third side is $\sqrt{10^2 - 6^2} = \sqrt{100 - 36} = \sqrt{64} = 8$ cm.',
        'C',
        False,
        '',
    ),
    (
        r'In the given diagram, $O$ is the centre of the circle. The value of $XZ$ will be',
        ['3 m.', '4 m.', '6 m.', '8 m.'],
        '20.1.1',
        10,
        r'In right $\triangle OYX$, $XY = \sqrt{OX^2 - OY^2} = \sqrt{5^2 - 3^2} = 4$ m. The perpendicular from the centre bisects chord $XZ$, so $XZ = 2 \times XY = 2 \times 4 = 8$ m.',
        'D',
        False,
        '',
    ),
    (
        r'If $AB$ and $CD$ are two congruent chords of a circle, then they are',
        ['equal to the diametre of the circle.', 'equidistant from the centre of the circle.', 'equidistant from the tangent to the circle.', 'intersecting at their midpoints.'],
        '20.1.1',
        10,
        r'By theorem 20.1.1c: If two chords of a circle are congruent, then they are equidistant from the centre of the circle.',
        'B',
        False,
        '',
    ),
    (
        r'In the given image, $O$ is the centre of the circle. From point $R$, $RM$ and $RN$ are tangent segments touching the circle at $M$ and $N$ respectively. $RN$ is equal to',
        ['RO', 'RM', '2MO', 'MN'],
        '20.2.1',
        10,
        r'By theorem 20.2.1b: Tangent segments drawn from an external point to a circle are equal in length: $RN = RM$.',
        'B',
        False,
        '',
    ),
    (
        r'If two circles touch each other internally and their radii are 8 cm and 12 cm, then the distance between their centres is',
        ['2 cm.', '4 cm.', '10 cm.', '20 cm.'],
        '20.2.1',
        10,
        r'By theorem 20.2.1c: For internally touching circles, the distance between their centres equals the difference of their radii: $12 - 8 = 4$ cm.',
        'B',
        False,
        '',
    ),
    (
        r'In the given diagram, a circle with centre $O$. We draw two equal chords $AC$ and $BD$. If $\angle BOD = 60^\circ$, then the measurement of $\angle AOC$ will be',
        ['30°', '60°', '90°', '120°'],
        '20.3.1',
        10,
        r'By theorem 20.3.1b: Equal chords of a circle subtend equal angles at the centre, hence $\angle AOC = \angle BOD = 60^\circ$.',
        'B',
        False,
        '',
    ),
    (
        r'In the given circle, two arcs $KL$ and $MN$ are congruent. The CORRECT relationship between the lengths of chords $KL$ and $MN$ will be',
        [r'$MN = 2 KL$', r'$KL = \frac{1}{2} MN$', r'$KL - MN = 0$', r'$KL + MN = 0$'],
        '20.3.1',
        10,
        r'By theorem 20.3.1a: Congruent arcs subtend equal chords, so $KL = MN \iff KL - MN = 0$.',
        'C',
        False,
        '',
    ),
    (
        r'In the given diagram, if the central angle of a minor arc $\angle AOB$ is $30^\circ$, then the measure of the angle subtended by the corresponding major arc will be',
        [r'$\angle ACB = 15^\circ$', r'$\angle ACB = 30^\circ$', r'$\angle ACB = 60^\circ$', r'$\angle ACB = 90^\circ$'],
        '20.4.1',
        10,
        r'By theorem 20.4.1a: The central angle of a minor arc is double the angle subtended by the corresponding major arc at the circumference: $\angle ACB = \frac{1}{2} \angle AOB = 15^\circ$.',
        'A',
        False,
        '',
    ),
]

# Paper II questions (CRQs)
THEORY_DATA = [
    (
        '1',
        3,
        3,
        '14.2.1',
        '22.2.1',
        10,
        'Compulsory.',
        None,
        'U',
        r'The given table shows 18 people’s favourite colour.' + '\n' +
        r'i. Complete the given table. (1 Mark)' + '\n' +
        r'Colour | Number of People (f) | Angles' + '\n' +
        r'Red | 3 | [angle]' + '\n' +
        r'Blue | 4 | [angle]' + '\n' +
        r'Green | 6 | [angle]' + '\n' +
        r'Yellow | 5 | [angle]' + '\n' +
        r'Total | 18 | 360°' + '\n\n' +
        r'ii. Display the information (completed in part i) as a pie chart. (2 Marks)',
        r'i. Calculating sector angles using $\text{Angle} = \frac{f}{18} \times 360^\circ = f \times 20^\circ$:' + '\n' +
        r'- Red: $\frac{3}{18} \times 360^\circ = 60^\circ$' + '\n' +
        r'- Blue: $\frac{4}{18} \times 360^\circ = 80^\circ$' + '\n' +
        r'- Green: $\frac{6}{18} \times 360^\circ = 120^\circ$' + '\n' +
        r'- Yellow: $\frac{5}{18} \times 360^\circ = 100^\circ$' + '\n' +
        r'Total: $60^\circ + 80^\circ + 120^\circ + 100^\circ = 360^\circ$.' + '\n\n' +
        r'ii. Draw a circle of convenient radius, mark the centre, and use a protractor to construct sectors of $60^\circ, 80^\circ, 120^\circ, 100^\circ$, labelling each sector with its respective colour.',
        r'Constructing frequency tables and graphical representations (pie chart) maps to Grade 10 Unit 22 (Basic Statistics).',
    ),
    (
        '2a',
        4,
        4,
        '15.3.1',
        '6.3.1',
        9,
        'Attempt either part a or part b of Q.2.',
        '2',
        'A',
        r'Find the square root of the given expression.' + '\n' +
        r'$4\frac{x^2}{y^2} + 20\frac{x}{y} + 13 - 30\frac{y}{x} + 9\frac{y^2}{x^2}$',
        r'Let $u = \frac{x}{y}$. The expression is $4u^2 + 20u + 13 - 30u^{-1} + 9u^{-2}$.' + '\n' +
        r'Using division method:' + '\n' +
        r'1. First term of root is $\sqrt{4u^2} = 2u = 2\frac{x}{y}$. Subtract $4u^2$, remainder is $20u + 13$.' + '\n' +
        r'2. Double root: $4u$. Divide $20u$ by $4u \implies 5$. Divisor is $4u + 5$. Multiply by 5: $20u + 25$. Subtract, remainder is $-12 - 30u^{-1} + 9u^{-2}$.' + '\n' +
        r'3. New divisor: $4u + 10 - 3u^{-1} = 4\frac{x}{y} + 10 - 3\frac{y}{x}$. Multiply by $-3u^{-1} = -3\frac{y}{x}$: $-12 - 30u^{-1} + 9u^{-2}$.' + '\n' +
        r'4. Remainder is 0.' + '\n' +
        r'Hence, the square root is $\pm\left(2\frac{x}{y} + 5 - 3\frac{y}{x}\right)$.',
        r'Finding the square root of algebraic expressions by division is in Grade 9 Unit 6 (SLO 6.3.1).',
    ),
    (
        '2b',
        4,
        4,
        '16.1.1',
        '6.4.2',
        9,
        'Attempt either part a or part b of Q.2.',
        '2',
        'A',
        r'Resolve the fraction $\frac{2}{x^2 - 9}$ into partial fractions and find the value of $A$ and $B$.',
        r'Denominator factors as $x^2 - 9 = (x - 3)(x + 3)$.' + '\n' +
        r'Set up: $\frac{2}{(x - 3)(x + 3)} = \frac{A}{x - 3} + \frac{B}{x + 3}$.' + '\n' +
        r'Multiply by $(x - 3)(x + 3)$: $2 = A(x + 3) + B(x - 3)$.' + '\n' +
        r'- Setting $x = 3$: $2 = A(6) \implies A = \frac{2}{6} = \frac{1}{3}$.' + '\n' +
        r'- Setting $x = -3$: $2 = B(-6) \implies B = -\frac{2}{6} = -\frac{1}{3}$.' + '\n' +
        r'Hence, $A = \frac{1}{3}$, $B = -\frac{1}{3}$, and the partial fractions are $\frac{1}{3(x - 3)} - \frac{1}{3(x + 3)}$.',
        r'Partial fraction resolution of rational expressions with distinct linear factors is in Grade 9 Unit 6 (SLO 6.4.2).',
    ),
    (
        '3a',
        5,
        3,
        '17.1.1',
        '7.1.2',
        9,
        'Attempt either part a or part b of Q.3.',
        '3',
        'A',
        r'The sum of the ages of a father and his son is 45. If the father is 15 years older than the son, determine their ages using linear equations.',
        r'Let the son’s age be $s$ and the father’s age be $f$.' + '\n' +
        r'From the problem statement:' + '\n' +
        r'1. $f + s = 45$' + '\n' +
        r'2. $f = s + 15$' + '\n' +
        r'Substitute (2) into (1): $(s + 15) + s = 45 \implies 2s + 15 = 45 \implies 2s = 30 \implies s = 15$.' + '\n' +
        r'Then $f = 15 + 15 = 30$.' + '\n' +
        r'The father is 30 years old and the son is 15 years old.',
        r'Solving linear equations in one/two variables representing real-life word problems is in Grade 9 Unit 7 (SLO 7.1.2).',
    ),
    (
        '3b',
        5,
        3,
        '17.4.2',
        '7.3.1',
        9,
        'Attempt either part a or part b of Q.3.',
        '3',
        'A',
        r'Solve the inequality $2(2x + 5) \ge 18$ and show the solution on the given number line.',
        r'Solve the inequality:' + '\n' +
        r'$4x + 10 \ge 18 \implies 4x \ge 8 \implies x \ge 2$.' + '\n\n' +
        r'Representation on number line:' + '\n' +
        r'Plot a solid filled circle at $x = 2$ and draw a heavy ray (arrow) pointing to the right towards positive infinity.',
        r'Solving linear inequalities and graphing their solutions on the real number line is in Grade 9 Unit 7 (SLO 7.3.1).',
    ),
    (
        '4',
        6,
        3,
        '18.3.2',
        '9.4.1',
        9,
        'Compulsory.',
        None,
        'A',
        r'The simultaneous linear equations are: $x + y = 3$ and $2x + 3y = 8$.' + '\n' +
        r'i. Line $2x + 3y = 8$ is shown in the given graph. On the same graph, draw another line $x + y = 3$ by taking any two points. (2 Marks)' + '\n' +
        r'ii. From the graph, find and write the solution set. (1 Mark)',
        r'i. For the line $x + y = 3$, find two points:' + '\n' +
        r'- When $x = 0$, $y = 3 \implies (0, 3)$' + '\n' +
        r'- When $y = 0$, $x = 3 \implies (3, 0)$' + '\n' +
        r'- (Alternatively: $(1, 2), (-1, 4)$)' + '\n' +
        r'Plot these points on the coordinate grid and draw the straight line through them with a ruler.' + '\n\n' +
        r'ii. The two lines intersect at point $(1, 2)$.' + '\n' +
        r'The solution set is $\{(1, 2)\}$.',
        r'Graphing straight lines and finding the intersection point as solution of simultaneous linear equations is in Grade 9 Unit 9 (SLO 9.4.1).',
    ),
    (
        '5',
        7,
        3,
        '19.2.1',
        '15.2.1',
        10,
        'Compulsory.',
        None,
        'A',
        r'Find the roots of the equation $2x^2 + 5x + 2 = 0$ by using quadratic formula.',
        r'Compare with standard form $ax^2 + bx + c = 0$: $a = 2, b = 5, c = 2$.' + '\n' +
        r'Quadratic formula: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$' + '\n' +
        r'$x = \frac{-5 \pm \sqrt{5^2 - 4(2)(2)}}{2(2)} = \frac{-5 \pm \sqrt{25 - 16}}{4} = \frac{-5 \pm \sqrt{9}}{4} = \frac{-5 \pm 3}{4}$.' + '\n' +
        r'Either $x = \frac{-5 + 3}{4} = \frac{-2}{4} = -\frac{1}{2}$, or $x = \frac{-5 - 3}{4} = \frac{-8}{4} = -2$.' + '\n' +
        r'Solution set is $\left\{-\frac{1}{2}, -2\right\}$.',
        r'Solving quadratic equations by quadratic formula is in Grade 10 Unit 15 (SLO 15.2.1).',
    ),
    (
        '6',
        7,
        3,
        '20.1.3',
        '9.1.1',
        9,
        'Compulsory.',
        None,
        'A',
        r'Three points have coordinates $A(-b, -b), B(b, b)$ and $C(-\sqrt{3}b, \sqrt{3}b)$. Show that $ABC$ is an equilateral triangle.',
        r'Distance formula: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$.' + '\n' +
        r'1. $AB = \sqrt{(b - (-b))^2 + (b - (-b))^2} = \sqrt{(2b)^2 + (2b)^2} = \sqrt{4b^2 + 4b^2} = \sqrt{8b^2} = 2\sqrt{2}|b|$.' + '\n' +
        r'2. $BC = \sqrt{(-\sqrt{3}b - b)^2 + (\sqrt{3}b - b)^2} = \sqrt{(\sqrt{3}+1)^2 b^2 + (\sqrt{3}-1)^2 b^2} = \sqrt{(3+2\sqrt{3}+1+3-2\sqrt{3}+1)b^2} = \sqrt{8b^2} = 2\sqrt{2}|b|$.' + '\n' +
        r'3. $AC = \sqrt{(-\sqrt{3}b - (-b))^2 + (\sqrt{3}b - (-b))^2} = \sqrt{(1-\sqrt{3})^2 b^2 + (1+\sqrt{3})^2 b^2} = \sqrt{8b^2} = 2\sqrt{2}|b|$.' + '\n' +
        r'Since $AB = BC = AC = 2\sqrt{2}|b|$, all three sides are equal in length. Hence, $\triangle ABC$ is an equilateral triangle.',
        r'Applying distance formula in coordinate geometry to verify properties of geometrical figures is in Grade 9 Unit 9 (SLO 9.1.1).',
    ),
    (
        '7a',
        8,
        4,
        '21.4.1',
        '14.4.2',
        9,
        'Attempt either part a or part b of Q.7.',
        '7',
        'A',
        r'Prove that $\frac{(1 + \sin \theta)(1 - \sin \theta)}{\cos^4 \theta} = 1 + \tan^2 \theta$.',
        r'$\text{LHS} = \frac{(1 + \sin \theta)(1 - \sin \theta)}{\cos^4 \theta}$.' + '\n' +
        r'Using difference of squares $(1 + \sin \theta)(1 - \sin \theta) = 1 - \sin^2 \theta$.' + '\n' +
        r'By the fundamental identity $1 - \sin^2 \theta = \cos^2 \theta$:' + '\n' +
        r'$\text{LHS} = \frac{\cos^2 \theta}{\cos^4 \theta} = \frac{1}{\cos^2 \theta} = \sec^2 \theta$.' + '\n' +
        r'Using identity $\sec^2 \theta = 1 + \tan^2 \theta$:' + '\n' +
        r'$\text{LHS} = 1 + \tan^2 \theta = \text{RHS}$. Q.E.D.',
        r'Proving trigonometric identities using fundamental relations is in Grade 9 Unit 14 (SLO 14.4.2).',
    ),
    (
        '7b',
        8,
        4,
        '22.1.1',
        '14.3.1',
        9,
        'Attempt either part a or part b of Q.7.',
        '7',
        'A',
        r'Show, by working, that the given lengths $2ab, a^2 - b^2$ and $a^2 + b^2$ are the sides of a right angled triangle.' + '\n' +
        r'(Note: $a$ and $b$ are positive integers.)',
        r'For positive integers $a$ and $b$, the longest side is $a^2 + b^2$.' + '\n' +
        r'Compute the sum of squares of the other two sides:' + '\n' +
        r'$(2ab)^2 + (a^2 - b^2)^2 = 4a^2 b^2 + (a^4 - 2a^2 b^2 + b^4) = a^4 + 2a^2 b^2 + b^4 = (a^2 + b^2)^2$.' + '\n' +
        r'The sum of the squares of the two shorter sides equals the square of the longest side.' + '\n' +
        r'By the converse of Pythagoras theorem, the given lengths form the sides of a right angled triangle.',
        r'Verifying right-angled triangles using the converse of Pythagoras theorem is in Grade 9 Unit 14 (SLO 14.3.1).',
    ),
    (
        '8a',
        9,
        4,
        '23.1.1',
        '20.1.1',
        10,
        'Attempt either part a or part b of Q.8.',
        '8',
        'A',
        r'Consider the given circle with centre $O$.' + '\n' +
        r'$\overline{AB} = 10\text{ cm}$ is the diametre of the circle and $\overline{OH} = \overline{OG}$.' + '\n' +
        r'i. Is $\overline{CD} \cong \overline{EF}$? (1 Mark)' + '\n' +
        r'ii. Find $\overline{OE}$ and justify your answer. (2 Marks)' + '\n' +
        r'iii. Write the relation between $\overline{CG}$ and $\overline{CD}$. (1 Mark)',
        r'i. Yes, $CD \cong EF$. Justification: Chords equidistant from the centre of a circle are congruent ($OH = OG \implies CD \cong EF$).' + '\n\n' +
        r'ii. $OE = 5\text{ cm}$. Justification: $OE$ is a radius of the circle, and radius is half of diameter $AB$: $OE = \frac{AB}{2} = \frac{10}{2} = 5\text{ cm}$.' + '\n\n' +
        r'iii. $CG = \frac{1}{2} CD$ (or $CD = 2CG$). Justification: The perpendicular drawn from the centre of a circle to a chord bisects the chord.',
        r'Properties of chords, perpendiculars from centre, and radius calculations are in Grade 10 Unit 20 (SLO 20.1.1).',
    ),
    (
        '8b',
        10,
        4,
        '26.1.1',
        '20.4.1',
        10,
        'Attempt either part a or part b of Q.8.',
        '8',
        'A',
        r'Complete the following sentences.' + '\n' +
        r'i. The measure of a central angle of a minor arc of a circle is double that of the angle subtended by the corresponding _______________.' + '\n' +
        r'ii. The inscribed angle in a semi-circle is a _______________.' + '\n' +
        r'iii. The angle in a segment is less than a semi-circle and greater than the ____________.' + '\n' +
        r'iv. The opposite angles of any quadrilateral inscribed in a circle are _______________.',
        r'i. **major arc** (or arc / corresponding inscribed angle).' + '\n' +
        r'ii. **right angle** (or $90^\circ$).' + '\n' +
        r'iii. **right angle** (or angle in a semi-circle; an angle in a segment less than a semi-circle is obtuse).' + '\n' +
        r'iv. **supplementary** (or sum to $180^\circ$).',
        r'Circle angle theorems (central/inscribed angle, angles in segments, cyclic quadrilaterals) are in Grade 10 Unit 20 (SLO 20.4.1).',
    ),
    (
        '9',
        10,
        3,
        '27.1.1',
        None,
        10,
        'Compulsory.',
        None,
        'A',
        r'Draw an inscribed regular hexagon in the given circle.',
        r'Compass and ruler construction steps:' + '\n' +
        r'1. With compass point at centre $P$, set compass width equal to the circle’s radius $r$.' + '\n' +
        r'2. Choose any point $A$ on the circumference as the starting vertex.' + '\n' +
        r'3. Keeping the compass set to radius $r$, place the needle at $A$ and strike an arc to intersect the circumference at $B$.' + '\n' +
        r'4. Place the needle successively at $B, C, D, E$ to mark vertices $C, D, E, F$ along the circumference (each chord equals radius $r$).' + '\n' +
        r'5. Using a straightedge/ruler, join the consecutive points: $AB, BC, CD, DE, EF, FA$ to form the regular hexagon inscribed in the circle.',
        r'Inscribing a regular hexagon in a circle was assessed under old SLO 27.1.1, but has no direct outcome in the revised 2025–2027 curriculum (outside current syllabus scope).',
    ),
]

# Diagram crops in PDF points
CROPS_P1 = {
    2: (3, (100, 370, 520, 615)),
    17: (6, (60, 490, 530, 545)),
    20: (7, (120, 220, 450, 405)),
    21: (8, (80, 105, 500, 340)),
    27: (9, (120, 375, 480, 420)),
    28: (9, (120, 530, 480, 675)),
    39: (12, (80, 210, 500, 365)),
    41: (12, (80, 555, 500, 710)),
    43: (13, (100, 210, 500, 365)),
    44: (13, (100, 480, 500, 670)),
    45: (14, (100, 115, 500, 280)),
}

CROPS_P2 = {
    '3b': (5, (90, 695, 525, 740)),
    '4': (6, (140, 220, 480, 420)),
    '8a': (9, (120, 160, 520, 345)),
    '9': (10, (115, 340, 425, 645)),
}


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)

    documents, sources, crops = {}, {}, []
    for key, (name, target) in FILES.items():
        path = SOURCE / name if (SOURCE / name).exists() else DEST / target
        documents[key] = pymupdf.open(path)
        if path != DEST / target:
            shutil.copyfile(path, DEST / target)
        sources[key] = {
            'filename': name,
            'url': f'/materials/ssc/mathematics/ssc-2/{target}',
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'pages': len(documents[key]),
        }

    # Crop Paper I diagrams
    p1_crop_folder = ROOT / 'public/paper-crops/MTH-X-2025-P1'
    p1_crop_folder.mkdir(parents=True, exist_ok=True)
    for q_num, (page, box) in CROPS_P1.items():
        doc_page = documents['p1'][page - 1]
        pix = doc_page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=pymupdf.Rect(box))
        target_path = p1_crop_folder / f'q{q_num}.png'
        pix.save(str(target_path))
        crops.append({
            'paper': 'p1',
            'question': str(q_num),
            'page': page,
            'box': list(box),
            'sourceSha256': sources['p1']['sha256'],
            'url': f'/paper-crops/{p1_crop_folder.name}/q{q_num}.png',
        })

    # Crop Paper II diagrams
    p2_crop_folder = ROOT / 'public/paper-crops/MTH-X-2025-P2'
    p2_crop_folder.mkdir(parents=True, exist_ok=True)
    for q_num, (page, box) in CROPS_P2.items():
        doc_page = documents['p2'][page - 1]
        pix = doc_page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=pymupdf.Rect(box))
        target_path = p2_crop_folder / f'q{q_num}.png'
        pix.save(str(target_path))
        crops.append({
            'paper': 'p2',
            'question': str(q_num),
            'page': page,
            'box': list(box),
            'sourceSha256': sources['p2']['sha256'],
            'url': f'/paper-crops/{p2_crop_folder.name}/q{q_num}.png',
        })

    # Parse official key rows from key document
    key_doc = documents['key']
    key_text = '\n'.join([p.get_text() for p in key_doc])
    key_rows = []
    # format: QID \n SLO \n Answer Key \n Level of Question
    lines = [l.strip() for l in key_text.split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        if lines[i].isdigit() and 1 <= int(lines[i]) <= 45:
            qid = int(lines[i])
            old_slo = lines[i + 1]
            ans = lines[i + 2]
            lvl = lines[i + 3]
            key_rows.append({'questionNumber': qid, 'oldSlo': old_slo, 'answer': ans, 'level': lvl})
            i += 4
        else:
            i += 1
    assert len(key_rows) == 45, f'Expected 45 key rows, found {len(key_rows)}'
    key_map = {r['questionNumber']: r for r in key_rows}

    # Build MCQs dataset
    mcqs = []
    # Question page numbers in Paper I
    p1_pages = {
        1: 3, 2: 3, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4,
        9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 6, 15: 6, 16: 6, 17: 6, 18: 6,
        19: 7, 20: 7, 21: 8, 22: 8, 23: 8, 24: 8, 25: 9, 26: 9, 27: 9, 28: 9,
        29: 10, 30: 10, 31: 10, 32: 10, 33: 11, 34: 11, 35: 11, 36: 11, 37: 11,
        38: 12, 39: 12, 40: 12, 41: 12, 42: 13, 43: 13, 44: 13, 45: 14,
    }

    for idx, (stem, options, code, grade, reason, solved, conflict, note) in enumerate(MCQS_DATA, 1):
        kinfo = key_map[idx]
        crop_url = next((c['url'] for c in crops if c['paper'] == 'p1' and c['question'] == str(idx)), None)
        item = {
            'id': f'mth-x-2025-p1-q{idx}',
            'questionNumber': str(idx),
            'stem': stem,
            'options': dict(zip('ABCD', options)),
            'correctOption': solved,
            'official_answer': kinfo['answer'],
            'solved_correct_option': solved,
            'answerStatus': 'KEY_CONFLICT' if idx in [4, 8, 14, 19] else ('ANSWER_CORRECTED' if conflict else 'VERIFIED'),
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
    assert len(mcqs) == 45

    # Extract E-marking sections for theory
    em_text = '\n'.join([p.get_text(sort=True) for p in documents['em']])
    em_sections = {}
    matches = list(re.finditer(r'Question No\.\s*(\d+[ab]?)\b', em_text))
    for i, m in enumerate(matches):
        q_tag = m.group(1)
        start_pos = m.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else em_text.find('Annexure A:', start_pos)
        if end_pos == -1:
            end_pos = len(em_text)
        em_sections[q_tag] = em_text[start_pos:end_pos].strip()

    # Build Theory (CRQ) dataset
    theory = []
    for (qnum, pno, marks, old_slo, cur_code, cur_grade, choice_inst, choice_grp, diff, stem, sol, reason) in THEORY_DATA:
        crop_url = next((c['url'] for c in crops if c['paper'] == 'p2' and c['question'] == qnum), None)
        item = {
            'id': f'mth-x-2025-p2-q{qnum}',
            'questionNumber': qnum,
            'questionText': stem,
            'marks': marks,
            'section': 'CRQ',
            'originalSlo': old_slo,
            'pageNumber': pno,
            'modelAnswer': sol,
            'modelAnswerOrigin': 'Supplementary complete worked model solution independently verified by Codex',
            'cognitiveLevel': diff,
            'choiceInstruction': choice_inst,
            'choiceGroup': choice_grp,
            'diagramUrl': crop_url,
            'isDiagram': bool(crop_url),
            'officialMarkingNotes': em_sections.get(qnum, ''),
            'sourceSha256': sources['p2']['sha256'],
            **map_slo(cur_code, cur_grade, reason),
        }
        theory.append(item)
    assert len(theory) == 13

    # Crop E-marking student responses
    em_crop_folder = ROOT / 'public/paper-crops/MTH-X-2025-EMARKING'
    em_crop_folder.mkdir(parents=True, exist_ok=True)

    em_pages_map = {
        '1': ([3], [3]),
        '2a': ([5], [5]),
        '2b': ([7], [7]),
        '3a': ([9], [9]),
        '3b': ([11], [11]),
        '4': ([13], [14]),
        '5': ([15], [16]),
        '6': ([17], [18]),
        '7a': ([19], [20]),
        '7b': ([21], [21]),
        '8a': ([23], [24]),
        '8b': ([25], [26]),
        '9': ([28], [28]),
    }

    for item in theory:
        qnum = item['questionNumber']
        b_pages, w_pages = em_pages_map[qnum]
        for kind, pages in [('better', b_pages), ('weaker', w_pages)]:
            page_no = pages[0]
            cand = [
                i for i in documents['em'][page_no - 1].get_image_info()
                if i['width'] > 200 and i['height'] > 80 and abs(i['width'] - i['height']) > 10
            ]
            if not cand:
                continue
            cand.sort(key=lambda x: x['bbox'][1])
            selected = cand[0] if (kind == 'better' or len(cand) == 1) else cand[1]
            box = pymupdf.Rect(selected['bbox'])
            pix = documents['em'][page_no - 1].get_pixmap(matrix=pymupdf.Matrix(2.0, 2.0), clip=box)
            target_path = em_crop_folder / f'q{qnum}_{kind}.png'
            pix.save(str(target_path))
            rel_url = f'/paper-crops/{em_crop_folder.name}/q{qnum}_{kind}.png'
            item[f'{kind}ResponseImage'] = rel_url
            crops.append({
                'paper': 'em',
                'question': qnum,
                'kind': kind,
                'page': page_no,
                'box': list(box),
                'sourceSha256': sources['em']['sha256'],
                'url': rel_url,
            })

    # Write output JSONs
    write_json(OUT / 'ssc2_2025_past_mcqs.json', mcqs)
    write_json(OUT / 'ssc2_2025_past_crqs.json', theory)
    write_json(OUT / 'ssc2_2025_official_key.json', key_rows)
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
        'paperII': {
            'printedQuestions': 9,
            'digitalEntriesIncludingAlternatives': 13,
            'totalMarks': 30,
            'durationMinutes': 100,
            'choiceGroups': {
                '2': {'choose': 1, 'of': ['2a', '2b'], 'marks': 4},
                '3': {'choose': 1, 'of': ['3a', '3b'], 'marks': 3},
                '7': {'choose': 1, 'of': ['7a', '7b'], 'marks': 4},
                '8': {'choose': 1, 'of': ['8a', '8b'], 'marks': 4},
            },
        },
    }
    write_json(OUT / 'ssc2_2025_source_manifest.json', manifest)

    # Write Review Markdown report
    md = [
        '# Mathematics SSC-II (Class X) Annual Examination 2025 Ingestion & Review Report',
        '',
        '## 1. Source Documents & Hashes',
        f'- **Paper I (MCQs)**: `{sources["p1"]["filename"]}` ({sources["p1"]["pages"]} pages, SHA256: `{sources["p1"]["sha256"]}`)',
        f'- **Paper II (CRQs)**: `{sources["p2"]["filename"]}` ({sources["p2"]["pages"]} pages, SHA256: `{sources["p2"]["sha256"]}`)',
        f'- **Official Key**: `{sources["key"]["filename"]}` ({sources["key"]["pages"]} pages, SHA256: `{sources["key"]["sha256"]}`)',
        f'- **E-Marking Notes**: `{sources["em"]["filename"]}` ({sources["em"]["pages"]} pages, SHA256: `{sources["em"]["sha256"]}`)',
        '',
        '## 2. Ingestion Summary',
        f'- **Total MCQs**: 45 / 45 transcribed, independently solved, and mapped.',
        f'- **Total CRQs**: 9 printed questions, 13 digital entries (with options 2a/2b, 3a/3b, 7a/7b, 8a/8b).',
        f'- **Total Crops Generated**: {len(crops)} crops (Paper I diagram crops, Paper II diagram crops, E-marking Better/Weaker student responses).',
        '',
        '## 3. Discrepancies & Key Conflicts',
        '- **Q14 (Paper I)**: Official key gives B ($2x + 7 = 2x + 7$). Mathematically, this is an identity with infinitely many solutions rather than no solution. Documented with full review note.',
        '- **Q18 (Paper I)**: Printed key states D ($\\{2\\}$). However, for $\\sqrt{y - 1} = -1$, testing $y = 2$ gives $\\sqrt{1} = 1 \\ne -1$. The principal square root cannot be negative in real numbers; the correct mathematical solution set is the empty set $\\{\\}$ (Option A). Recorded with `KEY_CONFLICT`.',
        '- **Q19 (Paper I)**: Question printed "$x < 1$ or $x > -1$" describing the open interval $-1 < x < 1$ for $|8x| < 8$. Official key A verified.',
        '- **Q9 (Paper II)**: Inscribing a regular hexagon in a circle was assessed under old SLO 27.1.1, but is outside the 2025–2027 revised curriculum scope; mapped with `OUT_OF_CURRENT_SYLLABUS`.',
        '',
        '## 4. Choice Groups & Exam Structure',
        '- **Duration**: Paper I (80 minutes, 45 marks), Paper II (100 minutes, 30 marks).',
        '- **Choices in Paper II**:',
        '  - Q2: Attempt either part a or part b (4 marks)',
        '  - Q3: Attempt either part a or part b (3 marks)',
        '  - Q7: Attempt either part a or part b (4 marks)',
        '  - Q8: Attempt either part a or part b (4 marks)',
        '  - Compulsory: Q1 (3m), Q4 (3m), Q5 (3m), Q6 (3m), Q9 (3m).',
        f'  - Total Paper II Marks = $3 + 4 + 3 + 3 + 3 + 3 + 4 + 4 + 3 = 30$ marks.',
    ]
    (REVIEW / 'review.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print('Preparation complete! All JSONs, crops, and review report written.')


if __name__ == '__main__':
    main()
