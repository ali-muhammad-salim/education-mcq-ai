"""Prepare the reviewed Mathematics IX Annual Examination 2021 Paper I.
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
REVIEW = ROOT / 'output/mathematics-ix-2021'

FILES = {
    'p1': 'mathematics-ix-2021-paper-i.pdf',
    'key': 'mathematics-ix-2021-keys.pdf',
}

# 50 MCQs: stem, A-D options, current SLO code, current grade (9 or 10 or None), semantic rationale, verified answer.
MCQS = [
    # 1
    (
        r'It is given that $M = \{0, 1, 2, 3\}$ and $N = \{1, 3, 4, 5\}$.' + '\n' +
        r'The set $M - N$ is equal to',
        [r'$\{0\}$', r'$\{0, 2\}$', r'$\{4, 5\}$', r'$\{1, 3\}$'],
        '3.2.2', 9,
        r'Difference $M - N$ contains all elements of $M$ that do not belong to $N$: $\{0, 2\}$.',
        'B'
    ),
    # 2
    (
        r'It is given that $M = \{0, 1, 2, 3\}$ and $N = \{1, 3, 4, 5\}$.' + '\n' +
        r'The set $N \cup M$ is equal to',
        [r'$\{1, 3\}$', r'$\{0, 2, 4, 5\}$', r'$\{0, 1, 2, 3, 4, 5\}$', r'$\{0, 1, 1, 2, 3, 3, 4, 5\}$'],
        '3.2.2', 9,
        r'Union $N \cup M$ contains every unique element from both sets: $\{0, 1, 2, 3, 4, 5\}$.',
        'C'
    ),
    # 3
    (
        r'For the Cartesian product $P \times Q = \{(1, m), (1, 3), (4, m), (4, 3), (7, m), (7, 3)\}$, the number of elements in set $Q$ is',
        [r'$6$', r'$5$', r'$3$', r'$2$'],
        '3.6.2', 9,
        r'The second coordinates form set $Q = \{m, 3\}$, which has $2$ elements.',
        'D'
    ),
    # 4
    (
        r'A mapping from set $X$ to set $Y$ is given in the diagram.' + '\n' +
        r'The given mapping shows a/ an',
        [
            r'into function only.',
            r'one-one function only.',
            r'one-one and into function.',
            r'one-one and onto function.'
        ],
        '4.1.2', 9,
        r'Every element in domain $X$ maps to a distinct element in $Y$ (one-one), but element $e \in Y$ is not in the range (into). Hence it is a one-one and into function.',
        'C'
    ),
    # 5
    (
        r'A mapping from set $X$ to set $Y$ is given in the diagram.' + '\n' +
        r'If the element $e$ is removed from the set $Y$, then the given mapping will become a/ an',
        [
            r'onto function only.',
            r'one-one function only.',
            r'one-one and into function.',
            r'one-one and onto function.'
        ],
        '4.1.2', 9,
        r'Removing $e$ makes the range equal to the codomain $Y = \{c, d\}$, while distinct elements still map to distinct images, making it a one-one and onto (bijective) function.',
        'D'
    ),
    # 6
    (
        r'If $A = \{1, 2, 3\}$ and $A \cup B = \{1, 2, 3, 4, 5\}$, then the possible set(s) $B$ will be' + '\n' +
        r'I. $\{3, 4, 5\}$' + '\n' +
        r'II. $\{1, 3, 5\}$' + '\n' +
        r'III. $\{2, 4, 5\}$',
        [r'I only', r'II only', r'I and III', r'II and III'],
        '3.2.2', 9,
        r'$B$ must supply elements $4$ and $5$. Sets I and III both contain $4$ and $5$ (along with elements already in $A$), making $A \cup B = \{1, 2, 3, 4, 5\}$. Set II lacks $4$.',
        'C'
    ),
    # 7
    (
        r'Consider two sets $A = \{2, 3, 4\}$ and $B = \{a, b\}$. The binary relation $\{(2, b), (3, b), (4, b)\}$ is',
        [
            r'not a function.',
            r'an into function.',
            r'an onto function.',
            r'an one-one function.'
        ],
        '4.1.2', 9,
        r'Every element in $A$ has a unique image in $B$, so it is a function. The range $\{b\}$ is a proper subset of $B$ (element $a$ is unmapped), so it is an into function.',
        'B'
    ),
    # 8
    (
        r'If $A = \{a, b\}$ and $B = \{10, 20\}$, then which of the following option(s) is/ are binary relation from $A$ to $B$?' + '\n' +
        r'I. $\{(a, 10), (b, 20)\}$' + '\n' +
        r'II. $\{(10, a), (20, b)\}$' + '\n' +
        r'III. $\{(a, 20)\}$' + '\n' +
        r'IV. $\{(10, b)\}$',
        [r'I only', r'II only', r'I and III', r'II and IV'],
        '3.7.1', 9,
        r'A binary relation from $A$ to $B$ is a subset of $A \times B$ where first coordinates belong to $A$ and second coordinates to $B$. I and III satisfy this.',
        'C'
    ),
    # 9
    (
        r'If a universal set is defined as $U = \{1, 2, 3, 4, 5, 6, 7, 8, 9, 10\}$ and $E$ is the set of even numbers, then $E^c$ is',
        [
            r'$\phi$',
            r'$\{1, 3, 5, 7, 9\}$',
            r'$\{2, 4, 6, 8, 10\}$',
            r'$\{1, 2, 3, 4, 5, 6, 7, 8, 9, 10\}$'
        ],
        '3.2.2', 9,
        r'$E = \{2, 4, 6, 8, 10\}$. Its complement $E^c = U - E = \{1, 3, 5, 7, 9\}$.',
        'B'
    ),
    # 10
    (
        r'If a number $0.0101$ can also be expressed as $1.01 \times 10^p$, then the value of $p$ is equal to',
        [r'$-2$', r'$-1$', r'$1$', r'$2$'],
        '2.1.1', 9,
        r'Moving the decimal point 2 places to the right yields $0.0101 = 1.01 \times 10^{-2}$, so $p = -2$.',
        'A'
    ),
    # 11
    (
        r'On converting $10^{-3} = 0.001$ into the logarithmic form $\log_{10} m = n$, the value of $m$ will be',
        [r'$-3$', r'$0.001$', r'$1$', r'$10$'],
        '2.2.1', 9,
        r'By definition $b^y = x \iff \log_b x = y$. For $10^{-3} = 0.001$, $\log_{10}(0.001) = -3$, so $m = 0.001$.',
        'B'
    ),
    # 12
    (
        r'The value of $\log_x\left(\frac{1}{x^2}\right)$ is equal to',
        [r'$-1$', r'$1$', r'$2$', r'$-2$'],
        '2.4.1', 9,
        r'$\log_x(x^{-2}) = -2\log_x x = -2(1) = -2$.',
        'D'
    ),
    # 13
    (
        r'In a single logarithm, $\log a^2 - 3\log b + \log a$ can be written as',
        [
            r'$\log\left(\frac{3a}{3b}\right)$',
            r'$3\log\left(\frac{a}{b}\right)$',
            r'$\log\left(\frac{a^2 + a}{b^3}\right)$',
            r'$\log(a^2 - 3b + a)$'
        ],
        '2.4.1', 9,
        r'$\log a^2 + \log a - 3\log b = \log(a^3) - \log(b^3) = \log\left(\frac{a}{b}\right)^3 = 3\log\left(\frac{a}{b}\right)$.',
        'B'
    ),
    # 14
    (
        r'If $2^{-x} = \frac{1}{16}$, then the value of $x$ is',
        [r'$-4$', r'$-\frac{1}{4}$', r'$\frac{1}{4}$', r'$4$'],
        '1.5.1', 9,
        r'$2^{-x} = 16^{-1} = (2^4)^{-1} = 2^{-4} \implies -x = -4 \implies x = 4$.',
        'D'
    ),
    # 15
    (
        r'On simplification, $\frac{y^0 \times x}{x^0 \times y}$ is equal to',
        [r'$\frac{x}{y}$', r'$\frac{y}{x}$', r'$1$', r'$0$'],
        '1.5.1', 9,
        r'Since $y^0 = 1$ and $x^0 = 1$, the expression evaluates to $\frac{1 \cdot x}{1 \cdot y} = \frac{x}{y}$.',
        'A'
    ),
    # 16
    (
        r'If $b - a = 2$ and $\frac{1}{2}(b + a) = 1$, then the value of $b^2 - a^2$ is equal to',
        [r'$1$', r'$4$', r'$\frac{1}{2}$', r'$\frac{1}{4}$'],
        '5.1.1', 9,
        r'$b + a = 2 \times 1 = 2$. Then $b^2 - a^2 = (b - a)(b + a) = 2 \times 2 = 4$.',
        'B'
    ),
    # 17
    (
        r'The value of $(2 + 4) - \sqrt{4} + \sqrt{2}$ is equal to',
        [r'$4 + \sqrt{2}$', r'$4 + \sqrt{6}$', r'$6 - \sqrt{2}$', r'$6 - \sqrt{6}$'],
        '1.4.1', 9,
        r'$(2 + 4) - \sqrt{4} + \sqrt{2} = 6 - 2 + \sqrt{2} = 4 + \sqrt{2}$.',
        'A'
    ),
    # 18
    (
        r'The value of $\left[\frac{1}{2}(a + x)\right]^3$, when $a = 1 - x$, is equal to',
        [r'$\frac{1}{6}$', r'$\frac{1}{8}$', r'$\frac{3}{2}$', r'$\frac{3}{8}$'],
        '5.1.1', 9,
        r'$a + x = (1 - x) + x = 1$. Thus $\left[\frac{1}{2}(1)\right]^3 = \frac{1}{8}$.',
        'B'
    ),
    # 19
    (
        r'One of the examples of polynomial expression is',
        [
            r'$5\sqrt{x} + 5$',
            r'$3x^3 + 4x^{2/3} + 6$',
            r'$3x^{-3} + 2x^2 + 3$',
            r'$5x^3 - \frac{4}{3}x^2 + \sqrt{3}$'
        ],
        '5.1.1', 9,
        r'A polynomial requires non-negative integer exponents of the variable. $5x^3 - \frac{4}{3}x^2 + \sqrt{3}$ has exponents $3$ and $2$ with real coefficients.',
        'D'
    ),
    # 20
    (
        r'On simplification of $\left(\frac{a^2 + a^2 b}{1 - b^2}\right)$, we get',
        [
            r'$\frac{2a^2}{1-b}$',
            r'$\frac{2a^2}{1+b}$',
            r'$\frac{a^2}{1-b}$',
            r'$\frac{a^2}{1+b}$'
        ],
        '6.2.2', 9,
        r'$\frac{a^2(1 + b)}{(1 - b)(1 + b)} = \frac{a^2}{1 - b}$.',
        'C'
    ),
    # 21
    (
        r'The value of $(x - y) \times (x^2 - xy + y^2)$ at $x = 1$ and $y = -1$ is',
        [r'$2$', r'$4$', r'$5$', r'$6$'],
        '5.1.1', 9,
        r'At $x = 1, y = -1$: $(x - y) = 1 - (-1) = 2$. $(x^2 - xy + y^2) = 1 - (1)(-1) + 1 = 3$. Product $= 2 \times 3 = 6$.',
        'D'
    ),
    # 22
    (
        r'On complete factorisation, $3 - 3p^2$ is equal to',
        [
            r'$3(1-p)^2$',
            r'$3(3-p)^2$',
            r'$3(1+p)(1-p)$',
            r'$3(3+p)(3-p)$'
        ],
        '5.2.1', 9,
        r'Factor out $3$: $3(1 - p^2) = 3(1 + p)(1 - p)$.',
        'C'
    ),
    # 23
    (
        r'The expression $r^2 - 3 + 6r + 12$ can also be written as',
        [r'$(r+3)^2$', r'$(r-3)^2$', r'$(r-3)^2 + 6^2$', r'$(r+3)^2 + 6^2$'],
        '5.2.1', 9,
        r'$r^2 + 6r + (-3 + 12) = r^2 + 6r + 9 = (r + 3)^2$.',
        'A'
    ),
    # 24
    (
        r'If a polynomial $q^3 x + q^3 + 1$ is divided by a linear expression, then the remainder is $1$. The linear expression must be',
        [r'$x + 1$', r'$x - 1$', r'$x + q$', r'$x - q$'],
        '5.3.2', 9,
        r'By the Remainder Theorem, dividing by $x - c$ gives $P(c) = 1 \implies q^3 c + q^3 + 1 = 1 \implies q^3(c + 1) = 0 \implies c = -1$. The divisor is $x - (-1) = x + 1$.',
        'A'
    ),
    # 25
    (
        r'On factorisation of $x(x + 2) + 1$, we get',
        [
            r'$x(x+3)$',
            r'$2x(x+1)$',
            r'$(x+1)(x+1)$',
            r'$(x+2)(x+1)$'
        ],
        '5.2.1', 9,
        r'$x^2 + 2x + 1 = (x + 1)^2 = (x + 1)(x + 1)$.',
        'C'
    ),
    # 26
    (
        r'On complete factorisation of $x + y - (x - y)(x + y)$, we get',
        [
            r'$(x+y)(x-y)$',
            r'$-(x+y)(x-y)$',
            r'$(x+y)(1-x-y)$',
            r'$(x+y)(1-x+y)$'
        ],
        '5.2.1', 9,
        r'Take common factor $(x + y)$: $(x + y)[1 - (x - y)] = (x + y)(1 - x + y)$.',
        'D'
    ),
    # 27
    (
        r'On complete factorisation of $x^2 - 2x + 2 - 1$, we get',
        [
            r'$(x-1)(x-1)$',
            r'$(x-1)(x+1)$',
            r'$(x-1)(x+2)$',
            r'$(x+1)(x-2)$'
        ],
        '5.2.1', 9,
        r'$x^2 - 2x + 1 = (x - 1)^2 = (x - 1)(x - 1)$.',
        'A'
    ),
    # 28
    (
        r'On factorisation of $b^3 - \frac{1}{b^3}$, we get',
        [
            r'$\left(b - \frac{1}{b}\right)\left(b^2 - 1 + \frac{1}{b^2}\right)$',
            r'$\left(b - \frac{1}{b}\right)\left(b^2 - 1 - \frac{1}{b^2}\right)$',
            r'$\left(b - \frac{1}{b}\right)\left(b^2 + 1 - \frac{1}{b^2}\right)$',
            r'$\left(b - \frac{1}{b}\right)\left(b^2 + 1 + \frac{1}{b^2}\right)$'
        ],
        '5.2.1', 9,
        r'Using difference of cubes formula $u^3 - v^3 = (u - v)(u^2 + uv + v^2)$ where $uv = b(1/b) = 1$: $\left(b - \frac{1}{b}\right)\left(b^2 + 1 + \frac{1}{b^2}\right)$.',
        'D'
    ),
    # 29
    (
        r'The polynomial $ax^3 - x^2 - x$ is divided by $x + 1$ and the remainder is $1$. The value of $a$ will be',
        [r'$-3$', r'$-1$', r'$1$', r'$3$'],
        '5.3.2', 9,
        r'Remainder $P(-1) = a(-1)^3 - (-1)^2 - (-1) = -a - 1 + 1 = -a$. Since remainder $= 1 \implies -a = 1 \implies a = -1$.',
        'B'
    ),
    # 30
    (
        r'The option which represents one of the zeros of the polynomial $x^3 + 2x^2 - x - 2$ is',
        [r'$-1$', r'$0$', r'$2$', r'$-3$'],
        '5.4.1', 9,
        r'Substitute $x = -1$: $(-1)^3 + 2(-1)^2 - (-1) - 2 = -1 + 2 + 1 - 2 = 0$. Hence $-1$ is a zero.',
        'A'
    ),
    # 31
    (
        r'If $R = [a \quad -b]$, then the additive inverse of $R$ is',
        [
            r'-[a \quad b]',
            r'-[a \quad -b]',
            r'-[-a \quad b]',
            r'-[-a \quad -b]'
        ],
        '18.3.7', 10,
        r'The additive inverse of matrix $R$ is $-R = -[a \quad -b]$. (Matrices topic moved to Grade X).',
        'B'
    ),
    # 32
    (
        r'If $N = \begin{bmatrix}0 & 0 \\ 1 & 1\end{bmatrix}$, then the transpose of $N$ is',
        [
            r'$\begin{bmatrix}0 & 1 \\ 0 & 1\end{bmatrix}$',
            r'$\begin{bmatrix}1 & 1 \\ 0 & 0\end{bmatrix}$',
            r'$\begin{bmatrix}0 & 1 \\ 1 & 0\end{bmatrix}$',
            r'$\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$'
        ],
        '18.2.2', 10,
        r'Rows become columns: row 1 $(0, 0)$ becomes column 1, row 2 $(1, 1)$ becomes column 2: $\begin{bmatrix}0 & 1 \\ 0 & 1\end{bmatrix}$. (Grade X).',
        'A'
    ),
    # 33
    (
        r'Given that $E = [0 \quad -1]$, $F = \begin{bmatrix}-1 \\ 0\end{bmatrix}$ and $G \times F = \begin{bmatrix}4 \\ 3\end{bmatrix}$.' + '\n' +
        r'The order of matrix $G$',
        [r'is $2 \times 1$', r'is $1 \times 2$', r'is $2 \times 2$', r'cannot be determined'],
        '18.4.2', 10,
        r'Let order of $G$ be $r \times c$. $F$ is $2 \times 1$, product $G \times F$ is $2 \times 1$. For multiplication $c = 2$; for result order $r = 2$. So $G$ is $2 \times 2$. (Grade X).',
        'C'
    ),
    # 34
    (
        r'Given that $E = [0 \quad -1]$ and $F = \begin{bmatrix}-1 \\ 0\end{bmatrix}$.' + '\n' +
        r'The product of matrices $E$ and $F$, i.e., $E \times F$ is',
        [
            r'$\begin{bmatrix}-1 \\ -1\end{bmatrix}$',
            r'$\begin{bmatrix}0 \\ 0\end{bmatrix}$',
            r'$[-2]$',
            r'$[0]$'
        ],
        '18.4.3', 10,
        r'$E \times F = [(0)(-1) + (-1)(0)] = [0 + 0] = [0]$. (Grade X).',
        'D'
    ),
    # 35
    (
        r'Given that $E = [0 \quad -1]$.' + '\n' +
        r'The multiplicative inverse of $E^2$',
        [
            r'is $[0 \quad 1]$',
            r'is $\begin{bmatrix}0 \\ 1\end{bmatrix}$',
            r'is $\begin{bmatrix}0 & 1 \\ 0 & 1\end{bmatrix}$',
            r'does not exist.'
        ],
        '18.5.7', 10,
        r'$E$ is a $1 \times 2$ non-square matrix. Matrix multiplication $E \times E$ is undefined because column count $2 \neq$ row count $1$. Thus $E^2$ and its inverse do not exist. (Grade X).',
        'D'
    ),
    # 36
    (
        r'The matrix $\begin{bmatrix}0 & 0 & 1 \\ 0 & 1 & 0 \\ 1 & 0 & 0\end{bmatrix}$ is a/ an',
        [
            r'unit matrix.',
            r'scalar matrix.',
            r'square matrix.',
            r'diagonal matrix.'
        ],
        '18.2.1', 10,
        r'The matrix has $3$ rows and $3$ columns, making it a square matrix. It is not diagonal, scalar, or identity because non-zero entries exist off the main diagonal. (Grade X).',
        'C'
    ),
    # 37
    (
        r'If the matrix $\begin{bmatrix}a & -a \\ b & b\end{bmatrix}$ is a singular matrix, then the condition will be',
        [r'$ab = \frac{1}{2}$', r'$ab = 0$', r'$ab = -\frac{1}{2}$', r'$a = -b$'],
        '18.5.3', 10,
        r'$\det = (a)(b) - (-a)(b) = ab + ab = 2ab$. A singular matrix has determinant zero: $2ab = 0 \implies ab = 0$. (Grade X).',
        'B'
    ),
    # 38
    (
        r'If a matrix equation is $3X - \begin{bmatrix}6 & 3 \\ 0 & 1\end{bmatrix} = \begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$, then the matrix $X$ will be',
        [
            r'$\begin{bmatrix}2 & 1 \\ 0 & \frac{1}{3}\end{bmatrix}$',
            r'$\begin{bmatrix}3 & 0 \\ -3 & -2\end{bmatrix}$',
            r'$\begin{bmatrix}-9 & -6 \\ -3 & -4\end{bmatrix}$',
            r'$\begin{bmatrix}-2 & -1 \\ 0 & -\frac{1}{3}\end{bmatrix}$'
        ],
        '18.6.1', 10,
        r'$3X = \begin{bmatrix}6 & 3 \\ 0 & 1\end{bmatrix} \implies X = \frac{1}{3}\begin{bmatrix}6 & 3 \\ 0 & 1\end{bmatrix} = \begin{bmatrix}2 & 1 \\ 0 & 1/3\end{bmatrix}$. (Grade X).',
        'A'
    ),
    # 39
    (
        r'The matrix form of the given simultaneous linear equations $x - 2y = 3$ and $y = -1$, will be',
        [
            r'$\begin{bmatrix}1 & 2 \\ 0 & 1\end{bmatrix}\begin{bmatrix}x \\ y\end{bmatrix} = \begin{bmatrix}-3 \\ 1\end{bmatrix}$',
            r'$\begin{bmatrix}1 & -2 \\ 0 & 1\end{bmatrix}\begin{bmatrix}x \\ y\end{bmatrix} = \begin{bmatrix}3 \\ -1\end{bmatrix}$',
            r'$\begin{bmatrix}1 & -2 \\ 1 & 0\end{bmatrix}\begin{bmatrix}x \\ y\end{bmatrix} = \begin{bmatrix}-3 \\ 1\end{bmatrix}$',
            r'$\begin{bmatrix}1 & -2 \\ 1 & 0\end{bmatrix}\begin{bmatrix}x \\ y\end{bmatrix} = \begin{bmatrix}3 \\ -1\end{bmatrix}$'
        ],
        '18.6.2', 10,
        r'Equations $1x - 2y = 3$ and $0x + 1y = -1$ translate to matrix equation $\begin{bmatrix}1 & -2 \\ 0 & 1\end{bmatrix}\begin{bmatrix}x \\ y\end{bmatrix} = \begin{bmatrix}3 \\ -1\end{bmatrix}$. (Grade X).',
        'B'
    ),
    # 40
    (
        r'In the given diagram, $\Delta EFG$ and $\Delta HIJ$ are congruent.' + '\n' +
        r'If $\angle E = y$, then the value of $y$',
        [r'is $66^\circ$', r'is $86^\circ$', r'is $94^\circ$', r'cannot be determined'],
        '12.1.1', 9,
        r'By triangle congruence $\Delta EFG \cong \Delta HIJ$, corresponding angles are congruent: $\angle E = \angle H = 66^\circ$. Thus $y = 66^\circ$.',
        'A'
    ),
    # 41
    (
        r'In the given diagram, $\Delta EFG$ and $\Delta HIJ$ are congruent.' + '\n' +
        r'The sum of the lengths $FG$ and $HJ$ is',
        [r'$2f$ units.', r'$hf$ units.', r'$2h$ units.', r'$f + h$ units.'],
        '12.1.1', 9,
        r'By congruence, corresponding sides are equal: $FG = IJ = h$ units, and $HJ = EG = f$ units. Sum $= FG + HJ = h + f = f + h$ units.',
        'D'
    ),
    # 42
    (
        r'In the given diagram, $PQRS$ is a parallelogram.' + '\n' +
        r'If $k = 24$, then the value of $r$ is equal to',
        [r'$3$', r'$8$', r'$16$', r'$32$'],
        '13.1.1', 9,
        r'Opposite sides of a parallelogram are equal: $PQ = SR \implies k - r = 8$. For $k = 24$: $24 - r = 8 \implies r = 16$.',
        'C'
    ),
    # 43
    (
        r'In the given diagram, $PQRS$ is a parallelogram.' + '\n' +
        r'The value of $\angle SRQ$ is equal to',
        [r'$15^\circ$', r'$28^\circ$', r'$43^\circ$', r'$71^\circ$'],
        '13.1.1', 9,
        r'Opposite angles of a parallelogram are equal: $\angle SRQ = \angle SPQ$. In $\Delta SPQ$, $\angle SPQ = 28^\circ + 43^\circ = 71^\circ$ (by alternate interior angles with $SR \parallel PQ$). Hence $\angle SRQ = 71^\circ$.',
        'D'
    ),
    # 44
    (
        r'In the given triangle, $VW$ is the longest side and $UV$ is the smallest side.' + '\n' +
        r'The CORRECT relationship between the angles is',
        [r'$c > a$', r'$b > a$', r'$a > c$', r'$c > b$'],
        None, 9,
        r'The angle opposite the longest side $VW$ is $\angle U = a$ (greatest angle). The angle opposite the smallest side $UV$ is $\angle W = c$ (smallest angle). Therefore $a > c$. (Historical triangle inequalities topic; no direct outcome in current syllabus).',
        'C'
    ),
    # 45
    (
        r'For the given triangle $ABC$, the length of side $AB$ is',
        [r'$x$ cm.', r'$y$ cm.', r'$x - y$ cm.', r'$x - \frac{y}{2}$ cm.'],
        '13.1.1', 9,
        r'In $\Delta ABC$, $\angle C = 180^\circ - (74^\circ + 53^\circ) = 53^\circ$. Since $\angle B = \angle C = 53^\circ$, $\Delta ABC$ is isosceles with $AB = AC = y$ cm.',
        'B'
    ),
    # 46
    (
        r'In the correspondence of $\Delta ABC \leftrightarrow \Delta PQR$, if $AB = PQ$, $BC = QR$ and $CA = RP$, then the correct relation between the angles will be',
        [
            r'$\angle A = \angle R$',
            r'$\angle B = \angle R$',
            r'$\angle A = \angle Q$',
            r'$\angle B = \angle Q$'
        ],
        '12.1.1', 9,
        r'By SSS congruence $\Delta ABC \cong \Delta PQR$. Corresponding vertices are $A \leftrightarrow P, B \leftrightarrow Q, C \leftrightarrow R$, so $\angle B = \angle Q$.',
        'D'
    ),
    # 47
    (
        r'In the given triangle $ABC$, $DE$ is parallel to $AB$. The CORRECT relation between the sides is',
        [r'$AC = BC$', r'$AD = DC$', r'$DC = EC$', r'$AC = 2BE$'],
        '13.1.1', 9,
        r'Given $DE \parallel AB$ and $DE = a = \frac{1}{2}(2a) = \frac{1}{2}AB$, by the converse of the Midpoint Theorem, $D$ is the midpoint of $AC$, meaning $AD = DC$.',
        'B'
    ),
    # 48
    (
        r'In the given triangle $ABC$, the points $D, E$ and $F$ are the midpoints of the sides $AC, AB$ and $BC$ respectively. The line segments $AF, BD$ and $CE$ are the',
        [
            r'altitudes.',
            r'medians.',
            r'right bisectors.',
            r'angle bisectors.'
        ],
        '21.1.2', 10,
        r'A line segment connecting a triangle vertex to the midpoint of the opposite side is a median. (Practical geometry constructions of concurrent lines moved to Grade X).',
        'B'
    ),
    # 49
    (
        r'In the given diagram, $AB$ is a line segment and $AC = BC$.' + '\n' +
        r'The CORRECT relation of $AD$, $BD$ and $\angle D$ is',
        [
            r'$AD \neq BD$ and $\angle D \neq 90^\circ$',
            r'$AD \neq BD$ and $\angle D = 90^\circ$',
            r'$AD = BD$ and $\angle D = 90^\circ$',
            r'$AD = BD$ and $\angle D \neq 90^\circ$'
        ],
        '10.1.3', 9,
        r'Any point equidistant from the endpoints of a line segment lies on its right bisector. Thus the line through $C$ is perpendicular to $AB$ ($\angle D = 90^\circ$) and bisects $AB$ ($AD = BD$).',
        'C'
    ),
    # 50
    (
        r'The CORRECT measures of the sides of a triangle are',
        [
            r'$5$ cm, $7$ cm and $13$ cm.',
            r'$6$ cm, $6$ cm and $12$ cm.',
            r'$7$ cm, $7$ cm and $10$ cm.',
            r'$9$ cm, $3$ cm and $14$ cm.'
        ],
        None, 9,
        r'By the Triangle Inequality Theorem, the sum of any two sides must exceed the third: $7 + 7 = 14 > 10$. In all other options, the sum of the two smaller sides is $\le$ the largest side. (Historical curriculum topic).',
        'C'
    ),
]

# Pixel-perfect crop regions: (page_0_indexed, rect(x0, y0, x1, y1))
CROPS = {
    4: (1, (340, 505, 510, 625)),
    5: (1, (340, 505, 510, 625)),
    40: (10, (85, 135, 540, 325)),
    41: (10, (85, 135, 540, 325)),
    42: (11, (115, 135, 530, 290)),
    43: (11, (115, 135, 530, 290)),
    44: (11, (110, 505, 530, 645)),
    45: (12, (220, 110, 555, 240)),
    46: (12, (90, 415, 555, 570)),
    47: (13, (80, 110, 535, 295)),
    48: (13, (180, 465, 535, 625)),
    49: (14, (240, 115, 550, 290)),
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
    crop_folder = ROOT / 'public/paper-crops/MTH-IX-2021-P1'
    crop_folder.mkdir(parents=True, exist_ok=True)
    for number, (pno, box) in CROPS.items():
        out_img = crop_folder / f'q{number}.png'
        documents['p1'][pno].get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=pymupdf.Rect(box)).save(str(out_img))
        crops.append({
            'paper': 'p1',
            'question': str(number),
            'page': pno + 1,
            'box': box,
            'sourceSha256': sources['p1']['sha256'],
            'url': f'/paper-crops/MTH-IX-2021-P1/q{number}.png'
        })

    # 2. Read official key
    key_doc = documents['key']
    key_lines = []
    for p in key_doc:
        for l in p.get_text().splitlines():
            l = l.strip()
            if l:
                key_lines.append(l)

    keys = []
    i = 0
    while i < len(key_lines):
        if key_lines[i].isdigit() and 1 <= int(key_lines[i]) <= 50 and i + 6 < len(key_lines):
            if '.' in key_lines[i+1]:
                qid = int(key_lines[i])
                slo = key_lines[i+1]
                ans = key_lines[i+2]
                uni = key_lines[i+3]
                k_val = key_lines[i+4]
                u_val = key_lines[i+5]
                a_val = key_lines[i+6]
                cog = 'K' if k_val == '1' else 'U' if u_val == '1' else 'A' if a_val == '1' else 'U'
                keys.append({'question': str(qid), 'oldSlo': slo, 'answer': ans, 'level': cog})
                i += 7
                continue
        i += 1

    assert len(keys) == 50, f"Expected 50 keys, found {len(keys)}"
    by_number = {int(k['question']): k for k in keys}

    # 3. Load syllabus outcomes for mapping
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

    # 4. Build MCQs JSON
    page_ranges = [
        (2, 1, 5), (3, 6, 11), (4, 12, 15), (5, 16, 19),
        (6, 20, 24), (7, 25, 29), (8, 30, 33), (9, 34, 37),
        (10, 38, 39), (11, 40, 41), (12, 42, 44), (13, 45, 46),
        (14, 47, 48), (15, 49, 50)
    ]

    mcqs = []
    for n, (stem, options, code, grade, reason, solved) in enumerate(MCQS, 1):
        key = by_number[n]
        page = next(p for p, start, end in page_ranges if start <= n <= end)
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

    # 5. Manifest and review
    manifest = {
        'subject': 'Mathematics',
        'level': 'SSC-I',
        'grade': 9,
        'examYear': 2021,
        'examSession': 'April-May',
        'examType': 'ANNUAL',
        'sources': sources,
        'crops': crops,
        'mcqCount': len(mcqs),
        'summary': {
            'p1': {
                'questions': len(mcqs),
                'verifiedAnswers': sum(1 for q in mcqs if q['answerStatus'] in ['VERIFIED', 'ANSWER_CORRECTED']),
                'inScopeCount': sum(1 for q in mcqs if q['mappingStatus'] == 'IN_SCOPE'),
                'movedCount': sum(1 for q in mcqs if q['mappingStatus'] == 'MOVED_TO_GRADE_X'),
                'noDirectOutcomeCount': sum(1 for q in mcqs if q['mappingStatus'] == 'NO_DIRECT_OUTCOME'),
            }
        }
    }

    write(OUT / 'ssc1_2021_past_mcqs.json', mcqs)
    write(OUT / 'ssc1_2021_source_manifest.json', manifest)

    review_lines = [
        '# Mathematics SSC-I (Class IX) Annual 2021 Review\n',
        f'- **MCQs Total:** {len(mcqs)}',
        f'- **In-Scope (Current Grade 9):** {manifest["summary"]["p1"]["inScopeCount"]}',
        f'- **Moved to Grade 10:** {manifest["summary"]["p1"]["movedCount"]}',
        f'- **No Direct Outcome (Historical):** {manifest["summary"]["p1"]["noDirectOutcomeCount"]}',
        f'- **Crops extracted:** {len(crops)}\n',
        '## Questions Review\n',
        '| # | Old SLO | New SLO | Grade | Status | Key | Solved | Match | Diagram |',
        '|---|---|---|---|---|---|---|---|---|',
    ]
    for q in mcqs:
        match_str = 'VERIFIED' if q['correctOption'] == q['official_answer'] else q['answerStatus']
        diag = f"[image]({q['diagramUrl']})" if q['diagramUrl'] else 'No'
        review_lines.append(
            f"| {q['questionNumber']} | {q['originalSlo']} | {q['current_slo']} | {q['mapping_scope']['grade']} | {q['mappingStatus']} | {q['official_answer']} | {q['solved_correct_option']} | {match_str} | {diag} |"
        )

    (REVIEW / 'review.md').write_text('\n'.join(review_lines) + '\n', encoding='utf-8')

    print(json.dumps({
        'mcqs': len(mcqs),
        'crops': len(crops),
        'ungradableMCQs': [q['questionNumber'] for q in mcqs if not q['correctOption']],
        'mappingCounts': {
            'IN_SCOPE': manifest['summary']['p1']['inScopeCount'],
            'MOVED_TO_GRADE_X': manifest['summary']['p1']['movedCount'],
            'NO_DIRECT_OUTCOME': manifest['summary']['p1']['noDirectOutcomeCount'],
        }
    }, indent=2))


if __name__ == '__main__':
    prepare()
