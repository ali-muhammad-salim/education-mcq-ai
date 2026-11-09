"""Prepare the source-reviewed 2023 Mathematics IX papers, without database writes."""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'
DEST = ROOT/'public/materials/ssc/mathematics/ssc-1'
OUT = ROOT/'data/mathematics'
REVIEW = ROOT/'output/mathematics-ix-2023'
FILES = {'p1':('Mathematics-IX-Paper-I-2023.pdf','mathematics-ix-2023-paper-i.pdf'), 'p2':('Mathematics-IX-Paper-II-2023.pdf','mathematics-ix-2023-paper-ii.pdf'), 'key':('Mathematics-IX-Keys-2023.pdf','mathematics-ix-2023-keys.pdf'), 'em':('E-marking-Notes-Mathematics-IX-2023.pdf','mathematics-ix-2023-emarking.pdf')}

# Source stem, four choices in printed order, semantic target SLO and grade,
# independent reasoning, and independently checked answer. None means no direct
# current IX-X outcome; it never means that the historical question is deleted.
MCQS = [
 (r'If $A=\{1,2,3\}$ and $A\cup B=\{1,2,3,4,5\}$, then the possible set(s) represented by $B$ could be\nI. $\{3,4,5\}$\nII. $\{1,3,5\}$\nIII. $\{4,5\}$', ['I only.','II only.','I and III.','II and III.'], '3.2.2',9,'B must contain 4 and 5, which are absent from A. Sets I and III satisfy this; set II omits 4.','C'),
 ('There are 10 balls in a bag. The balls are numbered as 1 to 10. Amaan wants to separate the balls in three sets of even (E), odd (O) and prime (P) numbers as shown in the given Venn diagram.\n\nThe overlapping region between O and P, represented as X, will contain the balls numbered as', [r'$\{1,2,3,5,7,9\}$',r'$\{3,5,7,9\}$',r'$\{2,3,5,7\}$',r'$\{3,5,7\}$'],'3.4.2',9,'The odd primes from 1 to 10 are 3, 5 and 7. One is not prime, and two is even.','D'),
 (r'If $M$, $N$ and $Q$ are any non-empty sets, then $M\cup(N\cap Q)$ is equal to', [r'$(M\cap N)\cap(M\cap Q)$',r'$(M\cup N)\cup(M\cup Q)$',r'$(M\cap N)\cup(M\cap Q)$',r'$(M\cup N)\cap(M\cup Q)$'],'3.3.1',9,'Use the distributive property of union over intersection.','D'),
 ('The shaded region in the given Venn diagram shows',[r'$T\cup V$',r'$T\cap V$',r'$T^c\cup V^c$',r'$T^c\cap V^c$'],'3.4.1',9,'Only the overlap of T and V is shaded, representing their intersection.','B'),
 (r'If $A\times B=\{(1,a),(1,b),(1,c),(4,a),(4,b),(4,c)\}$, then the number of elements in set $A$ must be',['2','3','5','6'],'3.6.2',9,'The distinct first coordinates are 1 and 4, so A has two elements.','A'),
 (r'If $A=\{0,1,2,3\}$ and $B=\{(0,4)\}$, then one of the binary relations from $A$ to $B$ will be',[r'$\{((0,4),0)\}$',r'$\{(0,(0,4))\}$',r'$\{(0,0),(0,4)\}$',r'$\{(0,0),(0,1),(0,2)\}$'],'3.7.1',9,'The single element of B is the ordered pair (0,4). A relation from A to B may contain (0,(0,4)); the nested pair must be preserved.','B'),
 ('Which of the given numbers is/ are rational number(s)?\nI. 5.38356125\nII. 5.234523452345…\nIII. 5.32112345145143652…',['II only','III only','I and II','II and III'],'1.2.1',9,'I terminates, and II repeats the block 2345, so both are rational. III is presented as non-recurring. A finite displayed prefix alone does not mathematically determine an infinite continuation; this interpretation follows the question convention and printed key.','C'),
 (r'The radical form of $(2^3\times3)^{1/3}$ will be',[r'$\sqrt[3]{18}$',r'$8\times\sqrt[3]{3}$',r'$2\times\sqrt[3]{3}$',r'$3\times\sqrt[3]{8}$'],'1.4.2',9,'The cube root of 8 times 3 is 2 times the cube root of 3.','C'),
 (r'The simplest form of $\frac{a^n\times a^{-3n}}{a^{2n}}$ will be',[r'$a^{-4n}$',r'$a^{-3n/2}$','−1',r'$a^{4n}$'],'1.5.1',9,'Add numerator exponents and subtract the denominator exponent: n−3n−2n = −4n, for nonzero a.','A'),
 (r'If $z_1=-2i$ and $z_2=5i$ are two complex numbers, then their product will be',['−10',r'$3i$',r'$10i$','10'],'17.2.1',10,'(−2i)(5i)=−10i²=10. Complex-number operations are now Grade X.','D'),
 ('The number 1,000,000 can be expressed in scientific notation as',[r'$1\times10^6$',r'$1\times10^5$',r'$10\times10^6$',r'$10\times10^7$'],'2.1.1',9,'A million equals 1 times 10 to the sixth power, with coefficient between 1 and 10.','A'),
 (r'The value of $a$ in the logarithmic equation $\log_2\sqrt a=3$ will be',[r'$2\sqrt2$',r'$3\sqrt2$','8','64'],'2.2.2',9,'The equation gives √a=2³=8 and therefore a=64.','D'),
 (r'The expression $\log\frac{x-y}{z}$ can be expressed in the form',[r'$\log x-\log y-\log z$',r'$\log x+\log y-\log z$',r'$\log(x-y)-\log z$',r'$\log(x-y)+\log z$'],'2.4.1',9,'The quotient law gives log(x−y)−log z on the domain x−y>0 and z>0. A difference inside a logarithm cannot be separated into a difference of logarithms.','C'),
 (r'The value of the logarithmic expression $1+\log_2 32-\log_2\frac18$ will be',['9','8','3','2'],'2.4.1',9,'log₂32=5 and log₂(1/8)=−3, giving 1+5−(−3)=9.','A'),
 (r'The expression $\log\sqrt[3]{9}$ is equal to',[r'$\frac16\log9$',r'$\frac23\log9$',r'$\frac23\log3$',r'$\frac32\log3$'],'2.4.1',9,'The power rule gives (1/3)log9 = (1/3)(2log3) = (2/3)log3.','C'),
 (r'An algebraic expression $2x^n+3y^m-z^p$ is a polynomial if the values of $m$, $n$ and $p$ belong to the set of',['integers.','rational numbers.','non-negative integers.','positive real numbers.'],None,9,'Polynomial powers must be non-negative integers. The current syllabus uses polynomials but has no direct outcome for this identification task.','C'),
 (r'The value of $(x-y)\times(x^2-xy+y^2)$ at $x=1$ and $y=-1$ will be',['2','4','5','6'],None,9,'Substitution gives (1−(−1))(1−(−1)+1)=2×3=6. Do not apply the difference-of-cubes identity, which would require +xy in the second factor. Direct polynomial substitution is not explicitly a current outcome.','D'),
 (r'If the value of $(a+b)^2=144$ and $ab=35$, then the value of $a-b$ will be',[r'$\pm2$',r'$\pm12$',r'$\pm\sqrt{74}$',r'$\pm\sqrt{109}$'],'5.1.1',9,'(a−b)²=(a+b)²−4ab=144−140=4, so a−b=±2.','A'),
 (r'If $a+\frac1a=2$, then $a^3+\frac1{a^3}$ will be',['−8','−2','2','8'],'5.1.1',9,'Let u=a and v=1/a. Then u³+v³=(u+v)³−3uv(u+v)=8−6=2.','C'),
 (r'On simplification of $2\sqrt{27}+2\sqrt{12}$, we get',[r'$8\sqrt3$',r'$10\sqrt3$',r'$2\sqrt{39}$',r'$4\sqrt{39}$'],'1.5.1',9,'Evaluate the real half-powers: 2√27+2√12=6√3+4√3=10√3.','B'),
 (r'The product of $a-1$, $a^3-1$ and $a^2+a+1$ will be',[r'$(a^3+1)^2$',r'$(a^3-1)^2$',r'$a^6-1$',r'$a^6+1$'],'5.1.1',9,'(a−1)(a²+a+1)=a³−1, so multiplying by the remaining factor gives (a³−1)².','B'),
 (r'The complete factorised form of the expression $x+y-(x-y)(x+y)$ will be',[r'$-(x+y)(x-y)$',r'$(x+y)(x-y)$',r'$(x+y)(1-x-y)$',r'$(x+y)(1-x+y)$'],'5.2.1',9,'Take out x+y to get (x+y)[1−(x−y)]=(x+y)(1−x+y).','D'),
 (r'The expression $\frac1{p^4}+\frac2{p^2}+1$ can be expressed as',[r'$\left(1+\frac1{p^2}\right)^2$',r'$\left(1-\frac1{p^2}\right)^2$',r'$\left(1+\frac1p+\frac1{p^2}\right)\left(1-\frac1p+\frac1{p^2}\right)$',r'$\left(1+\frac1p+\frac1{p^2}\right)\left(1+\frac1p-\frac1{p^2}\right)$'],'5.2.1',9,'This is a perfect-square trinomial (1+1/p²)², for p≠0.','A'),
 (r'On factorisation of $x^2-(2x-1)$, we get',[r'$(x-1)(x-1)$',r'$(x-1)(x+1)$',r'$x(x-2)+1$',r'$x(x-2)-1$'],'5.2.1',9,'x²−(2x−1)=x²−2x+1=(x−1)². Option C is equivalent but is not a complete factorisation.','A'),
 (r'The expression $t^3-3t^2+3t-1$ is equal to',[r'$(t-1)^3$',r'$(1-t)^3$',r'$1-t^3$',r'$t^3-1$'],'5.2.1',9,'Apply the cube-of-a-difference identity with t and 1.','A'),
 (r'All of the given options are the zeros of the polynomial $p(y)=y(y-1)(y-2)(y+4)$ EXCEPT',['0','1','2','4'],'5.4.1',9,'The zeros are 0, 1, 2 and −4. Positive 4 is not a zero.','D'),
 (r'The polynomial $p(a)=a^2-3a+1$ divided by a linear divisor leaves $-1$ as remainder. One of the linear divisor in this case is',[r'$a-3$',r'$a-1$',r'$a+1$',r'$a+2$'],'5.3.2',9,'The remainder theorem gives p(1)=1−3+1=−1, so a−1 is the required divisor.','B'),
 (r'Applying the factor theorem, one of the factors of the polynomial $p(t)=t^3-t^2-t+1$ is',[r'$t$',r'$t-2$',r'$t+1$',r'$t+2$'],'5.4.1',9,'p(−1)=−1−1+1+1=0, so t+1 is a factor. In fact p(t)=(t−1)²(t+1).','C'),
 (r'The value of $x$ for $7:6::21:x$ is',['2','3','18','20'],None,9,'7/6=21/x gives 7x=126 and x=18. Proportion is not explicitly a current IX–X outcome.','C'),
 ('The mean proportions between 3 and 12 are',[r'$\pm6$',r'$\pm9$',r'$\pm12$',r'$\pm36$'],None,9,'The mean proportional m satisfies m²=3×12=36, giving ±6. Continued proportion has no direct current IX–X outcome.','A'),
 (r'If $s$ is inversely proportional to $t$, then the missing value of $s$ in the given table will be',['2.5','7.5','10','17'],None,9,'st is constant: 5×12=60, so the missing s at t=24 is 60/24=2.5. Inverse variation is not explicitly a current IX–X outcome.','A'),
 (r'If $a:b::c:d$, then $\frac{a+b}{a-b}=\frac{c+d}{c-d}$. This is the statement of',['dividendo theorem.','alternendo theorem.','componendo theorem.','componendo dividendo theorem.'],None,9,'Combining componendo and dividendo gives the displayed equality, with nonzero denominators. The named proportion theorem is not a direct current IX–X outcome.','D'),
 (r'The order of the matrix $\begin{bmatrix}5&6&1&0\end{bmatrix}$ is',[r'$1\times3$',r'$1\times4$',r'$3\times1$',r'$4\times1$'],'18.1.2',10,'There is one row and four columns. Matrix order is now Grade X.','B'),
 (r'The matrix $\begin{bmatrix}1&2&0\\2&1&0\\0&0&0\end{bmatrix}$ is a\nI. null matrix\nII. square matrix\nIII. symmetric matrix',['I only.','II only.','I and III.','II and III.'],'18.2.1',10,'It has order 3×3 and equals its transpose, but is not the zero matrix. Thus II and III hold.','D'),
 (r'The matrix $\begin{bmatrix}0&-b\\0&-4\end{bmatrix}$ is the additive inverse of the matrix',[r'$\begin{bmatrix}b&0\\4&0\end{bmatrix}$',r'$\begin{bmatrix}0&b\\0&4\end{bmatrix}$',r'$\begin{bmatrix}-b&0\\4&0\end{bmatrix}$',r'$\begin{bmatrix}0&b\\0&-4\end{bmatrix}$'],'18.3.7',10,'Negate every entry to recover the original matrix [[0,b],[0,4]].','B'),
 (r'The product of $A=\begin{bmatrix}a&-b\\1&1\end{bmatrix}$ and an unknown matrix $B$ is $AB=I$, where $I$ is the identity matrix of order $2\times2$. The matrix $B$ would be',[r'$\frac1{a+b}\begin{bmatrix}1&b\\-1&a\end{bmatrix}$',r'$\frac1{a-b}\begin{bmatrix}1&b\\-1&a\end{bmatrix}$',r'$\frac1{a-b}\begin{bmatrix}-a&1\\-b&-1\end{bmatrix}$',r'$\frac1{a+b}\begin{bmatrix}-a&1\\-b&-1\end{bmatrix}$'],'18.5.7',10,'The determinant is a+b. For a+b≠0, B=A⁻¹=adj(A)/(a+b), giving option A.','A'),
 (r'If the matrix $\begin{bmatrix}a&-a\\b&b\end{bmatrix}$ is a singular matrix, then $a$ and $b$ are related as',[r'$ab=\frac12$',r'$ab=0$',r'$a=-b$',r'$ab=-\frac12$'],'18.5.4',10,'The determinant is ab−(−ab)=2ab, which is zero exactly when ab=0.','B'),
 (r'On solving the matrix equation $\begin{bmatrix}1&2\\1&-1\end{bmatrix}\begin{bmatrix}x\\y\end{bmatrix}=\begin{bmatrix}3\\-1\end{bmatrix}$ by Crammer’s rule, the value of $x$ can be represented as',[r'$\frac{\begin{vmatrix}3&2\\-1&-1\end{vmatrix}}{\begin{vmatrix}1&2\\1&-1\end{vmatrix}}$',r'$\frac{\begin{vmatrix}1&2\\1&-1\end{vmatrix}}{\begin{vmatrix}3&2\\-1&-1\end{vmatrix}}$',r'$\frac{\begin{vmatrix}2&3\\-1&-1\end{vmatrix}}{\begin{vmatrix}1&2\\1&-1\end{vmatrix}}$',r'$\frac{\begin{vmatrix}1&2\\1&-1\end{vmatrix}}{\begin{vmatrix}2&3\\-1&-1\end{vmatrix}}$'],'18.6.2',10,'Cramer’s rule replaces the x coefficient column by the constants (3,−1)ᵀ and divides by the coefficient determinant.','A'),
 (r'In the correspondence of $\triangle PQS\leftrightarrow\triangle RQS$, $PQ=QR$ and $\angle PQS=\angle SQR$, as shown in the given diagram. The value of $x$ will be',['4 cm.','5 cm.','6 cm.','11 cm.'],None,9,'The triangles are congruent by SAS: PQ=QR, QS is common, and the included angles are equal. Hence SR=PS=4 cm. The standalone congruence criterion is not a direct current IX–X outcome.','A'),
 (r'In the correspondence $\triangle ABC\leftrightarrow\triangle EFD$, if $\triangle ABC\cong\triangle EFD$, then the value of $x$ will be',['50°','61°','69°','119°'],None,9,'B corresponds to F, whose angle is 69°. Use the stated vertex correspondence rather than visual orientation. Congruence-angle matching is not an explicit current IX–X outcome.','C'),
 ('Consider the triangle ABC such that E and F are the midpoints of the sides AB and AC respectively. The length of BC would be',[r'$\frac12a$ units.','a unit.','2a units.','4a units.'],'13.1.1',9,'The midpoint segment EF=2a is half of BC. Thus BC=4a.','D'),
 ('In the given triangle ABC, the points D, E and F are the midpoints of the sides AC, AB and BC respectively. The line segments AF, BD and CE are the',['altitudes.','medians.','right bisectors.','angle bisectors.'],'21.1.2',10,'Each segment joins a vertex to the midpoint of its opposite side, so each is a median. This identifies the medians used in the current Grade X practical-geometry outcome.','B'),
 (r'In the given figure, $AC$ is the angle bisector of angle $\angle BAD$. If $BC=a$ units, then the length of $CD$ will be',[r'$\frac12a$ units.','a units.','2a units.','3a units.'],'10.1.3',9,'A point C on the angle bisector is equidistant from the two intersecting sides AB and AD. The marked right angles show these distances are BC and CD, so CD=a.','B'),
 (r'In the given diagram, if $p$, $q$, $r$ and $s$ are distances of point $X$ from the line $l$, then the shortest distance is',[r'$p$.',r'$q$.',r'$r$.',r'$s$.'],None,9,'The perpendicular segment XM, labelled r, is the shortest distance from X to the line. This standalone shortest-distance theorem is not explicitly a current IX–X outcome.','C'),
 (r'If $BD$ is the bisector of $\angle ABC$, then the ratio $x:y$ is',['1:1','1:2','1:4','2:1'],None,9,'By the angle-bisector theorem, AD/DC=AB/BC=2/4=1/2. The triangle angle-bisector proportionality theorem is not explicitly a current IX–X outcome.','B'),
]

