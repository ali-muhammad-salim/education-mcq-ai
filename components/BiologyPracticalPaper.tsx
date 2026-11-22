import type { hsscBiologyPractical } from '@/lib/hsscBiologyPractical';
import styles from './MaterialLayout.module.css';

export const biologyPracticalInstructions = [
  'Check your name and school information and sign if it is correct.',
  'Complete every task in all three stages.',
  'Demonstrate the required skills to the examiner when instructed.',
  'Write inside the allotted space for each task. Answers outside that space will not be marked.',
  'Use black pen or pencil only. Avoid coloured pencils, markers and highlighters.',
  'Avoid staples, paper clips, glue, correcting fluid and ink erasers. Cross out mistakes neatly and write the correction beside them.',
  'Use the marks shown for each task to manage your time.',
  'You may use a scientific calculator.',
];

export default function BiologyPracticalPaper({ paper }: { paper: NonNullable<ReturnType<typeof hsscBiologyPractical>> }) {
  return (
    <div className={styles.digital}>
      {paper.stages.map(stage => (
        <section key={stage.title} className={styles.practicalStage}>
          <div className={styles.practicalHeading}>
            <h3>{stage.title}</h3>
            <span>{stage.tasks.reduce((total, task) => total + task.marks, 0)} marks</span>
          </div>
          <p>{stage.prompt}</p>
          {stage.note && <p className={styles.muted}>{stage.note}</p>}
          {stage.tasks.map(task => (
            <article key={task.number} className={styles.practicalTask}>
              <div className={styles.practicalHeading}>
                <h4>Task {task.number}</h4>
                <span>{task.marks} {task.marks === 1 ? 'mark' : 'marks'}</span>
              </div>
              {task.prompt && <p>{task.prompt}</p>}
              {task.observed && <p className={styles.muted}>Examiner’s observation</p>}
              {task.responses?.map(label => <p key={label} className={styles.practicalResponse}>{label}</p>)}
              {task.drawing && <div className={styles.practicalDrawing}>Space for the {task.drawing.toLowerCase()}</div>}
            </article>
          ))}
        </section>
      ))}
      <section className={styles.practicalStage}>
        <div className={styles.practicalHeading}><h3>School record</h3><span>3 marks</span></div>
      </section>
    </div>
  );
}
