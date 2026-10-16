import { INITIAL_FEN, parseRules, type RoomRules } from "@gambit/core";
import { describe, expect, it } from "vitest";
import { ROOM_TTL_MS, RoomCore, type RoomRecord } from "./room-core";

const T0 = 1_000_000;
const BLITZ = parseRules({
  creatorColor: "white",
  timeControl: { kind: "fischer", initialSeconds: 60, incrementSeconds: 2 },
});

/** Gera tokens previsíveis: t1, t2, ... */
function tokens() {
  let n = 0;
  return () => `t${++n}`;
}

function setup(rules: RoomRules = BLITZ, random = () => 0) {
  const newToken = tokens();
  const { room, creatorToken } = RoomCore.create({
    code: "K7P2QX",
    rules,
    now: T0,
    newToken,
    random,
  });
  return { room, creatorToken, newToken };
}

/** Sala com os dois assentos ocupados: criador de brancas (t1), visitante de pretas (t2). */
function seated(rules: RoomRules = BLITZ) {
  const ctx = setup(rules);
  const guest = ctx.room.hello({ now: T0, newToken: ctx.newToken });
  if (!guest.ok || guest.role === "spectator") throw new Error("hello falhou");
  return { ...ctx, guestToken: guest.token };
}

function play(room: RoomCore, moves: string, start = T0) {
  moves.split(" ").forEach((uci, i) => {
    const role = i % 2 === 0 ? "white" : "black";
    const result = room.move(role, uci, room.record.moves.length, start + i * 1000);
    if (!result.ok) throw new Error(`${uci}: ${result.code}`);
  });
}

describe("criação", () => {
  it("guarda regras, posição inicial e assento do criador", () => {
    const { room, creatorToken } = setup();
    expect(creatorToken).toBe("t1");
    expect(room.record).toMatchObject({
      code: "K7P2QX",
      initialFen: INITIAL_FEN,
      moves: [],
      seats: { white: { token: "t1" }, black: null },
      result: null,
      createdAt: T0,
      lastActivity: T0,
    });
    expect(room.status).toBe("waiting");
  });

  it("cor aleatória usa o sorteio recebido", () => {
    const rules = parseRules({ creatorColor: "random" });
    expect(setup(rules, () => 0.2).room.record.seats.white?.token).toBe("t1");
    expect(setup(rules, () => 0.8).room.record.seats.black?.token).toBe("t1");
  });

  it("usa o FEN inicial das regras", () => {
    const fen = "8/8/8/4k3/8/8/4K3/R7 w - - 0 1";
    const { room } = setup(parseRules({ initialFen: fen }));
    expect(room.record.initialFen).toBe(fen);
  });

  it("tempo ilimitado não tem relógio", () => {
    const { room } = setup(parseRules({ timeControl: { kind: "unlimited" } }));
    expect(room.record.clock).toBeNull();
  });
});

describe("hello: assentos e espectadores", () => {
  it("criador com token recupera o assento", () => {
    const { room, newToken } = setup();
    expect(room.hello({ token: "t1", now: T0, newToken })).toEqual({
      ok: true,
      role: "white",
      token: "t1",
    });
  });

  it("primeiro visitante sem token ocupa o assento livre e recebe token", () => {
    const { room, newToken } = setup();
    expect(room.hello({ name: "Ana", now: T0, newToken })).toEqual({
      ok: true,
      role: "black",
      token: "t2",
    });
    expect(room.record.seats.black).toEqual({ token: "t2", name: "Ana" });
    expect(room.status).toBe("playing");
  });

  it("visitante seguinte vira espectador", () => {
    const { room, newToken } = seated();
    expect(room.hello({ now: T0, newToken })).toEqual({ ok: true, role: "spectator" });
  });

  it("token desconhecido com assento livre ocupa o assento", () => {
    const { room, newToken } = setup();
    expect(room.hello({ token: "velho", now: T0, newToken })).toMatchObject({ role: "black" });
  });

  it("espectadores proibidos recebem erro", () => {
    const { room, newToken } = seated(parseRules({ ...BLITZ, allowSpectators: false }));
    expect(room.hello({ now: T0, newToken })).toEqual({
      ok: false,
      code: "spectators_disabled",
    });
  });

  it("hello com nome atualiza o nome do assento", () => {
    const { room, newToken } = setup();
    room.hello({ token: "t1", name: "Iago", now: T0, newToken });
    expect(room.record.seats.white).toEqual({ token: "t1", name: "Iago" });
  });

  it("hello atualiza a última atividade", () => {
    const { room, newToken } = setup();
    room.hello({ now: T0 + 5000, newToken });
    expect(room.record.lastActivity).toBe(T0 + 5000);
  });
});

