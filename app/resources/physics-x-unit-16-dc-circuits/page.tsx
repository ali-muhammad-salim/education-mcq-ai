import Image from 'next/image';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import DocumentViews from '@/components/DocumentViews';
import styles from '@/components/MaterialLayout.module.css';
import { physicsUnit16Resource as resource } from '@/lib/physicsUnit16Resource';
import { physicsUnit16ChapterQuestions } from '@/lib/physicsUnit16Questions';
import chapterBank from '@/data/physics/chapter_wise_theory_bank.json';
import StructuredContent from '@/components/StructuredContent';

const assetRoot = '/materials/ssc/physics/ssc-2';
const classPath = '/akueb/X/physics';
const workedExamples = chapterBank['10'].find(unit => unit.unitNumber === resource.unit)?.numericals
  .filter(item => item.sourceHref === resource.href) ?? [];

export default function Unit16ResourcePage() {
  return (
    <main className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Class 10 Physics', href: classPath },
        { label: 'Chapter-wise notes', href: classPath + '/chapter-notes#unit-16' },
        { label: 'D.C. Circuits', active: true },
      ]} />
      <h1>{resource.title}</h1>
      <div className={styles.actions}>
        <Link className={styles.button} href={'/quizzes/' + resource.quizCode + '/take'}>Start {physicsUnit16ChapterQuestions.length}-question practice quiz</Link>
        <Link className={styles.button} href={classPath + '/numericals/' + resource.unit}>View worked numericals</Link>
      </div>
      <DocumentViews original={resource.pdf} title={resource.title} digitalLabel="Digital notes">
        <article className={styles.digital}>
          <section>
            <h2>Series and parallel resistors · 16.1.1–16.1.3</h2>
            <p>Resistance is opposition to electric current. It is measured in ohms (Ω). For an ohmic resistor at constant temperature, V = IR.</p>
            <h3>Series</h3>
            <p>There is one path, so the same current flows through every resistor (I = I₁ = I₂ = I₃). The voltage drops add (V = V₁ + V₂ + V₃). Substituting V = IR and dividing by I gives R = R₁ + R₂ + R₃. A break stops current throughout the loop.</p>
            <Image src={assetRoot + '/unit-16-series.webp'} alt="Battery and three resistors on a single conducting loop" width={1000} height={449} unoptimized style={{ width: '100%', height: 'auto', background: 'white' }} />
            <h3>Parallel</h3>
            <p>All branches connect across the same two nodes, so V = V₁ = V₂ = V₃. The branch currents add (I = I₁ + I₂ + I₃). Substituting I = V/R and dividing by V gives 1/R = 1/R₁ + 1/R₂ + 1/R₃. The equivalent resistance is below the smallest branch resistance. Other branches can still operate if one opens.</p>
            <Image src={assetRoot + '/unit-16-parallel.webp'} alt="Three resistors on separate branches across the same two nodes" width={1000} height={475} unoptimized style={{ width: '100%', height: 'auto', background: 'white' }} />
            <p>Domestic appliances are connected in parallel so they share the supply voltage and operate independently.</p>
            <p>For mixed circuits, simplify a series or parallel group at a time.</p>
          </section>
          <section>
            <h2>Electric circuits and circuit symbols · 16.2.1–16.2.2</h2>
            <p>For steady current, a source and a closed conducting path are needed. A switch opens or closes that path. Conventional current in the external circuit flows from positive to negative. Electrons in metal drift in the opposite direction.</p>
            <Image src={assetRoot + '/unit-16-symbols.webp'} alt="Source diagram showing switches, cells, batteries, lamps, fuses, meters, resistors, diodes and other circuit symbols" width={1000} height={544} unoptimized style={{ width: '100%', height: 'auto', background: 'white' }} />
            <ul>
              <li>Cell or battery — supplies energy. The long line represents the positive terminal. A battery symbol shows repeated long–short pairs.</li>
              <li>Ammeter (A) — measures current in series. Its ideal resistance is zero.</li>
              <li>Voltmeter (V) — measures potential difference in parallel. Its ideal resistance is infinite.</li>
              <li>Diode and LED — conduct mainly in one direction. An LED emits light when forward-biased and carrying sufficient current. Its symbol has outward arrows.</li>
              <li>Fuse and switch — a fuse melts and opens the circuit when excessive current heats it. A switch opens or closes the path directly.</li>
              <li>Lamp — converts electrical energy to light and heat. Its symbol is a circle with a cross.</li>
              <li>Resistors — a fixed resistor is shown as a rectangle or zigzag. A variable resistor adds a diagonal arrow. An LDR has inward light arrows and its resistance falls as light intensity increases. An NTC thermistor’s resistance falls as temperature rises.</li>
            </ul>
          </section>
          <section>
            <h2>Current, voltage and power · 16.2.3</h2>
            <p>Find the equivalent resistance first, then use I = V/R for the whole circuit. Use the series current or the parallel branch voltage to find the quantities for each component. Power is P = VI. For a resistor, P = I²R = V²/R.</p>
          </section>
          {workedExamples.length > 0 && (
            <section>
              <h2>Worked numericals</h2>
              {workedExamples.map(item => (
                <div key={item.id}>
                  <h3>{item.questionNumber}</h3>
                  <p>{item.problem}</p>
                  <StructuredContent text={item.solution} />
                </div>
              ))}
            </section>
          )}
          <section>
            <h2>Corrections to the original PDF</h2>
            <ul>
              <li>Page 2 adds the series current values. They are equal.</li>
              <li>Page 3 adds the parallel voltage values. The voltage across each branch equals the supply voltage.</li>
              <li>Question 16 on page 17 is missing the correct option, 4 Ω. The quiz includes it.</li>
              <li>Question 22 on page 18 now asks about the battery symbol convention used in these notes.</li>
              <li>Question 30 on page 20 now gives zero resistance for an ideal ammeter. A practical ammeter has very low resistance.</li>
            </ul>
          </section>
        </article>
      </DocumentViews>
    </main>
  );
}
