import { SUPPORTED_BOARDS } from "@/lib/boardHierarchy";
import MaterialList from "@/components/MaterialList";
import styles from "@/components/MaterialLayout.module.css";
export default function Home() {
  return (
    <section className={styles.page}>
      <h1>Choose your board</h1>
      <MaterialList
        items={SUPPORTED_BOARDS.map((board) => ({
          label: board.name,
          href: "/" + board.id,
        }))}
      />
    </section>
  );
}
