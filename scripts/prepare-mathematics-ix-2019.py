"""Prepare the reviewed Mathematics IX Annual Examination 2019 papers.
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
REVIEW = ROOT / 'output/mathematics-ix-2019'

FILES = {
    'p1': 'mathematics-ix-2019-paper-i.pdf',
    'p2': 'mathematics-ix-2019-paper-ii.pdf',
    'key': 'mathematics-ix-2019-keys.pdf',
    'em': 'mathematics-ix-2019-emarking.pdf',
}

# 35 MCQs: stem, A-D options, current SLO code, current grade (9 or 10 or None), semantic rationale, verified answer.
MCQS = [
    # 1
    (
        r'Given that $A = \{a\}$ and $B = \{1, 2\}$, then $B - A$ is equal to',
        [r'$\{ \}$', r'$\{a\}$', r'$\{1, 2\}$', r'$\{1 - a, 2 - a\}$'],
        '3.2.2', 9,
        r'Difference $B - A$ consists of all elements that belong to $B$ but not to $A$. Since $\{1, 2\} \cap \{a\} = \emptyset$, $B - A = \{1, 2\}$.',
        'C'
    ),
    # 2
    (
        r'If $U = \{1, 2, 3, 4, 5\}$ and $A \cup B = \{1, 2, 3, 4\}$, then $A^c \cap B^c$ is equal to',
        [r'$\phi$', r'$\{5\}$', r'$\{1, 2, 3, 4\}$', r'$\{1, 2, 3, 4, 5\}$'],
        '3.2.2', 9,
        r'By De Morgan\'s Law, $A^c \cap B^c = (A \cup B)^c = U - (A \cup B) = \{1, 2, 3, 4, 5\} - \{1, 2, 3, 4\} = \{5\}$.',
        'B'
    ),
    # 3
    (
        r'For the three non-empty sets $X$, $Y$ and $Z$, the CORRECT option is',
        [
            r'$(X \cup Y) \cap Z = X \cup (Y \cap Z)$',
            r'$(X \cup Y) \cap Z = X \cup (Y \cup Z)$',
            r'$(X \cap Y) \cup Z = X \cap (Y \cap Z)$',
            r'$(X \cup Y) \cup Z = X \cup (Y \cup Z)$'
        ],
        '3.3.1', 9,
        r'The associative property of set union states that $(X \cup Y) \cup Z = X \cup (Y \cup Z)$.',
        'D'
    ),
    # 4
    (
        r'For a given binary relation $r = \{(a, a), (a, b), (b, c), (b, d)\}$, the range is',
        [r'$\{a, b\}$', r'$\{a, b, c\}$', r'$\{a, c, d\}$', r'$\{a, b, c, d\}$'],
        '3.7.2', 9,
        r'The range of a binary relation is the set of all second elements in the ordered pairs: $\{a, b, c, d\}$.',
        'D'
    ),
    # 5
    (
        r'For the sets $A = \{a, e, i\}$ and $B = \{1, 2, 3, 4\}$, the function from $A$ to $B$ will be',
        [
            r'$\{(a, 1), (e, 2)\}$',
            r'$\{(a, 1), (e, 1), (i, 1)\}$',
            r'$\{(a, 1), (e, 2), (i, 3), (i, 4)\}$',
            r'$\{(a, 1), (a, 2), (e, 3), (i, 4)\}$'
        ],
        '4.1.2', 9,
        r'A function from $A$ to $B$ must assign each element of domain $A = \{a, e, i\}$ to exactly one element of $B$. Only $\{(a, 1), (e, 1), (i, 1)\}$ satisfies this condition.',
        'B'
    ),
    # 6
    (
        r'If $2i + 3 = b + ai - 3i$, then the value of $a$ will be',
        [r'$-2$', r'$-1$', r'$1$', r'$5$'],
        '17.1.5', 10,
        r'Equating imaginary parts: $2 = a - 3 \implies a = 5$ (and real part $b = 3$). Complex numbers have moved to current Grade X.',
        'D'
    ),
    # 7
    (
        r'On simplification of $ai + ib - b - a$, we get',
        [
            r'$(a + b)i - 1$',
            r'$(a + b)(i - 1)$',
            r'$(a - b) + (a + b)i$',
            r'$-(a + b) + (a + b)i$'
        ],
        '17.1.5', 10,
        r'Factor by grouping: $ai + ib - (a + b) = i(a + b) - 1(a + b) = (a + b)(i - 1)$. Current Grade X.',
        'B'
    ),
    # 8
    (
        r'Which of the following fractions is a terminating decimal fraction?',
        [r'$\frac{4}{3}$', r'$\frac{3}{4}$', r'$\frac{2}{3}$', r'$\frac{1}{3}$'],
        '1.2.1', 9,
        r'A rational fraction in simplest form terminates if and only if its denominator has prime factors of only $2$ and/or $5$. Since $4 = 2^2$, $\frac{3}{4} = 0.75$ is terminating.',
        'B'
    ),
    # 9
    (
        r'$\sqrt{\frac{a^2 \times b}{b^3}}$ is equal to',
        [r'$\frac{a^2}{b^2}$', r'$\frac{a}{b}$', r'$\pm \frac{a}{b}$', r'$\pm \frac{ab}{2}$'],
        '1.4.1', 9,
        r'Simplifying the radicand: $\frac{a^2 b}{b^3} = \frac{a^2}{b^2}$. Taking the square root gives $\sqrt{\frac{a^2}{b^2}} = \frac{a}{b}$.',
        'B'
    ),
    # 10
    (
        r'If $5 \times 10^{-b} = 0.0500$, then $b$ is equal to',
        [r'$-2$', r'$-1$', r'$1$', r'$2$'],
        '2.1.1', 9,
        r'$0.0500 = 5 \times 10^{-2}$. Comparing with $5 \times 10^{-b}$ gives $-b = -2 \implies b = 2$.',
        'D'
    ),
    # 11
    (
        r'The logarithmic form of $a^{-3} = \frac{1}{16}$ will be written as',
        [
            r'$\log_a \left(\frac{1}{16}\right) = -3$',
            r'$\log_a (16) = -3$',
            r'$\log_{1/16} (3) = a$',
            r'$\log_3 \left(\frac{1}{16}\right) = -a$'
        ],
        '2.2.1', 9,
        r'By definition of logarithm, $b^y = x \iff \log_b(x) = y$. Thus $a^{-3} = \frac{1}{16} \iff \log_a\left(\frac{1}{16}\right) = -3$.',
        'A'
    ),
    # 12
    (
        r'The logarithmic expression $\frac{\log_3 x}{\log_3 y}$ can also be written as',
        [r'$\log_x y$', r'$\log_y x$', r'$\log_3 \left(\frac{x}{y}\right)$', r'$\log_3 (x - y)$'],
        '2.4.1', 9,
        r'By the change of base formula of logarithms, $\frac{\log_c x}{\log_c y} = \log_y x$.',
        'B'
    ),
    # 13
    (
        r'For $a = -1$ and $b = -1$, the value of $a^2 - 2ab^2$ is equal to',
        [r'$-3$', r'$-1$', r'$1$', r'$3$'],
        '5.1.1', 9,
        r'Substitute $a = -1$ and $b = -1$: $a^2 - 2ab^2 = (-1)^2 - 2(-1)(-1)^2 = 1 - 2(-1)(1) = 1 + 2 = 3$.',
        'D'
    ),
    # 14
    (
        r'The value of $a^2 + b^2$, when $(a + b)^2 = 81$ and $ab = 20$, is equal to',
        [r'$41$', r'$61$', r'$81$', r'$121$'],
        '5.1.1', 9,
        r'Using the identity $(a + b)^2 = a^2 + b^2 + 2ab$, we have $a^2 + b^2 = (a + b)^2 - 2ab = 81 - 2(20) = 81 - 40 = 41$.',
        'A'
    ),
    # 15
    (
        r'On simplification of $\frac{6 + \sqrt{35}}{3 - \sqrt{8}} \times \frac{6 - \sqrt{35}}{3 + \sqrt{8}}$, we get',
        [r'$-2$', r'$-1$', r'$1$', r'$2$'],
        '1.5.1', 9,
        r'Multiplying numerators and denominators: $\frac{(6 + \sqrt{35})(6 - \sqrt{35})}{(3 - \sqrt{8})(3 + \sqrt{8})} = \frac{6^2 - (\sqrt{35})^2}{3^2 - (\sqrt{8})^2} = \frac{36 - 35}{9 - 8} = \frac{1}{1} = 1$.',
        'C'
    ),
    # 16
    (
        r'In simplified form, $\frac{(x - 1)^2}{x^2 - 1}$ is equal to',
        [r'$1$', r'$\frac{x + 1}{x - 1}$', r'$\frac{x - 1}{x + 1}$', r'$\frac{1}{x + 1}$'],
        '6.2.2', 9,
        r'Factor denominator: $x^2 - 1 = (x - 1)(x + 1)$. Then $\frac{(x - 1)^2}{(x - 1)(x + 1)} = \frac{x - 1}{x + 1}$ for $x \neq 1$.',
        'C'
    ),
    # 17
    (
        r'On complete factorisation of $9 - (3a - b)^2$, we get',
        [
            r'$(3 + 3a + b)(3 - 3a - b)$',
            r'$(3 + 3a - b)(3 - 3a + b)$',
            r'$(9 + 3a - b)(9 - 3a + b)$',
            r'$(9 + 3a + b)(9 - 3a - b)$'
        ],
        '5.2.1', 9,
        r'Difference of squares: $3^2 - (3a - b)^2 = [3 + (3a - b)][3 - (3a - b)] = (3 + 3a - b)(3 - 3a + b)$.',
        'B'
    ),
    # 18
    (
        r'The factors of $x^2 + 2x + 2xy + 4y$ are',
        [
            r'$(x + 2)$ and $3y$',
            r'$(x + 4)$ and $3y$',
            r'$(x + 2)$ and $(x + 4y)$',
            r'$(x + 2)$ and $(x + 2y)$'
        ],
        '5.2.1', 9,
        r'Factor by grouping: $x(x + 2) + 2y(x + 2) = (x + 2)(x + 2y)$.',
        'D'
    ),
    # 19
    (
        r'On complete factorisation of $2a^3 - 2$, we get',
        [
            r'$(2a - 1)(a^2 + 2a + 1)$',
            r'$2(a - 1)(a^2 + a + 1)$',
            r'$2(a - 1)(a^2 - a + 1)$',
            r'$(2a - 1)(a^2 - 2a + 1)$'
        ],
        '5.2.1', 9,
        r'Take 2 common: $2(a^3 - 1) = 2(a - 1)(a^2 + a + 1)$.',
        'B'
    ),
    # 20
    (
        r'One of the factors of $x^3 + x^2 - 4x - 4$ is',
        [r'$x$', r'$x - 1$', r'$x + 1$', r'$x + 4$'],
        '5.2.1', 9,
        r'Factor by grouping: $x^2(x + 1) - 4(x + 1) = (x^2 - 4)(x + 1) = (x - 2)(x + 2)(x + 1)$. Hence $(x + 1)$ is a factor.',
        'C'
    ),
    # 21
    (
        r'For $x^2 - 2x^3 - 3$, one of the zeros of the given polynomial is',
        [r'$-2$', r'$-1$', r'$0$', r'$1$'],
        '5.4.1', 9,
        r'Testing $x = -1$: $(-1)^2 - 2(-1)^3 - 3 = 1 - 2(-1) - 3 = 1 + 2 - 3 = 0$. Hence $-1$ is a zero.',
        'B'
    ),
    # 22
    (
        r'If $a : b = c : d$, then according to the invertendo property, we get',
        [
            r'$b : a = d : c$',
            r'$a : b = d : c$',
            r'$b : a = c : d$',
            r'$a : c = b : d$'
        ],
        None, 9,
        r'Invertendo property of proportions states that if $\frac{a}{b} = \frac{c}{d}$, then $\frac{b}{a} = \frac{d}{c}$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'A'
    ),
    # 23
    (
        r'If numbers $k$, $5$ and $25$ are in continued proportion, then the value of $k$ is',
        [r'$1$', r'$5$', r'$\frac{1}{5}$', r'$125$'],
        None, 9,
        r'In continued proportion, $\frac{k}{5} = \frac{5}{25} \implies k = \frac{25}{25} = 1$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'A'
    ),
    # 24
    (
        r'The matrix $\begin{bmatrix}1 & 1 & 1\end{bmatrix}$ is a' + '\n' +
        r'I. unit matrix.' + '\n' +
        r'II. row matrix.' + '\n' +
        r'III. rectangular matrix.',
        [r'I only.', r'III only.', r'I and II.', r'II and III.'],
        '18.2.1', 10,
        r'The matrix has order $1 \times 3$: it has 1 row (row matrix) and unequal dimensions $1 \neq 3$ (rectangular matrix). It is not a unit (identity) matrix. Current Grade X.',
        'D'
    ),
    # 25
    (
        r'The transpose of the matrix $\begin{bmatrix}2 & 3 & 1 \\ 2 & 3 & 1\end{bmatrix}$ is',
        [
            r'$\begin{bmatrix}2 & 1 & 3 \\ 2 & 1 & 3\end{bmatrix}$',
            r'$\begin{bmatrix}1 & 3 & 2 \\ 1 & 3 & 2\end{bmatrix}$',
            r'$\begin{bmatrix}2 & 2 \\ 3 & 3 \\ 1 & 1\end{bmatrix}$',
            r'$\begin{bmatrix}2 & 2 \\ 1 & 1 \\ 3 & 3\end{bmatrix}$'
        ],
        '18.2.2', 10,
        r'Transposing exchanges rows and columns: the $2 \times 3$ matrix becomes a $3 \times 2$ matrix $\begin{bmatrix}2 & 2 \\ 3 & 3 \\ 1 & 1\end{bmatrix}$. Current Grade X.',
        'C'
    ),
    # 26
    (
        r'If $A = \begin{bmatrix}2 & 3\end{bmatrix}$ and $B = \begin{bmatrix}1 \\ 5\end{bmatrix}$, then $A \times B$',
        [
            r'is $[17]$',
            r'is $\begin{bmatrix}2 \\ 15\end{bmatrix}$',
            r'is $\begin{bmatrix}2 & 15\end{bmatrix}$',
            r'cannot be determined.'
        ],
        '18.4.3', 10,
        r'Multiplication of $1 \times 2$ by $2 \times 1$: $[2(1) + 3(5)] = [2 + 15] = [17]$. Current Grade X.',
        'A'
    ),
    # 27
    (
        r'If $A = \begin{bmatrix}a & 18 \\ 2 & a\end{bmatrix}$ is a singular matrix, then the possible value(s) of $a$ will be',
        [r'$0$', r'$\pm 18$', r'$\pm 6$', r'$9$'],
        '18.5.4', 10,
        r'Singular matrix has determinant zero: $\det(A) = a^2 - (18)(2) = a^2 - 36 = 0 \implies a = \pm 6$. Current Grade X.',
        'C'
    ),
    # 28
    (
        r'If $A = \begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}$, then $|\text{Adj} A|$ will be',
        [r'$-10$', r'$-2$', r'$2$', r'$10$'],
        '18.5.5', 10,
        r'$\text{Adj} A = \begin{bmatrix}4 & -2 \\ -3 & 1\end{bmatrix}$. Its determinant is $|\text{Adj} A| = 4(1) - (-2)(-3) = 4 - 6 = -2$. (Alternatively, for $2 \times 2$, $|\text{Adj} A| = |A| = 4 - 6 = -2$). Current Grade X.',
        'B'
    ),
    # 29
    (
        r'If $\Delta ABC \cong \Delta DFE$, then the value of $x$ is equal to',
        [r'$20^\circ$', r'$25^\circ$', r'$35^\circ$', r'$50^\circ$'],
        '12.1.1', 9,
        r'In $\Delta ABC$, $\angle B = 180^\circ - (50^\circ + 45^\circ) = 85^\circ$. Corresponding angle in $\Delta DFE$ is $\angle F = \angle B = 85^\circ$. From the diagram, $(35 + 2x)^\circ = 85^\circ \implies 2x = 50 \implies x = 25^\circ$.',
        'B'
    ),
    # 30
    (
        r'For the given parallelogram $ABCD$, the CORRECT option is' + '\n' +
        r'I. $\angle B = \angle C$' + '\n' +
        r'II. $AB = CD$' + '\n' +
        r'III. $\angle D = 180^\circ - t^\circ$',
        [r'I only.', r'III only.', r'I and II.', r'II and III.'],
        '13.1.1', 9,
        r'In a parallelogram, opposite sides are equal ($AB = CD$, II), and consecutive angles are supplementary ($\angle D + \angle C = 180^\circ \implies \angle D = 180^\circ - t^\circ$, III). Adjacent angles are generally not equal, so I is false.',
        'D'
    ),
    # 31
    (
        r'The given figure shows a triangle $ABC$, where $D$ and $E$ are the midpoints of sides $AC$ and $AB$ respectively. The CORRECT option will be' + '\n' +
        r'I. $AD = AE$' + '\n' +
        r'II. $DE = \frac{1}{2} BC$' + '\n' +
        r'III. $DE$ is parallel to $BC$',
        [r'I only.', r'II only.', r'II and III.', r'I and III.'],
        '13.1.1', 9,
        r'By the Midpoint Theorem, the line segment joining midpoints of two sides of a triangle is parallel to the third side ($DE \parallel BC$, III) and equal to half its length ($DE = \frac{1}{2}BC$, II).',
        'C'
    ),
    # 32
    (
        r'The given figure shows a triangle $ABC$. Its medians $AF$, $BD$ and $CE$ are intersecting at point $O$. If $AF = 6\text{ cm}$, then $OA$ is equal to',
        [r'$1\text{ cm}$', r'$2\text{ cm}$', r'$3\text{ cm}$', r'$4\text{ cm}$'],
        '21.1.2', 10,
        r'The centroid $O$ divides each median in the ratio $2 : 1$ from vertex to midpoint: $OA = \frac{2}{3} AF = \frac{2}{3} \times 6 = 4\text{ cm}$. Current Grade X.',
        'D'
    ),
    # 33
    (
        r'The given figure shows a parallelogram $ABCD$, the measurement of angle $BCE$ is',
        [r'$25^\circ$', r'$75^\circ$', r'$105^\circ$', r'$115^\circ$'],
        '13.1.1', 9,
        r'In parallelogram $ABCD$, consecutive angles are supplementary: $\angle C = 180^\circ - \angle B = 180^\circ - 65^\circ = 115^\circ$. From the figure, $\angle C$ is divided into $\angle BCE$ and $\angle ECD = 40^\circ$. Therefore $\angle BCE = 115^\circ - 40^\circ = 75^\circ$.',
        'B'
    ),
    # 34
    (
        r'If $EF$ is the right bisector of $BC$, then triangle $ABC$ and triangle $DBC$ are',
        [
            r'scalene triangles.',
            r'isosceles triangles.',
            r'equilateral triangles.',
            r'right angled triangles.'
        ],
        '10.1.3', 9,
        r'Any point on the right bisector of a line segment is equidistant from its endpoints: $A$ on $EF \implies AB = AC$ (so $\Delta ABC$ is isosceles), and $D$ on $EF \implies DB = DC$ (so $\Delta DBC$ is isosceles).',
        'B'
    ),
    # 35
    (
        r'For the given triangle $EFG$, which of the following is TRUE?',
        [
            r'$\angle F > \angle G$',
            r'$\angle G > \angle E$',
            r'$\angle E > \angle F$',
            r'$\angle G = \angle E + \angle F$'
        ],
        None, 9,
        r'In $\Delta EFG$, side $EF = 6\text{ cm}$ lies opposite to $\angle G$, and side $GF = 2\text{ cm}$ lies opposite to $\angle E$. Since side $EF > GF$ ($6 > 2$), the angle opposite the longer side is greater: $\angle G > \angle E$. (Historical topic; no direct outcome in current IX-X syllabus).',
        'B'
    ),
]

# 12 CRQs: number, page, marks, original SLO, current SLO code, current grade, question text, model answer
CRQS = [
    (
        '1', 2, 4, '3.3.1', '4.1.2', 9,
        r'For two non-empty sets $A$ and $B$, an onto function from $A$ to $B$ is defined as $f_1 = \{(p, 10), (q, 10), (r, 25), (s, 30)\}$.' + '\n' +
        r'Using the given information, answer the following parts:' + '\n' +
        r'i. Find the domain of $f_1$. (1 Mark)' + '\n' +
        r'ii. Find the set $A$. (1 Mark)' + '\n' +
        r'iii. Select and write down the possible set $B$ from the given two choices. (1 Mark)' + '\n' +
        r'Choice I: $\{10, 25, 30\}$' + '\n' +
        r'Choice II: $\{10, 15, 20, 25, 30\}$' + '\n' +
        r'iv. Write down a function $f_2$ from $A$ to $B$. (1 Mark)',
        r'i. The domain of $f_1$ consists of all first coordinates in the ordered pairs: $\text{Domain}(f_1) = \{p, q, r, s\}$.' + '\n' +
        r'ii. Since $f_1$ is a function from $A$ to $B$, its domain must equal set $A$: $A = \{p, q, r, s\}$.' + '\n' +
        r'iii. For an onto (surjective) function from $A$ to $B$, the range must equal the codomain $B$. The range of $f_1$ is $\{10, 25, 30\}$. Therefore, $B = \{10, 25, 30\}$ (Choice I).' + '\n' +
        r'iv. A function $f_2$ from $A$ to $B$ requires each element of $A$ to have a unique image in $B$, for example: $f_2 = \{(p, 10), (q, 25), (r, 30), (s, 10)\}$ or any valid function mapping $A$ into $B$.'
    ),
    (
        '2', 3, 4, '2.1.2 & 2.1.4', '1.4.1', 9,
        r'Simplify $\sqrt[3]{\frac{64x^{12}y^2}{x^3 y^{-4}}}$.',
        r'Simplify powers inside the cube root using exponent laws:' + '\n' +
        r'$\frac{64 x^{12} y^2}{x^3 y^{-4}} = 64 \cdot x^{12 - 3} \cdot y^{2 - (-4)} = 64 x^9 y^6$.' + '\n' +
        r'Express $64$ as $4^3$ and apply the rational exponent $\frac{1}{3}$:' + '\n' +
        r'$\sqrt[3]{64 x^9 y^6} = (4^3 x^9 y^6)^{1/3} = 4^{3/3} \cdot x^{9/3} \cdot y^{6/3} = 4x^3 y^2$.'
    ),
    (
        '3', 4, 4, '3.2.3', '2.4.1', 9,
        r'For the given logarithmic equation $x = \log_3 27 + \log_3 3 - \log_3 3^2$, find the value of $x$.',
        r'Evaluate each logarithmic term using laws of logarithms:' + '\n' +
        r'$\log_3 27 = \log_3 (3^3) = 3 \log_3 3 = 3(1) = 3$.' + '\n' +
        r'$\log_3 3 = 1$.' + '\n' +
        r'$\log_3 3^2 = 2 \log_3 3 = 2(1) = 2$.' + '\n' +
        r'Substitute into the equation:' + '\n' +
        r'$x = 3 + 1 - 2 = 2$.' + '\n' +
        r'(Alternatively, combine using product and quotient laws: $x = \log_3\left(\frac{27 \times 3}{3^2}\right) = \log_3\left(\frac{81}{9}\right) = \log_3 9 = 2$).'
    ),
    (
        '4a', 5, 5, '4.2.7', '5.1.1', 9,
        r'For $2x - a = -\frac{1}{2x}$, prove that $8x^3 + \frac{1}{8x^3} = a^3 - 3a$.',
        r'Rearrange the given equation:' + '\n' +
        r'$2x + \frac{1}{2x} = a$.' + '\n' +
        r'Cube both sides:' + '\n' +
        r'$\left(2x + \frac{1}{2x}\right)^3 = a^3$.' + '\n' +
        r'Expand using $(u + v)^3 = u^3 + v^3 + 3uv(u + v)$ with $u = 2x$ and $v = \frac{1}{2x}$:' + '\n' +
        r'$(2x)^3 + \left(\frac{1}{2x}\right)^3 + 3(2x)\left(\frac{1}{2x}\right)\left(2x + \frac{1}{2x}\right) = a^3$' + '\n' +
        r'$8x^3 + \frac{1}{8x^3} + 3(1)(a) = a^3$' + '\n' +
        r'$8x^3 + \frac{1}{8x^3} + 3a = a^3 \implies 8x^3 + \frac{1}{8x^3} = a^3 - 3a$. (Hence proved).'
    ),
    (
        '4b', 5, 5, '4.2.9', '5.1.1', 9,
        r'Prove that $(2x + 3y)(2x - 3y)(4x^2 + 6xy + 9y^2)(4x^2 - 6xy + 9y^2) = 64x^6 - 729y^6$.',
        r'Rearrange terms to pair factors according to the difference and sum of cubes formulas:' + '\n' +
        r'$[(2x - 3y)(4x^2 + 6xy + 9y^2)] \times [(2x + 3y)(4x^2 - 6xy + 9y^2)]$' + '\n' +
        r'Apply $(u - v)(u^2 + uv + v^2) = u^3 - v^3$ and $(u + v)(u^2 - uv + v^2) = u^3 + v^3$ with $u = 2x$ and $v = 3y$:' + '\n' +
        r'$= [(2x)^3 - (3y)^3] \times [(2x)^3 + (3y)^3]$' + '\n' +
        r'$= (8x^3 - 27y^3)(8x^3 + 27y^3)$' + '\n' +
        r'Apply $(A - B)(A + B) = A^2 - B^2$:' + '\n' +
        r'$= (8x^3)^2 - (27y^3)^2 = 64x^6 - 729y^6$. (Hence proved).'
    ),
    (
        '5a', 6, 5, '5.1.1', '5.2.1', 9,
        r'Factorise the expression $15x^3 - 24x^2 + 3x + 6x$ completely.',
        r'Combine like linear terms:' + '\n' +
        r'$15x^3 - 24x^2 + 9x$.' + '\n' +
        r'Take out the greatest common monomial factor $3x$:' + '\n' +
        r'$= 3x(5x^2 - 8x + 3)$.' + '\n' +
        r'Factorise the quadratic factor $5x^2 - 8x + 3$ by splitting the middle term ($ac = 15$, $-5 \times -3 = 15$, $-5 - 3 = -8$):' + '\n' +
        r'$5x^2 - 5x - 3x + 3 = 5x(x - 1) - 3(x - 1) = (5x - 3)(x - 1)$.' + '\n' +
        r'Thus, the complete factorisation is:' + '\n' +
        r'$3x(5x - 3)(x - 1)$.'
    ),
    (
        '5b', 6, 5, '5.2.1a', '5.2.1', 9,
        r'Using factorisation, show that the expression $64a^4 + b^4$ can be written as $(8a^2 + 4ab + b^2)(8a^2 - 4ab + b^2)$.',
        r'Complete the square by adding and subtracting $2(8a^2)(b^2) = 16a^2 b^2$:' + '\n' +
        r'$64a^4 + b^4 = (8a^2)^2 + (b^2)^2 + 2(8a^2)(b^2) - 16a^2 b^2$' + '\n' +
        r'$= (8a^2 + b^2)^2 - (4ab)^2$.' + '\n' +
        r'Apply the difference of squares identity $u^2 - v^2 = (u + v)(u - v)$ with $u = 8a^2 + b^2$ and $v = 4ab$:' + '\n' +
        r'$= (8a^2 + b^2 + 4ab)(8a^2 + b^2 - 4ab)$' + '\n' +
        r'$= (8a^2 + 4ab + b^2)(8a^2 - 4ab + b^2)$. (Hence proved).'
    ),
    (
        '6', 7, 4, '6.3.1', '4.4.1', 9,
        r'If $y$ is directly proportional to $\sqrt{x}$, then find the missing values of $x$ and $y$ in the following table.' + '\n' +
        r'| $x$ | $16$ | $3$ | ? |' + '\n' +
        r'| $y$ | $4$ | ? | $9$ |',
        r'Since $y \propto \sqrt{x}$, we have $y = k\sqrt{x}$ for constant $k$.' + '\n' +
        r'Using the first column $(x = 16, y = 4)$:' + '\n' +
        r'$4 = k\sqrt{16} = 4k \implies k = 1$.' + '\n' +
        r'So the relation is $y = \sqrt{x}$ (or $x = y^2$).' + '\n' +
        r'When $x = 3$: $y = 1\sqrt{3} = \sqrt{3}$ (or $\approx 1.732$).' + '\n' +
        r'When $y = 9$: $9 = \sqrt{x} \implies x = 9^2 = 81$.' + '\n' +
        r'Thus, the missing values are $y = \sqrt{3}$ when $x = 3$, and $x = 81$ when $y = 9$.'
    ),
    (
        '7', 8, 5, '7.5.3, 7.5.4, 7.5.8', '18.5.5', 10,
        r'a. For the given matrix $A = \begin{bmatrix}2 & 3 \\ 6 & 2\end{bmatrix}$, find its' + '\n' +
        r'i. determinant. (1 Mark)' + '\n' +
        r'ii. adjoint. (1 Mark)' + '\n' +
        r'iii. inverse. (1 Mark)' + '\n' +
        r'b. Using the result of part a, show that $A^{-1} \times A = I$. (2 Marks)',
        r'a. i. Determinant: $\det(A) = (2)(2) - (3)(6) = 4 - 18 = -14$.' + '\n' +
        r'ii. Adjoint: $\text{Adj}(A) = \begin{bmatrix}2 & -3 \\ -6 & 2\end{bmatrix}$.' + '\n' +
        r'iii. Multiplicative inverse: $A^{-1} = \frac{1}{\det(A)} \text{Adj}(A) = -\frac{1}{14}\begin{bmatrix}2 & -3 \\ -6 & 2\end{bmatrix} = \begin{bmatrix}-1/7 & 3/14 \\ 3/7 & -1/7\end{bmatrix}$.' + '\n' +
        r'b. Multiply $A^{-1}$ by $A$:' + '\n' +
        r'$A^{-1} \times A = -\frac{1}{14}\begin{bmatrix}2 & -3 \\ -6 & 2\end{bmatrix} \begin{bmatrix}2 & 3 \\ 6 & 2\end{bmatrix}$' + '\n' +
        r'$= -\frac{1}{14}\begin{bmatrix}2(2) + (-3)(6) & 2(3) + (-3)(2) \\ (-6)(2) + 2(6) & (-6)(3) + 2(2)\end{bmatrix}$' + '\n' +
        r'$= -\frac{1}{14}\begin{bmatrix}4 - 18 & 6 - 6 \\ -12 + 12 & -18 + 4\end{bmatrix} = -\frac{1}{14}\begin{bmatrix}-14 & 0 \\ 0 & -14\end{bmatrix} = \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix} = I$.' + '\n' +
        r'(Matrices have moved to current Grade X).'
    ),
    (
        '8', 9, 3, '17.2.1b', '21.1.2', 10,
        r'For the given triangle $ABC$, show that the altitudes of the triangles are concurrent.',
        r'Altitudes are the perpendicular line segments drawn from each vertex to the opposite side (or its extension).' + '\n' +
        r'1. From vertex $A$, construct a perpendicular to side $BC$, meeting $BC$ at point $D$ (altitude $AD$).' + '\n' +
        r'2. From vertex $B$, construct a perpendicular to side $AC$, meeting $AC$ at point $E$ (altitude $BE$).' + '\n' +
        r'3. From vertex $C$, construct a perpendicular to side $AB$, meeting $AB$ at point $F$ (altitude $CF$).' + '\n' +
        r'4. The three altitudes $AD$, $BE$ and $CF$ pass through a single point $H$ (orthocenter).' + '\n' +
        r'Therefore, the altitudes of triangle $ABC$ are concurrent. (Moved to current Grade X Practical Geometry).'
    ),
    (
        '9a', 10, 3, '11.1.1b', '11.1.1', 9,
        r'In the given figure, $ABC$ is a triangle and sum of all its sides are $30.56\text{ cm}$. Find the length of the side $AB$. (3 Marks)',
        r'Find angle $C$ using the angle sum property of a triangle:' + '\n' +
        r'$\angle C + \angle A + \angle B = 180^\circ \implies \angle C + 80^\circ + 50^\circ = 180^\circ \implies \angle C = 180^\circ - 130^\circ = 50^\circ$.' + '\n' +
        r'Since $\angle B = \angle C = 50^\circ$, triangle $ABC$ is isosceles with sides opposite to equal angles being equal: $AB = AC$.' + '\n' +
        r'Let $AB = AC = x$.' + '\n' +
        r'Given perimeter $= BC + AB + AC = 30.56\text{ cm}$ and $BC = 20\text{ cm}$:' + '\n' +
        r'$20 + x + x = 30.56 \implies 20 + 2x = 30.56 \implies 2x = 10.56 \implies x = 5.28\text{ cm}$.' + '\n' +
        r'Therefore, the length of side $AB$ is $5.28\text{ cm}$.'
    ),
    (
        '9b', 11, 3, '12.1.1b & 12.1.1d', '10.1.3', 9,
        r'i. If lengths of any two sides of a triangle are $5\text{ cm}$ and $7\text{ cm}$, then write any TWO possible lengths for the third side of the triangle. (1 Mark)' + '\n' +
        r'ii. In the given diagram find any possible length of $AD$. Justify your answer. (2 Marks)',
        r'i. By the triangle inequality theorem, the third side $x$ must satisfy $|7 - 5| < x < 7 + 5 \implies 2\text{ cm} < x < 12\text{ cm}$. Any two lengths in this open interval are acceptable, e.g., $3\text{ cm}, 4\text{ cm}, 6\text{ cm}, 8\text{ cm}, 10\text{ cm}$.' + '\n' +
        r'ii. From point $A$, $AD$ is perpendicular to line $BC$ and $AE = 9\text{ cm}$ is an oblique line segment drawn from $A$ to the line. Since the perpendicular distance from a point to a line is the shortest distance, $AD < AE \implies AD < 9\text{ cm}$. Any value strictly less than $9\text{ cm}$ (e.g., $5\text{ cm}, 7\text{ cm}, 8\text{ cm}$) is valid with this justification.'
    ),
    (
        '9c', 12, 3, '13.1.1b', '14.1.1', 9,
        r'In the given figure $ABC$ is a triangle and $DE$ is parallel to $BC$. Find the length of $DB$ if $AB = 6\text{ cm}$, $AC = 8\text{ cm}$ and $EC = 2\text{ cm}$. (3 Marks)',
        r'Since $DE \parallel BC$, by the Basic Proportionality Theorem (Thales\'s Theorem):' + '\n' +
        r'$\frac{DB}{AB} = \frac{EC}{AC}$.' + '\n' +
        r'Substitute the given values:' + '\n' +
        r'$\frac{DB}{6} = \frac{2}{8} = \frac{1}{4}$.' + '\n' +
        r'$DB = \frac{6}{4} = 1.5\text{ cm}$.' + '\n' +
        r'(Alternatively, $AE = AC - EC = 8 - 2 = 6\text{ cm}$. Then $\frac{AD}{DB} = \frac{AE}{EC} = \frac{6}{2} = 3 \implies AD = 3 DB$. Since $AD + DB = AB = 6\text{ cm} \implies 4 DB = 6 \implies DB = 1.5\text{ cm}$).'
    ),
]

CROPS = {
    'p1': {
        29: (6, (190, 330, 555, 445)),
        30: (6, (280, 465, 555, 580)),
        31: (6, (290, 605, 555, 790)),
        32: (7, (260, 100, 530, 280)),
        33: (7, (235, 330, 530, 445)),
        34: (7, (310, 460, 530, 690)),
        35: (8, (270, 105, 550, 255)),
    },
    'p2': {
        '6': (6, (60, 140, 240, 210)),
        '8': (8, (70, 130, 535, 480)),
        '9a': (9, (200, 180, 520, 320)),
        '9b': (10, (240, 230, 520, 360)),
        '9c': (11, (230, 170, 520, 310)),
    },
}

RESPONSE_CROPS = {
    '1':  {'better': (1, (60, 530, 540, 800)), 'weaker': (2, (60, 130, 540, 750))},
    '2':  {'better': (4, (60, 100, 540, 540)), 'weaker': (5, (60, 170, 540, 680))},
    '3':  {'better': (6, (60, 550, 540, 800)), 'weaker': (8, (60, 300, 540, 750))},
    '4a': {'better': (10, (60, 100, 540, 600)), 'weaker': (12, (60, 100, 540, 680))},
    '4b': {'better': (14, (60, 100, 540, 680)), 'weaker': (15, (60, 100, 540, 600))},
    '5a': {'better': (17, (60, 280, 540, 600)), 'weaker': (18, (60, 500, 540, 780))},
    '5b': {'better': (20, (60, 320, 540, 780)), 'weaker': (21, (60, 680, 540, 800))},
    '6':  {'better': (22, (60, 560, 540, 800)), 'weaker': (23, (60, 550, 540, 800))},
    '7':  {'better': (25, (60, 440, 540, 800)), 'weaker': (26, (60, 330, 540, 800))},
    '8':  {'better': (28, (60, 460, 540, 800)), 'weaker': (29, (60, 170, 540, 700))},
    '9a': {'better': (30, (60, 330, 540, 780)), 'weaker': (31, (60, 130, 540, 350))},
    '9b': {'better': (32, (60, 100, 540, 780)), 'weaker': (33, (60, 170, 540, 700))},
    '9c': {'better': (35, (60, 100, 540, 680)), 'weaker': (36, (60, 150, 540, 680))},
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
        folder = ROOT / f'public/paper-crops/MTH-IX-2019-{key.upper()}'
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
    em_folder = ROOT / 'public/paper-crops/MTH-IX-2019-EMARKING'
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
                'url': f'/paper-crops/MTH-IX-2019-EMARKING/q{q_num}_{kind}.png'
            })

    # 3. Read official key
    key_lines = [l.strip() for l in documents['key'][0].get_text().splitlines() if l.strip()]
    keys = []
    i = 0
    while i < len(key_lines):
        if key_lines[i].isdigit() and 1 <= int(key_lines[i]) <= 35:
            q_num = int(key_lines[i])
            ans = key_lines[i + 1]
            level = key_lines[i + 2]
            if ans in ['?', '*']:
                ans = '*'
            keys.append({'question': str(q_num), 'answer': ans, 'level': level})
            i += 3
        else:
            i += 1
    assert len(keys) == 35, f"Expected 35 keys, found {len(keys)}"
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
    assert len(MCQS) == 35, f"Expected 35 MCQs, found {len(MCQS)}"
    for idx, (stem, options, code, grade, reason, solved) in enumerate(MCQS, start=1):
        key = by_number[idx]
        page = next(p for p, start, end in [
            (2, 1, 5), (3, 6, 11), (4, 12, 16), (5, 17, 22),
            (6, 23, 26), (7, 27, 31), (8, 32, 34), (9, 35, 35)
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
            'paperCode': 'MTH-IX-2019-P1',
            'diagramUrl': crop,
            'isDiagram': bool(crop),
            'sourceSha256': sources['p1']['sha256'],
            **mapping(code, grade, reason)
        }
        mcqs.append(item)

    # 7. Build CRQs dataset
    theory = []
    for number, page, marks, old, code, grade, text, solution in CRQS:
        crop = f'/paper-crops/MTH-IX-2019-P2/q{number}.png' if number in CROPS['p2'] else None
        choice = (
            'Attempt either 4a or 4b.' if number.startswith('4') else
            'Attempt either 5a or 5b.' if number.startswith('5') else
            'Attempt any two of 9a, 9b and 9c.' if number.startswith('9') else
            'Compulsory.'
        )
        better_img = f'/paper-crops/MTH-IX-2019-EMARKING/q{number}_better.png'
        weaker_img = f'/paper-crops/MTH-IX-2019-EMARKING/q{number}_weaker.png'
        item = {
            'questionNumber': number,
            'questionText': text.replace('\\n', '\n'),
            'marks': marks,
            'section': 'CRQ',
            'originalSlo': old,
            'pageNumber': page,
            'modelAnswer': solution,
            'modelAnswerOrigin': 'Supplementary worked solution, checked against marking criteria',
            'cognitiveLevel': 'U' if number in ['1', '8'] else 'A',
            'choiceInstruction': choice,
            'choiceGroup': '4' if number.startswith('4') else '5' if number.startswith('5') else '9' if number.startswith('9') else None,
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
    write(OUT / 'ssc1_2019_past_mcqs.json', mcqs)
    write(OUT / 'ssc1_2019_past_crqs.json', theory)
    write(OUT / 'ssc1_2019_source_manifest.json', {
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
            'printedQuestions': 9,
            'digitalEntriesIncludingAlternatives': 13,
            'totalMarks': 40,
            'durationMinutes': 130,
            'choiceGroups': {
                '4': {'choose': 1, 'of': ['4a', '4b'], 'marks': 5},
                '5': {'choose': 1, 'of': ['5a', '5b'], 'marks': 5},
                '9': {'choose': 2, 'of': ['9a', '9b', '9c'], 'marks': 6}
            }
        }
    })

    # 9. Write Review Report
    report = [
        '# Mathematics IX Annual Examination 2019 - Import Review',
        '',
        '35 MCQs; 9 printed Paper II questions represented by 13 entries including alternatives.',
        'Paper I: 35 marks / 50 minutes. Paper II: 40 marks / 130 minutes (2 hours 10 minutes).',
        '',
        'The authoritative project syllabus is labelled 2025, revised July 2026, first examined in 2027.',
        'Original examination class and old SLO codes are preserved in metadata.',
        'Current mappings were determined from topic descriptions across IX and X syllabi.',
        '',
        '## Source Notes & Discrepancies',
        '',
        '- Paper I Q6, Q7: Complex numbers; moved to current Grade X Unit 17.',
        '- Paper I Q22, Q23: Ratio and proportion properties (invertendo, continued proportion); retained without direct current SLO.',
        '- Paper I Q24-Q28: Matrices; moved to current Grade X Unit 18.',
        '- Paper I Q32: Centroid dividing medians in 2:1 ratio; moved to current Grade X Unit 21.',
        '- Paper I Q35: Angle-side inequalities; historical topic without direct current SLO.',
        '- Paper II Q7: Matrices inverse and verification; moved to Grade X Unit 18.',
        '- Paper II Q8: Altitudes concurrency construction; moved to Grade X Unit 21.',
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
