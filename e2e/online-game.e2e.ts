import { expect, test } from "@playwright/test";
import { createRoomViaApi, move, newPlayer, openAsCreator, square, status } from "./helpers";

test("criar sala, entrar pelo código e jogar até o mate", async ({ browser }) => {
  const white = await newPlayer(browser);
  const black = await newPlayer(browser);

  // Criador escolhe brancas na home.
  await white.goto("/");
  await white.getByText("Brancas", { exact: true }).click();
  await white.getByRole("button", { name: "Criar sala" }).click();
  await expect(white).toHaveURL(/\/r\/[A-Z0-9]{6}$/);
  await expect(status(white)).toHaveText("Esperando o oponente entrar");
  const code = new URL(white.url()).pathname.split("/").pop() ?? "";

  // Oponente digita o código com hífen e minúsculas.
  await black.goto("/");
  await black
    .getByLabel("Código da sala")
    .fill(`${code.slice(0, 3)}-${code.slice(3)}`.toLowerCase());
  await black.getByRole("button", { name: "Entrar" }).click();
  await expect(black).toHaveURL(`/r/${code}`);
  await expect(black.getByText("Pretas (você)")).toBeVisible();
  await expect(status(white)).toHaveText("Sua vez");
  await expect(status(black)).toHaveText("Vez do oponente");

  // Mate do louco.
  await move(white, "f2", "f3");
  await expect(status(black)).toHaveText("Sua vez");
  await move(black, "e7", "e5");
  await expect(status(white)).toHaveText("Sua vez");
  await move(white, "g2", "g4");
  await expect(status(black)).toHaveText("Sua vez");
  await move(black, "d8", "h4");

  for (const page of [white, black]) {
    await expect(status(page)).toHaveText("Pretas vencem por xeque-mate");
    await expect(page.getByRole("list", { name: "Lances" })).toContainText("Qh4#");
  }
});

test("recarregar a página devolve o mesmo assento", async ({ browser }) => {
  const { code, creatorToken } = await createRoomViaApi({ creatorColor: "white" });
  const white = await newPlayer(browser);
  const black = await newPlayer(browser);
  await openAsCreator(white, code, creatorToken);
  await black.goto(`/r/${code}`);
  await expect(black.getByText("Pretas (você)")).toBeVisible();

  await move(white, "e2", "e4");
  await expect(status(black)).toHaveText("Sua vez");

  await black.reload();
  await expect(black.getByText("Pretas (você)")).toBeVisible();
  await expect(status(black)).toHaveText("Sua vez");
  await move(black, "e7", "e5");
  await expect(status(white)).toHaveText("Sua vez");
});

test("terceiro visitante entra como espectador", async ({ browser }) => {
  const { code, creatorToken } = await createRoomViaApi({ creatorColor: "white" });
  const white = await newPlayer(browser);
  const black = await newPlayer(browser);
  const spectator = await newPlayer(browser);
  await openAsCreator(white, code, creatorToken);
  await black.goto(`/r/${code}`);
  await expect(black.getByText("Pretas (você)")).toBeVisible();

  await spectator.goto(`/r/${code}`);
  await expect(status(spectator)).toHaveText("Brancas jogam");
  await expect(spectator.getByRole("button", { name: "Desistir" })).toHaveCount(0);
});

test("promoção com escolha da peça", async ({ browser }) => {
  const { code, creatorToken } = await createRoomViaApi({
    creatorColor: "white",
    initialFen: "8/P6k/8/8/8/8/8/K7 w - - 0 1",
  });
  const white = await newPlayer(browser);
  const black = await newPlayer(browser);
  await openAsCreator(white, code, creatorToken);
  await black.goto(`/r/${code}`);
  await expect(status(white)).toHaveText("Sua vez");

  await move(white, "a7", "a8");
  const dialog = white.getByRole("dialog", { name: "Promover peão" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "cavalo" }).click();

  await expect(square(black, "a8")).toHaveAccessibleName("a8, cavalo branco");
  await expect(black.getByRole("list", { name: "Lances" })).toContainText("a8=N");
});

test("relógio zera e a partida acaba por tempo", async ({ browser }) => {
  const { code, creatorToken } = await createRoomViaApi({
    creatorColor: "white",
    timeControl: { kind: "fischer", initialSeconds: 10, incrementSeconds: 0 },
  });
  const white = await newPlayer(browser);
  const black = await newPlayer(browser);
  await openAsCreator(white, code, creatorToken);
  await black.goto(`/r/${code}`);
  await expect(status(white)).toHaveText("Sua vez");

  // O relógio só corre depois do primeiro lance de cada lado.
  await move(white, "e2", "e4");
  await expect(status(black)).toHaveText("Sua vez");
  await move(black, "e7", "e5");
  await expect(status(white)).toHaveText("Sua vez");

  // Brancas não jogam. O alarme do servidor encerra a partida.
  for (const page of [white, black]) {
    await expect(status(page)).toHaveText("Pretas vencem por tempo", { timeout: 20_000 });
  }
});

test("sala que não existe mostra aviso", async ({ page }) => {
  await page.goto("/r/ZZZZZZ");
  await expect(status(page)).toHaveText("Sala não encontrada");
});
