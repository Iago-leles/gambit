import { describe, expect, it } from "vitest";
import { corsHeaders, isOriginAllowed, parseAllowedOrigins } from "./origin";

const WEB = "https://gambit-web.iago-leles.workers.dev";
const DOMAIN = "https://gambit.iagoleles.com";
const PROD_REQUEST = "https://gambit-server.iago-leles.workers.dev/api/rooms";
const LOCAL_REQUEST = "http://127.0.0.1:8787/api/rooms";

describe("parseAllowedOrigins", () => {
  it("sem valor devolve lista vazia", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins("")).toEqual([]);
  });

  it("separa por vírgula, tira espaços e ignora vazios", () => {
    expect(parseAllowedOrigins(` ${WEB} , ${DOMAIN} ,, `)).toEqual([WEB, DOMAIN]);
  });

  it("normaliza barra final, maiúsculas e caminho", () => {
    expect(parseAllowedOrigins("HTTPS://Gambit.IagoLeles.com/")).toEqual([DOMAIN]);
    expect(parseAllowedOrigins(`${DOMAIN}/sala/abc`)).toEqual([DOMAIN]);
  });

  it("descarta o que não é uma URL", () => {
    expect(parseAllowedOrigins(`lixo, ${WEB}, ://`)).toEqual([WEB]);
  });

  it("descarta esquemas que não são http nem https", () => {
    expect(parseAllowedOrigins("ftp://exemplo.com, javascript:alert(1)")).toEqual([]);
  });
});

describe("isOriginAllowed: pedidos sem Origin", () => {
  it("passam, porque não são de navegador (curl, servidor, CI)", () => {
    expect(isOriginAllowed(null, { allowed: [WEB], requestUrl: PROD_REQUEST })).toBe(true);
  });
});

describe("isOriginAllowed: origens configuradas", () => {
  const ctx = { allowed: [WEB, DOMAIN], requestUrl: PROD_REQUEST };

  it.each([WEB, DOMAIN])("aceita %s", (origin) => {
    expect(isOriginAllowed(origin, ctx)).toBe(true);
  });

  it.each([
    ["outro site", "https://evil.example"],
    ["subdomínio parecido", "https://gambit.iagoleles.com.evil.example"],
    ["subdomínio a mais", "https://x.gambit.iagoleles.com"],
    ["esquema diferente", "http://gambit.iagoleles.com"],
    ["porta diferente", "https://gambit.iagoleles.com:8443"],
    ["a string null (iframe isolado)", "null"],
    ["texto que não é origem", "isso não é uma origem"],
    ["origem com usuário", "https://user@gambit.iagoleles.com"],
  ])("recusa %s", (_name, origin) => {
    expect(isOriginAllowed(origin, ctx)).toBe(false);
  });

  it("com a lista vazia, recusa qualquer origem", () => {
    expect(isOriginAllowed(WEB, { allowed: [], requestUrl: PROD_REQUEST })).toBe(false);
  });
});

describe("isOriginAllowed: servidor local", () => {
  const ctx = { allowed: [WEB], requestUrl: LOCAL_REQUEST };

  it.each([
    "http://localhost:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
  ])("aceita a origem local %s", (origin) => {
    expect(isOriginAllowed(origin, ctx)).toBe(true);
  });

  it("continua aceitando as origens configuradas", () => {
    expect(isOriginAllowed(WEB, ctx)).toBe(true);
  });

  it("continua recusando sites de fora", () => {
    expect(isOriginAllowed("https://evil.example", ctx)).toBe(false);
    expect(isOriginAllowed("http://localhost.evil.example", ctx)).toBe(false);
  });

  it("origem local só vale quando o próprio servidor é local", () => {
    const prod = { allowed: [WEB], requestUrl: PROD_REQUEST };
    expect(isOriginAllowed("http://localhost:3000", prod)).toBe(false);
    expect(isOriginAllowed("http://127.0.0.1:3000", prod)).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("devolve a origem recebida, não *, e avisa os caches com Vary", () => {
    expect(corsHeaders(DOMAIN)).toEqual({
      "access-control-allow-origin": DOMAIN,
      vary: "Origin",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    });
  });
});
