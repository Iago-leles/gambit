import { expect, test, type Page } from "@playwright/test";
import { square, status } from "./helpers";

/** Joga com o teclado: a cena 3D tem uma grade de botões escondida para isso. */
async function press(page: Page, name: string) {
  await square(page, name).focus();
  await page.keyboard.press("Enter");
}

test("alternar entre 2D e 3D e jogar no 3D", async ({ page }) => {
  await page.goto("/local");
  await expect(page.getByTestId("board-3d")).toHaveCount(0);

  await page.getByRole("button", { name: "Ver em 3D" }).click();
  await expect(page.getByTestId("board-3d").locator("canvas")).toBeVisible();

  await press(page, "e2");
  await press(page, "e4");
  await expect(status(page)).toHaveText("Pretas jogam");
  await expect(page.getByRole("list", { name: "Lances" })).toContainText("e4");

  // A escolha fica salva.
  await page.reload();
  await expect(page.getByTestId("board-3d").locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: "Ver em 2D" }).click();
  await expect(page.getByTestId("board-3d")).toHaveCount(0);
  await expect(square(page, "e4")).toBeVisible();
});

test("arrastar uma peça no 3D", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("gambit:view", "3d");
  });
  await page.goto("/local");
  const canvas = page.getByTestId("board-3d").locator("canvas");
  await expect(canvas).toBeVisible();
  // O quadro tem tamanho fixo desde o início; o canvas só cresce depois de carregar.
  const box = await page.getByTestId("board-3d").boundingBox();
  if (!box) throw new Error("sem canvas");
  // Posições na câmera inicial, como fração do canvas: peão de d2 e casa d4.
  const at = (fx: number, fy: number) => ({
    x: box.x + box.width * fx,
    y: box.y + box.height * fy,
  });
  const from = at(0.444, 0.618);
  const to = at(0.456, 0.53);

  // Espera a cena ficar do tamanho do quadro e desenhar a primeira vez.
  await expect
    .poll(() =>
      canvas.evaluate((el: HTMLCanvasElement) => el.width >= el.clientWidth && el.width > 300),
    )
    .toBe(true);
  await page.waitForTimeout(800);
  // O primeiro arrasto pode pegar a cena ainda carregando. Tenta de novo se não jogou.
  await expect(async () => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, (from.y + to.y) / 2, { steps: 5 });
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    await expect(status(page)).toHaveText("Pretas jogam", { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("list", { name: "Lances" })).toContainText("d4");
});
