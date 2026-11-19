// `npm run package`: the finished site as a ZIP file, dist/adressen-singletier.zip (`package zip` in the architecture). Everything below public/ goes into it,
// so the content of the ZIP is the site itself: unpack it into any web server, or open index.html. Written once by `pisa init`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";

const files = {};
for (const name of readdirSync("public", { recursive: true })) {
  if (!name.includes(".")) continue; // a folder
  files[name.split("\\").join("/")] = new Uint8Array(readFileSync(join("public", name)));
}
mkdirSync("dist", { recursive: true });
writeFileSync("dist/adressen-singletier.zip", zipSync(files));
console.log(`dist/adressen-singletier.zip: ${Object.keys(files).length} files`);
