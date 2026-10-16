"use client";

import type { Color, Snapshot } from "@gambit/core";
import { useEffect, useState } from "react";
import { clockAt, formatClock } from "@/lib/clock-view";
import styles from "./GameLayout.module.css";

interface ClockFaceProps {
  color: Color;
  label: string;
  clock: Snapshot["clock"];
  receivedAt: number;
}

/** Mostra o tempo de um lado. Só atualiza a tela enquanto esse lado está correndo. */
export function ClockFace({ color, label, clock, receivedAt }: ClockFaceProps) {
  const running = clock?.running === color;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => {
      window.clearInterval(timer);
    };
  }, [running]);

  const times = clockAt(clock, receivedAt, running ? now : receivedAt);
  const ms = times?.[color];

  return (
    <div className={`${styles.clock} ${running ? styles.clockRunning : ""}`}>
      <span className={styles.clockLabel}>{label}</span>
      {ms !== undefined && (
        <span className={`${styles.clockTime} ${ms < 10_000 ? styles.clockLow : ""}`}>
          {formatClock(ms)}
        </span>
      )}
    </div>
  );
}
