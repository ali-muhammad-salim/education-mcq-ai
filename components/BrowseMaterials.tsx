import { SUPPORTED_BOARDS } from "@/lib/boardCatalog";
import MaterialList from "./MaterialList";
import styles from "./MaterialLayout.module.css";
export default function BrowseMaterials({ title }: { title: string }) {
  return (
    <section className={styles.page}>
      <h1>{title}</h1>
      <MaterialList
        items={SUPPORTED_BOARDS.map((board) => ({
          label: board.name,
          href: "/" + board.id,
        }))}
      />
    </section>
  );
}
