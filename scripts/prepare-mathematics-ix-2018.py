"""Prepare the reviewed Mathematics IX Annual Examination 2018 papers.
Transcription, LaTeX formatting, diagram cropping, and new SLO mappings.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/materials/ssc/mathematics/ssc-1'
DEST = ROOT / 'public/materials/ssc/mathematics/ssc-1'
OUT = ROOT / 'data/mathematics'
REVIEW = ROOT / 'output/mathematics-ix-2018'

FILES = {
    'p1': 'mathematics-ix-2018-paper-i.pdf',
    'p2': 'mathematics-ix-2018-paper-ii.pdf',
    'key': 'mathematics-ix-2018-keys.pdf',
    'em': 'mathematics-ix-2018-emarking.pdf',
}

# 30 MCQs: stem, A-D options, current SLO code, current grade (9 or 10 or None), semantic rationale, verified answer.
MCQS = [
    # 1
    (
        r'On simplification, $\frac{x^2}{x^{-4}}$ becomes',
        [r'$\frac{1}{x^2}$', r'$\frac{1}{x^6}$', r'$x^2$', r'$x^6$'],
        '1.4.1', 9,
        r'Using the quotient law of exponents: $\frac{x^2}{x^{-4}} = x^{2 - (-4)} = x^{2 + 4} = x^6$.',
        'D'
    ),
    # 2
    (
        r'If $p = \frac{11}{5}$ and $q + r = \frac{14}{5}$, then $(p + q) + r$ is equal to',
        [r'$\frac{3}{5}$', r'$\frac{5}{2}$', r'$2$', r'$5$'],
        '1.3.1', 9,
        r'By the associative property of addition over real numbers, $(p + q) + r = p + (q + r) = \frac{11}{5} + \frac{14}{5} = \frac{25}{5} = 5$.',
        'D'
    ),
    # 3
    (
        r'If $p$ and $q$ are real numbers, and $p^{-1}$ is the multiplicative inverse of $p$, then which of the following statements is FALSE?',
        [
            r'$p \times q$ is a real number',
            r'$p \times q = q \times p$',
            r'$p \times p^{-1} = 0$',
            r'$p \times 1 = p$'
        ],
        '1.3.1', 9,
        r'The multiplicative inverse property states that $p \times p^{-1} = 1$, not $0$. Therefore, statement C is FALSE.',
        'C'
    ),
    # 4
    (
        r'$\sqrt{2^3}$ can also be expressed as',
        [r'$2^{3/2}$', r'$2^{2/3}$', r'$8^{3/2}$', r'$8^{2/3}$'],
        '1.4.1', 9,
        r'Converting radical to exponential form: $\sqrt{2^3} = (2^3)^{1/2} = 2^{3/2}$.',
        'A'
    ),
    # 5
    (
        r'Set $A$ is defined as $A = \{1, 2, 3\}$. If $A \cup B = \{1, 2, 3, 4, 5\}$ and $A \cap B = \phi$, then set $B$ is equal to',
        [r'$\phi$', r'$\{4, 5\}$', r'$\{1, 2, 3\}$', r'$\{1, 2, 3, 4, 5\}$'],
        '3.2.2', 9,
        r'Since $A$ and $B$ are disjoint ($A \cap B = \phi$), $B = (A \cup B) - A = \{1, 2, 3, 4, 5\} - \{1, 2, 3\} = \{4, 5\}$.',
        'B'
    ),
    # 6
    (
        r'If $A = \{a, b\}$ and $B = \{10, 20\}$, then which of the following option(s) is/ are binary relation from $A$ to $B$?' + '\n' +
        r'I. $\{(a, 10), (b, 20)\}$' + '\n' +
        r'II. $\{(10, a), (20, b)\}$' + '\n' +
        r'III. $\{(a, 20)\}$' + '\n' +
        r'IV. $\{(10, b)\}$',
        [r'I only', r'II only', r'I and III', r'II and IV'],
        '3.7.1', 9,
        r'A binary relation from $A$ to $B$ must be a subset of the Cartesian product $A \times B = \{(a, 10), (a, 20), (b, 10), (b, 20)\}$. Both I and III are subsets of $A \times B$, whereas II and IV are relations from $B$ to $A$. Thus I and III are valid.',
        'C'
    ),
    # 7
    (
        r'If a universal set is defined as $U = \{1, 2, 3, 4, 5, 6, 7, 8, 9, 10\}$ and $E$ is the set of even numbers, then $E^\prime$ is',
        [r'$\phi$', r'$\{1, 3, 5, 7, 9\}$', r'$\{2, 4, 6, 8, 10\}$', r'$\{1, 2, 3, 4, 5, 6, 7, 8, 9, 10\}$'],
        '3.2.2', 9,
        r'The even numbers in $U$ are $E = \{2, 4, 6, 8, 10\}$. The complement $E^\prime = U - E$ consists of odd numbers in $U$: $\{1, 3, 5, 7, 9\}$.',
        'B'
    ),
    # 8
    (
        r'If $X = \{10, 20\}$ and $Y = \{p, q, r\}$, then which of the following represents a function from $X$ to $Y$?',
        [
            r'$\{(10, p)\}$',
            r'$\{(10, p), (10, q)\}$',
            r'$\{(10, p), (20, p)\}$',
            r'$\{(10, p), (10, q), (20, r)\}$'
        ],
        '4.1.2', 9,
        r'A function from $X$ to $Y$ requires the domain to be exactly $X = \{10, 20\}$ with no first element repeated. In $\{(10, p), (20, p)\}$, both $10$ and $20$ appear exactly once as first elements.',
        'C'
    ),
    # 9
    (
        r'The exponential form of $\log_3 5 = 2x$ is',
        [r'$3^{2x} = 5$', r'$5^{2x} = 3$', r'$(2x)^3 = 5$', r'$(2x)^5 = 3$'],
        '2.2.1', 9,
        r'By definition of logarithm, $\log_b a = c \iff b^c = a$. Hence $\log_3 5 = 2x \iff 3^{2x} = 5$.',
        'A'
    ),
    # 10
    (
        r'If $\log_6 x = 2$, then $x$ is equal to',
        [r'$3$', r'$12$', r'$36$', r'$64$'],
        '2.2.1', 9,
        r'Converting logarithmic form to exponential form: $\log_6 x = 2 \implies x = 6^2 = 36$.',
        'C'
    ),
    # 11
    (
        r'On rationalisation of $\frac{1}{2 + \sqrt{3}}$, we get',
        [r'$2 + \sqrt{3}$', r'$2 - \sqrt{3}$', r'$-2 + \sqrt{3}$', r'$-2 - \sqrt{3}$'],
        '1.5.1', 9,
        r'Multiply numerator and denominator by the conjugate $2 - \sqrt{3}$: $\frac{1}{2 + \sqrt{3}} \times \frac{2 - \sqrt{3}}{2 - \sqrt{3}} = \frac{2 - \sqrt{3}}{2^2 - (\sqrt{3})^2} = \frac{2 - \sqrt{3}}{4 - 3} = 2 - \sqrt{3}$.',
        'B'
    ),
    # 12
    (
        r'$\frac{a^4 - 4a^2}{a^2 - 2a}$ is equal to',
        [r'$a^2 + 2a$', r'$a^2 - 2a$', r'$a^2 + 4a$', r'$a^2 - 4a$'],
        '6.2.2', 9,
        r'Factor numerator and denominator: $\frac{a^2(a^2 - 4)}{a(a - 2)} = \frac{a^2(a - 2)(a + 2)}{a(a - 2)} = a(a + 2) = a^2 + 2a$.',
        'A'
    ),
    # 13
    (
        r'$2(\sqrt{2} + 1) - 3\sqrt{2}$ is equal to',
        [r'$2 + \sqrt{2}$', r'$2 - \sqrt{2}$', r'$2 + 5\sqrt{2}$', r'$2 - 5\sqrt{2}$'],
        '1.5.1', 9,
        r'Expand and collect like radical terms: $2\sqrt{2} + 2 - 3\sqrt{2} = 2 + (2 - 3)\sqrt{2} = 2 - \sqrt{2}$.',
        'B'
    ),
    # 14
    (
        r'$u^3 - 27v^3$ can also be expressed as',
        [
            r'$(u + 3v)(u^2 - uv + v^2)$',
            r'$(u - 3v)(u^2 + uv + v^2)$',
            r'$(u + 3v)(u^2 - 3uv + 9v^2)$',
            r'$(u - 3v)(u^2 + 3uv + 9v^2)$'
        ],
        '5.2.1', 9,
        r'Difference of cubes formula: $A^3 - B^3 = (A - B)(A^2 + AB + B^2)$ with $A = u$ and $B = 3v$ gives $(u - 3v)(u^2 + 3uv + 9v^2)$.',
        'D'
    ),
    # 15
    (
        r'On factorisation of $25x^2 + 5ax + 10x + 2a$, we get',
        [
            r'$(5x + a)(5x + 2)$',
            r'$(5a + x)(5a + 2)$',
            r'$(5x^2 + a)(5x + 2)$',
            r'$(5ax + a)(5ax + 2)$'
        ],
        '5.2.1', 9,
        r'Factor by grouping: $5x(5x + a) + 2(5x + a) = (5x + a)(5x + 2)$.',
        'A'
    ),
    # 16
    (
        r'$8p^3 + 12p^2 q + 6pq^2 + q^3$ can also be expressed as',
        [r'$(2p)^3 + q^3$', r'$(2p + q)^3$', r'$(p + 2q)^3$', r'$p^3 + 2q^3$'],
        '5.1.1', 9,
        r'Using the expansion of a sum cubed: $(A + B)^3 = A^3 + 3A^2 B + 3AB^2 + B^3$ with $A = 2p$ and $B = q$ gives $(2p + q)^3$.',
        'B'
    ),
    # 17
    (
        r'If $a : b :: c : d$, then according to componendo property',
        [
            r'$a + b : b :: c + d : d$',
            r'$a - b : b :: c - d : d$',
            r'$a + b : a :: c + d : c$',
            r'$a - b : a :: c - d : c$'
        ],
        None, 9,
        r'The componendo property of proportion states that if $\frac{a}{b} = \frac{c}{d}$, then $\frac{a+b}{b} = \frac{c+d}{d}$, which is $a + b : b :: c + d : d$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'A'
    ),
    # 18
    (
        r'Ali bought an efficient washing machine that saves 10 gallons of water per load. How many gallons of water will he save if he washes 15 loads of laundry?',
        [r'$0.15$', r'$1.5$', r'$15$', r'$150$'],
        '4.4.1', 9,
        r'Water saved varies directly with the number of loads: $\text{Total savings} = 10 \times 15 = 150\text{ gallons}$.',
        'D'
    ),
    # 19
    (
        r'If $P$ is a $1 \times 3$ matrix and $Q$ is a $3 \times 1$ matrix, then which one of the following represents a matrix of order $1 \times 1$?',
        [r'$Q^2$', r'$P^2$', r'$PQ$', r'$QP$'],
        '18.4.2', 10,
        r'Matrix multiplication order rule: $(1 \times 3) \times (3 \times 1) \rightarrow 1 \times 1$. Thus product $PQ$ has order $1 \times 1$. (In contrast, $QP$ has order $3 \times 3$). Current Grade X.',
        'C'
    ),
    # 20
    (
        r'If $\begin{bmatrix}2 & 3 \\ -3 & 0\end{bmatrix} + Q = \begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$, then $Q$ is equal to',
        [
            r'$\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$',
            r'$\begin{bmatrix}0 & -3 \\ 3 & 2\end{bmatrix}$',
            r'$\begin{bmatrix}2 & 3 \\ -3 & 0\end{bmatrix}$',
            r'$\begin{bmatrix}-2 & -3 \\ 3 & 0\end{bmatrix}$'
        ],
        '18.3.1', 10,
        r'$Q$ is the additive inverse of matrix $\begin{bmatrix}2 & 3 \\ -3 & 0\end{bmatrix}$: $Q = -\begin{bmatrix}2 & 3 \\ -3 & 0\end{bmatrix} = \begin{bmatrix}-2 & -3 \\ 3 & 0\end{bmatrix}$. Current Grade X.',
        'D'
    ),
    # 21
    (
        r'The determinant of the matrix $\begin{bmatrix}5 & -3 \\ 1 & 2\end{bmatrix}$ is equal to',
        [r'$3$', r'$7$', r'$13$', r'$10$'],
        '18.5.3', 10,
        r'Determinant of a $2 \times 2$ matrix: $\det = (5)(2) - (-3)(1) = 10 - (-3) = 10 + 3 = 13$. Current Grade X.',
        'C'
    ),
    # 22
    (
        r'The ages (in years) of nine children in a group are $4, 7, 8, 9, 6, 10, 5, 8$ and $10$. The median age is',
        [r'$6$', r'$7$', r'$8$', r'$10$'],
        '22.3.1', 10,
        r'Arrange data in ascending order: $4, 5, 6, 7, 8, 8, 9, 10, 10$. The number of values is $n = 9$ (odd), so the median is the $\frac{9+1}{2} = 5$th value, which is $8$. Statistics has moved to current Grade X Unit 22.',
        'C'
    ),
    # 23
    (
        r'In Paediatrics department, the percentage change shows that hiring in 2016 as compared to last year has',
        [
            r'decreased by $25\%$',
            r'decreased by $33\%$',
            r'increased by $25\%$',
            r'increased by $33\%$'
        ],
        None, 9,
        r'From the bar chart, hiring in Paediatrics was $8$ in 2015 and $6$ in 2016. Percentage change $= \frac{6 - 8}{8} \times 100\% = -\frac{2}{8} \times 100\% = -25\%$, i.e., decreased by $25\%$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'A'
    ),
    # 24
    (
        r'The number of employees hired in 2016 are',
        [r'$4$', r'$5$', r'$23$', r'$24$'],
        None, 9,
        r'Sum of 2016 values across all four departments: Urology ($8$) + Paediatrics ($6$) + Gynaecology ($7$) + Pathology ($2$) $= 8 + 6 + 7 + 2 = 23$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'C'
    ),
    # 25
    (
        r'In the given triangle $ABC$, the side $BC$ is equal to',
        [r'$b - a$', r'$a$', r'$2a$', r'$\frac{b + a}{2}$'],
        None, 9,
        r'Sum of angles in $\Delta ABC$: $\angle C = 180^\circ - (120^\circ + 30^\circ) = 30^\circ$. Since $\angle A = 30^\circ$ and $\angle C = 30^\circ$, triangle $ABC$ is isosceles with side $BC$ opposite to $\angle A$ equal to side $AB$ opposite to $\angle C$. Hence $BC = AB = a$.',
        'B'
    ),
    # 26
    (
        r'In the given diagram, the side $AB$ is equal to',
        [r'$3\text{ cm}$', r'$4\text{ cm}$', r'$6\text{ cm}$', r'$7\text{ cm}$'],
        None, 9,
        r'In triangle $PAB$, $\angle A = 60^\circ$ and $\angle B = 60^\circ$, so $\angle P = 180^\circ - 120^\circ = 60^\circ$, making $\Delta PAB$ equilateral. The altitude $PQ \perp AB$ bisects the base, so $AQ = QB = 3\text{ cm}$. Therefore, total side $AB = 3 + 3 = 6\text{ cm}$.',
        'C'
    ),
    # 27
    (
        r'In the given diagram, $D$ and $E$ are the midpoints of the sides $AC$ and $BC$ respectively. If $AB = 4x$, $DE = 16\text{ cm}$ and $EC = 40\text{ cm}$, then the value of $x$ is equal to',
        [r'$8\text{ cm}$', r'$12\text{ cm}$', r'$16\text{ cm}$', r'$32\text{ cm}$'],
        '13.1.1', 9,
        r'By the Midpoint Theorem, the segment joining midpoints of two sides of a triangle is half of the third side: $DE = \frac{1}{2}AB \implies 16 = \frac{1}{2}(4x) \implies 16 = 2x \implies x = 8\text{ cm}$.',
        'A'
    ),
    # 28
    (
        r'In the given diagram, the line $XY$ bisects the line segment $AB$. If the length of $AB$ is $a\text{ cm}$, then the length of $OA$ is equal to',
        [r'$a$', r'$\frac{a}{2}$', r'$a^2$', r'$2a$'],
        '10.1.3', 9,
        r'By definition of a segment bisector, point $O$ is the midpoint of segment $AB$. Therefore $OA = \frac{1}{2} AB = \frac{a}{2}\text{ cm}$.',
        'B'
    ),
    # 29
    (
        r'For the given triangle $ABC$, which one of the following is TRUE?',
        [
            r'$m\angle C < m\angle A < m\angle B$',
            r'$m\angle B < m\angle A < m\angle C$',
            r'$m\angle A < m\angle B < m\angle C$',
            r'$m\angle C < m\angle B < m\angle A$'
        ],
        None, 9,
        r'Side lengths: $AB = 2\text{ cm}$ (opposite $\angle C$), $BC = 3\text{ cm}$ (opposite $\angle A$), and $AC = 4\text{ cm}$ (opposite $\angle B$). Since $2 < 3 < 4$, the opposite angles satisfy $m\angle C < m\angle A < m\angle B$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'A'
    ),
    # 30
    (
        r'In the following figure, $BD$ is the angle bisector of $\angle ABC$. If $AB = 2\text{ cm}$, $BC = 6\text{ cm}$, and $CD = 3\text{ cm}$, then the length of $AD$ is',
        [r'$1\text{ cm}$', r'$2\text{ cm}$', r'$3\text{ cm}$', r'$4\text{ cm}$'],
        '12.1.1', 9,
        r'By the Angle Bisector Theorem: $\frac{AD}{CD} = \frac{AB}{BC} \implies \frac{AD}{3} = \frac{2}{6} = \frac{1}{3} \implies AD = 1\text{ cm}$.',
        'A'
    ),
]

# 17 CRQs: number, page, marks, original SLO, current SLO code, current grade, question text, model answer
CRQS = [
    (
        '1a', 2, 4, '2.1.2', '1.4.1', 9,
        r'Simplify the following and express it in the lowest exponential form.' + '\n' +
        r'i. $\frac{a^2 b^3}{(a b^3)^5}$ (2 Marks)' + '\n' +
        r'ii. $a^0 \times a^{3/4} \times a$ (2 Marks)',
        r'i. Apply power of product rule: $(ab^3)^5 = a^5 b^{3 \times 5} = a^5 b^{15}$.' + '\n' +
        r'Using quotient law of exponents:' + '\n' +
        r'$\frac{a^2 b^3}{a^5 b^{15}} = a^{2 - 5} b^{3 - 15} = a^{-3} b^{-12} = \frac{1}{a^3 b^{12}}$ or $\frac{1}{(a b^4)^3}$.' + '\n' +
        r'ii. Apply product law of exponents ($a^0 = 1$ and $a = a^1$):' + '\n' +
        r'$a^0 \times a^{3/4} \times a^1 = 1 \times a^{\frac{3}{4} + 1} = a^{\frac{3 + 4}{4}} = a^{7/4}$.'
    ),
    (
        '1b', 2, 4, '2.5.4', '17.1.5', 10,
        r'Separate the real and imaginary parts of $\frac{(2 - i)^2}{1 + i}$. (4 Marks)',
        r'Expand the numerator using $(u - v)^2 = u^2 - 2uv + v^2$:' + '\n' +
        r'$(2 - i)^2 = 2^2 - 2(2)(i) + i^2 = 4 - 4i + (-1) = 3 - 4i$.' + '\n' +
        r'Multiply numerator and denominator by the conjugate of $1 + i$, which is $1 - i$:' + '\n' +
        r'$\frac{3 - 4i}{1 + i} \times \frac{1 - i}{1 - i} = \frac{3(1 - i) - 4i(1 - i)}{1^2 - i^2} = \frac{3 - 3i - 4i + 4i^2}{1 - (-1)} = \frac{3 - 7i + 4(-1)}{2} = \frac{-1 - 7i}{2}$.' + '\n' +
        r'Separate real and imaginary components:' + '\n' +
        r'$\text{Real part} = -\frac{1}{2}$, $\text{Imaginary part} = -\frac{7}{2}$. (Complex numbers moved to Grade X).'
    ),
    (
        '2a', 3, 4, '1.2.2', '3.2.2', 9,
        r'If $U = \{1, 2, 3, 4, 5, 6, 7, 8, 9, 10\}$ is a universal set, $A = \{1, 2, 3, 4, 5, 6\}$ and $B = \{2, 4, 6, 8, 10\}$, then show that $(A \cup B)^\prime = A^\prime \cap B^\prime$.',
        r'LHS: Find $A \cup B = \{1, 2, 3, 4, 5, 6, 8, 10\}$.' + '\n' +
        r'Complement $(A \cup B)^\prime = U - (A \cup B) = \{7, 9\}$.' + '\n' +
        r'RHS: Find $A^\prime = U - A = \{7, 8, 9, 10\}$.' + '\n' +
        r'Find $B^\prime = U - B = \{1, 3, 5, 7, 9\}$.' + '\n' +
        r'Intersection $A^\prime \cap B^\prime = \{7, 8, 9, 10\} \cap \{1, 3, 5, 7, 9\} = \{7, 9\}$.' + '\n' +
        r'Since $\text{LHS} = \text{RHS} = \{7, 9\}$, the De Morgan\'s Law is verified.'
    ),
    (
        '2b', 3, 4, '1.3.1', '3.4.2', 9,
        r'Sets $A$, $B$ and $C$ are defined as follows.' + '\n' +
        r'$A = \{1, 2, 3, 4\}$' + '\n' +
        r'$B = \{-1, 0, 1, 2\}$' + '\n' +
        r'$C = \{-1, 1, 3, 5\}$' + '\n' +
        r'Place the elements of sets $A$, $B$ and $C$ in the given Venn Diagram.',
        r'Determine the elements in each Venn diagram region:' + '\n' +
        r'1. Center intersection of all three sets $A \cap B \cap C = \{1\}$.' + '\n' +
        r'2. Intersection of $A$ and $B$ only: $(A \cap B) - C = \{2\}$.' + '\n' +
        r'3. Intersection of $A$ and $C$ only: $(A \cap C) - B = \{3\}$.' + '\n' +
        r'4. Intersection of $B$ and $C$ only: $(B \cap C) - A = \{-1\}$.' + '\n' +
        r'5. Only in $A$: $A - (B \cup C) = \{4\}$.' + '\n' +
        r'6. Only in $B$: $B - (A \cup C) = \{0\}$.' + '\n' +
        r'7. Only in $C$: $C - (A \cup B) = \{5\}$.' + '\n' +
        r'Each element is placed in its unique disjoint region on the Venn diagram.'
    ),
    (
        '3', 4, 3, '3.2.3', '2.4.1', 9,
        r'Find the value of $x$ for $\log_6 1 + \frac{\log_6 216}{\log_6 36} = x$.',
        r'Evaluate each term using logarithm properties:' + '\n' +
        r'$\log_6 1 = 0$ (since $6^0 = 1$).' + '\n' +
        r'$\log_6 216 = \log_6 (6^3) = 3 \log_6 6 = 3(1) = 3$.' + '\n' +
        r'$\log_6 36 = \log_6 (6^2) = 2 \log_6 6 = 2(1) = 2$.' + '\n' +
        r'Substitute into the equation:' + '\n' +
        r'$x = 0 + \frac{3}{2} = \frac{3}{2}$ (or $1.5$).'
    ),
    (
        '4a', 5, 4, '4.2.7', '5.1.1', 9,
        r'If $x + \frac{1}{x} = 5$, then find the value of $x^3 + \frac{1}{x^3}$.',
        r'Cube both sides of $x + \frac{1}{x} = 5$:' + '\n' +
        r'$\left(x + \frac{1}{x}\right)^3 = 5^3$.' + '\n' +
        r'Expand using the identity $(u + v)^3 = u^3 + v^3 + 3uv(u + v)$ with $u = x, v = \frac{1}{x}$:' + '\n' +
        r'$x^3 + \frac{1}{x^3} + 3(x)\left(\frac{1}{x}\right)\left(x + \frac{1}{x}\right) = 125$' + '\n' +
        r'$x^3 + \frac{1}{x^3} + 3(1)(5) = 125$' + '\n' +
        r'$x^3 + \frac{1}{x^3} + 15 = 125 \implies x^3 + \frac{1}{x^3} = 125 - 15 = 110$.'
    ),
    (
        '4b', 5, 4, '4.2.3', '5.1.1', 9,
        r'For three quantities $a$, $b$ and $c$, if $a + b + c = 80$ and $a^2 + b^2 + c^2 = 3000$, then find the value of $ab + bc + ca$.',
        r'Use the algebraic identity:' + '\n' +
        r'$(a + b + c)^2 = a^2 + b^2 + c^2 + 2(ab + bc + ca)$.' + '\n' +
        r'Substitute given values $a + b + c = 80$ and $a^2 + b^2 + c^2 = 3000$:' + '\n' +
        r'$(80)^2 = 3000 + 2(ab + bc + ca)$' + '\n' +
        r'$6400 = 3000 + 2(ab + bc + ca)$' + '\n' +
        r'$2(ab + bc + ca) = 6400 - 3000 = 3400$' + '\n' +
        r'$ab + bc + ca = \frac{3400}{2} = 1700$.'
    ),
    (
        '5a', 6, 5, '5.3.1', '5.4.1', 9,
        r'Two factors of the polynomial $p(x) = x^3 + mx^2 + nx - 2$ are $x - 1$ and $x + 1$. Find the values of $m$ and $n$. (5 Marks)',
        r'By the Factor Theorem, if $(x - a)$ is a factor of $p(x)$, then $p(a) = 0$.' + '\n' +
        r'Since $(x - 1)$ is a factor, $p(1) = 0$:' + '\n' +
        r'$1^3 + m(1)^2 + n(1) - 2 = 0 \implies 1 + m + n - 2 = 0 \implies m + n = 1$. (Equation 1)' + '\n' +
        r'Since $(x + 1)$ is a factor, $p(-1) = 0$:' + '\n' +
        r'$(-1)^3 + m(-1)^2 + n(-1) - 2 = 0 \implies -1 + m - n - 2 = 0 \implies m - n = 3$. (Equation 2)' + '\n' +
        r'Add Equation 1 and Equation 2:' + '\n' +
        r'$(m + n) + (m - n) = 1 + 3 \implies 2m = 4 \implies m = 2$.' + '\n' +
        r'Substitute $m = 2$ into Equation 1:' + '\n' +
        r'$2 + n = 1 \implies n = 1 - 2 = -1$.' + '\n' +
        r'Therefore, $m = 2$ and $n = -1$.'
    ),
    (
        '5b', 6, 5, '5.2.1a & 5.2.1d', '5.2.1', 9,
        r'Factorise the following completely.' + '\n' +
        r'i. $36a^4 + 12a^2 b + b^2 - 9$ (3 Marks)' + '\n' +
        r'ii. $a^{15} - 216b^{15}$ (2 Marks)',
        r'i. Group the first three terms as a perfect square trinomial:' + '\n' +
        r'$(36a^4 + 12a^2 b + b^2) - 9 = [(6a^2)^2 + 2(6a^2)(b) + b^2] - 3^2$' + '\n' +
        r'$= (6a^2 + b)^2 - 3^2$.' + '\n' +
        r'Apply difference of squares $u^2 - v^2 = (u + v)(u - v)$:' + '\n' +
        r'$= (6a^2 + b + 3)(6a^2 + b - 3)$.' + '\n' +
        r'ii. Express as difference of cubes $u^3 - v^3$ where $u = a^5$ and $v = 6b^5$:' + '\n' +
        r'$a^{15} - 216b^{15} = (a^5)^3 - (6b^5)^3$' + '\n' +
        r'Apply $(u - v)(u^2 + uv + v^2)$:' + '\n' +
        r'$= (a^5 - 6b^5)((a^5)^2 + (a^5)(6b^5) + (6b^5)^2)$' + '\n' +
        r'$= (a^5 - 6b^5)(a^{10} + 6a^5 b^5 + 36b^{10})$.'
    ),
    (
        '6a', 7, 4, '6.3.2', '4.4.1', 9,
        r'The width $w$ units of a rectangular solid with a fixed volume, is inversely proportional to its length $l$ units and breadth $b$ units.' + '\n' +
        r'| Width ($w$ units) | Length ($l$ units) | Breadth ($b$ units) |' + '\n' +
        r'| 3 | 4 | 2 |' + '\n' +
        r'| ? | 6 | 2.5 |' + '\n' +
        r'Using the table, find the missing width of the rectangular solid.',
        r'Translate the inverse variation into an equation: $w \propto \frac{1}{lb} \implies w = \frac{k}{lb} \iff k = w \cdot l \cdot b$.' + '\n' +
        r'Use data from row 1 ($w = 3, l = 4, b = 2$):' + '\n' +
        r'$k = 3 \times 4 \times 2 = 24$.' + '\n' +
        r'Now calculate missing width $w$ when $l = 6$ and $b = 2.5$:' + '\n' +
        r'$w = \frac{24}{6 \times 2.5} = \frac{24}{15} = 1.6\text{ units}$ (or $\frac{8}{5}\text{ units}$).'
    ),
    (
        '6b', 7, 4, '6.4.1', None, 9,
        r'If $\frac{a}{b} = \frac{c}{d}$, then prove that $\frac{5a + 3c}{5b + 3d} = \sqrt[5]{\frac{a^5}{b^5}}$ using K-method.',
        r'Let $\frac{a}{b} = \frac{c}{d} = k \implies a = bk$ and $c = dk$.' + '\n' +
        r'LHS: Substitute $a = bk$ and $c = dk$:' + '\n' +
        r'$\text{LHS} = \frac{5(bk) + 3(dk)}{5b + 3d} = \frac{k(5b + 3d)}{5b + 3d} = k$.' + '\n' +
        r'RHS: Substitute $a = bk$:' + '\n' +
        r'$\text{RHS} = \sqrt[5]{\frac{(bk)^5}{b^5}} = \sqrt[5]{\frac{b^5 k^5}{b^5}} = \sqrt[5]{k^5} = k$.' + '\n' +
        r'Since $\text{LHS} = \text{RHS} = k$, the relation is proved. (Historical curriculum topic; no direct outcome in current IX-X syllabus).'
    ),
    (
        '7', 8, 5, '7.4.1 & 7.5.1', '18.3.1', 10,
        r'a. Find the value of $p$ and $q$ for the given matrix equation.' + '\n' +
        r'$2\begin{bmatrix}2 & p \\ 1 & 5\end{bmatrix} + \begin{bmatrix}1 & 2 \\ 3 & 0\end{bmatrix} = \begin{bmatrix}5 & 2 \\ q & 10\end{bmatrix}$ (3 Marks)' + '\n' +
        r'b. Given that $\begin{bmatrix}1 & 2 & 3 \\ 0 & 1 & 1\end{bmatrix} \times \begin{bmatrix}0 & 2 \\ 1 & 3 \\ 5 & 1\end{bmatrix}$. State the reason why these two matrices are conformable for multiplication. (2 Marks)',
        r'a. Multiply by scalar 2:' + '\n' +
        r'$\begin{bmatrix}4 & 2p \\ 2 & 10\end{bmatrix} + \begin{bmatrix}1 & 2 \\ 3 & 0\end{bmatrix} = \begin{bmatrix}4 + 1 & 2p + 2 \\ 2 + 3 & 10 + 0\end{bmatrix} = \begin{bmatrix}5 & 2p + 2 \\ 5 & 10\end{bmatrix}$.' + '\n' +
        r'Equating with RHS matrix $\begin{bmatrix}5 & 2 \\ q & 10\end{bmatrix}$:' + '\n' +
        r'$2p + 2 = 2 \implies 2p = 0 \implies p = 0$.' + '\n' +
        r'$q = 5$.' + '\n' +
        r'b. The first matrix has order $2 \times 3$ (number of columns = 3), and the second matrix has order $3 \times 2$ (number of rows = 3).' + '\n' +
        r'Two matrices are conformable for multiplication because the number of columns of the first matrix is equal to the number of rows of the second matrix. (Matrices moved to current Grade X).'
    ),
    (
        '8', 9, 4, '16.1.1', None, 9,
        r'In a survey, employees of a company were asked their preferred lunch menu from choices $A$, $B$ and $C$. The results are represented in the given pie chart containing three sections.' + '\n' +
        r'Use the given information to complete the given table.' + '\n' +
        r'| Menu | Percentage of Employee | Number of Employee | Angle of Section |' + '\n' +
        r'| $A$ | $16\%$ | $64$ | ? |' + '\n' +
        r'| $B$ | $28\%$ | ? | ? |' + '\n' +
        r'| $C$ | ? | ? | ? |',
        r'1. Find total number of employees from Menu A data ($16\%$ of total $= 64$):' + '\n' +
        r'$\text{Total employees} = \frac{64}{0.16} = 400$.' + '\n' +
        r'2. Menu A Angle of Sector: $16\% \times 360^\circ = 0.16 \times 360^\circ = 57.6^\circ$.' + '\n' +
        r'3. Menu B: Number of employees $= 28\% \times 400 = 112$.' + '\n' +
        r'Angle of Sector: $28\% \times 360^\circ = 0.28 \times 360^\circ = 100.8^\circ$.' + '\n' +
        r'4. Menu C: Percentage of employees $= 100\% - (16\% + 28\%) = 56\%$.' + '\n' +
        r'Number of employees $= 56\% \times 400 = 224$.' + '\n' +
        r'Angle of Sector: $56\% \times 360^\circ = 0.56 \times 360^\circ = 201.6^\circ$.' + '\n' +
        r'Check angle sum: $57.6^\circ + 100.8^\circ + 201.6^\circ = 360^\circ$.'
    ),
    (
        '9', 10, 4, '10.1.1', '13.1.1', 9,
        r'The perimeter of the given parallelogram $ABCD$ is $38\text{ cm}$. Find $x$ and $y$. (4 Marks)',
        r'1. Perimeter of parallelogram $ABCD = 2(AB + AD) = 38\text{ cm}$.' + '\n' +
        r'Given $AB = 10\text{ cm}$ and $AD = x$:' + '\n' +
        r'$2(10 + x) = 38 \implies 10 + x = 19 \implies x = 9\text{ cm}$.' + '\n' +
        r'2. Angles in parallelogram $ABCD$:' + '\n' +
        r'At vertex $D$, exterior angle $= 120^\circ \implies \text{interior } \angle ADC = 180^\circ - 120^\circ = 60^\circ$.' + '\n' +
        r'In a parallelogram, opposite angles are congruent: $\angle B = \angle ADC \implies y = 60^\circ$.' + '\n' +
        r'Therefore, $x = 9\text{ cm}$ and $y = 60^\circ$.'
    ),
    (
        '10a', 11, 4, '11.1.1d', '10.1.3', 9,
        r'In the following figure, $OB$ and $OC$ are angle bisectors of $\angle COA$ and $\angle DOA$ respectively.' + '\n' +
        r'Find' + '\n' +
        r'i. $\angle DOC$ (2 Marks)' + '\n' +
        r'ii. $\angle DOA$ (2 Marks)',
        r'Since $OB$ bisects $\angle COA$, $\angle COB = \angle AOB = 30^\circ$.' + '\n' +
        r'Therefore, $\angle COA = 30^\circ + 30^\circ = 60^\circ$.' + '\n' +
        r'Since $OC$ bisects $\angle DOA$, the ray $OC$ divides $\angle DOA$ into two equal angles: $\angle DOC = \angle COA$.' + '\n' +
        r'i. $\angle DOC = 60^\circ$.' + '\n' +
        r'ii. $\angle DOA = \angle DOC + \angle COA = 60^\circ + 60^\circ = 120^\circ$.'
    ),
    (
        '10b', 12, 4, '13.1.1b & 13.1.1c', '12.1.1', 9,
        r'In the following diagram, $BC$ is parallel to $DE$. Find the values of $x$ and $y$. (4 Marks)',
        r'1. Value of $y$ using similar triangles:' + '\n' +
        r'Since $BC \parallel DE$, $\Delta ADE \sim \Delta ABC$.' + '\n' +
        r'The ratio of corresponding sides is equal: $\frac{AD}{AB} = \frac{DE}{BC}$.' + '\n' +
        r'From the diagram, $AD = 8\text{ cm}, AB = AD + DB = 8 + y\text{ cm}, DE = 6\text{ cm}, BC = 9\text{ cm}$.' + '\n' +
        r'$\frac{8}{8 + y} = \frac{6}{9} = \frac{2}{3} \implies 2(8 + y) = 3(8) = 24 \implies 16 + 2y = 24 \implies 2y = 8 \implies y = 4\text{ cm}$.' + '\n' +
        r'2. Value of $x$:' + '\n' +
        r'In $\Delta ADE$, $\angle A = 45^\circ$ and $\angle ADE = 50^\circ$.' + '\n' +
        r'Third angle $\angle AED = 180^\circ - (45^\circ + 50^\circ) = 180^\circ - 95^\circ = 85^\circ$.' + '\n' +
        r'Since $BC \parallel DE$, corresponding angles are equal: $\angle C = \angle AED \implies x = 85^\circ$.'
    ),
    (
        '11', 13, 4, '17.2.1a', '21.1.2', 10,
        r'Construct a triangle $ABC$ with $AB = 10\text{ cm}$, $\angle A = 30^\circ$ and $BC = 6\text{ cm}$. Also draw two medians of the triangle. (4 Marks)',
        r'Steps of construction:' + '\n' +
        r'1. Draw a line segment $AB = 10\text{ cm}$ using a ruler.' + '\n' +
        r'2. At vertex $A$, construct an angle of $30^\circ$ using a compass.' + '\n' +
        r'3. With center $B$ and radius $6\text{ cm}$, draw an arc intersecting the ray of angle $A$ at point $C$. Join $BC$ to form triangle $ABC$.' + '\n' +
        r'4. Draw the perpendicular bisectors of any two sides (e.g., sides $AB$ and $AC$) using compass to locate their respective midpoints $D$ and $E$.' + '\n' +
        r'5. Join midpoint $D$ to vertex $C$ (median $CD$) and midpoint $E$ to vertex $B$ (median $BE$).' + '\n' +
        r'Thus, medians $CD$ and $BE$ of $\Delta ABC$ are constructed. (Moved to Grade X Practical Geometry).'
    ),
]

CROPS = {
    'p1': {
        '23': (5, (40, 240, 420, 425)),
        '24': (5, (40, 240, 420, 425)),
        '25': (5, (300, 670, 520, 775)),
        '26': (6, (300, 95, 520, 205)),
        '27': (6, (300, 230, 520, 345)),
        '28': (6, (300, 385, 520, 495)),
        '29': (6, (300, 530, 520, 630)),
        '30': (6, (300, 650, 520, 760)),
    },
    'p2': {
        '2b': (2, (80, 520, 360, 770)),
        '8': (8, (180, 170, 480, 330)),
        '9': (9, (160, 150, 480, 240)),
        '10a': (10, (160, 180, 440, 305)),
        '10b': (11, (160, 160, 470, 260)),
    },
}

RESPONSE_CROPS = {
    '1a': {'better': (1, (60, 470, 540, 720)), 'weaker': (2, (60, 240, 540, 500))},
    '1b': {'better': (3, (60, 100, 540, 330)), 'weaker': (3, (60, 450, 540, 640))},
    '2a': {'better': (4, (60, 320, 540, 510)), 'weaker': (4, (60, 580, 540, 780))},
    '2b': {'better': (5, (60, 430, 540, 600)), 'weaker': (6, (60, 100, 540, 270))},
    '3': {'better': (6, (60, 480, 540, 730)), 'weaker': (7, (60, 160, 540, 310))},
    '4a': {'better': (8, (60, 100, 540, 410)), 'weaker': (8, (60, 560, 540, 780))},
    '4b': {'better': (9, (60, 280, 540, 460)), 'weaker': (9, (60, 560, 540, 740))},
    '5a': {'better': (10, (60, 280, 540, 700)), 'weaker': (11, (60, 60, 540, 500))},
    '5b': {'better': (12, (60, 100, 540, 390)), 'weaker': (12, (60, 600, 540, 810))},
    '6a': {'better': (13, (60, 440, 540, 730)), 'weaker': (14, (60, 180, 540, 460))},
    '6b': {'better': (15, (60, 100, 540, 340)), 'weaker': (15, (60, 460, 540, 700))},
    '7a': {'better': (16, (60, 320, 540, 540)), 'weaker': (17, (60, 100, 540, 320))},
    '7b': {'better': (17, (60, 470, 540, 605)), 'weaker': (17, (60, 700, 540, 810))},
    '8': {'better': (18, (60, 570, 540, 810)), 'weaker': (19, (60, 180, 540, 270))},
    '9': {'better': (19, (60, 550, 540, 750)), 'weaker': (20, (60, 180, 540, 300))},
    '10a': {'better': (21, (60, 100, 540, 280)), 'weaker': (21, (60, 370, 540, 550))},
    '10b': {'better': (22, (60, 400, 540, 600)), 'weaker': (23, (60, 100, 540, 290))},
    '11': {'better': (23, (60, 560, 540, 810)), 'weaker': (24, (60, 180, 540, 370))},
}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def prepare():
    for folder in [DEST, OUT, REVIEW]:
        folder.mkdir(parents=True, exist_ok=True)

    documents, sources, crops = {}, {}, []
    for key, name in FILES.items():
        path = SOURCE / name
        doc = pymupdf.open(path)
        documents[key] = doc
        sources[key] = {
            'filename': name,
            'url': f'/materials/ssc/mathematics/ssc-1/{name}',
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'pages': len(doc)
        }

    # 1. Question diagrams cropping
    for key, regions in CROPS.items():
        folder = ROOT / f'public/paper-crops/MTH-IX-2018-{key.upper()}'
        folder.mkdir(parents=True, exist_ok=True)
        for number, (page_idx, box) in regions.items():
            out_img = folder / f'q{number}.png'
            documents[key][page_idx].get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=pymupdf.Rect(box)).save(str(out_img))
            crops.append({
                'paper': key,
                'question': str(number),
                'page': page_idx + 1,
                'box': box,
                'sourceSha256': sources[key]['sha256'],
                'url': f'/paper-crops/{folder.name}/q{number}.png'
            })

    # 2. Student response cropping
    em_folder = ROOT / 'public/paper-crops/MTH-IX-2018-EMARKING'
    em_folder.mkdir(parents=True, exist_ok=True)
    for q_num, kinds in RESPONSE_CROPS.items():
        for kind, (page_idx, box) in kinds.items():
            out_img = em_folder / f'q{q_num}_{kind}.png'
            documents['em'][page_idx].get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=pymupdf.Rect(box)).save(str(out_img))
            crops.append({
                'paper': 'em',
                'question': q_num,
                'kind': kind,
                'page': page_idx + 1,
                'box': box,
                'sourceSha256': sources['em']['sha256'],
                'url': f'/paper-crops/MTH-IX-2018-EMARKING/q{q_num}_{kind}.png'
            })

    # Q7 has separate marking examples for parts a and b. Preserve both in
    # the single digital Q7 entry, rather than referencing nonexistent files.
    from PIL import Image
    for kind in ['better', 'weaker']:
        images = [Image.open(em_folder / f'q7{part}_{kind}.png').convert('RGB') for part in ['a', 'b']]
        combined = Image.new('RGB', (max(im.width for im in images), sum(im.height for im in images) + 20), 'white')
        y = 0
        for im in images:
            combined.paste(im, (0, y))
            y += im.height + 20
        combined.save(em_folder / f'q7_{kind}.png')
        crops.append({'paper': 'em', 'question': '7', 'kind': kind,
                      'sourceSha256': sources['em']['sha256'],
                      'componentUrls': [f'/paper-crops/MTH-IX-2018-EMARKING/q7{part}_{kind}.png' for part in ['a', 'b']],
                      'url': f'/paper-crops/MTH-IX-2018-EMARKING/q7_{kind}.png'})

    # 3. Read official key
    key_lines = [l.strip() for l in documents['key'][0].get_text().splitlines() if l.strip()]
    keys = []
    i = 0
    while i < len(key_lines):
        if key_lines[i].isdigit() and 1 <= int(key_lines[i]) <= 30:
            q_num = int(key_lines[i])
            ans = key_lines[i + 1]
            level = key_lines[i + 2]
            if ans in ['?', '*']:
                ans = '*'
            keys.append({'question': str(q_num), 'answer': ans, 'level': level})
            i += 3
        else:
            i += 1
    assert len(keys) == 30, f"Expected 30 keys, found {len(keys)}"
    by_number = {int(k['question']): k for k in keys}

    # 4. Load syllabus outcomes for mapping
    outcomes = {}
    for grade in [9, 10]:
        syl_file = OUT / f'ssc{1 if grade == 9 else 2}_exact_syllabus.json'
        for unit in json.loads(syl_file.read_text(encoding='utf-8')):
            for sub in unit['subtopics']:
                for slo in sub['slos']:
                    outcomes[grade, slo['code']] = {
                        **slo,
                        'topic': unit['name'],
                        'unitNumber': unit['unitNumber']
                    }

    def mapping(code, grade, reason):
        slo = outcomes.get((grade, code))
        return {
            'current_slo': code,
            'currentSlo': code,
            'current_mapping': [] if not slo else [{
                'code': code,
                'description': slo['description'],
                'topic': slo['topic'],
                'grade': grade
            }],
            'mapping_scope': {'board': 'AKU-EB', 'grade': grade or 9, 'subject': 'Mathematics'},
            'mappingStatus': 'NO_DIRECT_OUTCOME' if not slo else 'MOVED_TO_GRADE_X' if grade == 10 else 'IN_SCOPE',
            'mappingReason': reason,
            'in_syllabus': bool(slo and grade == 9),
            'out_of_syllabus': not bool(slo and grade == 9),
            'current_syllabus_reviewed': True,
            'syllabusEdition': '2025; latest revision July 2026; first examined 2027',
            'unitNumber': slo['unitNumber'] if slo else None,
            'unitName': slo['topic'] if slo else 'Historical syllabus / no direct current outcome',
            'sloText': slo['description'] if slo else ''
        }

    # 5. Extract E-Marking notes by question
    sections = {}
    full_em = '\n'.join([p.get_text() for p in documents['em']])
    for part in full_em.split('Question '):
        if not part.strip():
            continue
        header = part.splitlines()[0].strip().replace(':', '')
        sections[header] = part[:1500].strip()

    # 6. Build MCQs dataset
    mcqs = []
    assert len(MCQS) == 30, f"Expected 30 MCQs, found {len(MCQS)}"
    for idx, (stem, options, code, grade, reason, solved) in enumerate(MCQS, start=1):
        key = by_number[idx]
        page = next(p for p, start, end in [
            (2, 1, 5), (3, 6, 10), (4, 11, 16), (5, 17, 21),
            (6, 22, 25), (7, 26, 30)
        ] if start <= idx <= end)
        conflict = solved is not None and key['answer'] != '*' and solved != key['answer']
        is_asterisk_corrected = solved is not None and key['answer'] == '*'
        correct_option = solved if (is_asterisk_corrected or not conflict) else ''
        answer_status = 'ANSWER_CORRECTED' if is_asterisk_corrected else ('KEY_CONFLICT' if conflict else ('OFFICIAL_ASTERISK' if key['answer'] == '*' else 'VERIFIED'))
        answer_origin = 'Project-owner-authorized correction, independently worked; not a board erratum' if is_asterisk_corrected else 'Official key cross-checked; explanations are supplementary'
        answer_review_note = (f"Reviewed correction: {solved}. Original printed key: {key['answer']}. {reason}"
                              if is_asterisk_corrected else (reason if conflict or key['answer'] == '*' else ''))

        crop = next((c['url'] for c in crops if c['paper'] == 'p1' and c['question'] == str(idx)), None)
        item = {
            'questionNumber': idx,
            'stem': stem.replace('\\n', '\n'),
            'questionText': stem.replace('\\n', '\n'),
            'options': dict(zip('ABCD', options)),
            'choices': dict(zip('ABCD', options)),
            'correctOption': correct_option,
            'official_answer': key['answer'],
            'officialKey': key['answer'],
            'solved_correct_option': solved,
            'answerStatus': answer_status,
            'answer_review_note': answer_review_note,
            'explanation': reason,
            'answer_origin': answer_origin,
            'originalSlo': key.get('oldSlo') or code or 'N/A',
            'slo': key.get('oldSlo') or code or 'N/A',
            'cognitiveLevel': {'K': 'R'}.get(key['level'], key['level']),
            'originalCognitiveLevel': key['level'],
            'pageNumber': page,
            'section': 'MCQ',
            'marks': 1,
            'paperCode': 'MTH-IX-2018-P1',
            'diagramUrl': crop,
            'isDiagram': bool(crop),
            'sourceSha256': sources['p1']['sha256'],
            **mapping(code, grade, reason)
        }
        mcqs.append(item)

    # 7. Build CRQs dataset
    theory = []
    for number, page, marks, old, code, grade, text, solution in CRQS:
        crop = f'/paper-crops/MTH-IX-2018-P2/q{number}.png' if number in CROPS['p2'] else None
        choice = (
            'Attempt either 1a or 1b.' if number in ['1a', '1b'] else
            'Attempt either 2a or 2b.' if number in ['2a', '2b'] else
            'Attempt either 4a or 4b.' if number in ['4a', '4b'] else
            'Attempt either 5a or 5b.' if number in ['5a', '5b'] else
            'Attempt either 6a or 6b.' if number in ['6a', '6b'] else
            'Attempt either 10a or 10b.' if number in ['10a', '10b'] else
            'Compulsory.'
        )
        group = (
            '1' if number in ['1a', '1b'] else
            '2' if number in ['2a', '2b'] else
            '4' if number in ['4a', '4b'] else
            '5' if number in ['5a', '5b'] else
            '6' if number in ['6a', '6b'] else
            '10' if number in ['10a', '10b'] else
            None
        )
        better_img = f'/paper-crops/MTH-IX-2018-EMARKING/q{number}_better.png'
        weaker_img = f'/paper-crops/MTH-IX-2018-EMARKING/q{number}_weaker.png'
        item = {
            'questionNumber': number,
            'questionText': text.replace('\\n', '\n'),
            'marks': marks,
            'section': 'CRQ',
            'originalSlo': old,
            'pageNumber': page,
            'modelAnswer': solution,
            'modelAnswerOrigin': 'Supplementary worked solution, checked against marking criteria',
            'cognitiveLevel': 'U' if number in ['2a', '2b', '7', '8', '11'] else 'A',
            'choiceInstruction': choice,
            'choiceGroup': group,
            'diagramUrl': crop,
            'isDiagram': bool(crop),
            'officialMarkingNotes': sections.get(number, ''),
            'sourceSha256': sources['p2']['sha256'],
            'betterResponseImage': better_img,
            'weakerResponseImage': weaker_img,
            **mapping(code, grade, solution)
        }
        theory.append(item)

    # 8. Write JSON artifacts
    write(OUT / 'ssc1_2018_past_mcqs.json', mcqs)
    write(OUT / 'ssc1_2018_past_crqs.json', theory)
    write(OUT / 'ssc1_2018_source_manifest.json', {
        'sources': sources,
        'officialKeyRows': keys,
        'crops': crops,
        'syllabusSource': {
            'url': '/materials/ssc/mathematics/ssc-1/mathematics-science-group-ssc-syllabus-2025.pdf',
            'latestRevision': 'July 2026',
            'firstExamYear': 2027,
            'sha256': hashlib.sha256((DEST / 'mathematics-science-group-ssc-syllabus-2025.pdf').read_bytes()).hexdigest()
        },
        'paperII': {
            'printedQuestions': 11,
            'digitalEntriesIncludingAlternatives': 17,
            'totalMarks': 45,
            'durationMinutes': 140,
            'choiceGroups': {
                '1': {'choose': 1, 'of': ['1a', '1b'], 'marks': 4},
                '2': {'choose': 1, 'of': ['2a', '2b'], 'marks': 4},
                '4': {'choose': 1, 'of': ['4a', '4b'], 'marks': 4},
                '5': {'choose': 1, 'of': ['5a', '5b'], 'marks': 5},
                '6': {'choose': 1, 'of': ['6a', '6b'], 'marks': 4},
                '10': {'choose': 1, 'of': ['10a', '10b'], 'marks': 4}
            }
        }
    })

    # 9. Write Review Report
    report = [
        '# Mathematics IX Annual Examination 2018 - Import Review',
        '',
        '30 MCQs; 11 printed Paper II questions represented by 17 entries including alternatives.',
        'Paper I: 30 marks / 40 minutes. Paper II: 45 marks / 140 minutes (2 hours 20 minutes).',
        '',
        'The authoritative project syllabus is labelled 2025, revised July 2026, first examined in 2027.',
        'Original examination class and old SLO codes are preserved in metadata.',
        'Current mappings were determined from topic descriptions across IX and X syllabi.',
        '',
        '## Source Notes & Discrepancies',
        '',
        '- Paper I Q17: Componendo property; historical topic retained without direct current outcome.',
        '- Paper I Q19-Q21: Matrices; moved to current Grade X Unit 18.',
        '- Paper I Q22: Median of ungrouped data; moved to current Grade X Unit 22.',
        '- Paper I Q23, Q24: Bar chart interpretation; historical topic without direct current outcome.',
        '- Paper I Q29: Angle-side inequalities; historical topic without direct current outcome.',
        '- Paper II Q1b: Complex numbers; moved to current Grade X Unit 17.',
        '- Paper II Q6b: K-method proportion proof; historical topic without direct current outcome.',
        '- Paper II Q7: Matrices operations and conformability; moved to current Grade X Unit 18.',
        '- Paper II Q8: Pie chart angle/frequency completion; historical topic without direct current outcome.',
        '- Paper II Q11: Triangle medians construction; moved to current Grade X Unit 21.',
        '',
        '## Current SLO Mapping Table',
        '',
        '| Paper | Question | Original SLO | Current SLO | Current Grade | Status |',
        '|---|---|---|---|---|---|'
    ]
    for component, items in [('I', mcqs), ('II', theory)]:
        for item in items:
            report.append(
                f"| {component} | {item['questionNumber']} | {item['originalSlo']} | {item['current_slo'] or '-'} | "
                f"{item['mapping_scope']['grade'] if item['current_slo'] else '-'} | {item['mappingStatus']} |"
            )
    (REVIEW / 'review.md').write_text('\n'.join(report) + '\n', encoding='utf-8')

    print(json.dumps({
        'mcqs': len(mcqs),
        'theoryEntries': len(theory),
        'crops': len(crops),
        'ungradableMCQs': [x['questionNumber'] for x in mcqs if not x['correctOption']],
        'mappingCounts': {
            status: sum(x['mappingStatus'] == status for x in mcqs + theory)
            for status in ['IN_SCOPE', 'MOVED_TO_GRADE_X', 'NO_DIRECT_OUTCOME']
        }
    }, indent=2))


if __name__ == '__main__':
    prepare()
