"use client";

import {
  describeResult,
  encodeMessage,
  formatCode,
  opposite,
  parseServerMessage,
  type Color,
} from "@gambit/core";
import Link from "next/link";
import PartySocket from "partysocket";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { Board2D } from "@/components/Board2D";
import { ClockFace } from "@/components/ClockFace";
import styles from "@/components/GameLayout.module.css";
import { MoveList } from "@/components/MoveList";
import { SERVER_URL } from "@/lib/api";
import { createOnlineGameStore, type OnlineGameState } from "@/lib/online-game-store";
import { loadSeatToken, saveSeatToken } from "@/lib/seat-tokens";

const COLOR_NAME: Record<Color, string> = { white: "Brancas", black: "Pretas" };

/** Liga o store a um PartySocket. O socket reconecta sozinho e repete o `hello` a cada conexão. */
function useOnlineGame(code: string) {
  const [store] = useState(() => {
    let socket: PartySocket | null = null;
    const store = createOnlineGameStore({
      code,
      send: (message) => socket?.send(encodeMessage(message)),
      saveToken: (token) => {
        saveSeatToken(code, token);
      },
    });
    return Object.assign(store, {
      attach(s: PartySocket) {
        socket = s;
      },
    });
  });

  useEffect(() => {
    const socket = new PartySocket({ host: new URL(SERVER_URL).host, party: "room", room: code });
    store.attach(socket);
    const state = store.getState();

    const onOpen = () => {
      state.setConnection("open");
      const playerToken = loadSeatToken(code);
      socket.send(encodeMessage({ type: "hello", ...(playerToken && { playerToken }) }));
    };
    const onClose = () => {
      state.setConnection("closed");
    };
    const onMessage = (event: MessageEvent) => {
      const message = parseServerMessage(String(event.data));
      if (!message) return;
      state.receive(message);
      // Sala que não existe: não adianta reconectar.
      if (message.type === "error" && message.code === "room_not_found") socket.close();
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);
    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
  }, [code, store]);

  return useStore(store);
}

function statusText(state: OnlineGameState): string {
  const { snapshot, role, connection, game } = state;
  if (state.error?.code === "room_not_found") return "Sala não encontrada";
  if (!snapshot || !game) return connection === "closed" ? "Sem conexão" : "Conectando…";
  if (snapshot.result) return describeResult(snapshot.result);
  if (snapshot.status === "waiting") return "Esperando o oponente entrar";
  const check = game.isCheck ? ". Xeque." : "";
  if (role === game.turn) return `Sua vez${check}`;
  if (role === "spectator") return `${COLOR_NAME[game.turn]} jogam${check}`;
  return `Vez do oponente${check}`;
}

export function OnlineGame({ code }: { code: string }) {
  const state = useOnlineGame(code);
  const { snapshot, role, game, orientation, error } = state;
  const isPlayer = role === "white" || role === "black";
  const isOver = Boolean(snapshot?.result);
  const top = opposite(orientation);
  const bottom = orientation;

  useEffect(() => {
    if (!error || error.code === "room_not_found") return;
    const timer = window.setTimeout(state.dismissError, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [error, state.dismissError]);

  const playerLabel = (color: Color) => {
    const player = snapshot?.players[color];
    const name = player?.name ?? COLOR_NAME[color];
    const you = role === color ? " (você)" : "";
    const offline = player && !player.connected ? " · fora" : "";
    return `${name}${you}${offline}`;
  };

  return (
    <main className={styles.layout}>
      <div className={styles.boardArea}>
        <Board2D
          pieces={state.pieces}
          orientation={orientation}
          selected={state.selected}
          dests={state.dests}
          lastMove={state.lastMove}
          checkSquare={state.checkSquare}
          onSquareClick={state.selectSquare}
          {...(state.pendingPromotion &&
            game && {
              promotion: {
                color: game.turn,
                onChoose: state.choosePromotion,
                onCancel: state.cancelPromotion,
              },
            })}
        />
      </div>

      <aside className={styles.panel}>
        <Link href="/" className={styles.back}>
          Gambit
        </Link>

        {snapshot && (
          <ClockFace
            color={top}
            label={playerLabel(top)}
            clock={snapshot.clock}
            receivedAt={state.receivedAt}
          />
        )}

        <p className={styles.status} role="status" aria-live="polite">
          {statusText(state)}
        </p>

        {snapshot?.status === "waiting" && <Lobby code={code} />}

        {error && error.code !== "room_not_found" && (
          <p className={styles.error} role="alert">
            {error.message}
          </p>
        )}
        {error?.code === "room_not_found" && (
          <p className={styles.empty}>
            Confira o código ou <Link href="/">crie uma sala nova</Link>.
          </p>
        )}

        {game && (
          <MoveList
            moves={game.moves}
            emptyText={isPlayer ? "As brancas começam." : "Nenhum lance ainda."}
          />
        )}

        {snapshot && (
          <ClockFace
            color={bottom}
            label={playerLabel(bottom)}
            clock={snapshot.clock}
            receivedAt={state.receivedAt}
          />
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={state.flip}>
            Virar tabuleiro
          </button>
          {isPlayer && snapshot?.status === "playing" && !isOver && (
            <>
              <DrawButtons state={state} />
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  if (window.confirm("Desistir desta partida?")) state.resign();
                }}
              >
                Desistir
              </button>
            </>
          )}
        </div>
      </aside>
    </main>
  );
}

function DrawButtons({ state }: { state: OnlineGameState }) {
  const { snapshot, role } = state;
  if (!snapshot || (role !== "white" && role !== "black")) return null;

  if (snapshot.drawOffer === opposite(role)) {
    return (
      <>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          onClick={() => {
            state.draw("accept");
          }}
        >
          Aceitar empate
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            state.draw("decline");
          }}
        >
          Recusar empate
        </button>
      </>
    );
  }
  if (snapshot.drawOffer === role) {
    return (
      <button type="button" className={styles.button} disabled>
        Empate oferecido
      </button>
    );
  }
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => {
        state.draw("offer");
      }}
    >
      Oferecer empate
    </button>
  );
}

function Lobby({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.lobby}>
      <p className={styles.lobbyHint}>Mande este código para o oponente:</p>
      <p className={styles.lobbyCode}>{formatCode(code)}</p>
      <button type="button" className={styles.button} onClick={() => void copyLink()}>
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}
