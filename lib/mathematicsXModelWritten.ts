type ModelWritten = readonly [number: string, page: number, marks: number, slo: string, worked: boolean, stem: string, solution: string];
const math = String.raw;

export const mathematicsXModelWritten: readonly ModelWritten[] = [
  ['1',3,3,'15.2.1',true,math`Find the solution set of $3x^2-4x+2=0$ using the quadratic formula.`,
    math`The discriminant is $(-4)^2-4(3)(2)=-8$. So $x=\frac{4\pm\sqrt{-8}}6=\frac{2\pm i\sqrt2}{3}$. There are no real solutions. The displayed pair is the solution set over the complex numbers.`],
  ['2',4,4,'16.2.1',true,math`Use the given values to draw the two linear graphs. Then find their solution graphically.

| $x$ | $-2$ | $-1$ | $4$ |
| --- | --- | --- | --- |
| $y=-x+3$ | $5$ | $4$ | $-1$ |
| $y=x-1$ | $-3$ | $-2$ | $3$ |`,
    math`Plot $(-1,4)$ and $(4,-1)$ for the descending line, and $(-2,-3)$ and $(4,3)$ for the rising line. Extend each as a straight line. The graphs intersect at $(2,1)$. Both expressions give 1 when $x=2$.`],
  ['3',5,3,'17.3.5',true,math`If $s=(1-i)^2+\left(\frac1{i^2}\right)^2$, find $\overline s$.`,
    math`Use $i^2=-1$. Then $(1-i)^2=-2i$ and $\left(1/i^2\right)^2=1$. Thus $s=1-2i$, so $\overline{s}=1+2i$.`],
  ['4a',6,4,'18.5.8',true,math`For $A=\begin{bmatrix}2&3\\6&2\end{bmatrix}$, find (i) its determinant (1 mark) and inverse (1 mark). (ii) Use the inverse to show that $A^{-1}A=I$. (2 marks)`,
    math`$\det A=2\cdot2-3\cdot6=-14$. Thus $A^{-1}=-\frac1{14}\begin{bmatrix}2&-3\\-6&2\end{bmatrix}$. The product of the adjugate with $A$ is $\begin{bmatrix}-14&0\\0&-14\end{bmatrix}$, and multiplying by $-1/14$ gives $I$.`],
  ['4b',7,4,'18.5.9',true,math`For $A=\begin{bmatrix}1&2\\0&1\end{bmatrix}$ and $B=\begin{bmatrix}1&0\\0&1\end{bmatrix}$, verify $(AB)^{-1}=B^{-1}A^{-1}$.`,
    math`Since $B=I$, $AB=A$ and $B^{-1}=I$. The inverse of $A$ is $\begin{bmatrix}1&-2\\0&1\end{bmatrix}$. The left-hand side equals this matrix, and so does $IA^{-1}$ on the right-hand side.`],
  ['5a',8,3,'19.3.2',true,'A ship is 15 miles west and 20 miles south of an island. What bearing takes the ship directly to the island?',
    math`From the ship the island is 15 miles east and 20 miles north. Measure clockwise from north: $\theta=\tan^{-1}(15/20)\approx36.87^\circ$. The nearest whole-degree three-figure bearing is $037^\circ$.`],
  ['5b',8,3,'19.3.2',true,math`A bike travels 500 miles on a bearing of $040^\circ$ towards the northeast. Find the distance travelled towards the east.`,
    math`The bearing is measured from north. The eastward component is opposite the $40^\circ$ angle, so it is $500\sin40^\circ\approx321.4$ miles.`],
  ['6',9,3,'20.3.1',true,math`In the circle with centre $O$, $AB=CD$. Find (i) $\angle AOB$, (ii) $\angle AOC$, and (iii) $\angle OCD$. Each angle is worth 1 mark.`,
    math`(i) Equal chords subtend equal central angles, so $\angle AOB=\angle COD=120^\circ$. (ii) $A,O,D$ are collinear, so $\angle AOC=180^\circ-120^\circ=60^\circ$. (iii) Since $OC=OD$, each base angle of triangle $OCD$ is $(180^\circ-120^\circ)/2=30^\circ$.`],
  ['7',10,3,'21.3.2',false,math`Draw two tangents to the given circle from a point 7 cm away from the centre $P$.`,
    math`Mark an external point $T$ with $PT=7$ cm and bisect $PT$ at $M$. Draw an auxiliary circle with centre $M$ and radius $MP$. It intersects the given circle at $U$ and $V$. Join $TU$ and $TV$. Because $PT$ is a diameter of the auxiliary circle, $\angle PUT$ and $\angle PVT$ are right angles, so the lines are tangent to the given circle.`],
  ['8a',11,4,'22.4.2',true,math`Calculate the coefficient of variation of the students’ weekly study hours from the given frequency table.`,
    math`The totals are $\sum f=40$, $\sum fx=1020$ and $\sum fx^2=31800$. Then $\bar x=25.5$ and $\sigma^2=31800/40-(25.5)^2=144.75$. So $\sigma\approx12.031$ and $\mathrm{CV}=100\sigma/25.5\approx47.18\%$.`],
  ['8b',12,4,'22.3.7',true,'Use the cumulative frequency graph to estimate (i) the median and (ii) the first quartile. Find (iii) the number of students scoring more than 70 and (iv) the difference between the estimates in (i) and (ii). Each part is worth 1 mark.',
    math`There are 100 students. (i) At cumulative frequency 50, the marks are about 50. (ii) At cumulative frequency 25, interpolate between $(10,0)$ and $(25,40)$ to get about $19.4$ marks. (iii) The cumulative frequency at 70 is 80, leaving $100-80=20$ students above 70. (iv) The difference is approximately $50-19.4=30.6$ marks. Estimates read by eye may vary slightly.`],
  ['9',13,3,'23.1.2',true,'A coin is tossed and a die is rolled simultaneously. (a) Write the sample space. (2 marks) (b) Find the probability of a head and a die result greater than 3. (1 mark)',
    math`(a) The outcomes are $(H,1),(H,2),(H,3),(H,4),(H,5),(H,6),(T,1),(T,2),(T,3),(T,4),(T,5),(T,6)$, where $H$ is heads and $T$ is tails. (b) The favourable outcomes are $(H,4),(H,5),(H,6)$, so the probability is $3/12=1/4$.`],
];
