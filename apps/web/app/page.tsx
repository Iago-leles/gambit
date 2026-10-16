import { HomeActions } from "./HomeActions";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Gambit</h1>
      <p className={styles.lead}>
        Crie uma sala, escolha o tempo e mande o código para o oponente.
      </p>
      <HomeActions />
    </main>
  );
}