describe("move", () => {
  it("aplica lance legal na vez certa", () => {
    const { room } = seated();
    expect(room.move("white", "e2e4", 0, T0)).toEqual({ ok: true });
    expect(room.record.moves).toEqual(["e2e4"]);
  });

  it.each([
    { name: "espectador", role: "spectator", uci: "e2e4", ply: 0, code: "not_a_player" },
    { name: "fora da vez", role: "black", uci: "e7e5", ply: 0, code: "not_your_turn" },
    { name: "ply atrasado", role: "white", uci: "e2e4", ply: 1, code: "stale_ply" },
    { name: "lance ilegal", role: "white", uci: "e2e5", ply: 0, code: "illegal_move" },
  ] as const)("recusa $name com $code", ({ role, uci, ply, code }) => {
    const { room } = seated();
    expect(room.move(role, uci, ply, T0)).toEqual({ ok: false, code });
    expect(room.record.moves).toEqual([]);
  });

  it("recusa lance antes do oponente sentar", () => {
    const { room } = setup();
    expect(room.move("white", "e2e4", 0, T0)).toEqual({
      ok: false,
      code: "waiting_for_opponent",
    });
  });

  it("mate encerra a partida e para de aceitar lances", () => {
    const { room } = seated();
    play(room, "f2f3 e7e5 g2g4 d8h4");
    expect(room.record.result).toEqual({ winner: "black", reason: "checkmate" });
    expect(room.status).toBe("ended");
    expect(room.move("white", "a2a3", 4, T0 + 10_000)).toEqual({ ok: false, code: "game_over" });
  });

  it("lance gasta tempo e soma incremento depois que o relógio começa", () => {
    const { room } = seated();
    play(room, "e2e4 e7e5"); // relógio parado nos dois primeiros lances
    room.move("white", "g1f3", 2, T0 + 1000 + 10_000);
    expect(room.record.clock?.remaining.white).toBe(60_000 - 10_000 + 2000);
  });

  it("lance depois do fim de tempo encerra por tempo", () => {
    const { room } = seated();
    play(room, "e2e4 e7e5"); // relógio das brancas começa em T0 + 1000
    expect(room.move("white", "g1f3", 2, T0 + 1000 + 60_000)).toEqual({
      ok: false,
      code: "game_over",
    });
    expect(room.record.result).toEqual({ winner: "black", reason: "timeout" });
  });
});

describe("desistência e empate", () => {
  it("desistir dá a vitória ao oponente", () => {
    const { room } = seated();
    expect(room.resign("black", T0)).toEqual({ ok: true });
    expect(room.record.result).toEqual({ winner: "white", reason: "resign" });
  });

  it("espectador não pode desistir", () => {
    const { room } = seated();
    expect(room.resign("spectator", T0)).toEqual({ ok: false, code: "not_a_player" });
  });

  it("oferta aceita vira empate por acordo", () => {
    const { room } = seated();
    room.draw("white", "offer", T0);
    expect(room.record.drawOffer).toBe("white");
    expect(room.draw("black", "accept", T0)).toEqual({ ok: true });
    expect(room.record.result).toEqual({ winner: null, reason: "agreement" });
    expect(room.record.drawOffer).toBeNull();
  });

  it("oferta recusada some", () => {
    const { room } = seated();
    room.draw("white", "offer", T0);
    room.draw("black", "decline", T0);
    expect(room.record.drawOffer).toBeNull();
    expect(room.record.result).toBeNull();
  });

  it("oferta cruzada vira acordo", () => {
    const { room } = seated();
    room.draw("white", "offer", T0);
    room.draw("black", "offer", T0);
    expect(room.record.result).toEqual({ winner: null, reason: "agreement" });
  });

  it("aceitar sem oferta do oponente dá erro", () => {
    const { room } = seated();
    room.draw("white", "offer", T0);
    expect(room.draw("white", "accept", T0)).toEqual({ ok: false, code: "no_draw_offer" });
  });

  it("um lance cancela a oferta pendente", () => {
    const { room } = seated();
    room.draw("black", "offer", T0);
    room.move("white", "e2e4", 0, T0);
    expect(room.record.drawOffer).toBeNull();
  });
});

