// The page persons.html in a browser. Generated from spec/base/*.dml and spec/base/person.ui.md - rewritten on every `pisa generate`.
// The data is in the browser: every test starts with a fresh browser context, so the page is empty (the example data is made on the first visit, so the tests wait for it and clear the list).
import { expect, test, type Page } from "@playwright/test";
import { createThroughTheForm, fill, open, rows, submit, type Fill } from "./support.ts";

const FILLS: Fill[] = [{"name":"firstName","checkbox":false,"values":["firstName-1","firstName-2"]},{"name":"lastName","checkbox":false,"values":["lastName-1","lastName-2"]},{"name":"email","checkbox":false,"values":["email-1@example.com","email-2@example.com"]},{"name":"phone","checkbox":false,"values":["+41791234501","+41791234502"]},{"name":"birthday","checkbox":false,"values":["2000-01-15","2000-01-16"]},{"name":"status","checkbox":false,"select":true,"values":["ACTIVE","BLOCKED"]},{"name":"address.street","checkbox":false,"values":["address.street-1","address.street-2"]},{"name":"address.zip","checkbox":false,"values":["0000","1111"]},{"name":"address.city","checkbox":false,"values":["address.city-1","address.city-2"]}];

// The row this test made: the one that shows the first value it typed (the page may hold example data too).
const first = FILLS.find((f) => !f.checkbox && !f.select);
const mine = (page: Page, variant: 0 | 1) => rows(page).filter({ hasText: first ? first.values[first.createOnly ? 0 : variant] : "" });

test("shows its heading", async ({ page }) => {
  await open(page, "persons.html");
  await expect(page.locator("main > h1")).toHaveText("Persons");
  await page.reload();
  await expect(page.locator("main > h1")).toHaveText("Persons");
});

test("creates, edits and deletes a row through the form; the row is still there after a reload", async ({ page }) => {
  await open(page, "persons.html");
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

test("marks the field red for an invalid value", async ({ page }) => {
  await open(page, "persons.html");
  const before = await rows(page).count();
  await fill(page, FILLS, 0);
  await page.locator("[name='email']").fill("foo@bar");
  await submit(page);

  // The page marks the field red and says why; nothing is saved.
  await expect(page.locator("[name='email'].invalid")).toHaveCount(1);
  await expect(page.locator("label:has([name='email']) .field-error")).toBeVisible();
  await expect(rows(page)).toHaveCount(before);
});
