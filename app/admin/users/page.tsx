import PeopleDirectory from '@/components/PeopleDirectory';
import styles from '@/components/PeopleDirectory.module.css';
export default function UserManagementPage(){return <section className={styles.page} aria-label="Account administration"><PeopleDirectory admin/></section>;}
