"use client";

import { isValidCode, normalizeCode, type CreatorColor } from "@gambit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { ApiError, createRoom } from "@/lib/api";
import { saveSeatToken } from "@/lib/seat-tokens";
import styles from "./page.module.css";

const TIME_CONTROLS = [
  { id: "1+0", label: "1+0", initialSeconds: 60, incrementSeconds: 0 },
  { id: "3+2", label: "3+2", initialSeconds: 180, incrementSeconds: 2 },
  { id: "5+3", label: "5+3", initialSeconds: 300, incrementSeconds: 3 },
  { id: "10+5", label: "10+5", initialSeconds: 600, incrementSeconds: 5 },
  { id: "15+10", label: "15+10", initialSeconds: 900, incrementSeconds: 10 },
  { id: "unlimited", label: "Sem relógio" },
] as const;

const COLORS: { value: CreatorColor; label: string }[] = [
  { value: "white", label: "Brancas" },
  { value: "random", label: "Sorteio" },
  { value: "black", label: "Pretas" },
];

const ERROR_TEXT: Record<string, string> = {
  network: "Não foi possível falar com o servidor. Tente de novo.",
  invalid_rules: "As regras escolhidas não são válidas.",
};

export function HomeActions() {
  const router = useRouter();
  const [timeId, setTimeId] = useState<string>("5+3");
  const [color, setColor] = useState<CreatorColor>("random");
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const onCreate = async (event: SyntheticEvent) => {
    event.preventDefault();
    const tc = TIME_CONTROLS.find((t) => t.id === timeId) ?? TIME_CONTROLS[2];
    const timeControl =
      tc.id === "unlimited"
        ? { kind: "unlimited" }
        : {
            kind: "fischer",
            initialSeconds: tc.initialSeconds,
            incrementSeconds: tc.incrementSeconds,
          };

    setCreating(true);
    setCreateError(null);
    try {
      const room = await createRoom({ timeControl, creatorColor: color, allowSpectators });
      saveSeatToken(room.code, room.creatorToken);
      router.push(`/r/${room.code}`);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "unknown";
      setCreateError(ERROR_TEXT[code] ?? "Algo deu errado ao criar a sala.");
      setCreating(false);
    }
  };

  const onJoin = (event: SyntheticEvent) => {
    event.preventDefault();
    const code = normalizeCode(joinCode);
    if (!isValidCode(code)) {
      setJoinError("O código tem 6 letras e números, como K7P-2QX.");
      return;
    }
    router.push(`/r/${code}`);
  };

  return (
    <div className={styles.actions}>
      <form className={styles.card} onSubmit={(e) => void onCreate(e)}>
        <h2 className={styles.cardTitle}>Criar sala</h2>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Tempo</legend>
          <div className={styles.choices}>
            {TIME_CONTROLS.map((tc) => (
              <label key={tc.id} className={styles.choice}>
                <input
                  type="radio"
                  name="time"
                  value={tc.id}
                  checked={timeId === tc.id}
                  onChange={() => {
                    setTimeId(tc.id);
                  }}
                />
                <span>{tc.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Sua cor</legend>
          <div className={styles.choices}>
            {COLORS.map((c) => (
              <label key={c.value} className={styles.choice}>
                <input
                  type="radio"
                  name="color"
                  value={c.value}
                  checked={color === c.value}
                  onChange={() => {
                    setColor(c.value);
                  }}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={allowSpectators}
            onChange={(e) => {
              setAllowSpectators(e.target.checked);
            }}
          />
          Permitir espectadores
        </label>

        {createError && (
          <p className={styles.formError} role="alert">
            {createError}
          </p>
        )}
        <button type="submit" className={styles.cta} disabled={creating}>
          {creating ? "Criando…" : "Criar sala"}
        </button>
      </form>

      <form className={styles.card} onSubmit={onJoin}>
        <h2 className={styles.cardTitle}>Entrar com código</h2>
        <label className={styles.legend} htmlFor="join-code">
          Código da sala
        </label>
        <input
          id="join-code"
          className={styles.codeInput}
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value);
            setJoinError(null);
          }}
          placeholder="K7P-2QX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={9}
        />
        {joinError && (
          <p className={styles.formError} role="alert">
            {joinError}
          </p>
        )}
        <button type="submit" className={styles.cta}>
          Entrar
        </button>
        <Link href="/local" className={styles.secondary}>
          Ou jogue os dois lados neste aparelho
        </Link>
      </form>
    </div>
  );
}
