type WrittenRow = readonly [number: string, paperPage: number, notesPage: number, marks: number, originalSlo: string, currentSlo: string, level: 'U' | 'A', worked: boolean, stem: string, solution: string, hints: string];
const math = String.raw;

export const mathematicsX2026Written: readonly WrittenRow[] = [
  ['1', 3, 2, 3, '14.4.1', '22.4.1', 'A', true, math`Complete the frequency table. Find the variance and standard deviation of the data.

| Class interval | Frequency $f$ | Class mark $x$ | $fx$ | $fx^2$ |
| --- | ---: | ---: | ---: | ---: |
| 1.5–4.5 | 2 | 3 | 6 | |
| 4.5–7.5 | 8 | 6 | 48 | |
| 7.5–10.5 | 10 | 9 | 90 | |
| 10.5–13.5 | 6 | 12 | 72 | |
| 13.5–16.5 | 4 | 15 | 60 | |
| Total | 30 | — | 276 | |`,
    math`The $fx^2$ entries are $18,288,810,864,900$, totalling $2880$. The mean is $276/30=9.2$. Hence the variance is $2880/30-(9.2)^2=11.36$ and the standard deviation is $\sqrt{11.36}\approx 3.37$.`,
    '1 mark for the completed column and total, 1 for the variance, and 1 for the standard deviation.'],
  ['2a', 4, 4, 4, '15.1.2', '6.1.1', 'A', true,
    math`Find the least common multiple of $P(x)=3x^3-27x$ and $Q(x)=x^2-6x-27$.`,
    math`Factor $P(x)=3x(x-3)(x+3)$ and $Q(x)=(x-9)(x+3)$. Take every factor to its highest power. The LCM is $3x(x-3)(x+3)(x-9)$.`,
    'Factorise both polynomials, then include each distinct factor at its highest required power.'],
  ['2b', 4, 7, 4, '16.2.1', '6.4.2', 'A', true,
    math`If $\frac{2+3x}{x^2+6x+9}=\frac{P}{(x+3)^2}+\frac{Q}{x+3}$, find $P$ and $Q$.`,
    math`The denominator is $(x+3)^2$. Clear it to get $2+3x=P+Q(x+3)$. Comparing coefficients gives $Q=3$ and $P+9=2$, so $P=-7$.`,
    'Clear the common denominator and find both constants by comparison or substitution.'],
  ['3a', 5, 10, 3, '17.1.3', '7.1.4', 'A', true,
    math`Find $x$ for $\frac{\sqrt{x-\frac14}}{2}-\frac23=0$.`,
    math`Isolate the radical: $\sqrt{x-\frac14}=\frac43$. Squaring gives $x-\frac14=\frac{16}{9}$, so $x=\frac{73}{36}$. Substitution gives $\frac{(4/3)}2-\frac23=0$.`,
    'Isolate the radical, square both sides, then solve the linear equation.'],
  ['3b', 5, 12, 3, '17.2.2', '7.2.2', 'A', true,
    math`If $m=\frac52$, find the value(s) of $x$ satisfying $\lvert3x-5\rvert=15-2m$.`,
    math`Substitution gives $\lvert3x-5\rvert=10$. The equation $3x-5=10$ gives $x=5$, and $3x-5=-10$ gives $x=-\frac53$.`,
    '1 mark for substitution and 1 mark for each solution.'],
  ['4', 6, 14, 3, '18.1.6', '16.2.1', 'A', true,
    math`(i) Complete the given table for $y=\frac{6-3x}{2}$. (1 mark)

| $x$ | $0$ | $4$ |
| --- | --- | --- |
| $y$ | $3$ | |

(ii) Draw the graph using the values from the table. (2 marks)`,
    math`When $x=4$, $y=(6-12)/2=-3$. Plot $(0,3)$ and $(4,-3)$ on labelled axes, and draw the straight line through them. It crosses the $x$-axis at $(2,0)$.`,
    '1 mark for the missing value, then use the points to plot the line.'],
  ['5', 7, 17, 3, '19.2.1', '15.2.1', 'A', true,
    math`Solve $x^2-x-1=0$ by completing the square.`,
    math`Rewrite as $x^2-x=1$ and add $\frac14$ to both sides. Then $(x-\frac12)^2=\frac54$, giving $x=\frac{1\pm\sqrt5}{2}$.`,
    'Move the constant, complete the square, and obtain both roots.'],
  ['6', 7, 19, 3, '20.2.3', '9.1.3', 'A', true,
    math`The vertices of a triangle are $A(-1,2)$, $B(-1,0)$ and $C(0,1)$. Given $\lvert BC\rvert=\sqrt2$ units, identify the type of triangle.`,
    math`The distance formula gives $AB=2$ and $AC=\sqrt{1^2+(-1)^2}=\sqrt2$. Thus $AC=BC$, so it is isosceles. Also $AC^2+BC^2=4=AB^2$, so the triangle is right-angled at $C$.`,
    'Find AB and AC, then use the side lengths to classify the triangle.'],
  ['7a', 8, 20, 4, '21.4.2', '14.4.2', 'A', false,
    math`Prove that $\frac1{\sin\theta}-\sin\theta=\cot\theta\cos\theta$.`,
    math`With $\sin\theta\ne0$, combine the terms to obtain $\frac{1-\sin^2\theta}{\sin\theta}$. Since $1-\sin^2\theta=\cos^2\theta$, this is $\frac{\cos\theta}{\sin\theta}\cos\theta=\cot\theta\cos\theta$.`,
    'Use a common denominator, the Pythagorean identity, and the quotient definition of cotangent.'],
  ['7b', 8, 23, 4, '22.1.1(a)', '14.3.1', 'A', true,
    math`The figure shows rectangle $ABEC$ and right triangles $ABC$ and $ACD$. Using the given lengths, find $ED$.`,
    math`Since $AB=EC=10$ cm, $AC^2=BC^2-AB^2=225-100=125$. Then $CD^2=AD^2-AC^2=900-125=775$, so $CD=5\sqrt{31}$ cm. The full length is $ED=EC+CD=10+5\sqrt{31}\approx37.84$ cm.`,
    'Apply the Pythagorean theorem in both triangles, then add EC and CD.'],
  ['8a', 9, 25, 4, '26.1.1', '20.4.1', 'U', true,
    math`In the figure, $AD$ is parallel to $BO$ and $\angle ADC=40^\circ$. Find (i) $\angle AOC$, (ii) $\angle ACD$, (iii) $\angle ABC$, and (iv) $\angle OAC$. Each angle is worth 1 mark.`,
    math`(i) The central angle for the same arc is $2(40^\circ)=80^\circ$. (ii) Since $DC$ is a diameter, $\angle DAC=90^\circ$, giving $\angle ACD=50^\circ$. (iii) Opposite angles of the cyclic quadrilateral sum to $180^\circ$, giving $\angle ABC=140^\circ$. (iv) In isosceles triangle $AOC$, the base angles are $(180^\circ-80^\circ)/2=50^\circ$.`,
    '1 mark for each correct angle. Justify the results with the appropriate circle theorems.'],
  ['8b', 10, 28, 4, '23.1.1', '20.1.1', 'U', true,
    math`In the figure, $O$ is the centre and $OP=OQ$. (i) Find an expression for $KL+MN$ if $MN=2(x+5)$ units. (ii) If $MQ+QN=20$ units, find $\frac32 QN$. Each part is worth 2 marks.`,
    math`(i) Using $OP$ and $OQ$ as the perpendicular distances from the centre to the chords, the chords are congruent. So $KL+MN=4(x+5)=4x+20$. (ii) The perpendicular from the centre bisects $MN$, so $QN=MQ=10$ and $\frac32 QN=15$ units.`,
    'Use congruent chords to find their sum, then use the bisection theorem to find QN and multiply by three halves.'],
  ['9', 11, 30, 3, '27.2.6', '21.3.2', 'A', false,
    'Draw a circumscribed square around the circle in the diagram.',
    'Construct the perpendicular bisector of the given diameter. It intersects the circle at the endpoints of a second diameter. Draw the tangent at each of the four endpoints, perpendicular to its radius, and extend the tangents to meet. These four intersection points form the vertices of the circumscribed square.',
    'Draw the perpendicular bisector, construct the tangents at the four points, and complete the square.'],
];
