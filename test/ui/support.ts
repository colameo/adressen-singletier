// What the generated browser tests share. Rewritten on every `pisa generate`.
import { expect, type Page } from "@playwright/test";

export interface Fill {
  name: string;
  checkbox?: boolean;
  select?: boolean;
  // The id of an existing row can't be edited, so it is typed in on create only.
  createOnly?: boolean;
  values: [string, string];
}

/** Fills the form: the values of variant 0 (create) or 1 (edit). A choice of another entity's row is left as it is (the list may be empty); a choice of an enum takes the value. */
export async function fill(page: Page, fills: Fill[], variant: 0 | 1): Promise<void> {
  for (const f of fills) {
    const field = page.locator(`[name='${f.name}']`);
    if (f.select) await field.selectOption(f.values[variant]);
    else if (f.checkbox) await (variant === 0 ? field.check() : field.uncheck());
    else if (!f.createOnly || variant === 0) await field.fill(f.values[variant]);
  }
}

/** Opens a page of the site and waits until its script has loaded the data (the store is in the browser: no example data in these tests). */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

export const rows = (page: Page) => page.locator("main > table tbody tr");

export async function submit(page: Page): Promise<void> {
  await page.locator("form button[type=submit]").click();
}

/** Creates a row through the form and checks that it shows in the list. */
export async function createThroughTheForm(page: Page, path: string, fills: Fill[], marker?: string): Promise<void> {
  await open(page, path);
  await fill(page, fills, 0);
  await submit(page);
  await expect(rows(page)).toHaveCount(1);
  if (marker !== undefined) await expect(rows(page).first()).toContainText(marker);
}
