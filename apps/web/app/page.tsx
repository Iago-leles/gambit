import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Gambit</h1>
      <p className={styles.lead}>
        Xadrez no navegador. Por enquanto, os dois lados jogam no mesmo aparelho. Salas online
        chegam na próxima etapa.
      </p>
      <Link href="/local" className={styles.cta}>
        Jogar no mesmo aparelho
      </Link>
    </main>
  );
}
