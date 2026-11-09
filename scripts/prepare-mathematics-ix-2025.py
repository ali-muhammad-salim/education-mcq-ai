"""Prepare the reviewed 2025 papers; never writes to the database.

Transcription and semantic mappings were checked against rendered source pages.
Run with the folder containing the four original PDFs. Source errors stay visible.
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads'
DEST = ROOT / 'public/materials/ssc/mathematics/ssc-1'
OUT = ROOT / 'data/mathematics'
REVIEW = ROOT / 'output/mathematics-ix-2025'
FILES = {
    'p1': ('Mathematics-IX-Paper-I-2025.pdf', 'mathematics-ix-2025-paper-i.pdf'),
    'p2': ('Mathematics-IX-Paper-II-2025.pdf', 'mathematics-ix-2025-paper-ii.pdf'),
    'key': ('Mathematics-IX-Keys-2025.pdf', 'mathematics-ix-2025-keys.pdf'),
    'em': ('E-marking-Notes-Mathematics-IX-2025.pdf', 'mathematics-ix-2025-emarking.pdf'),
}

# Each row: stem, A-D in printed order, current SLO (None = no direct outcome),
# grade of the CURRENT outcome, semantic rationale, independently checked answer.
MCQS = [
    (r'The set of integers, whole numbers and natural numbers are represented by $Z$, $W$ and $N$ respectively. Which one of the following statements is TRUE about the given sets?', [r'$Z\cup W=W$', r'$Z\cap N=N$', r'$N\cap W=W$', r'$N\cup W=Z$'], '3.2.2', 9, 'Set intersection: all natural numbers are integers, hence the intersection is N.', 'B'),
    (r'If $M$, $N$ and $P$ are three non-empty sets, then according to associative property of union the correct equation will be,', [r'$M\cup(N\cup P)=(M\cup N)\cup P$', r'$M\cap(N\cap P)=(M\cap N)\cap P$', r'$M\cap(N\cup P)=(M\cup N)\cap P$', r'$M\cap(N\cup P)=(M\cap N)\cup P$'], '3.3.1', 9, 'Identifies the associative property of union; changing grouping does not change the union.', 'A'),
    (r'The shaded region in the Venn diagram also represents', [r"$(A\cup B)'$", r"$(A-B)'$", r'$A-B$', r"$A\cup B'$"], '3.4.2', 9, "The shaded region contains all of A and everything outside B, so it is A union B complement: option D. The printed board key has an asterisk; D is the reviewed correction authorized by the project owner.", 'D'),
    (r'If $A=\{1,2,3,4,5\}$, then the number of ordered pairs in $A\times A$ will be', ['5', '10', '25', '32'], '3.6.2', 9, 'The Cartesian product has 5 × 5 = 25 ordered pairs.', 'C'),
    ('If the element e is removed from the set Y, then the given mapping will become a/ an', ['onto function only.', 'one-one function only.', 'one-one and into function.', 'one-one and onto function.'], '4.1.3', 9, 'Each input has a distinct image, and deleting e makes the range equal to the codomain.', 'D'),
    (r"If $A=\{1,2,3\}$ and $U=\{1,2,3,4,5\}$, then $A'$ will be equal to", [r'$\{1,2,3,4,5\}$', r'$\{1,2,3\}$', r'$\{2,3\}$', r'$\{4,5\}$'], '3.2.2', 9, 'The complement consists of elements of U which are not in A: 4 and 5.', 'D'),
    (r'The simplest form of $(7^2)^{\frac35}$ in radical form will be', [r'$\sqrt[5]{7}$', r'$\sqrt[5]{7^2}$', r'$7\times\sqrt[5]{7}$', r'$7\times\sqrt[5]{7^2}$'], '1.4.2', 9, 'The exponent is 6/5 = 1 + 1/5, giving 7 times the fifth root of 7.', 'C'),
    (r'The simplified form of $\frac{a\times b^{-2}}{a^{-2}\times b^3}$ in radical form will be', [r'$a^{-3}\times b^{-5}$', r'$a^3\times b^{-5}$', r'$a^3\times b$', r'$a^{-3}\times b$'], '1.5.1', 9, 'Subtract exponents on division: 1 − (−2) = 3 and −2 − 3 = −5. The source wording says radical form although its choices use exponents.', 'B'),
    (r'If $x+3i-1=2+3i$, then the value of $x$ will be', ['−3', '−2', '2', '3'], '17.1.5', 10, 'Apply equality of complex numbers: x − 1 = 2. Complex numbers moved to current Grade X.', 'D'),
    (r'On simplification of $ai+ib-b-a$, we get', [r'$(a+b)i-1$', r'$(a+b)(i-1)$', r'$a-b+(a+b)i$', r'$(a-b)i+a+b$'], '17.2.1', 10, 'Collect real and imaginary parts to obtain (a+b)i − (a+b). Current Grade X complex-number operations.', 'B'),
    (r'If a number $0.0101$ can also be expressed as $a\times10^b$, then the value of $a$ and $b$ respectively will be', ['10.1 and −2', '1.01 and −2', '1.01 and 2', '10.1 and 2'], '2.1.1', 9, 'Scientific notation requires 1 ≤ a < 10: 0.0101 = 1.01 × 10⁻².', 'B'),
    (r'If $\log_x\left(\frac{1}{4^2}\right)=-2$, then the value of $x$ will be', ['−4', '−2', '2', '4'], '2.2.2', 9, 'Convert to exponential form: x⁻² = 1/16; a logarithm base must be positive, so x = 4.', 'D'),
    (r'The value of $\log_2(16)^{\frac34}$ will be', ['1', '2', '3', '8'], '2.4.1', 9, 'The printed expression has 16 raised to 3/4 inside the logarithm: log₂(16³/⁴) = (3/4) × 4 = 3.', 'C'),
    (r'In single logarithm, the expression $\log 3x-\log x^2+\log(x-y)$ will be equal to', [r'$\log(4x-x^2-y)$', r'$\log 3x^3(x-y)$', r'$\log\frac{3x-x^2}{x-y}$', r'$\log\frac{3x(x-y)}{x^2}$'], '2.4.1', 9, 'Use the product and quotient rules: log(3x(x−y)/x²), on the domain of the original logarithms.', 'D'),
    (r'The logarithm $\frac{\log_3 5}{\log_3 7}$ can be expressed as', [r'$\log_3 5-\log_3 7$', r'$\log_3 7-\log_3 5$', r'$\log_5 7$', r'$\log_7 5$'], '2.4.1', 9, 'The change-of-base law gives log₇5.', 'D'),
    ('In the given options, an example of polynomial is', [r'$x^2+\frac1{x^2}$', r'$x^2+\frac1{\sqrt{x}}+\frac12$', r'$x^2+\sqrt{x}+\frac12$', r'$x^2+x+\frac1{\sqrt2}$'], None, 9, 'D is a polynomial: powers of x are non-negative integers; an irrational constant is allowed. Polynomial identification is prerequisite knowledge but no direct current IX–X outcome explicitly assesses this task.', 'D'),
    (r'On simplification, $\frac{y^0\times x}{x^0\times y}$ is equal to', [r'$\frac xy$', r'$\frac yx$', '1', '0'], '1.5.1', 9, 'For nonzero x and y, x⁰ = y⁰ = 1, leaving x/y.', 'A'),
    (r'If $(x+2y)^2=361$ and $xy=-60$, then the value of $x-2y$ will be equal to', [r'$\pm19$', r'$\pm\sqrt{481}$', r'$\pm\sqrt{601}$', r'$\pm29$'], '5.1.1', 9, '(x−2y)² = (x+2y)² − 8xy = 361 + 480 = 841, so x−2y = ±29. The official key C conflicts with this calculation.', 'D'),
    (r'If $y-\frac1y=3$, then $y^3-\frac1{y^3}$ will be', ['24', '27', '36', '54'], '5.1.1', 9, '(y−1/y)³ = y³−1/y³−3(y−1/y), giving 27 + 9 = 36.', 'C'),
    (r'The value of $(2+4)-\sqrt4+\sqrt2$ is equal to', [r'$4+\sqrt2$', r'$4+\sqrt6$', r'$6-\sqrt2$', r'$6-\sqrt6$'], '1.5.1', 9, 'Evaluate the real power √4 = 2, then combine real numbers: 6−2+√2 = 4+√2.', 'A'),
    (r'The product of expressions is given as $(a-1)(a^2+a+1)$. The simplest form of this product will be', [r'$(a+1)^3$', r'$(a-1)^3$', r'$a^3-1$', r'$a^3+1$'], '5.1.1', 9, 'Apply the difference-of-cubes identity with b = 1.', 'C'),
    (r'The factors of $a^2-3a+2ab-6b$ are', [r'$(a+3)$ and $(a-2b)$', r'$(a+3)$ and $(a+2b)$', r'$(a-3)$ and $(a-2b)$', r'$(a-3)$ and $(a+2b)$'], '5.2.1', 9, 'Group a(a−3)+2b(a−3) = (a−3)(a+2b).', 'D'),
    (r'The complete factorised form of the expression $9-(a^2+1)^2$ will be', [r'$(3+a^2+1)(3+a^2-1)$', r'$(3+a^2+1)(3-a^2-1)$', r'$(9+a^2+1)(9+a^2-1)$', r'$(9+a^2+1)(9-a^2-1)$'], '5.2.1', 9, 'Use u²−v² with u = 3 and v = a²+1.', 'B'),
    (r'The expression $k^2-kt-2t^2$ can be expressed in terms of product of factors as', [r'$(k-t)(k-2t)$', r'$(k+t)(k-2t)$', r'$(k+t)(k+2t)$', r'$(k-t)(k+2t)$'], '5.2.1', 9, 'Split the middle term: −2kt+kt, giving (k+t)(k−2t).', 'B'),
    (r'The polynomial $(3a+1)^3$ is the factorised form of the polynomial', [r'$27a^3+27a^2+9a+1$', r'$27a^3+9a^2+3a+1$', r'$27a^3+3a^2+3a+1$', r'$27a^3+a^2+a+1$'], '5.2.1', 9, 'The cube identity expands to 27a³+27a²+9a+1.', 'A'),
    (r'The factorised form of $8a^3-125$ to the lowest forms is', [r'$(2a+5)(4a^2-10a-25)$', r'$(2a-5)(4a^2-10a+25)$', r'$(2a+5)(4a^2+10a+25)$', r'$(2a-5)(4a^2+10a+25)$'], '5.2.1', 9, 'Apply the difference-of-cubes factorisation with 2a and 5.', 'D'),
    (r'If $P(x)=x^3+1$ is divided by $(x+2)$, then the remainder is', ['−7', '−5', '7', '9'], '5.3.2', 9, 'The remainder theorem gives P(−2) = −8+1 = −7.', 'A'),
    (r'Which of the given options is NOT a zero of the polynomial $(2a+1)(a+3)(a-3)(a-1)$?', ['−3', '−1', '1', '3'], '5.4.1', 9, 'Its zeros are −1/2, −3, 3 and 1. Of the printed choices, −1 is not a zero.', 'B'),
    (r'If $x$, $a+b$ and $a-b$ are in continued proportion, then $x$ is equal to', [r'$(a+b)^2$', r'$(a-b)^2$', r'$\frac{(a-b)^2}{a+b}$', r'$\frac{(a+b)^2}{a-b}$'], None, 9, 'Continued proportion gives x(a−b) = (a+b)². The current syllabus has no direct continued-proportion outcome.', 'D'),
    (r'If numbers $k$, $5$, $3$ and $15$ are in fourth proportion, then the value of $k$ is', [r'$\frac15$', '1', '5', '15'], None, 9, 'k/5 = 3/15, hence k = 1. Fourth proportion has no direct current IX–X outcome.', 'B'),
    (r'If $x:5=7:y$, then applying the componendo theorem, we get', [r'$\frac{x+5}{5}=\frac{7+y}{y}$', r'$\frac{x-5}{5}=\frac{7-y}{y}$', r'$\frac{x}{x-5}=\frac7{7-y}$', r'$\frac{x}{x-5}=\frac7{7+y}$'], None, 9, 'Componendo adds the denominator to the numerator on both sides. This theorem is not a direct current IX–X outcome.', 'A'),
    ('The volume of a gas V varies inversely with pressure P at a constant temperature. The volume of the gas is noted as 240 cubic centimetres at 30 kg/cm² pressure. The volume of this gas at 45 kg/cm² pressure will be', ['5.6 cm³', '160 cm³', '360 cm³', '720 cm³'], None, 9, 'PV = 30 × 240 = 7200, so V = 7200/45 = 160 cm³. Inverse variation is not explicitly an outcome in the current syllabus; function knowledge alone is not an exact match.', 'B'),
    (r'The matrix $\begin{bmatrix}a&0\\b&2\end{bmatrix}$ is a scalar matrix if', [r'$a=0$ and $b=2$', r'$a=0$ and $b=-2$', r'$a=2$ and $b=0$', r'$a=2$ and $b=2$'], '18.2.1', 10, 'A scalar matrix has zero off-diagonal entries and equal diagonal entries. Current Grade X.', 'C'),
    (r'If $M=\begin{bmatrix}0\\1\end{bmatrix}$, $N=\begin{bmatrix}1&2\\1&1\end{bmatrix}$ and $P=\begin{bmatrix}2&1\end{bmatrix}$ are given matrices, then which of the matrix product is possible?\nI. $MN$\nII. $PM$\nIII. $NP$', ['I only', 'II only', 'I and III', 'II and III'], '18.4.2', 10, 'The orders are 2×1, 2×2 and 1×2. Only PM has matching inner dimensions. Current Grade X.', 'B'),
    (r'The multiplicative inverse of the matrix $\begin{bmatrix}2&6\\-1&-3\end{bmatrix}$ is', [r'$\begin{bmatrix}-3&-6\\1&2\end{bmatrix}$', r'$-\frac1{12}\begin{bmatrix}-3&-6\\1&2\end{bmatrix}$', r'$\frac1{12}\begin{bmatrix}-3&-6\\1&2\end{bmatrix}$', 'does not exist.'], '18.5.7', 10, 'Its determinant is 2(−3)−6(−1) = 0, so its inverse does not exist. Current Grade X.', 'D'),
    (r'If the matrix $\begin{bmatrix}a&6\\1&-3\end{bmatrix}$ is a singular matrix, then the value of $a$ will be', ['−3', '−2', '0', '2'], '18.5.4', 10, 'Set the determinant −3a−6 equal to zero, obtaining a = −2. Current Grade X.', 'B'),
    (r'If $2x+3y=2$ and $x-2y=1$ are two simultaneous linear equations, then the matrix form of the equations will be', [r'$\begin{bmatrix}2&3\\1&-2\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}1\\2\end{bmatrix}$', r'$\begin{bmatrix}2&3\\1&-2\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}2\\1\end{bmatrix}$', r'$\begin{bmatrix}2&1\\3&-2\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}2\\1\end{bmatrix}$', r'$\begin{bmatrix}2&1\\3&-2\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}1\\2\end{bmatrix}$'], '18.6.2', 10, 'The coefficient rows must be (2,3) and (1,−2), with constants (2,1). This is the matrix formulation used in simultaneous-equation solving, now Grade X.', 'B'),
    (r'After solving the matrix equation $3A+\begin{bmatrix}1&0\\0&1\end{bmatrix}\begin{bmatrix}1\\-1\end{bmatrix}=\begin{bmatrix}1\\2\end{bmatrix}$, the matrix $A$ will be', [r'$\begin{bmatrix}0\\1/3\end{bmatrix}$', r'$\begin{bmatrix}0\\1\end{bmatrix}$', r'$\begin{bmatrix}0\\-1\end{bmatrix}$', r'$\begin{bmatrix}0\\-1/3\end{bmatrix}$'], '18.6.1', 10, 'Subtract (1,−1)ᵀ to obtain 3A = (0,3)ᵀ, hence A = (0,1)ᵀ. Current Grade X.', 'B'),
    (r'In the given diagram, the value of $b$ in terms of $a$ will be equal to', [r'$a^\circ$', r'$2a^\circ$', r'$(90-a)^\circ$', r'$2(90-a)^\circ$'], None, 9, 'Vertically opposite angles at C are equal; the right triangle gives b = 90−a. No direct current outcome covers this standalone congruence/elementary-angle task.', 'C'),
    (r'An archer has two targets placed at M and N, such that both are equal distances from the archer standing at L as shown in the given diagram. After hitting the target at M, he turns to target at N, rotating an angle $\theta$. The value of $\theta$ will be', ['50°', '60°', '100°', '120°'], None, 9, 'LM = LN, so the base angles are equal. With the angle at N equal to 60°, the whole angle at L is 60°. No direct current outcome explicitly assesses isosceles-angle properties.', 'B'),
    (r'In the given parallelogram $QRST$, the value of $x$ will be', ['31', '35', '70', '94'], '13.1.1', 9, 'Adjacent angles are supplementary: (3x+5)+(x+4+31)=180, giving x = 35.', 'B'),
    ('Which of the following diagrams represent a right bisector of the side XY of the triangle XYZ?', ['Diagram A (see source figure)', 'Diagram B (see source figure)', 'Diagram C (see source figure)', 'Diagram D (see source figure)'], '10.1.3', 9, 'Diagram B is perpendicular to XY at its midpoint: the locus equidistant from X and Y. The task identifies a locus rather than asking for a compass construction.', 'B'),
    (r'Consider the given diagram. If $a=e$, then the correct relation(s) is/ are\nI. $x^\circ=y^\circ$\nII. $a=b$\nIII. $b=d$', ['I only.', 'III only.', 'I and III.', 'II and III.'], '10.1.3', 9, 'Equal perpendicular distances to the two sides put D on the angle bisector, proving I. They do not imply AD = DC (III). The official key C is unsupported without an extra condition such as AB = BC.', 'A'),
    ('In the given triangle, VW is the longest side and UV is the smallest side. The CORRECT relationship between the angles is', [r'$c>a$', r'$b>a$', r'$a>c$', r'$c>b$'], None, 9, 'The longest side is opposite the largest angle a; the smallest side is opposite the smallest angle c. Thus a > c. No direct current IX–X outcome explicitly lists this angle/side ordering task.', 'C'),
    (r'In the following figure, $BD$ is the angle bisector of $\angle ABC$. If $AB=2$ cm, $BC=8$ cm, and $AD=1$ cm, then the length of $CD$ is', ['1 cm.', '2 cm.', '3 cm.', '4 cm.'], None, 9, 'The angle-bisector theorem gives AD/DC = AB/BC = 1/4, hence DC = 4 cm. That proportionality theorem is not explicitly a current IX–X outcome.', 'D'),
]

# number, source page, marks, old SLO, current SLO, current grade, text, solution.
THEORY = [
    ('1',3,3,'1.1.3','3.2.2',9,r'If $N=\{1,2,3,\ldots\}$ and $W=\{0,1,2,\ldots\}$, then find $N\triangle W$.',r'$N\cup W=W$, $N\cap W=N$, hence $N\triangle W=(N\cup W)-(N\cap W)=\{0\}$.'),
    ('2',3,3,'3.4.1','2.4.1',9,r'Using the laws of logarithm, expand $\log\sqrt{\frac{x}{x+1}}$.',r'$\log\sqrt{x/(x+1)}=\frac12\log(x/(x+1))=\frac12[\log x-\log(x+1)]$, for $x>0$. The original radical logarithm also exists for $x<-1$; a domain-preserving real expansion is $\frac12[\log|x|-\log|x+1|]$ for $x<-1$ or $x>0$.'),
    ('3a',4,4,'4.2.4','5.1.1',9,r'i. Prove that $(2x-3y+z)^2=4x^2+9y^2+z^2-12xy-6yz+4xz$. (2 Marks)\n\nii. If $2x-3y+z=10$ and $-6xy-3yz+2xz=15$, then find $4x^2+9y^2+z^2$. (Note: Use the expression from part i.) (2 Marks)',r'Apply $(a+b+c)^2$ with $a=2x$, $b=-3y$, $c=z$. Then $100=4x^2+9y^2+z^2+2(15)$, giving $4x^2+9y^2+z^2=70$.'),
    ('3b',5,4,'4.2.9','5.1.1',9,r'Find the continued product in simplified form for the given expression.\n$(16p^2-1)(16p^2+4p+1)(16p^2-4p+1)$',r'Let $t=4p$. The product is $(t-1)(t+1)(t^2+t+1)(t^2-t+1)=(t^3-1)(t^3+1)=t^6-1=4096p^6-1$.'),
    ('4a',6,4,'5.4.1','5.4.1',9,r'Using factor theorem, find the factors of the polynomial $P(x)=x^3-x^2-4x+4$.',r'$P(1)=0$, so $(x-1)$ is a factor. Division gives $x^2-4=(x-2)(x+2)$. Thus $P(x)=(x-1)(x-2)(x+2)$.'),
    ('4b',6,4,'5.1.1a & 5.2.1b','5.2.1',9,r'Completely factorise the expression $15x^3-24x^2+9x$.',r'$15x^3-24x^2+9x=3x(5x^2-8x+3)=3x[5x(x-1)-3(x-1)]=3x(5x-3)(x-1)$.'),
    ('5',7,3,'6.4.1',None,9,r'If $a:b::c:d$, then use k-method to prove $\frac{a^4+c^4}{a^3b+c^3d}=k$.',r'Let $a/b=c/d=k$, so $a=bk$ and $c=dk$. The quotient is $k^4(b^4+d^4)/[k^3(b^4+d^4)]=k$, whenever the original ratios and quotient are defined. Conditional equalities involving proportions by k-method have no direct current IX–X outcome.'),
    ('6',8,4,'7.6.2a','18.6.2',10,r'Solve the given simultaneous linear equations by matrix inverse method.\n$x+y=5$\n$x-2y=1$',r'$A=\begin{bmatrix}1&1\\1&-2\end{bmatrix}$, $\det A=-3$, $A^{-1}=\frac1{-3}\begin{bmatrix}-2&-1\\-1&1\end{bmatrix}$. Thus $\begin{bmatrix}x\\y\end{bmatrix}=A^{-1}\begin{bmatrix}5\\1\end{bmatrix}=\begin{bmatrix}11/3\\4/3\end{bmatrix}$. This method is now current Grade X.'),
    ('7',9,3,'8.1.2d','21.1.2',10,r'A right angled triangle ABC having right angle at A is given. Hence, draw an altitude from A to BC.',r'Construct the perpendicular from A to BC using compass arcs and a straightedge. If the foot is H, then H lies on BC and AH is perpendicular to BC. The paper requests this one altitude. The marking hint saying "3 required" is inconsistent with the printed task. Compass construction of altitudes is now Grade X.'),
    ('8a',10,3,'9.1.1c',None,9,r'In the correspondence of $\triangle LKM\leftrightarrow\triangle KLN$, $\triangle LKM\cong\triangle KLN$. Using the given diagram, find the values of $x$, $y$ and $z$.',r'The correspondence gives $x=30^\circ$ and $y=40^\circ$. The angle at L of triangle LKM is $180-40-30=110^\circ$, corresponding to the whole angle at K of triangle KLN. Thus $z=110-40=70^\circ$. The current IX–X outcomes do not directly assess these congruence criteria.'),
    ('8b',11,3,'10.1.1c','13.1.1',9,r'In the given triangle ABC, BD and AE are the medians of the triangle.\ni. Find $DE$ and $BC$. (2 Marks)\nii. Is $DE$ parallel to $AB$? Give a reason to justify your answer. (1 Mark)',r'D and E are midpoints, so $DE=AB/2=9/2=4.5$ cm and $BC=2CE=10$ cm. Also $DE\parallel AB$ by the midpoint theorem. The source marking notes print 5.4 cm for DE; this is retained as a source discrepancy, not used as the worked result.'),
    ('8c',12,3,'13.1.1d','12.1.3',9,r'Using properties of ratios of corresponding sides of two triangles, prove that $\triangle ABC\sim\triangle DEF$.',r'$AB/DE=16/8=2$, $BC/EF=10/5=2$, and $AC/DF=12/6=2$. All corresponding sides are proportional, so the triangles are similar by SSS similarity.'),
]

# PDF points, not pixels. Keep labels and option figures; retain source watermarks.
CROPS = {
    'p1': {3:(3,(100,359,272,458)),5:(4,(69,120,185,208)),39:(11,(92,113,537,236)),40:(11,(125,356,537,507)),41:(12,(68,114,504,274)),42:(12,(71,376,525,661)),43:(13,(89,105,532,279)),44:(13,(112,455,549,595)),45:(14,(259,132,531,248))},
    'p2': {'7':(9,(182,257,440,532)),'8a':(10,(73,172,515,280)),'8b':(11,(95,134,549,336)),'8c':(12,(72,140,555,255))},
}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


def prepare():
    for folder in [DEST, OUT, REVIEW]:
        folder.mkdir(parents=True, exist_ok=True)
    documents, sources, crops = {}, {}, []
    for key, (name, target) in FILES.items():
        path=SOURCE/name
        documents[key]=pymupdf.open(path)
        shutil.copyfile(path, DEST/target)
        sources[key]={'filename':name,'url':f'/materials/ssc/mathematics/ssc-1/{target}', 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pages':len(documents[key])}
    for key, regions in CROPS.items():
        folder=ROOT/f'public/paper-crops/MTH-IX-2025-{key.upper()}'
        folder.mkdir(parents=True,exist_ok=True)
        for number,(page,box) in regions.items():
            documents[key][page-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(box)).save(str(folder/f'q{number}.png'))
            crops.append({'paper':key,'question':str(number),'page':page,'box':box,'sourceSha256':sources[key]['sha256'],'url':f'/paper-crops/{folder.name}/q{number}.png'})
    # Keep the printed key independently, including the repeated Q39 row.
    keys=[]
    for line in documents['key'][0].get_text(sort=True).splitlines():
        match=re.match(r'^\s*(\d+)\s+([\d.]+[a-z]?)\s+([A-D*])\s+([KUA])\s*$',line)
        if match:keys.append(dict(zip(['question','oldSlo','answer','level'],match.groups())))
    assert len(keys)==46 and len({x['question'] for x in keys})==45
    by_number={int(k['question']):k for k in keys}
    outcomes={}
    for grade in [9,10]:
        syllabus=OUT/f'ssc{1 if grade==9 else 2}_exact_syllabus.json'
        for unit in json.loads(syllabus.read_text(encoding='utf-8')):
            for sub in unit['subtopics']:
                for slo in sub['slos']:
                    outcomes[grade,slo['code']]={**slo,'topic':unit['name'],'unitNumber':unit['unitNumber']}
    def mapping(code,grade,reason):
        slo=outcomes.get((grade,code))
        assert code is None or slo is not None, (grade,code)
        return {'current_slo':code,'currentSlo':code,'current_mapping':[] if not slo else [{'code':code,'description':slo['description'],'topic':slo['topic'],'grade':grade}], 'mapping_scope':{'board':'AKU-EB','grade':grade,'subject':'Mathematics'},'mappingStatus':'NO_DIRECT_OUTCOME' if not slo else 'MOVED_TO_GRADE_X' if grade==10 else 'IN_SCOPE','mappingReason':reason,'in_syllabus':bool(slo and grade==9),'out_of_syllabus':not bool(slo and grade==9),'current_syllabus_reviewed':True,'syllabusEdition':'2025; latest revision July 2026; first examined 2027','unitNumber':slo['unitNumber'] if slo else None,'unitName':slo['topic'] if slo else 'Historical syllabus / no direct current outcome','sloText':slo['description'] if slo else ''}
    mcqs=[]
    for n,(stem,options,code,grade,reason,solved) in enumerate(MCQS,1):
        key=by_number[n]
        page=next(p for p,start,end in [(3,1,4),(4,5,9),(5,10,15),(6,16,20),(7,21,26),(8,27,31),(9,32,35),(10,36,38),(11,39,40),(12,41,42),(13,43,44),(14,45,45)] if start<=n<=end)
        conflict=solved is not None and solved!=key['answer']
        crop=next((c['url'] for c in crops if c['paper']=='p1' and c['question']==str(n)),None)
        item={'questionNumber':n,'stem':stem.replace('\\n','\n'),'options':dict(zip('ABCD',options)),'correctOption':solved,'official_answer':key['answer'],'solved_correct_option':solved,'answerStatus':'ANSWER_CORRECTED' if conflict else 'VERIFIED','answer_review_note':f'Reviewed correction: {solved}. Original printed key: {key["answer"]}. '+reason if conflict else '', 'explanation':reason,'answer_origin':'Project-owner-authorized correction, independently worked by Codex; not a board erratum' if conflict else 'Official key cross-checked by Codex; explanations are supplementary','originalSlo':key['oldSlo'],'slo':key['oldSlo'],'cognitiveLevel':{'K':'R'}.get(key['level'],key['level']),'originalCognitiveLevel':key['level'],'pageNumber':page,'marks':1,'diagramUrl':crop,'isDiagram':bool(crop),'sourceSha256':sources['p1']['sha256'],**mapping(code,grade,reason)}
        mcqs.append(item)
    assert len(mcqs)==45
    # Extract complete marking-note text by printed question section, without
    # silently treating its pedagogical instructions as execution instructions.
    em='\n'.join(p.get_text(sort=True) for p in documents['em'])
    sections={}
    matches=list(re.finditer(r'Question No\.\s*(\d+[abc]?)\b',em))
    for i,m in enumerate(matches):
        sections[m.group(1)]=em[m.start():matches[i+1].start() if i+1<len(matches) else em.find('Annexure A:',m.start())].strip()
    theory=[]
    for number,page,marks,old,code,grade,text,solution in THEORY:
        crop=next((c['url'] for c in crops if c['paper']=='p2' and c['question']==number),None)
        choice='Attempt either 3a or 3b.' if number.startswith('3') else 'Attempt either 4a or 4b.' if number.startswith('4') else 'Attempt any two of 8a, 8b and 8c.' if number.startswith('8') else 'Compulsory.'
        item={'questionNumber':number,'questionText':text.replace('\\n','\n'),'marks':marks,'section':'CRQ','originalSlo':old,'pageNumber':page,'modelAnswer':solution,'modelAnswerOrigin':'Supplementary worked solution by Codex, not verbatim board text','cognitiveLevel':'U' if number in ['1','7'] else 'A','choiceInstruction':choice,'choiceGroup':'3' if number.startswith('3') else '4' if number.startswith('4') else '8' if number.startswith('8') else None,'diagramUrl':crop,'isDiagram':bool(crop),'officialMarkingNotes':sections.get(number,''),'sourceSha256':sources['p2']['sha256'],**mapping(code,grade,solution)}
        if number=='8b':item['sourceDiscrepancy']='The marking notes print DE = 5.4 cm; the figure and midpoint theorem give 4.5 cm.'
        if number=='7':item['sourceDiscrepancy']='The checking hint says 3 altitudes required, but the paper asks only for the altitude from A to BC.'
        theory.append(item)
    # Crop the actual embedded student responses; exclude QR codes and source
    # diagrams. The full marking-note section remains linked separately.
    response_pages={'1':([2],[3]),'2':([4],[4]),'3a':([6],[6]),'3b':([8],[8]),'4a':([10],[10]),'4b':([12],[12]),'5':([13],[14]),'6':([16],[16]),'7':([18],[19]),'8a':([21],[21]),'8b':([23],[23]),'8c':([25],[25])}
    folder=ROOT/'public/paper-crops/MTH-IX-2025-EMARKING';folder.mkdir(parents=True,exist_ok=True)
    for item in theory:
        number=item['questionNumber'];better,weaker=response_pages[number]
        for kind,pages in [('better',better),('weaker',weaker)]:
            page=pages[0]; candidates=[i for i in documents['em'][page-1].get_image_info() if i['width']>350 and i['height']>100 and abs(i['width']-i['height'])>10]
            if not candidates:continue
            selected=candidates[0 if kind=='better' else -1]
            box=pymupdf.Rect(selected['bbox'])
            if number=='3a':
                selected_group=candidates[:2] if kind=='better' else candidates[2:]
                for region in selected_group:box|=pymupdf.Rect(region['bbox'])
            documents['em'][page-1].get_pixmap(matrix=pymupdf.Matrix(2,2),clip=box).save(str(folder/f'q{number}_{kind}.png'))
            item[f'{kind}ResponseImage']=f'/paper-crops/{folder.name}/q{number}_{kind}.png'
            crops.append({'paper':'em','question':number,'kind':kind,'page':page,'box':list(box),'sourceSha256':sources['em']['sha256'],'url':item[f'{kind}ResponseImage']})
    write(OUT/'ssc1_2025_past_mcqs.json',mcqs)
    write(OUT/'ssc1_2025_past_crqs.json',theory)
    write(OUT/'ssc1_2025_source_manifest.json',{'sources':sources,'officialKeyRows':keys,'crops':crops,'syllabusSource':{'url':'/materials/ssc/mathematics/ssc-1/mathematics-science-group-ssc-syllabus-2025.pdf','latestRevision':'July 2026','firstExamYear':2027,'sha256':hashlib.sha256((DEST/'mathematics-science-group-ssc-syllabus-2025.pdf').read_bytes()).hexdigest()},'paperII':{'printedQuestions':8,'digitalEntriesIncludingAlternatives':12,'totalMarks':30,'durationMinutes':100,'choiceGroups':{'3':{'choose':1,'of':['3a','3b'],'marks':4},'4':{'choose':1,'of':['4a','4b'],'marks':4},'8':{'choose':2,'of':['8a','8b','8c'],'marks':6}}}})
    report=['# Mathematics IX Annual Examination 2025 - import review','',
        '45 MCQs; 8 printed Paper II questions represented by 12 entries including alternatives. Paper I: 45 marks / 80 minutes. Paper II: 30 marks / 100 minutes.',
        '', 'The authoritative project syllabus is labelled 2025, revised July 2026, first examined in 2027. Original examination class and old SLO codes are preserved. Current mappings were selected from the descriptions of both IX and X outcomes; identical code numbers were not treated as equivalence.',
        '', '## Source discrepancies', '',
        '- Paper I Q3: original asterisk retained as provenance; the owner-authorized reviewed answer D is now used for grading: the shaded region is A union B complement.',
        '- Paper I Q18: original key C retained as provenance; (x-2y)^2 = 361 - 8(-60) = 841, giving the owner-authorized grading answer D.',
        '- Paper I Q43: original key C retained as provenance. Equal perpendicular distances imply angle-bisector statement I, but not midpoint statement III. The owner-authorized grading answer is A.',
        '- The key repeats Q39 with identical code and answer. Both source rows are retained in the source manifest; only one question is created.',
        '- Paper II Q7: the paper requests one altitude; the marking hint says three. The paper task is preserved.',
        '- Paper II Q8b: the marking notes print DE = 5.4 cm. The figure has AB = 9 cm; the midpoint theorem gives 4.5 cm. The source statement and supplementary correction are kept separate.',
        '', '## Current SLO mapping', '', '| Paper | Question | Original SLO | Current SLO | Current class | Status |', '|---|---|---|---|---|---|']
    for component,items in [('I',mcqs),('II',theory)]:
        for item in items: report.append(f"| {component} | {item['questionNumber']} | {item['originalSlo']} | {item['current_slo'] or '-'} | {item['mapping_scope']['grade'] if item['current_slo'] else '-'} | {item['mappingStatus']} |")
    report.extend(['', '## Assets and provenance', '', f'{len(crops)} inspected source crops: 13 question figures and 24 student response examples. Original PDFs are copied unchanged, with SHA-256 source hashes, source page numbers and crop coordinates in data/mathematics/ssc1_2025_source_manifest.json.', '', 'Worked solutions and explanations are supplementary Codex content; they are not presented as verbatim official board answers. The marking-note text remains in the data as extracted source evidence; the original PDF is linked for faithful reading.', '', '## Re-run', '', 'Prepare source data: `python scripts/prepare-mathematics-ix-2025.py <source-folder>`', '', 'Read-only database preflight: `npx tsx scripts/import-mathematics-ix-2025.ts`', '', 'Targeted atomic database import: `npx tsx scripts/import-mathematics-ix-2025.ts --apply`', '', 'The importer validates the existing current IX and X outcome descriptions, rejects duplicate paper/question rows and differing source hashes, preserves cross-grade links, and never runs schema migrations.'])
    (REVIEW/'review.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
    print(json.dumps({'mcqs':len(mcqs),'theoryEntries':len(theory),'crops':len(crops),'ungradableMCQs':[x['questionNumber'] for x in mcqs if not x['correctOption']],'mappingCounts':{status:sum(x['mappingStatus']==status for x in mcqs+theory) for status in ['IN_SCOPE','MOVED_TO_GRADE_X','NO_DIRECT_OUTCOME']}},indent=2))


if __name__=='__main__':
    prepare()
