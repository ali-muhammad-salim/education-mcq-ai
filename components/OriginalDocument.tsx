import styles from "./MaterialLayout.module.css";

export default function OriginalDocument({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  return (
    <div>
      <div className={styles.actions}>
        <a className={styles.button} href={url} target="_blank" rel="noopener noreferrer">
          Open PDF
        </a>
        <a className={styles.button} href={url} download="original.pdf">
          Download PDF
        </a>
      </div>
      <iframe className={styles.original} src={url} title={`${title} — original PDF`} />
    </div>
  );
}