THEORY = [
 ('1',3,3,'1.3.3','3.4.1',9,r'If $U=\{a,e,i,o,u\}$, $M=\{a,i,u\}$, $N=\{u\}$ and $R=\{e,o,u\}$, then represent\ni. M and N in the incomplete Venn diagram given below. (1 Mark)\nii. $N^c$ on the Venn diagram completed in part (i) by shading. (1 Mark)\niii. $(M\cap R)^c$ in the Venn diagram given below, by shading. (1 Mark)',r'i. Draw N inside M; place u in N, a and i in M outside N, and e and o outside M but inside U. ii. Shade all of U except N. iii. Since $M\cap R=\{u\}$, shade all of U outside the overlap; the shaded elements are $\{a,e,i,o\}$.'),
 ('2',3,3,'3.4.1','2.4.1',9,r'If the value of $\log3=0.4771$, then find the value of $\log81$.',r'$\log81=\log(3^4)=4\log3=4(0.4771)=1.9084$.'),
 ('3a',4,4,'4.4.2',None,9,r'If $m=2-\sqrt3$ and $n=\frac1{2+\sqrt3}$, then\ni. show that $m+n=\frac2{2+\sqrt3}$. (2 Marks)\nii. express $m+n$ in the form $a-b\sqrt c$ by rationalising the denominator. (2 Marks)',r'i. $(2-\sqrt3)(2+\sqrt3)=1$, so $m=1/(2+\sqrt3)=n$ and $m+n=2/(2+\sqrt3)$. ii. Multiply numerator and denominator by $2-\sqrt3$: $m+n=2(2-\sqrt3)/(4-3)=4-2\sqrt3$. Surd rationalisation is not explicitly an outcome in the current IX–X syllabus; do not force a mapping based only on a similar old code.'),
 ('3b',4,4,'4.1.4 and 4.1.5','6.2.2',9,r'Prove that the simplest form of $r=\left\{\frac{m-1}{2}\div(m^2-1)\right\}\times\left(1+\frac1m\right)$ is $r=\frac1{2m}$.',r'Factor $m^2-1=(m-1)(m+1)$ and write $1+1/m=(m+1)/m$. Then $r=(m-1)/[2(m-1)(m+1)]\times(m+1)/m=1/(2m)$, for $m\notin\{-1,0,1\}$.'),
 ('4a',5,4,'5.2.1(e)','5.2.1',9,r'Factorise $p^6-q^6$ completely.',r'$p^6-q^6=(p^3-q^3)(p^3+q^3)=(p-q)(p+q)(p^2+pq+q^2)(p^2-pq+q^2)$.'),
 ('4b',5,4,'5.3.3 and 5.4.1','5.4.1',9,r'For the polynomial $p(x)=x^3-3x-2$,\ni. using factor theorem, prove that $x+1$ is a factor of $p(x)$. (2 Marks)\nii. find the remaining two factors of $p(x)$. (2 Marks)',r'$p(-1)=-1+3-2=0$, so $x+1$ is a factor. Dividing gives $x^2-x-2=(x+1)(x-2)$. Thus $p(x)=(x+1)^2(x-2)$; the remaining factors are $x+1$ and $x-2$.'),
 ('5',6,3,'6.3.2',None,9,r'The quantity $m$ varies directly as $n^2$. If $m=4$ and $n=6$, then find the relation between $m$ and $n$ in terms of an equation.',r'Write $m=kn^2$. Substitution gives $4=36k$, so $k=1/9$ and $m=n^2/9$. Direct variation is not explicitly a current IX–X outcome.'),
 ('6',6,4,'7.5.4','18.5.4',10,r'For the matrices $S=\begin{bmatrix}2&-1\\s&4\end{bmatrix}$ and $T=\begin{bmatrix}0&1\\-s&-1\end{bmatrix}$, find the\ni. matrix $2(S-T)$. (2 Marks)\nii. value of $s$, if $S-T$ is a singular matrix. (2 Marks)',r'i. $S-T=\begin{bmatrix}2&-2\\2s&5\end{bmatrix}$, so $2(S-T)=\begin{bmatrix}4&-4\\4s&10\end{bmatrix}$. ii. Singularity gives $\det(S-T)=10+4s=0$, hence $s=-5/2$. Part i also uses current Grade X SLOs 18.3.2 (matrix subtraction) and 18.4.1 (scalar multiplication).'),
 ('7',7,3,'8.1.2','21.1.2',10,r'For the given triangle ABC, draw the\ni. angle bisector of angle A. (1 Mark)\nii. median passing through vertex B. (1 Mark)\niii. altitude from vertex A to its opposite side. (1 Mark)',r'i. Use equal-radius compass arcs from the two sides of angle A and join A to their intersection. ii. Construct the midpoint of AC and join it to B. iii. Construct the perpendicular from A to line BC; extend BC if needed. Preserve the distinction between an angle bisector, a median and an altitude.'),
 ('8a',8,3,'9.1.1a',None,9,r'In the given diagram, $OM=OP$ and $OL=OR$. In the correspondence $\triangle MOL\leftrightarrow\triangle POR$,\ni. find the unknown angle R. (2 Marks)\nii. find the unknown angle M. (1 Mark)',r'The vertical angles at O are both $95^\circ$, and the two pairs of given sides give SAS congruence. In triangle POR, $R=180^\circ-95^\circ-55^\circ=30^\circ$. By the vertex correspondence, $M=P=55^\circ$. Standalone triangle-congruence angle deductions are not explicitly a current IX–X outcome.'),
 ('8b',9,3,'10.1.1c','13.1.1',9,r'In the given figure, X and Y are the midpoints of UV and WV respectively. If $UW=26$ cm and $XY=(x+5)$ cm, then\ni. find the value of x. (2 Marks)\nii. recalling the statement of a relevant theorem, complete the given sentence. (1 Mark)\nXY and UW are lines __________________ to each other.',r'By the midpoint theorem, $XY=UW/2=13$ cm. Therefore $x+5=13$ and $x=8$. The midpoint segment XY is parallel to UW, so the missing word is "parallel".'),
 ('8c',10,3,'12.1.1d',None,9,r'In the given diagram, $PL=PN=x$ cm and KN is perpendicular to ML. If $KN=y$ cm, then find an expression for the shortest distance from K to ML.\n(Note: The expression shall be in terms of x, and y.)',r'The perpendicular from K meets ML at P, so the shortest distance is $KP=KN-PN=y-x$ cm. The stated PL=PN equality is not needed for this calculation. The standalone shortest-distance theorem is not explicitly a current IX–X outcome.'),
]

