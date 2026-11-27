type WrittenItem = {
  number: string; page: number; notesPage: number; originalSlo: string; slo: string;
  level: 'U' | 'A'; stem: string; solution: string; hints: string; diagram?: boolean; numerical?: boolean;
};

export const mathematicsIx2026Written: WrittenItem[] = [
  {
    number: '1', page: 3, notesPage: 2, originalSlo: '1.5.1', slo: '1.5.1', level: 'A',
    stem: String.raw`Solve $4^{10}=\frac{2^6}{4^x}$ for $x$.`,
    solution: String.raw`Write both sides with base 2. The equation becomes $2^{20}=2^{6-2x}$. Equate the exponents to get $20=6-2x$. Therefore $x=-7$.`,
    hints: 'Credit conversion to a common base, correct use of the exponent laws, and solution of the resulting linear equation.',
  },
  {
    number: '2', page: 3, notesPage: 4, originalSlo: '2.4.1', slo: '2.4.1', level: 'A',
    stem: String.raw`Given $\log 3=0.4771$ and $\log 5=0.6989$, find $\log 45$ using the given values.`,
    solution: String.raw`Since $45=3^2\cdot5$, $\log45=2\log3+\log5$. Using the supplied rounded values gives $2(0.4771)+0.6989=1.6531$.`,
    hints: 'Show the factorisation of 45, apply the logarithm laws, and substitute the stated values before adding.',
  },
  {
    number: '3', page: 4, notesPage: 6, originalSlo: '3.4.2', slo: '3.4.2', level: 'A', diagram: true,
    stem: String.raw`Let $A=\{1,2,3,4,7\}$, $B=\{3,4,5,6\}$ and $C=\{4,6,7,8,9\}$.

(a) Find $A\cap(B\cup C)$. (2 marks)

(b) Shade the corresponding regions on the Venn diagram. (1 mark)`,
    solution: String.raw`**a.** $B\cup C=\{3,4,5,6,7,8,9\}$. Keeping only the elements in $A$ gives $\{3,4,7\}$.

**b.** Shade the regions containing 3, 4 and 7. These are the A-and-B overlap outside C, the triple overlap, and the A-and-C overlap outside B.`,
    hints: 'Credit a correct union and intersection. The shading must agree with the result in part (a).',
  },
  {
    number: '4a', page: 4, notesPage: 9, originalSlo: '4.2.2', slo: '4.2.2', level: 'U',
    stem: String.raw`An inverse function is given by $f^{-1}(x)=\frac{x+3}{5}$. Determine $f(x)$.`,
    solution: String.raw`Set $y=\frac{x+3}{5}$, so $x=5y-3$. Interchange the variable roles to obtain $f(x)=5x-3$.`,
    hints: 'Reverse the inverse function by exchanging input and output, then isolate the new output.',
  },
  {
    number: '4b', page: 5, notesPage: 11, originalSlo: '4.4.1 and 4.4.2', slo: '4.4.1', level: 'A', diagram: true,
    stem: String.raw`(i) Draw the graph of $f(x)=-x$ for $-4\le x\le4$. (2 marks)

(ii) State the range of the function on this domain. (1 mark)`,
    solution: String.raw`**i.** Plot $(-4,4)$, $(0,0)$ and $(4,-4)$, then join them with a straight line segment. Include both endpoints.

**ii.** The range is $[-4,4]$.`,
    hints: 'Plot points that lie on the decreasing line and restrict the graph to the given closed interval. State the full range including both endpoints.',
  },
  {
    number: '5a', page: 6, notesPage: 14, originalSlo: '5.1.1', slo: '5.1.1', level: 'A',
    stem: 'If $a+2b+3c=5$ and $4ab+12bc+6ac=12$, find $a^2+4b^2+9c^2$.',
    solution: 'Expanding $(a+2b+3c)^2$ gives $a^2+4b^2+9c^2+4ab+12bc+6ac$. The square is 25 and the sum of cross terms is 12. The required value is 13.',
    hints: 'Square the three-term expression, identify the cross terms and subtract their given sum.',
  },
  {
    number: '5b', page: 6, notesPage: 17, originalSlo: '5.4.1', slo: '5.4.1', level: 'A',
    stem: 'Use the polynomial $P(x)=x^3-2x^2-5x+6$ to prove that $x-1$ and $x+2$ are linear factors.',
    solution: 'Compute $P(1)=1-2-5+6=0$ and $P(-2)=-8-8+10+6=0$. By the factor theorem, $x-1$ and $x+2$ are both factors. In full, $P(x)=(x-1)(x+2)(x-3)$.',
    hints: 'Credit evaluation at 1 and −2 and a correct conclusion from the factor theorem.',
  },
  {
    number: '6', page: 6, notesPage: 19, originalSlo: '6.4.2', slo: '6.4.2', level: 'U',
    stem: String.raw`Find $A$ and $B$ such that $\frac{x}{(x-1)^2}=\frac{A}{x-1}+\frac{B}{(x-1)^2}$ for $x\ne1$.`,
    solution: 'Clear the denominator to get the polynomial identity $x=A(x-1)+B$. Matching coefficients gives $A=1$ and $B-A=0$, so $B=1$.',
    hints: 'Use the common denominator, then match coefficients or use two valid values in the polynomial identity.',
  },
  {
    number: '7a', page: 7, notesPage: 21, originalSlo: '7.1.4', slo: '7.1.4', level: 'A',
    stem: String.raw`Solve $\frac{2a\sqrt{x}}{b}-\frac{a\sqrt{x}}{2b}=\frac{2a}{b}$ over the real numbers, where $a$ and $b$ are constants and $b\ne0$. Verification is optional.`,
    solution: String.raw`Multiply by $2b$ to get $3a\sqrt{x}=4a$. If $a\ne0$, then $\sqrt{x}=\frac43$, so $x=\frac{16}{9}$. If $a=0$, the equation holds for every $x\ge0$, the real domain of the radical.`,
    hints: 'Clear the denominators, isolate the square root and square both sides. The published worked method divides by a, which assumes that a is nonzero.',
  },
  {
    number: '7b', page: 8, notesPage: 24, originalSlo: '7.3.4 and 7.3.6', slo: '7.3.5', level: 'A', diagram: true,
    stem: String.raw`On the given coordinate plane, graph $2x-y\le6$ and $x+y\le3$, with $x\ge0$ and $y\ge0$. (2 marks) Shade their common solution region. (1 mark)`,
    solution: String.raw`Draw solid boundary lines $y=2x-6$ and $y=3-x$. Shade the part of the first quadrant on or above the first line and on or below the second. The resulting triangle has vertices $(0,0)$, $(0,3)$ and $(3,0)$. All three edges are included.`,
    hints: 'Credit each correctly drawn boundary and shade only the region satisfying both inequalities and both nonnegativity conditions.',
  },
  {
    number: '8', page: 9, notesPage: 28, originalSlo: '9.2.2', slo: '9.2.2', level: 'A',
    stem: String.raw`The points are $P=(-\frac m5,0)$ and $Q=(-\frac n3,2)$. The x-coordinate of their midpoint is $\frac5{30}$. Express $m$ in terms of $n$.`,
    solution: String.raw`The midpoint equation is $\frac{-m/5-n/3}{2}=\frac5{30}$. Multiply by 30 to obtain $-3m-5n=5$. Rearranging gives $m=-\frac{5n+5}{3}$.`,
    hints: 'Use the average of the x-coordinates. Preserve both negative signs when clearing denominators and isolate m.',
  },
  {
    number: '9a', page: 10, notesPage: 31, originalSlo: '14.3.1', slo: '14.3.1', level: 'A', diagram: true, numerical: true,
    stem: String.raw`The diagonal of square $ABCD$ is $5\sqrt2$ cm. Find the side length.`,
    solution: String.raw`The diagonal and two sides form a right triangle. If each side is $s$, then $2s^2=(5\sqrt2)^2=50$. Taking the positive root gives $s=5$ cm.`,
    hints: 'Identify the right triangle, substitute the diagonal into Pythagoras’ theorem and give the positive side length with units.',
  },
  {
    number: '9b', page: 10, notesPage: 33, originalSlo: '14.4.1, 14.2.1, and 14.2.2', slo: '14.4.1', level: 'U',
    stem: String.raw`Match each expression in column A with its equivalent or sign in column B. Take $\theta$ to be acute for the first expression.

| Column A | Choices in column B |
| --- | --- |
| $\sec\theta$ | $\sqrt3$ |
| $\sin210^\circ$ | $\sqrt{1+\tan^2\theta}$ |
| $\tan60^\circ$ | Negative |
| | $\sin60^\circ$ |
| | $\frac1{\sqrt3}$ |`,
    solution: String.raw`$\sec\theta$ matches $\sqrt{1+\tan^2\theta}$ because secant is positive for an acute angle. $\sin210^\circ$ matches Negative because $210^\circ$ is in quadrant III and its sine is $-\frac12$. $\tan60^\circ$ matches $\sqrt3$.`,
    hints: 'Credit one mark per correct match. The square-root identity gives the absolute value of secant in general, so its sign matters.',
  },
  {
    number: '9c', page: 11, notesPage: 35, originalSlo: '9.5.2', slo: '14.3.1', level: 'A', diagram: true, numerical: true,
    stem: String.raw`In the diagram, $AB=10$ cm is perpendicular to $CD$, the angle at D is $45^\circ$, and the angle at C is $30^\circ$. Find $CD$.`,
    solution: String.raw`In triangle ABD, $DB=\frac{10}{\tan45^\circ}=10$ cm. In triangle ABC, $BC=\frac{10}{\tan30^\circ}=10\sqrt3$ cm. Add these lengths to obtain $CD=10(1+\sqrt3)$ cm, about $27.32$ cm.`,
    hints: 'Use the common perpendicular as the opposite side of each right triangle. Calculate the two adjoining base lengths and add them. The printed 9.5.2 reference is retained as a source reference. The direct outcome in the current syllabus is 14.3.1.',
  },
];
