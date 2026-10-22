import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import styles from "./MaterialLayout.module.css";
export type MaterialItem = { label: string; href: string; pending?: boolean; year?:number };
export default function MaterialList({ items }: { items: MaterialItem[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.href}>
          <Link className={styles.row} href={item.href}>
            <FileText aria-hidden="true" className={styles.icon} size={18} />
            <span className={styles.label}>{item.label}</span>
            {item.pending && <span className={styles.muted}>Coming soon</span>}
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