CROPS = {
 'p1': {2:(3,(194,280,386,380)),4:(3,(320,632,506,735)),31:(9,(96,210,185,258)),39:(11,(138,500,539,620)),40:(12,(70,112,515,220)),41:(12,(99,331,515,458)),42:(13,(113,122,540,255)),43:(13,(119,374,540,543)),44:(14,(78,115,511,246)),45:(14,(61,351,509,452))},
 'p2': {'7':(7,(147,287,395,498)),'8a':(8,(145,154,508,315)),'8b':(9,(128,145,526,264)),'8c':(10,(127,155,506,273))},
}
RESPONSES = {'1':(3,3),'2':(4,5),'3a':(7,7),'3b':(10,10),'4a':(12,12),'4b':(13,14),'5':(15,15),'6':(17,18),'7':(19,20),'8a':(22,22),'8b':(24,25),'8c':(26,27)}

def write(path,value): path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def prepare():
 for folder in [DEST,OUT,REVIEW]:folder.mkdir(parents=True,exist_ok=True)
 docs,sources,crops={},{},[]
 for key,(name,target) in FILES.items():
  p=SOURCE/name;docs[key]=pymupdf.open(p);shutil.copyfile(p,DEST/target)
  sources[key]={'filename':name,'url':f'/materials/ssc/mathematics/ssc-1/{target}','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pages':len(docs[key])}
 for key,regions in CROPS.items():
  folder=ROOT/f'public/paper-crops/MTH-IX-2023-{key.upper()}';folder.mkdir(parents=True,exist_ok=True)
  for number,(page,box) in regions.items():
   url=f'/paper-crops/{folder.name}/q{number}.png'
   docs[key][page-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(box)).save(str(folder/f'q{number}.png'))
   # Remove clipped fragments of the preceding sentence from the crop margin;
   # these rectangles are outside the actual diagram and all of its labels.
   excluded={39:(138,500,190,515),44:(78,115,180,120)}.get(number) if key=='p1' else None
   if excluded:
    im=Image.open(folder/f'q{number}.png').convert('RGB')
    im.paste('white',tuple(round((v-box[i%2])*3) for i,v in enumerate(excluded)));im.save(folder/f'q{number}.png')
   crops.append({'paper':key,'question':str(number),'page':page,'box':box,'excludedMarginTextBox':excluded,'url':url,'sourceSha256':sources[key]['sha256']})
 # Q1 contains two separate source diagrams. Combine faithful crops rather than
 # redrawing the board's geometry or repeating the intervening question text.
 boxes=[(88,168,314,304),(95,377,314,508)]
 images=[]
 for box in boxes:
  pix=docs['p2'][2].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(box));images.append(Image.frombytes('RGB',[pix.width,pix.height],pix.samples))
 canvas=Image.new('RGB',(max(i.width for i in images),sum(i.height for i in images)+50),'white');y=0
 for label,im in zip(['(i) and (ii)','(iii)'],images):
  ImageDraw.Draw(canvas).text((5,y+3),label,fill='black');y+=25;canvas.paste(im,(0,y));y+=im.height
 folder=ROOT/'public/paper-crops/MTH-IX-2023-P2';canvas.save(folder/'q1.png')
 crops.append({'paper':'p2','question':'1','page':3,'boxes':boxes,'url':'/paper-crops/MTH-IX-2023-P2/q1.png','sourceSha256':sources['p2']['sha256']})
 keys=[]
 for line in docs['key'][0].get_text(sort=True).splitlines():
  m=re.match(r'^\s*(\d+)\s+(.+?)\s+([A-D*])\s+([KUA])\s*$',line)
  if m:keys.append(dict(zip(['question','oldSlo','answer','level'],m.groups())))
 assert len(keys)==45 and len({k['question'] for k in keys})==45
 by_number={int(k['question']):k for k in keys}
 outcomes={}
 for grade in [9,10]:
  for unit in json.loads((OUT/f'ssc{1 if grade==9 else 2}_exact_syllabus.json').read_text(encoding='utf-8')):
   for sub in unit['subtopics']:
    for slo in sub['slos']:outcomes[grade,slo['code']]={**slo,'topic':unit['name'],'unitNumber':unit['unitNumber']}
 def mapping(code,grade,reason):
  slo=outcomes.get((grade,code));assert code is None or slo is not None,(grade,code)
  return {'current_slo':code,'currentSlo':code,'current_mapping':[] if not slo else [{'code':code,'description':slo['description'],'topic':slo['topic'],'grade':grade}], 'mapping_scope':{'board':'AKU-EB','grade':grade,'subject':'Mathematics'},'mappingStatus':'NO_DIRECT_OUTCOME' if not slo else 'MOVED_TO_GRADE_X' if grade==10 else 'IN_SCOPE','mappingReason':reason,'in_syllabus':bool(slo and grade==9),'out_of_syllabus':not bool(slo and grade==9),'current_syllabus_reviewed':True,'syllabusEdition':'2025; latest revision July 2026; first examined 2027','unitNumber':slo['unitNumber'] if slo else None,'unitName':slo['topic'] if slo else 'Historical syllabus / no direct current outcome','sloText':slo['description'] if slo else ''}
 def diagram(key,number):return next((c['url'] for c in crops if c['paper']==key and c['question']==str(number)),None)
 mcqs=[]
 assert len(MCQS)==45
 for n,(stem,options,code,grade,reason,solved) in enumerate(MCQS,1):
  k=by_number[n];page=next(p for p,start,end in [(3,1,4),(4,5,9),(5,10,14),(6,15,19),(7,20,23),(8,24,29),(9,30,34),(10,35,37),(11,38,39),(12,40,41),(13,42,43),(14,44,45)] if start<=n<=end)
  assert solved==k['answer'],f'Independent answer conflicts with printed key at Q{n}: {solved} vs {k["answer"]}'
  crop=diagram('p1',n)
  mcqs.append({'questionNumber':n,'stem':stem.replace('\\n','\n'),'options':dict(zip('ABCD',options)),'correctOption':solved,'official_answer':k['answer'],'solved_correct_option':solved,'answerStatus':'VERIFIED','answer_review_note':'','explanation':reason,'answer_origin':'Official key cross-checked independently by Codex; explanations are supplementary','originalSlo':k['oldSlo'],'slo':k['oldSlo'],'cognitiveLevel':{'K':'R'}.get(k['level'],k['level']),'originalCognitiveLevel':k['level'],'pageNumber':page,'marks':1,'diagramUrl':crop,'isDiagram':bool(crop),'sourceSha256':sources['p1']['sha256'],**mapping(code,grade,reason)})
 em='\n'.join(p.get_text(sort=True) for p in docs['em']);matches=list(re.finditer(r'Question No\.\s*(\d+[abc]?)\b',em));sections={}
 for i,m in enumerate(matches):
  end=matches[i+1].start() if i+1<len(matches) else em.find('Annexure A:',m.start())
  sections[m.group(1)]=em[m.start():end if end>=0 else None].strip()
 theory=[]
 for number,page,marks,old,code,grade,text,solution in THEORY:
  choice='Attempt either 3a or 3b.' if number.startswith('3') else 'Attempt either 4a or 4b.' if number.startswith('4') else 'Attempt any two of 8a, 8b and 8c.' if number.startswith('8') else 'Compulsory.'
  crop=diagram('p2',number)
  item={'questionNumber':number,'questionText':text.replace('\\n','\n'),'marks':marks,'section':'CRQ','originalSlo':old,'pageNumber':page,'modelAnswer':solution,'modelAnswerOrigin':'Supplementary worked solution by Codex, checked against the original marking notes','cognitiveLevel':'U' if number=='7' else 'A','choiceInstruction':choice,'choiceGroup':number[0] if number[0] in '348' else None,'diagramUrl':crop,'isDiagram':bool(crop),'officialMarkingNotes':sections[number],'sourceSha256':sources['p2']['sha256'],**mapping(code,grade,solution)}
  if number=='6':
   for extra in ['18.3.2','18.4.1']:
    item['current_mapping'].extend(mapping(extra,10,'Part i: subtraction and scalar multiplication')['current_mapping'])
  folder=ROOT/'public/paper-crops/MTH-IX-2023-EMARKING';folder.mkdir(parents=True,exist_ok=True)
  for kind,p in zip(['better','weaker'],RESPONSES[number]):
   regions=[r for r in docs['em'][p-1].get_image_info() if r['width']>270 and r['height']>100 and abs(r['width']-r['height'])>10 and (number=='1' or r['bbox'][0]<200)]
   regions.sort(key=lambda r:r['bbox'][1]);assert regions,(number,kind,p)
   if number=='1':selected=regions[:2] if kind=='better' else regions[2:]
   elif number=='2':selected=regions if kind=='better' else regions[1:]
   elif RESPONSES[number][0]==RESPONSES[number][1]:selected=[regions[0 if kind=='better' else -1]]
   else:selected=regions
   box=pymupdf.Rect(selected[0]['bbox'])
   for r in selected[1:]:box|=pymupdf.Rect(r['bbox'])
   docs['em'][p-1].get_pixmap(matrix=pymupdf.Matrix(2.5,2.5),clip=box).save(str(folder/f'q{number}_{kind}.png'))
   extra_regions=[]
   if number=='2' and kind=='better':
    # The board's second better example continues at the top of PDF page 5.
    extra_box=(119.0,92.6,555.2,274.1)
    pix=docs['em'][4].get_pixmap(matrix=pymupdf.Matrix(2.5,2.5),clip=pymupdf.Rect(extra_box))
    first=Image.open(folder/f'q{number}_{kind}.png').convert('RGB');second=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    combined=Image.new('RGB',(max(first.width,second.width),first.height+second.height+16),'white');combined.paste(first,(0,0));combined.paste(second,(0,first.height+16));combined.save(folder/f'q{number}_{kind}.png')
    extra_regions=[{'page':5,'box':extra_box}]
   url=f'/paper-crops/{folder.name}/q{number}_{kind}.png';item[f'{kind}ResponseImage']=url
   crops.append({'paper':'em','question':number,'kind':kind,'page':p,'box':list(box),'additionalRegions':extra_regions,'url':url,'sourceSha256':sources['em']['sha256']})
  theory.append(item)
 write(OUT/'ssc1_2023_past_mcqs.json',mcqs);write(OUT/'ssc1_2023_past_crqs.json',theory)
 write(OUT/'ssc1_2023_source_manifest.json',{'sources':sources,'officialKeyRows':keys,'crops':crops,'syllabusSource':{'url':'/materials/ssc/mathematics/ssc-1/mathematics-science-group-ssc-syllabus-2025.pdf','latestRevision':'July 2026','firstExamYear':2027,'sha256':hashlib.sha256((DEST/'mathematics-science-group-ssc-syllabus-2025.pdf').read_bytes()).hexdigest()},'paperII':{'printedQuestions':8,'digitalEntriesIncludingAlternatives':12,'totalMarks':30,'durationMinutes':100,'choiceGroups':{'3':{'choose':1,'of':['3a','3b'],'marks':4},'4':{'choose':1,'of':['4a','4b'],'marks':4},'8':{'choose':2,'of':['8a','8b','8c'],'marks':6}}}})
 report=['# Mathematics IX Annual 2023 - source review','','45 MCQs and 12 Paper II entries, including the alternatives for Q3, Q4 and Q8. All 45 independent MCQ answers agree with the supplied key. Paper II remains CRQ-only.','','The target syllabus is the project’s 2025 syllabus, revised July 2026 and first examined in 2027. Old source codes, including parenthesised suffixes, are retained separately. Questions without a direct current outcome remain in the original paper and full-paper quiz.','','Q7 MCQ uses the conventional intended interpretation of the displayed decimal patterns; the ellipsis alone does not define their infinite continuation.','','Q6 Paper II maps to 18.5.4, with additional part-i mappings to 18.3.2 and 18.4.1.','','| Paper | Question | Old code | Current code(s) | Target grade | Status |','|---|---|---|---|---|---|']
 for component,rows in [('I',mcqs),('II',theory)]:
  for q in rows:report.append(f"| {component} | {q['questionNumber']} | {q['originalSlo']} | {', '.join(m['code'] for m in q['current_mapping']) or '-'} | {q['mapping_scope']['grade'] if q['current_slo'] else '-'} | {q['mappingStatus']} |")
 (REVIEW/'review.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
 print(json.dumps({'mcqs':len(mcqs),'theoryEntries':len(theory),'crops':len(crops),'mappingCounts':{s:sum(q['mappingStatus']==s for q in mcqs+theory) for s in ['IN_SCOPE','MOVED_TO_GRADE_X','NO_DIRECT_OUTCOME']}},indent=2))

if __name__=='__main__':prepare()
