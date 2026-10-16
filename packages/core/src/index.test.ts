import { describe, expect, it } from "vitest";
import * as core from "./index";

describe("core", () => {
  it("expõe a API pública pelo index", () => {
    expect(core.Game).toBeTypeOf("function");
    expect(core.parseRules).toBeTypeOf("function");
    expect(core.parseClientMessage).toBeTypeOf("function");
    expect(core.generateRoomCode).toBeTypeOf("function");
    expect(core.createClock).toBeTypeOf("function");
    expect(core.chess960Fen).toBeTypeOf("function");
    expect(core.resultToPgn).toBeTypeOf("function");
  });
});
