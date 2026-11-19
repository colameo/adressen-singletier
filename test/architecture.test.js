// The architecture of a single-tier application as a rule: there is no server, so nothing in the site may call one. Every file of public/ is
// searched for the ways a page reaches over the network (fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon); the libraries and the
// example data come from a CDN as scripts and modules (`<script src>`, `import`), which is no call. Rewritten on every `pisa generate`; put
// your own rules into another file. A second rule: no link or script starts with a slash, because on GitHub Pages the site lives below the
// name of the repository (https://<owner>.github.io/<repository>/), where /app.js would be somewhere else.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const CALLS = /\b(fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon)/;

const ABSOLUTE = /\b(href|src)\s*=\s*["']\/(?!\/)/;

const files = readdirSync("public", { recursive: true })
  .filter((name) => /\.(js|mjs|html)$/.test(name))
  .map((name) => join("public", name));

describe("architecture", () => {
  test("the site has files", () => {
    assert.ok(files.length > 0);
  });

  test("no file of public/ calls a server", () => {
    const violations = files.filter((file) => CALLS.test(readFileSync(file, "utf8")));
    assert.deepEqual(violations, [], "these files reach over the network, but a single-tier application has no server");
  });

  test("the pages link with relative paths, so the site works below a folder (GitHub Pages)", () => {
    const violations = files.filter((file) => file.endsWith(".html") && ABSOLUTE.test(readFileSync(file, "utf8")));
    assert.deepEqual(violations, [], "these pages have a link or script that starts with a slash");
  });
});
