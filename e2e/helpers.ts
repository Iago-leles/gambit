import { expect, type Browser, type Page } from "@playwright/test";
import { SERVER_URL } from "./env";

/** Uma casa do tabuleiro. O `aria-label` começa pelo nome da casa: "e4" ou "e2, peão branco". */
export function square(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^${name}(,|$)`) });
}

/** Aciona uma casa pelo teclado. Funciona no 2D e no 3D (que tem uma grade de botões escondida). */
export async function press(page: Page, name: string) {
  await square(page, name).focus();
  await page.keyboard.press("Enter");
}

/** Joga um lance, casa de origem e depois a de destino. */
export async function move(page: Page, from: string, to: string) {
  await press(page, from);
  await press(page, to);
}

export function status(page: Page) {
  return page.getByRole("status");
}

/** Um jogador = um contexto de navegador, com `localStorage` próprio. */
export async function newPlayer(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

/** Cria a sala direto na API, para regras que a home não oferece (FEN, relógio curto). */
export async function createRoomViaApi(rules: unknown) {
  const res = await fetch(`${SERVER_URL}/api/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rules),
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { code: string; creatorToken: string };
}

/** Abre a sala já com o token do criador no `localStorage`. */
export async function openAsCreator(page: Page, code: string, token: string) {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [`gambit:seat:${code}`, token] as const,
  );
  await page.goto(`/r/${code}`);
}