describe("alarme", () => {
  it("sem relógio correndo, o alarme é a expiração da sala", () => {
    const { room } = seated();
    expect(room.nextAlarm()).toBe(T0 + ROOM_TTL_MS);
  });

  it("com relógio correndo, o alarme é o fim do tempo da vez", () => {
    const { room } = seated();
    play(room, "e2e4 e7e5");
    expect(room.nextAlarm()).toBe(T0 + 1000 + 60_000);
  });

  it("checkTimeout encerra a partida no instante do fim de tempo", () => {
    const { room } = seated();
    play(room, "e2e4 e7e5");
    expect(room.checkTimeout(T0 + 1000 + 59_999)).toBe(false);
    expect(room.checkTimeout(T0 + 1000 + 60_000)).toBe(true);
    expect(room.record.result).toEqual({ winner: "black", reason: "timeout" });
  });

  it("depois do fim, o alarme volta a ser a expiração", () => {
    const { room } = seated();
    play(room, "e2e4 e7e5");
    room.resign("white", T0 + 5000);
    expect(room.nextAlarm()).toBe(T0 + 5000 + ROOM_TTL_MS);
  });

  it("isExpired depois de 24 h sem atividade", () => {
    const { room } = seated();
    expect(room.isExpired(T0 + ROOM_TTL_MS - 1)).toBe(false);
    expect(room.isExpired(T0 + ROOM_TTL_MS)).toBe(true);
  });
});

describe("restore (ADR 005)", () => {
  it("reconstrói a sala a partir do registro salvo", () => {
    const { room } = seated();
    play(room, "e2e4 c7c5 g1f3");
    const restored = RoomCore.restore(JSON.parse(JSON.stringify(room.record)) as RoomRecord);
    expect(restored.record).toEqual(room.record);
    expect(restored.snapshot(T0 + 3000, { white: true, black: true })).toEqual(
      room.snapshot(T0 + 3000, { white: true, black: true }),
    );
  });
});

describe("snapshot", () => {
  it("monta o estado completo para o cliente", () => {
    const { room } = seated();
    room.hello({ token: "t2", name: "Ana", now: T0, newToken: tokens() });
    play(room, "e2e4 e7e5");
    const snap = room.snapshot(T0 + 1000 + 5000, { white: true, black: false });
    expect(snap).toMatchObject({
      code: "K7P2QX",
      initialFen: INITIAL_FEN,
      moves: [
        { uci: "e2e4", san: "e4" },
        { uci: "e7e5", san: "e5" },
      ],
      turn: "white",
      isCheck: false,
      status: "playing",
      clock: { white: 55_000, black: 60_000, running: "white" },
      serverNow: T0 + 6000,
      players: { white: { connected: true }, black: { name: "Ana", connected: false } },
      drawOffer: null,
    });
    expect(snap.result).toBeUndefined();
  });

  it("relógio congela quando a partida acaba", () => {
    const { room } = seated();
    play(room, "e2e4 e7e5"); // relógio das brancas corre desde T0 + 1000
    room.resign("white", T0 + 1000 + 10_000);
    const later = room.snapshot(T0 + 1000 + 40_000, { white: true, black: true });
    expect(later.clock).toEqual({ white: 50_000, black: 60_000, running: null });
  });

  it("assento livre aparece como null", () => {
    const { room } = setup();
    expect(room.snapshot(T0, { white: true, black: false }).players.black).toBeNull();
  });

  it("nunca expõe os tokens", () => {
    const { room } = seated();
    expect(JSON.stringify(room.snapshot(T0, { white: true, black: true }))).not.toContain("t1");
  });
});
