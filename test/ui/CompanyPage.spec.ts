// The page companies.html in a browser. Generated from spec/base/*.dml and spec/base/company.ui.md - rewritten on every `pisa generate`.
// The data is in the browser: every test starts with a fresh browser context, so the page is empty (the example data is made on the first visit, so the tests wait for it and clear the list).
import { expect, test, type Page } from "@playwright/test";
import { createThroughTheForm, fill, open, rows, submit, type Fill } from "./support.ts";

const FILLS: Fill[] = [{"name":"name","checkbox":false,"values":["name-1","name-2"]}];

// The row this test made: the one that shows the first value it typed (the page may hold example data too).
const first = FILLS.find((f) => !f.checkbox && !f.select);
const mine = (page: Page, variant: 0 | 1) => rows(page).filter({ hasText: first ? first.values[first.createOnly ? 0 : variant] : "" });

test("shows its heading", async ({ page }) => {
  await open(page, "companies.html");
  await expect(page.locator("main > h1")).toHaveText("Companies");
  await page.reload();
  await expect(page.locator("main > h1")).toHaveText("Companies");
});

test("creates, edits and deletes a row through the form; the row is still there after a reload", async ({ page }) => {
  await open(page, "companies.html");
  const before = await rows(page).count();
  await fill(page, FILLS, 0);
  await submit(page);
  await expect(rows(page)).toHaveCount(before + 1);
  // the data is kept in the browser (localStorage)
  await page.reload();
  await expect(rows(page)).toHaveCount(before + 1);

  await mine(page, 0).first().locator("button:has-text('Edit')").click();
  await fill(page, FILLS, 1);
  await submit(page);
  await expect(rows(page)).toHaveCount(before + 1);

  page.on("dialog", (dialog) => dialog.accept());
  await mine(page, 1).first().locator("button:has-text('Delete')").click();
  await expect(rows(page)).toHaveCount(before);
  await page.reload();
  await expect(rows(page)).toHaveCount(before);
});
