"""Prepare the reviewed Mathematics IX Annual Examination 2024 papers.
Transcription, LaTeX formatting, diagram cropping, and new SLO mappings.
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/materials/ssc/mathematics/ssc-1'
DEST = ROOT / 'public/materials/ssc/mathematics/ssc-1'
OUT = ROOT / 'data/mathematics'
REVIEW = ROOT / 'output/mathematics-ix-2024'

FILES = {
    'p1': 'mathematics-ix-2024-paper-i.pdf',
    'p2': 'mathematics-ix-2024-paper-ii.pdf',
    'key': 'mathematics-ix-2024-keys.pdf',
    'em': 'mathematics-ix-2024-emarking.pdf',
}

# 45 MCQs: stem, A-D options, current SLO code, current grade (9 or 10 or None), semantic rationale, verified answer.
MCQS = [
    # 1
    (
        r'If $A$ and $B$ are two non-empty sets, then $A\cap B$ will contain',
        [
            r'the common elements of set $A$ and set $B$.',
            r'all of the elements in set $A$ and set $B$.',
            r'the elements in set $A$ but not in set $B$.',
            r'the elements in set $B$ but not in set $A$.'
        ],
        '3.2.2', 9,
        'Intersection of two sets is defined as the set containing all elements common to both sets.',
        'A'
    ),
    # 2
    (
        r'It is given that $M = \{0, 1, 2, 3\}$ and $N = \{1, 3, 4, 5\}$. The set $M - N$ is equal to',
        [r'$\{0\}$', r'$\{0, 2\}$', r'$\{4, 5\}$', r'$\{1, 3\}$'],
        '3.2.2', 9,
        'Difference $M - N$ contains elements of $M$ that are not in $N$: $\{0, 2\}$.',
        'B'
    ),
    # 3
    (
        r'If $M$, $N$ and $P$ are three non-empty sets, then the associative property of intersection will be',
        [
            r'$(M \cap N) \cap (M \cap P) = (M \cap P) \cap (M \cap N)$',
            r'$M \cap (N \cap P) = (M \cap N) \cap P$',
            r'$M \cap (N \cap P) = (N \cap P) \cap M$',
            r'$M \cap N \cap P = P \cap N \cap M$'
        ],
        '3.3.1', 9,
        'Associative property of intersection states that regrouping sets does not alter intersection: $M \cap (N \cap P) = (M \cap N) \cap P$.',
        'B'
    ),
    # 4
    (
        r'Given is a Venn diagram. The shaded region in the Venn diagram represents' + '\n' +
        r'I. $A \cap B$' + '\n' +
        r'II. $A \cup (A \cap B)$' + '\n' +
        r'III. $A \cap (A \cup B)$',
        [r'I only.', r'II only.', r'I and III.', r'II and III.'],
        '3.4.2', 9,
        'Circle $A$ is entirely shaded (including its intersection with $B$). $A \cup (A \cap B) = A$ and $A \cap (A \cup B) = A$, so both II and III represent set $A$.',
        'D'
    ),
    # 5
    (
        r'If $(2, k) = (c, 3)$, then the values of $k$ and $c$ respectively are',
        [r'$2$ and $3$', r'$3$ and $2$', r'$-2$ and $3$', r'$-3$ and $2$'],
        '3.6.1', 9,
        'By equality of ordered pairs: $c = 2$ and $k = 3$. The question requests $k$ and $c$ respectively, giving $3$ and $2$.',
        'B'
    ),
    # 6
    (
        r'If $M = \{a, b, c, d\}$ and $N = \{x, y\}$, then $f = \{(a, x), (b, y), (c, x), (d, y)\}$ is a/ an',
        [r'into function.', r'onto function.', r'one-one function.', r'bijective function.'],
        '4.1.2', 9,
        'The range of $f$ is $\{x, y\} = N$ (equal to the codomain), making it an onto (surjective) function. It is not one-one because $a$ and $c$ both map to $x$.',
        'B'
    ),
    # 7
    (
        r'Which of the following is a rational number?',
        [r'$\sqrt{2}$', r'$\pi$', r'$3.2137814115\ldots$', r'$3.33333\ldots$'],
        '1.2.1', 9,
        'A recurring decimal represents a rational number: $3.33333\ldots = 10/3$. Non-recurring non-terminating decimals, $\sqrt{2}$, and $\pi$ are irrational.',
        'D'
    ),
    # 8
    (
        r'The multiplicative inverse of $2$ is',
        [r'$-2$', r'$-\frac{1}{2}$', r'$\frac{1}{2}$', r'$2$'],
        '1.3.1', 9,
        'The multiplicative inverse of a non-zero real number $a$ is $1/a$, so for $2$ it is $1/2$.',
        'C'
    ),
    # 9
    (
        r'If $2i + 3 = b + ai - 3i$, then the value of $a$ will be',
        [r'$-2$', r'$-1$', r'$1$', r'$5$'],
        '17.1.5', 10,
        'Equating imaginary parts: $2 = a - 3 \implies a = 5$. Complex numbers have moved to current Grade X.',
        'D'
    ),
    # 10
    (
        r'The complex number $2i^2 + 3 - 5i$ is equal to',
        [r'$1 - 5i$', r'$5 - 5i$', r'$3 - 3i$', r'$2 - 2i$'],
        '17.2.1', 10,
        'Since $i^2 = -1$, $2(-1) + 3 - 5i = -2 + 3 - 5i = 1 - 5i$. Current Grade X.',
        'A'
    ),
    # 11
    (
        r'If $a \times 10^{-2} = 0.050$, then $a$ is equal to',
        [r'$-2$', r'$0.05$', r'$1$', r'$5$'],
        '2.1.1', 9,
        'Multiply both sides by $10^2$: $a = 0.050 \times 100 = 5$.',
        'D'
    ),
    # 12
    (
        r'The value of $\log_3 9$ is equal to',
        [r'$2$', r'$3$', r'$6$', r'$9$'],
        '2.4.1', 9,
        '$\log_3 9 = \log_3(3^2) = 2\log_3 3 = 2$.',
        'A'
    ),
    # 13
    (
        r'The logarithmic form of $a^{-3} = x$ is',
        [r'$\log_{-3} a = x$', r'$\log_x a = -3$', r'$\log_a x = -3$', r'$-\log_3 a = x$'],
        '2.2.1', 9,
        'By definition of logarithm: $b^y = x \iff \log_b x = y$. Here $a^{-3} = x \iff \log_a x = -3$.',
        'C'
    ),
    # 14
    (
        r'The $\log\sqrt{\frac{x+y}{2}}$ can be expressed in expanded form as',
        [
            r'$\frac{1}{2}\log(x+y) - \log 2$',
            r'$\frac{1}{2}\log(x+y) - \frac{1}{2}\log 2$',
            r'$\frac{1}{2}\log x + \log y - \log 2$',
            r'$\frac{1}{2}\log x + \frac{1}{2}\log y - \frac{1}{2}\log 2$'
        ],
        '2.4.1', 9,
        '$\log\left(\frac{x+y}{2}\right)^{1/2} = \frac{1}{2}[\log(x+y) - \log 2] = \frac{1}{2}\log(x+y) - \frac{1}{2}\log 2$.',
        'B'
    ),
    # 15
    (
        r'If $\log_a m = \frac{\log_b m}{\log_b a}$, then $\frac{\log_k 3}{\log_k 5}$ is equal to',
        [r'$\log_3 5$', r'$\log_5 3$', r'$\log_k 3 + \log_k 5$', r'$\log_k 3 - \log_k 5$'],
        '2.4.1', 9,
        'Applying the change of base rule in reverse gives $\frac{\log_k 3}{\log_k 5} = \log_5 3$.',
        'B'
    ),
    # 16
    (
        r'The expression $\frac{x^2 - 1}{x - 1}$, for $x \neq 1$, is' + '\n' +
        r'I. algebraic' + '\n' +
        r'II. rational' + '\n' +
        r'III. polynomial',
        [r'I only.', r'II only.', r'I and II.', r'II and III.'],
        '6.2.1', 9,
        r'The expression $\frac{x^2 - 1}{x - 1}$ for $x \neq 1$ is an algebraic expression (I) and a rational expression (II). Option C was originally printed as "I and III." due to a typographical error in the examination paper, causing the board to issue an asterisk (*); corrected to Option C ("I and II."), authorized by the project owner.',
        'C'
    ),
    # 17
    (
        r'If $a = 1$ and $b = -1$, then the value of $\frac{a^2 - b^2}{a^2 + b^2}$ is equal to',
        [r'$-1$', r'$0$', r'$1$', r'$2$'],
        '5.1.1', 9,
        '$a^2 = 1^2 = 1$ and $b^2 = (-1)^2 = 1$. The numerator is $1 - 1 = 0$, so the expression equals $0$.',
        'B'
    ),
    # 18
    (
        r'The simplest form of the expression $\frac{m^2 - 4mn}{4m}$ will be',
        [r'$\frac{m^2 - 4n}{4}$', r'$\frac{m - 4n}{4}$', r'$m^2 - n$', r'$m - n$'],
        '6.1.1', 9,
        'Factor out $m$ from the numerator: $\frac{m(m - 4n)}{4m} = \frac{m - 4n}{4}$.',
        'B'
    ),
    # 19
    (
        r'If $(a+b)^2 = 16$ and $4ab = 12$, then $(a-b)^2$ is equal to',
        [r'$2$', r'$4$', r'$\pm 2$', r'$\pm 4$'],
        '5.1.1', 9,
        'Using the algebraic identity $(a-b)^2 = (a+b)^2 - 4ab = 16 - 12 = 4$.',
        'B'
    ),
    # 20
    (
        r'The expression $t^3 + 8 + p$ is a perfect cube, if $p$ is equal to',
        [r'$6t(t-2)$', r'$3t(t-2)$', r'$3t(t+2)$', r'$6t(t+2)$'],
        '5.1.1', 9,
        '$(t+2)^3 = t^3 + 3t^2(2) + 3t(2^2) + 2^3 = t^3 + 8 + 6t^2 + 12t = t^3 + 8 + 6t(t+2)$, so $p = 6t(t+2)$.',
        'D'
    ),
    # 21
    (
        r'The expression $3\sqrt{3} - 6\sqrt{3}$ will be equal to',
        [r'$3\sqrt{3}$', r'$-3\sqrt{3}$', r'$9\sqrt{3}$', r'$-9\sqrt{3}$'],
        '1.5.1', 9,
        'Combine like radical terms: $(3 - 6)\sqrt{3} = -3\sqrt{3}$.',
        'B'
    ),
    # 22
    (
        r'The factors of an expression $a(b-c) - b(c-b)$ are',
        [r'$b-c$ and $a-b$', r'$b-c$ and $a+b$', r'$b+c$ and $a-b$', r'$b+c$ and $a+b$'],
        '5.2.1', 9,
        'Notice $-(c-b) = (b-c)$, so $a(b-c) + b(b-c) = (b-c)(a+b)$.',
        'B'
    ),
    # 23
    (
        r'The expression $xy - 5y + 4x - 20$ is equal to',
        [r'$(x-5)(y-4)$', r'$(x-5)(y+4)$', r'$(x+5)(y-4)$', r'$(x+5)(y+4)$'],
        '5.2.1', 9,
        'Factor by grouping: $y(x-5) + 4(x-5) = (x-5)(y+4)$.',
        'B'
    ),
    # 24
    (
        r'One of the factors of $2 - 16x^3$ is',
        [r'$1 - 4x$', r'$1 - 2x$', r'$2 + 2x$', r'$2 + 4x$'],
        '5.2.1', 9,
        'Take common factor $2$: $2(1 - 8x^3) = 2[1^3 - (2x)^3] = 2(1 - 2x)(1 + 2x + 4x^2)$. Thus $(1 - 2x)$ is a factor.',
        'B'
    ),
    # 25
    (
        r'The factorised form of the polynomial $1 - 3x - 10x^2$ will be',
        [r'$(1-5x)(1+2x)$', r'$(1+5x)(1-2x)$', r'$(1-5x)(1-2x)$', r'$(1+5x)(1+2x)$'],
        '5.2.1', 9,
        'Split the middle term: $1 - 5x + 2x - 10x^2 = (1 - 5x) + 2x(1 - 5x) = (1 - 5x)(1 + 2x)$.',
        'A'
    ),
    # 26
    (
        r'If $(x-b)$ is a factor of a polynomial $P(x)$, then $P(b)$ is equal to',
        [r'$-b$', r'$b$', r'$0$', r'$1$'],
        '5.4.1', 9,
        'By the Factor Theorem, $(x-b)$ divides $P(x)$ without remainder if and only if $P(b) = 0$.',
        'C'
    ),
    # 27
    (
        r'If $2x^3 - 1$ is divided by $x+1$, then the remainder will be',
        [r'$1$', r'$0$', r'$-1$', r'$-3$'],
        '5.3.2', 9,
        'By the Remainder Theorem, substitute $x = -1$: $P(-1) = 2(-1)^3 - 1 = 2(-1) - 1 = -3$.',
        'D'
    ),
    # 28
    (
        r'One of the factors of the polynomial $P(x) = (x-1)^2 - 4$ is',
        [r'$x+2$', r'$x-2$', r'$x-1$', r'$x+1$'],
        '5.2.1', 9,
        'Using $a^2 - b^2$: $(x-1)^2 - 2^2 = (x - 1 - 2)(x - 1 + 2) = (x - 3)(x + 1)$.',
        'D'
    ),
    # 29
    (
        r'In a local cafe, the ratio of an apple juice to orange juice in their signature blend is $2:3$. The cafe currently has a total of $120$ cups of juice, then the quantity of orange is',
        [r'$80$ cups.', r'$72$ cups.', r'$48$ cups.', r'$40$ cups.'],
        None, 9,
        'Total ratio parts = $2 + 3 = 5$. Quantity of orange juice = $\frac{3}{5} \times 120 = 72$ cups. Historical curriculum topic.',
        'B'
    ),
    # 30
    (
        r'If $a : b :: c : d$, then according to alternendo theorem',
        [r'$a : b :: d : c$', r'$a : c :: b : d$', r'$a + b : b :: c + d : c$', r'$a : a - b :: c : c - d$'],
        None, 9,
        'Alternendo theorem exchanges the middle terms (means): $a : c :: b : d$. Historical curriculum topic.',
        'B'
    ),
    # 31
    (
        r'The constant of proportionality will be',
        [r'$-2$', r'$-1$', r'$1$', r'$2$'],
        '4.4.1', 9,
        'The linear variation graph passes through $(0,0)$, $(1,2)$, and $(2,4)$. The constant of proportionality is $k = y/x = 2/1 = 2$.',
        'D'
    ),
    # 32
    (
        r'The equation form of the given relation will be',
        [r'$y = \frac{x}{2}$', r'$y = x$', r'$y = 2x$', r'$y = x^2$'],
        '4.4.1', 9,
        'With constant of proportionality $k = 2$, the direct variation equation is $y = 2x$.',
        'C'
    ),
    # 33
    (
        r'If the matrix $P = \begin{bmatrix}p & q \\ q & p\end{bmatrix}$ is a symmetric matrix, then $P^t$ will be equal to',
        [
            r'$\begin{bmatrix}p & q \\ p & q\end{bmatrix}$',
            r'$\begin{bmatrix}q & p \\ q & p\end{bmatrix}$',
            r'$\begin{bmatrix}q & p \\ p & q\end{bmatrix}$',
            r'$\begin{bmatrix}p & q \\ q & p\end{bmatrix}$'
        ],
        '18.2.1', 10,
        'For any symmetric matrix, the transpose equals the matrix itself: $P^t = P = \begin{bmatrix}p & q \\ q & p\end{bmatrix}$. Current Grade X.',
        'D'
    ),
    # 34
    (
        r'The additive identity of a matrix $\begin{bmatrix}a & b \\ c & d\end{bmatrix}$ will be',
        [
            r'$\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$',
            r'$\begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$',
            r'$\begin{bmatrix}-c & -a \\ -d & -b\end{bmatrix}$',
            r'$\begin{bmatrix}-a & -b \\ -c & -d\end{bmatrix}$'
        ],
        '18.3.1', 10,
        'The additive identity of any $2\times 2$ matrix is the zero matrix $\begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$. Current Grade X.',
        'B'
    ),
    # 35
    (
        r'If $X = \begin{bmatrix}1 & 0 \\ 1 & 1\end{bmatrix}$, $Y = \begin{bmatrix}1 \\ 2\end{bmatrix}$ and $Z = \begin{bmatrix}1 & 2\end{bmatrix}$ are matrices, then which of the following is/ are possible for matrix multiplication?' + '\n' +
        r'I. $XY$' + '\n' +
        r'II. $XZ$' + '\n' +
        r'III. $ZY$',
        [r'I only', r'II only', r'I and III', r'II and III'],
        '18.4.2', 10,
        'Orders: $X$ is $2\times 2$, $Y$ is $2\times 1$, $Z$ is $1\times 2$. $XY$ is $(2\times 2)(2\times 1) \rightarrow 2\times 1$ (valid). $XZ$ is $(2\times 2)(1\times 2)$ (columns $\neq$ rows, invalid). $ZY$ is $(1\times 2)(2\times 1) \rightarrow 1\times 1$ (valid). Thus I and III are possible. Current Grade X.',
        'C'
    ),
    # 36
    (
        r'If $A = \begin{bmatrix}a & 18 \\ 2 & a\end{bmatrix}$ is a singular matrix, then the possible value(s) of $a$ will be',
        [r'$\pm 18$', r'$\pm 6$', r'$0$', r'$9$'],
        '18.5.4', 10,
        'A singular matrix has determinant zero: $\det(A) = a^2 - (18)(2) = a^2 - 36 = 0 \implies a = \pm 6$. Current Grade X.',
        'B'
    ),
    # 37
    (
        r'If the equation of a matrix is $X - \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}\begin{bmatrix}1 \\ 1\end{bmatrix} = \begin{bmatrix}0 \\ 0\end{bmatrix}$, then the matrix $X$ will be',
        [
            r'$\begin{bmatrix}-1 & 0 \\ 0 & -1\end{bmatrix}$',
            r'$\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$',
            r'$\begin{bmatrix}-1 \\ -1\end{bmatrix}$',
            r'$\begin{bmatrix}1 \\ 1\end{bmatrix}$'
        ],
        '18.6.1', 10,
        '$I \begin{bmatrix}1 \\ 1\end{bmatrix} = \begin{bmatrix}1 \\ 1\end{bmatrix}$. Therefore $X - \begin{bmatrix}1 \\ 1\end{bmatrix} = \begin{bmatrix}0 \\ 0\end{bmatrix} \implies X = \begin{bmatrix}1 \\ 1\end{bmatrix}$. Current Grade X.',
        'D'
    ),
    # 38
    (
        r'If $|A| = 5$ and $A = \begin{bmatrix}1 & 5 \\ 3 & x\end{bmatrix}$, then the value of $x$ in matrix $A$ will be',
        [r'$-20$', r'$-10$', r'$10$', r'$20$'],
        '18.5.3', 10,
        '$|A| = (1)(x) - (5)(3) = x - 15 = 5 \implies x = 20$. Current Grade X.',
        'D'
    ),
    # 39
    (
        r'If the sum of all the three sides of a triangle $ABC$ is $14\text{ cm}$ and $m\overline{AB} = 4\text{ cm}$, then $m\overline{AC}$ is equal to',
        [r'$5\text{ cm.}$', r'$6\text{ cm.}$', r'$10\text{ cm.}$', r'$18\text{ cm.}$'],
        None, 9,
        'Base angles at $A$ and $B$ are both equal ($a^\circ$), so $\Delta ABC$ is isosceles with $AC = BC$. Perimeter $= AB + 2AC = 4 + 2AC = 14 \implies 2AC = 10 \implies AC = 5\text{ cm}$.',
        'A'
    ),
    # 40
    (
        r'If $\Delta ABC \cong \Delta DFE$, then the value of $a$ is equal to',
        [r'$20^\circ$', r'$25^\circ$', r'$35^\circ$', r'$50^\circ$'],
        None, 9,
        'In $\Delta ABC$, $\angle B = 180^\circ - (50^\circ + 45^\circ) = 85^\circ$. By congruence $\Delta ABC \cong \Delta DFE$, corresponding $\angle F = \angle B = 85^\circ$. The diagram gives $\angle F = (35 + 2a)^\circ \implies 35 + 2a = 85 \implies 2a = 50 \implies a = 25^\circ$.',
        'B'
    ),
    # 41
    (
        r'In the given diagram, $OP$ is the angle bisector of $\angle MON$. Based on the given information, the value of $x$ will be',
        [r'$2$', r'$3$', r'$4$', r'$6$'],
        '10.1.3', 9,
        'Any point on the angle bisector is equidistant from its arms: $x + 5 = 2x + 1 \implies x = 4$.',
        'C'
    ),
    # 42
    (
        r'The given diagram shows the various paths connecting towns.' + '\n' +
        r'• The paths connecting Town 1, Town 3 and Town 6 form a triangle.' + '\n' +
        r'• Town 2 is halfway between Town 1 and Town 3.' + '\n' +
        r'• Town 4 lies half way between Town 3 and Town 6.' + '\n' +
        r'If direct paths from Town 2 to Town 6 lies through Town 5, then the distance between Town 2 to Town 5 would be',
        [
            r'half of the distance from Town 3 to Town 4.',
            r'half of the distance from Town 2 to Town 6.',
            r'one third of the distance from Town 2 to Town 6.',
            r'one third of the distance from Town 4 to Town 6.'
        ],
        '13.1.1', 9,
        'By properties of medians and similarity in triangles, the segment division along median intersection gives one third of the distance from Town 2 to Town 6.',
        'C'
    ),
    # 43
    (
        r'Consider the given diagram. If $QM = QL$ and $NM = NL$, then' + '\n' +
        r'I. $QR = NR$' + '\n' +
        r'II. $MR = LR$' + '\n' +
        r'III. $\angle MRQ = 90^\circ$',
        [r'I only.', r'III only.', r'I and II.', r'II and III.'],
        '10.1.3', 9,
        'Points $Q$ and $N$ are equidistant from the endpoints $M$ and $L$. Therefore line $QN$ is the perpendicular bisector of segment $ML$, which implies $MR = LR$ and $\angle MRQ = 90^\circ$. Thus II and III are true.',
        'D'
    ),
    # 44
    (
        r'Which of the following is TRUE for the given triangle $EFG$?',
        [r'$\angle F > \angle G$', r'$\angle G > \angle E$', r'$\angle E > \angle F$', r'$\angle G = \angle E + \angle F$'],
        None, 9,
        'Side opposite to $\angle G$ is $EF = 6\text{ cm}$; side opposite to $\angle E$ is $GF = 2\text{ cm}$. Since $6\text{ cm} > 2\text{ cm}$, the angle opposite the greater side is larger: $\angle G > \angle E$.',
        'B'
    ),
    # 45
    (
        r'In the given triangle $NGH$, if $NM$ bisects $\angle GNH$, then $x$ will be equal to',
        [r'$3\text{ units.}$', r'$7\text{ units.}$', r'$10\text{ units.}$', r'$11\text{ units.}$'],
        None, 9,
        'By the Angle Bisector Theorem: $\frac{NG}{NH} = \frac{GM}{MH} \implies \frac{x}{7} = \frac{3}{7} \implies x = 3\text{ units}$.',
        'A'
    ),
]

# 12 Theory / CRQ entries: number, page, marks, old SLO, current SLO, current grade, text, solution.
THEORY = [
    (
        '1', 3, 3, '1.6.3', '4.1.2', 9,
        r'For the given sets $A$ and $B$, complete the given diagram.' + '\n' +
        r'i. An onto (surjective) function from $A$ to $B$ (1 Mark)' + '\n' +
        r'ii. An into function from $B$ to $A$ (1 Mark)' + '\n' +
        r'iii. Can we write an onto function from $B$ to $A$? Justify with a reason. (1 Mark)',
        r'i. Map all elements of $A = \{a, b, c, d\}$ to $B = \{1, 2, 3\}$ such that every element in $B$ has at least one pre-image (e.g., $a \to 1, b \to 2, c \to 3, d \to 3$).' + '\n' +
        r'ii. Map elements of $B = \{1, 2, 3\}$ to $A = \{a, b, c, d\}$ such that the range is a proper subset of $A$ (e.g., $1 \to a, 2 \to b, 3 \to c$, leaving $d$ unmapped).' + '\n' +
        r'iii. No, an onto function from $B$ to $A$ cannot be constructed because $n(B) = 3$ is strictly less than $n(A) = 4$. For an onto function, the domain must have at least as many elements as the codomain.'
    ),
    (
        '2', 3, 3, '3.2.2 & 3.4.1', '2.4.1', 9,
        r'Evaluate the value of $x$, if $\log_2(x-1) + \log_2\left(\frac{1}{8}\right) = 0$.',
        r'Using the quotient/product law: $\log_2\left[\frac{x-1}{8}\right] = 0$.' + '\n' +
        r'Converting to exponential form: $\frac{x-1}{8} = 2^0 = 1 \implies x - 1 = 8 \implies x = 9$.' + '\n' +
        r'Alternatively, $\log_2(x-1) - 3\log_2 2 = 0 \implies \log_2(x-1) - 3 = 0 \implies \log_2(x-1) = 3 \implies x - 1 = 2^3 = 8 \implies x = 9$.'
    ),
    (
        '3a', 4, 4, '4.2.9', '5.1.1', 9,
        r'Find the continued product of the expression $(1 - 2a)(1 - 2a + 4a^2)(1 + 2a)(1 + 2a + 4a^2)$.',
        r'Rearrange terms to pair factors according to the sum and difference of cubes formulae:' + '\n' +
        r'$[(1 - 2a)(1 + 2a + 4a^2)] \times [(1 + 2a)(1 - 2a + 4a^2)]$' + '\n' +
        r'$= [1^3 - (2a)^3] \times [1^3 + (2a)^3]$' + '\n' +
        r'$= (1 - 8a^3)(1 + 8a^3)$' + '\n' +
        r'Applying $(x - y)(x + y) = x^2 - y^2$:' + '\n' +
        r'$= 1^2 - (8a^3)^2 = 1 - 64a^6$.'
    ),
    (
        '3b', 4, 4, '4.4.2', '1.5.1', 9,
        r'If $x = 2 - \sqrt{3}$, then find the value of $x + \frac{1}{x}$ in the simplest form.',
        r'Find the reciprocal of $x$ and rationalise the denominator:' + '\n' +
        r'$\frac{1}{x} = \frac{1}{2 - \sqrt{3}} \times \frac{2 + \sqrt{3}}{2 + \sqrt{3}} = \frac{2 + \sqrt{3}}{2^2 - (\sqrt{3})^2} = \frac{2 + \sqrt{3}}{4 - 3} = 2 + \sqrt{3}$.' + '\n' +
        r'Then add $x$ and $1/x$:' + '\n' +
        r'$x + \frac{1}{x} = (2 - \sqrt{3}) + (2 + \sqrt{3}) = 4$.'
    ),
    (
        '4a', 5, 4, '5.2.1a', '5.2.1', 9,
        r'Factorise $(x^4 + 4)$ completely.',
        r'Express as completed square by adding and subtracting $4x^2$:' + '\n' +
        r'$x^4 + 4 = (x^2)^2 + (2)^2 + 2(x^2)(2) - 4x^2$' + '\n' +
        r'$= (x^2 + 2)^2 - (2x)^2$' + '\n' +
        r'Apply $a^2 - b^2 = (a + b)(a - b)$:' + '\n' +
        r'$= (x^2 + 2 + 2x)(x^2 + 2 - 2x) = (x^2 + 2x + 2)(x^2 - 2x + 2)$.'
    ),
    (
        '4b', 5, 4, '5.3.1', '5.3.2', 9,
        r'Find the possible values of $p$, if $(px - p)$ is divided by $\left(x - \frac{4}{p}\right)$ and the remainder is $p^2 - p$.',
        r'By the Remainder Theorem, substitute $x = \frac{4}{p}$ into $P(x) = px - p$:' + '\n' +
        r'Remainder $= p\left(\frac{4}{p}\right) - p = 4 - p$.' + '\n' +
        r'Equate to given remainder: $4 - p = p^2 - p \implies 4 = p^2 \implies p^2 = 4 \implies p = \pm 2$.'
    ),
    (
        '5', 6, 3, '6.4.1', None, 9,
        r'If $a : b :: c : d$, then show that $\frac{5a - 3b}{5a + 3b} = \frac{5c - 3d}{5c + 3d}$ by using K-method.',
        r'Let $\frac{a}{b} = \frac{c}{d} = k \implies a = bk$ and $c = dk$.' + '\n' +
        r'LHS $= \frac{5(bk) - 3b}{5(bk) + 3b} = \frac{b(5k - 3)}{b(5k + 3)} = \frac{5k - 3}{5k + 3}$.' + '\n' +
        r'RHS $= \frac{5(dk) - 3d}{5(dk) + 3d} = \frac{d(5k - 3)}{d(5k + 3)} = \frac{5k - 3}{5k + 3}$.' + '\n' +
        r'Since $\text{LHS} = \text{RHS} = \frac{5k-3}{5k+3}$, the equality is proved. (Historical curriculum topic; no direct outcome in current IX-X syllabus).'
    ),
    (
        '6', 6, 4, '7.5.10', '18.5.8', 10,
        r'If $A = \begin{bmatrix}1 & 2 \\ 0 & 1\end{bmatrix}$ and $B = \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$, then verify that $(AB)^{-1} = B^{-1} \times A^{-1}$.',
        r'$AB = \begin{bmatrix}1 & 2 \\ 0 & 1\end{bmatrix}\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix} = \begin{bmatrix}1 & 2 \\ 0 & 1\end{bmatrix}$.' + '\n' +
        r'$\det(AB) = 1(1) - 2(0) = 1$. $\text{adj}(AB) = \begin{bmatrix}1 & -2 \\ 0 & 1\end{bmatrix}$, so $(AB)^{-1} = \begin{bmatrix}1 & -2 \\ 0 & 1\end{bmatrix}$.' + '\n' +
        r'Since $B = I$, $B^{-1} = I = \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$.' + '\n' +
        r'$\det(A) = 1$, $A^{-1} = \begin{bmatrix}1 & -2 \\ 0 & 1\end{bmatrix}$.' + '\n' +
        r'$B^{-1} \times A^{-1} = I \times A^{-1} = \begin{bmatrix}1 & -2 \\ 0 & 1\end{bmatrix}$.' + '\n' +
        r'Therefore $(AB)^{-1} = B^{-1} \times A^{-1}$. (Matrices have moved to current Grade X).'
    ),
    (
        '7', 7, 3, '8.1.3b', '21.1.2', 10,
        r'Using compass, draw the altitudes for the given triangle and identify the point of concurrency.',
        r'From each vertex of the triangle $A$, $B$, $C$, draw arcs intersecting the opposite side at two points, and construct the perpendicular line (altitude) to that side.' + '\n' +
        r'Show that all three altitudes intersect at a single common point.' + '\n' +
        r'Identify and label this point of concurrency as the Orthocentre. (Practical geometry constructions of concurrent lines moved to current Grade X).'
    ),
    (
        '8a', 8, 3, '10.1.1 a, c', '13.1.1', 9,
        r'In the given diagram, $ABCD$ is a parallelogram and the side $BC$ of the parallelogram is passing through the midpoints $AE$ and $ED$ of the triangle $AED$.' + '\n' +
        r'Find the length of' + '\n' +
        r'i. $AD$ (1 Mark)' + '\n' +
        r'ii. $BE$ (1 Mark)' + '\n' +
        r'iii. $CF$ (1 Mark)',
        r'In $\Delta AED$, $B$ is the midpoint of $AE$ and $F$ is the midpoint of $ED$.' + '\n' +
        r'By the Midpoint Theorem, $BF = \frac{1}{2}AD$. The diagram gives $BF = 5\text{ cm} + 5\text{ cm} = 10\text{ cm}$, or $BC = BF + FC = 5 + 5 = 10\text{ cm}$.' + '\n' +
        r'In parallelogram $ABCD$, opposite sides are equal: $AD = BC = 10\text{ cm}$.' + '\n' +
        r'ii. Since $B$ is the midpoint of $AE$ and $AB = 5\text{ cm}$ (opposite side $CD = 5\text{ cm}$), $BE = AB = 5\text{ cm}$.' + '\n' +
        r'iii. Side $BC$ passes through midpoints, giving $CF = 5\text{ cm}$ (or $FD = 6\text{ cm} \implies EF = 6\text{ cm}$).'
    ),
    (
        '8b', 9, 3, '11.1.1b, 11.1.1d, 12.1.1d', '10.1.3', 9,
        r'Sarah was playing with a thread connecting to pins on a soft board. The positions of the pins were labelled as $U$, $V$, $W$ and $X$.' + '\n' +
        r'She measured the threads connecting the pins as $VW = 7\text{ cm}$, $UX = 4\text{ cm}$ and $WY = 3\text{ cm}$.' + '\n' +
        r'She observed that the angles $UVX$ and $WVX$ were equal in measurement and the thread $XV$ bisected the thread connected to $UW$ at right angle.' + '\n' +
        r'Based on the given information,' + '\n' +
        r'i. find the length of the threads connecting $U$ and $V$. (1 Mark)' + '\n' +
        r'ii. find the length of the threads connecting $W$ and $X$. (1 Mark)' + '\n' +
        r'iii. what would be the minimum length of thread required to connect $U$ and $W$? (1 Mark)',
        r'i. Since $XV$ is the angle bisector and right bisector of $UW$, $\Delta UVX \cong \Delta WVX$. Therefore $UV = VW = 7\text{ cm}$.' + '\n' +
        r'ii. Any point on the right bisector is equidistant from the endpoints: $WX = UX = 4\text{ cm}$.' + '\n' +
        r'iii. The line segment $UW$ is perpendicular to $XV$ at $Y$, and $Y$ is the midpoint of $UW$. Since $WY = 3\text{ cm}$, the full straight thread length $UW = 2 \times WY = 2 \times 3 = 6\text{ cm}$. (Shortest distance between two points is the straight line segment).'
    ),
    (
        '8c', 10, 3, '13.1.1d', '12.1.3', 9,
        r'In the given diagram, $AE = 9\text{ cm}$, $EC = 6\text{ cm}$, $DE = 12\text{ cm}$ and $BC = 20\text{ cm}$.' + '\n' +
        r'Prove that the triangles $ADE$ and $ABC$ are similar.',
        r'Calculate the total length of side $AC = AE + EC = 9 + 6 = 15\text{ cm}$.' + '\n' +
        r'Compute the ratio of corresponding sides:' + '\n' +
        r'$\frac{AE}{AC} = \frac{9}{15} = \frac{3}{5}$.' + '\n' +
        r'$\frac{DE}{BC} = \frac{12}{20} = \frac{3}{5}$.' + '\n' +
        r'Both triangles share the common angle $\angle A$ (or $\angle DAE = \angle BAC$).' + '\n' +
        r'Since the ratios of corresponding sides are equal ($\frac{AE}{AC} = \frac{DE}{BC} = \frac{3}{5}$) and the included angle is congruent, $\Delta ADE \sim \Delta ABC$ by SAS similarity (or SSS similarity of corresponding sides).'
    ),
]

CROPS = {
    'p1': {
        4: (3, (95, 410, 270, 505)),
        31: (9, (90, 140, 515, 470)),
        39: (11, (95, 570, 535, 700)),
        40: (12, (70, 130, 520, 245)),
        41: (12, (70, 350, 520, 460)),
        42: (13, (90, 160, 535, 305)),
        43: (13, (90, 455, 535, 575)),
        44: (14, (65, 120, 520, 265)),
        45: (14, (70, 390, 520, 510)),
    },
    'p2': {
        '1': (3, (200, 175, 360, 445)),
        '7': (7, (60, 155, 565, 675)),
        '8a': (8, (70, 200, 520, 320)),
        '8b': (9, (115, 230, 545, 355)),
        '8c': (10, (75, 155, 515, 275)),
    },
}

RESPONSE_CROPS = {
    '1':  {'better': (3, (120, 50, 560, 360)), 'weaker': (3, (120, 420, 575, 730))},
    '2':  {'better': (5, (120, 360, 560, 525)), 'weaker': (5, (120, 640, 520, 770))},
    '3a': {'better': (7, (120, 25, 560, 175)), 'weaker': (7, (120, 230, 545, 360))},
    '3b': {'better': (8, (120, 270, 560, 520)), 'weaker': (9, (120, 25, 555, 280))},
    '4a': {'better': (10, (120, 260, 560, 455)), 'weaker': (10, (120, 530, 545, 715))},
    '4b': {'better': (12, (120, 25, 560, 265)), 'weaker': (12, (120, 355, 555, 615))},
    '5':  {'better': (13, (120, 450, 560, 705)), 'weaker': (14, (120, 25, 555, 205))},
    '6':  {'better': (15, (110, 110, 550, 365)), 'weaker': (15, (110, 405, 550, 660))},
    '7':  {'better': (17, (120, 125, 555, 495)), 'weaker': (17, (120, 550, 555, 770))},
    '8a': {'better': (19, (120, 320, 560, 550)), 'weaker': (20, (120, 25, 555, 255))},
    '8b': {'better': (22, (120, 25, 550, 235)), 'weaker': (22, (120, 295, 555, 520))},
    '8c': {'better': (23, (110, 490, 535, 665)), 'weaker': (24, (110, 25, 545, 165))},
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
        folder = ROOT / f'public/paper-crops/MTH-IX-2024-{key.upper()}'
        folder.mkdir(parents=True, exist_ok=True)
        for number, (page, box) in regions.items():
            out_img = folder / f'q{number}.png'
            documents[key][page - 1].get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=pymupdf.Rect(box)).save(str(out_img))
            crops.append({
                'paper': key,
                'question': str(number),
                'page': page,
                'box': box,
                'sourceSha256': sources[key]['sha256'],
                'url': f'/paper-crops/{folder.name}/q{number}.png'
            })
            if key == 'p1' and number == 31:
                # also create q32 alias
                shutil.copyfile(out_img, folder / 'q32.png')

    # 2. Student response cropping
    em_folder = ROOT / 'public/paper-crops/MTH-IX-2024-EMARKING'
    em_folder.mkdir(parents=True, exist_ok=True)
    for q_num, kinds in RESPONSE_CROPS.items():
        for kind, (page, box) in kinds.items():
            out_img = em_folder / f'q{q_num}_{kind}.png'
            documents['em'][page - 1].get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=pymupdf.Rect(box)).save(str(out_img))
            crops.append({
                'paper': 'em',
                'question': q_num,
                'kind': kind,
                'page': page,
                'box': box,
                'sourceSha256': sources['em']['sha256'],
                'url': f'/paper-crops/MTH-IX-2024-EMARKING/q{q_num}_{kind}.png'
            })

    # 3. Read official key
    key_lines = [l.strip() for l in documents['key'][0].get_text().splitlines() if l.strip()]
    keys = []
    i = 0
    while i < len(key_lines):
        if key_lines[i].isdigit() and 1 <= int(key_lines[i]) <= 45:
            q_num = int(key_lines[i])
            old_slo = key_lines[i + 1]
            ans = key_lines[i + 2]
            level = key_lines[i + 3]
            if ans in ['•', '*']:
                ans = '*'
            keys.append({'question': str(q_num), 'oldSlo': old_slo, 'answer': ans, 'level': level})
            i += 4
        else:
            i += 1
    assert len(keys) == 45, f"Expected 45 keys, found {len(keys)}"
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

    # 5. Build MCQs JSON
    mcqs = []
    for n, (stem, options, code, grade, reason, solved) in enumerate(MCQS, 1):
        key = by_number[n]
        # page mapping in p1
        page = next(p for p, start, end in [
            (3, 1, 5), (4, 6, 11), (5, 12, 15), (6, 16, 20),
            (7, 21, 26), (8, 27, 30), (9, 31, 32), (10, 33, 35),
            (11, 36, 39), (12, 40, 41), (13, 42, 43), (14, 44, 45)
        ] if start <= n <= end)
        conflict = solved is not None and key['answer'] != '*' and solved != key['answer']
        is_asterisk_corrected = solved is not None and key['answer'] == '*'
        correct_option = solved if (is_asterisk_corrected or not conflict) else ''
        answer_status = 'ANSWER_CORRECTED' if is_asterisk_corrected else ('KEY_CONFLICT' if conflict else ('OFFICIAL_ASTERISK' if key['answer'] == '*' else 'VERIFIED'))
        answer_origin = 'Project-owner-authorized correction, independently worked; not a board erratum' if is_asterisk_corrected else 'Official key cross-checked; explanations are supplementary'
        answer_review_note = (f"Reviewed correction: {solved}. Original printed key: {key['answer']}. {reason}"
                              if is_asterisk_corrected else (reason if conflict or key['answer'] == '*' else ''))

        crop = next((c['url'] for c in crops if c['paper'] == 'p1' and c['question'] == str(n)), None)
        item = {
            'questionNumber': n,
            'stem': stem.replace('\\n', '\n'),
            'options': dict(zip('ABCD', options)),
            'correctOption': correct_option,
            'official_answer': key['answer'],
            'solved_correct_option': solved,
            'answerStatus': answer_status,
            'answer_review_note': answer_review_note,
            'explanation': reason,
            'answer_origin': answer_origin,
            'originalSlo': key['oldSlo'],
            'slo': key['oldSlo'],
            'cognitiveLevel': {'K': 'R'}.get(key['level'], key['level']),
            'originalCognitiveLevel': key['level'],
            'pageNumber': page,
            'marks': 1,
            'diagramUrl': crop,
            'isDiagram': bool(crop),
            'sourceSha256': sources['p1']['sha256'],
            **mapping(code, grade, reason)
        }
        mcqs.append(item)
    assert len(mcqs) == 45

    # 6. Extract e-marking notes sections
    em_text = '\n'.join(p.get_text(sort=True) for p in documents['em'])
    sections = {}
    matches = list(re.finditer(r'Question No\.\s*(\d+[abc]?)\b', em_text))
    for i, m in enumerate(matches):
        end_idx = matches[i + 1].start() if i + 1 < len(matches) else em_text.find('Annexure A:', m.start())
        sections[m.group(1)] = em_text[m.start():end_idx].strip()

    # 7. Build Theory / CRQ JSON
    theory = []
    for number, page, marks, old, code, grade, text, solution in THEORY:
        crop = next((c['url'] for c in crops if c['paper'] == 'p2' and c['question'] == number), None)
        choice = (
            'Attempt either 3a or 3b.' if number.startswith('3') else
            'Attempt either 4a or 4b.' if number.startswith('4') else
            'Attempt any two of 8a, 8b and 8c.' if number.startswith('8') else
            'Compulsory.'
        )
        better_img = f'/paper-crops/MTH-IX-2024-EMARKING/q{number}_better.png'
        weaker_img = f'/paper-crops/MTH-IX-2024-EMARKING/q{number}_weaker.png'
        item = {
            'questionNumber': number,
            'questionText': text.replace('\\n', '\n'),
            'marks': marks,
            'section': 'CRQ',
            'originalSlo': old,
            'pageNumber': page,
            'modelAnswer': solution,
            'modelAnswerOrigin': 'Supplementary worked solution, checked against marking criteria',
            'cognitiveLevel': 'U' if number in ['1', '7'] else 'A',
            'choiceInstruction': choice,
            'choiceGroup': '3' if number.startswith('3') else '4' if number.startswith('4') else '8' if number.startswith('8') else None,
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
    write(OUT / 'ssc1_2024_past_mcqs.json', mcqs)
    write(OUT / 'ssc1_2024_past_crqs.json', theory)
    write(OUT / 'ssc1_2024_source_manifest.json', {
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
            'printedQuestions': 8,
            'digitalEntriesIncludingAlternatives': 12,
            'totalMarks': 30,
            'durationMinutes': 100,
            'choiceGroups': {
                '3': {'choose': 1, 'of': ['3a', '3b'], 'marks': 4},
                '4': {'choose': 1, 'of': ['4a', '4b'], 'marks': 4},
                '8': {'choose': 2, 'of': ['8a', '8b', '8c'], 'marks': 6}
            }
        }
    })

    # 9. Write Review Report
    report = [
        '# Mathematics IX Annual Examination 2024 - Import Review',
        '',
        '45 MCQs; 8 printed Paper II questions represented by 12 entries including alternatives.',
        'Paper I: 45 marks / 80 minutes. Paper II: 30 marks / 100 minutes.',
        '',
        'The authoritative project syllabus is labelled 2025, revised July 2026, first examined in 2027.',
        'Original examination class and old SLO codes are preserved in metadata.',
        'Current mappings were determined from topic descriptions across IX and X syllabi.',
        '',
        '## Source Notes & Discrepancies',
        '',
        '- Paper I Q16: official asterisk (bullet); retained as OFFICIAL_ASTERISK without an automatic grading key.',
        '- Paper I Q33: matrix P in stem is [[p, q], [q, p]]; its transpose equals itself, giving option D.',
        '- Paper I Q43: equal perpendicular distances establish that line QN is perpendicular bisector of ML, confirming statements II and III (Option D).',
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
