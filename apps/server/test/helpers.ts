import { fileURLToPath } from "node:url";
import {
  encodeMessage,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from "@gambit/core";
import { unstable_startWorker } from "wrangler";

type Worker = Awaited<ReturnType<typeof unstable_startWorker>>;

/** Sobe o Worker real (workerd local) com o wrangler.jsonc do servidor. */
export async function startServer(): Promise<{ worker: Worker; base: URL }> {
  const worker = await unstable_startWorker({
    config: fileURLToPath(new URL("../wrangler.jsonc", import.meta.url)),
    dev: { server: { port: 0 }, inspector: false, persist: false, logLevel: "error" },
  });
  await worker.ready;
  return { worker, base: await worker.url };
}

export async function createRoom(base: URL, rules: unknown = {}) {
  const res = await fetch(new URL("/api/rooms", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rules),
  });
  return { status: res.status, body: await res.json<Record<string, unknown>>() };
}

/** Cliente WebSocket de teste: guarda as mensagens e espera pela próxima que satisfaz um filtro. */
export class TestClient {
  private readonly received: ServerMessage[] = [];
  private waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] =
    [];
  readonly closed: Promise<{ code: number }>;

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const message = parseServerMessage(String(event.data));
      if (!message) throw new Error(`Mensagem inválida do servidor: ${String(event.data)}`);
      const waiter = this.waiters.find((w) => w.match(message));
      if (waiter) {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        waiter.resolve(message);
      } else {
        this.received.push(message);
      }
    });
    this.closed = new Promise((resolve) => {
      ws.addEventListener("close", (event) => {
        resolve({ code: event.code });
      });
    });
  }

  static async connect(base: URL, code: string): Promise<TestClient> {
    const url = new URL(`/parties/room/${code}`, base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(url.href);
    const client = new TestClient(ws);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => {
        resolve();
      });
      ws.addEventListener("error", () => {
        reject(new Error(`Falha ao conectar em ${url.href}`));
      });
    });
    return client;
  }

  send(message: ClientMessage) {
    this.ws.send(encodeMessage(message));
  }

  /** Próxima mensagem do tipo pedido (já recebida ou futura). */
  next<T extends ServerMessage["type"]>(
    type: T,
    match: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true,
    timeoutMs = 5000,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    type M = Extract<ServerMessage, { type: T }>;
    const test = (m: ServerMessage): m is M => m.type === type && match(m as M);
    const index = this.received.findIndex(test);
    if (index >= 0) {
      const [found] = this.received.splice(index, 1);
      return Promise.resolve(found as M);
    }
    return new Promise<M>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Esperava "${type}" e não chegou`));
      }, timeoutMs);
      this.waiters.push({
        match: test,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m as M);
        },
      });
    });
  }

  close() {
    this.ws.close();
  }
}
