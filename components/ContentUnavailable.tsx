import Link from 'next/link';
import styles from './MaterialLayout.module.css';
export default function ContentUnavailable({title,back='/'}:{title:string;back?:string}){return <section className={styles.page}><h1>{title}</h1><p className={styles.muted}>Coming soon</p><Link href={back}>Back</Link></section>;}
