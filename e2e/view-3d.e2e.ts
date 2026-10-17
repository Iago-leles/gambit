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
