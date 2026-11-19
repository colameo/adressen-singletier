# Pisa — Tutorial: a site without a server (single tier, Alpine.js, JSON)

You build the same small **address book** (people with an address and a company) as in the two other tutorials, but as an application with
**only one tier**: a web site of plain HTML and Alpine.js, with no backend and no database. Its data stays in the browser and can be saved
to a file and loaded from it. The models stay the same; only the architecture description (`.adl`) is a smaller one. You write only prose; an LLM
proposes the architecture and the domain model, Pisa checks the proposals and generates the site. After every step it says what you should see.

> As of `pisa 0.17.0`. Commands in detail: [User Guide](pisa-user-guide.md), section "A single-tier site (no server)". Duration: about half an hour;
> `npm install` (optional, for the browser tests and the ZIP) downloads dependencies.

Steps 2 and 4 call an LLM (two short calls); all other steps run without one. Without an LLM you write the two files yourself, as they are shown in the steps.
At the end there are **optional steps** (9, the ZIP file of the site; 10, GitHub and GitHub Pages); `pisa play --fast` leaves them out.

## The method in four phases

Pisa works spec-driven, in the manner of [GitHub Spec Kit](https://github.com/github/spec-kit): you describe first, the description becomes a checked spec,
the code is generated from the specs, and tests check the result. It is the same method as in the [Spring Java](pisa-tutorial-spring-java.md) and
[Hono TypeScript](pisa-tutorial-hono-typescript.md) tutorials; each step title names its phase.

| Phase | What you do | Pisa | Steps |
|---|---|---|---|
| **Specify** | describe in prose what you want; have a spec proposed and correct it | `propose-architecture`, `propose-model` (an LLM proposes, Pisa checks the proposal before it writes anything) | 2, 4 |
| **Plan** | turn the specs into a project plan and into pages | `init` (the architecture plan `.pisa/architecture.plan.json`), `propose-specs` (forms) | 3, 5 |
| **Implement** | generate the code | `generate` (deterministic: the same specs give the same files, no LLM writes code) | 6 |
| **Check** | run the generated tests, try the site, reproduce the project | `npm test`, `npm run test:ui`, `replay` | 7, 8 |

**What is different here.** The architecture has *one container*: a frontend with `storage json`. There is no server, so there is nothing to log in to, no
database to start and no image to build. The site is static files in `public/`; any web server serves them (steps 9 and 10 say what you can do with them: a ZIP file, or GitHub Pages). The models (`.dml`), the forms (`.ui.md`) and the rules are the same as for the other targets; that is the point: **you change the `.adl`, the models stay.**

## 0. Requirements

| What | Check |
|---|---|
| Pisa 0.17.0 | `pisa --version` shows `pisa 0.17.0`. Otherwise install it: User Guide, section "Installing Pisa" (`curl`, PowerShell or `brew`, no login) |
| Node.js 24 or newer and npm | `node -v`, `npm -v`. Node.js only serves the files and runs the tests, there is no build step. Install and switch versions with nvm: `nvm install 24`, `nvm use 24` |
| A web browser and internet | The pages load Alpine.js, Bootstrap and (for the example data) Faker from a CDN (jsDelivr) |
| LLM access for `pi` | `pi` is set up with a model (see the `pi` documentation); needed only for steps 2 and 4 |
| Optional: Chromium for the browser tests | `npx playwright install chromium` (step 7) |
| Optional: Pisa plugin | IntelliJ or VS Code colors `.dml`/`.adl` and shows errors while you write (User Guide, "Setting up editor and PlantUML") |

## 1. Create a folder and prepare Pisa

```bash
mkdir adressen-singletier && cd adressen-singletier
pisa init
```

You should see: `Prepared .: doc/ (the user guide and the tutorials) and spec/base/.` and the hint which tutorial you can read.
`pisa init` without arguments creates **no project** yet, only what is the same for every kind of application: the folder **`doc/`** with the user guide and
the tutorials and an empty folder `spec/base/` for the base specs. Which kind of application you want you decide in the description in step 2; a project is created only in step 3.
All further commands run in this folder.

## 2. Specify: describe the architecture and have it proposed

<!-- play: llm -->
```bash
pisa propose-architecture --out .
```

You should see: `Created spec/base/architecture.md with a starting text - describe the architecture there, …`.
Open `spec/base/architecture.md`, **delete the line `<!-- pisa:starting-text -->`** and replace the text with something like this. **One place decides that it is a site
without a server:** the sentence that the data stays in the browser and in a file, and that there is no backend and no database.

<!-- play: write spec/base/architecture.md -->
```markdown
# Architecture

Management of people with their address and the companies they work for. It is a
small tool for one person: a web site without a server, no backend and no database.
The data stays in the browser and can be saved to a file and loaded from it.

- Example data: For the demo the site starts with 5 realistic example records per entity, Swiss German names and places.
- ZIP: I want a ZIP file of the finished site that I can put on any web server.
- Login: none.
```

Then once more:

<!-- play: llm -->
```bash
pisa propose-architecture --out .
```

You should see: the streaming text of the model, at the end `Architecture proposal complete:
spec/base/architecture.adl` and the line `Create the project from it: pisa init … --out . --adl …`.

Open `spec/base/architecture.adl` and check it:

<!-- play: write spec/base/architecture.adl unless-llm -->
```
architecture AdressenSingletier {
    container web : frontend {
        technology alpine
        storage json
        package zip
    }
    sampleData { entries 5  locale "de-CH" }
}
```

(The file is formatted over several lines; comments at the top name what the model could not cover.)
If something is wrong, change the file by hand: it is yours from now on.

The line `storage json` is what makes it a site without a server: the data is **one JSON file** that is kept in the browser, loaded and changed. Because it is one file, there is
**exactly one container**: no backend, no database, no second frontend. Pisa rejects a `.adl` that has more (`storage json needs a single frontend container …`), and also
`servedBy`, `docker` and `deploy render` with `storage json`: there is no server for them. The target (`alpine-json`) follows from `storage json`; you need no `--target`.

`package zip` (from the sentence "ZIP" in your description) makes `npm run package` write a ZIP file of the site (step 9). `sampleData { entries 5  locale "de-CH" }` (from the sentence
"Example data") fills the site with realistic records on the first visit: 5 per entity, names and places for German (Switzerland), made from your model with a Faker library. **If one of these
is missing** in your file, write it by hand into the file before the last bracket, or leave it out.

**If it does not work:** "ended without an accepted architecture" means the model answered invalidly three times, or not at all through the tool; formulate the description more precisely and repeat.
With an existing `.adl` the command does nothing, except with `--force`.

## 3. Plan: create the project

```bash
pisa init --out . --artifact adressen-singletier --adl spec/base/architecture.adl
```

You should see: `Architecture from spec/base/architecture.adl: … ` and the list of files (`package.json`, `playwright.config.ts`, `scripts/serve.js`, `scripts/package.js`,
`.pisa/architecture.plan.json`, …). New are also `spec/README.md` (a guide to the specs) and `README.md` with the recipe of the project. `doc/` from step 1 stays as it is.
`scripts/serve.js` is a small web server for development only (`npm start`); the finished site needs none of it.

(Short cut for later: `pisa init --target alpine-json --out . --artifact adressen-singletier` writes the smallest description itself: one frontend with `storage json` and `sampleData { }`.)

## 4. Specify: describe the domain model and have it proposed

<!-- play: llm -->
```bash
pisa propose-model --out .
```

You should see: `Created spec/base/domain-spec.md with a starting text - describe the domain model there, …`.
In `spec/base/domain-spec.md` delete the marker line again and write:

<!-- play: write spec/base/domain-spec.md -->
```markdown
# Domain model

A simple address book for a small office. It stores people with
their address and the companies they work for.

- **Person:** First name and last name are required (at most 80 characters each). The
  e-mail address is optional and may occur only once. Phone and
  birthday are optional. Every person has a status: `ACTIVE`, `BLOCKED` or `ARCHIVED`
  (displayed "Active", "Blocked" and "Archived").
- **Address:** Street and city are required, the postal code consists of exactly
  4 digits. The address belongs firmly to one person (a part), it has
  no page of its own and is saved and deleted with the person.
- **Company:** The name is required and unique. A company has many people,
  a person works for at most one company.

Not wanted: history of the addresses, access rights.
```

<!-- play: llm -->
```bash
pisa propose-model --out .
```

You should see: `Model proposal complete: spec/base/adressen-singletier.dml` (the file name is the project name) and the
line `Check it, then: pisa generate --file spec/base/adressen-singletier.dml --out .`.

**Check `spec/base/adressen-singletier.dml` closely**, this is the most important step: Are all three entities there? Does `Person` have a `status` as an `enum`, `Address` the rule for the
postal code (`~ "[0-9]{4}"`), `address` on the person as `composed`, `employees` on the company as `mappedBy company`? Wishes that the language does not express stand as `// Not covered: …`
above the first line. The model is a proposal, not the truth: change by hand what is not right; the plugin shows errors while you write. For comparison, this is what a fitting model looks like:

<!-- play: write spec/base/adressen-singletier.dml unless-llm -->
```
enum PersonStatus { ACTIVE ("Active"), BLOCKED ("Blocked"), ARCHIVED ("Archived") }

type Plz = String ~ "[0-9]{4}"

entity Person {
    @id id: Long
    firstName: String(1..80)
    lastName: String(1..80)
    email: Email? unique
    phone: Phone?
    birthday: Date?
    status: PersonStatus
    oneToOne address: Address composed
    manyToOne company: Company
}

entity Address {
    @id id: Long
    street: String
    zip: Plz
    city: String
}

entity Company {
    @id id: Long
    name: String unique
    oneToMany employees: Person mappedBy company
}
```

The relations must be those the site can do (the same as for the Hono target): `manyToOne`, `oneToMany … mappedBy` and `oneToOne … composed`. `manyToMany`, `oneToMany` without `mappedBy` and
`oneToOne` without `composed` are rejected by Pisa with `not supported by this target yet`.

## 5. Plan: derive the forms (without an LLM)

```bash
pisa propose-specs --out .
```

You should see: `Wrote spec/base/person.ui.md`, `Wrote spec/base/company.ui.md`, `Wrote spec/base/use-cases.uc.md`.
The forms (`.ui.md`) hold a Salt mockup in a Bootstrap look; `generate` reads only the form box, the rest is decoration. You can adjust the forms later; the command never overwrites existing files.
The use cases (`.uc.md`) are written too, but this target makes **no browser test from them yet**; the browser tests of the site are one per page (step 7).

## 6. Implement: generate code

```bash
pisa generate --file spec/base/adressen-singletier.dml --out .
```

You should see: `Generated alpine-json files for Person, Address, Company:` and the list of generated files and at the end `Recorded step N in .pisa/recipe.json and README.md.`

| File | Content |
|---|---|
| `public/index.html`, `public/persons.html`, `public/companies.html` | the pages: a start page and one page per entity with a list, a form, a display mode and the rules before saving (`Address` is a part of the person and has no page) |
| `public/app.js`, `public/app.css` | the script of every page (it also holds the menu with Save, Load and Reset) and the look |
| `public/schema.js` | the rules of your model (required values, lengths, ranges, patterns, `Email`, `unique`) |
| `public/store.js` | the **in-browser store**: it answers the requests of the pages the way the REST API of the other targets does, and keeps the data in the browser |
| `public/sample-data.js` | the example data (only with `sampleData`) |
| `test/architecture.test.js` | the architecture test: no file of `public/` may call a server (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`) |
| `test/ui/*.spec.ts` | one browser test (Playwright) per page |

## 7. Check: start and try it out

Start the development server (it only serves the files of `public/`):

<!-- play: server /index.html -->
```bash
npm start
```

You should see: `AdressenSingletier on http://localhost:8080/`.

Open http://localhost:8080/ **in the browser, through the running server** (an ES module is loaded from the page, a `file://` address does not work). The start page has a menu with Persons and
Companies. Open **Persons**: the list is not empty, it holds 5 example records (from `sampleData`; they are made on the **first visit** only, when the browser holds no data yet; Faker comes from the CDN, so you need internet).
Create a company, then a person with an address and choose the company. A click on a row shows the entry **read-only** (display mode); there is "Edit". Try the rules: a postal code with 3 digits, the same e-mail twice, an
empty last name; the field turns red and the page shows the message per field, the same messages as the REST API of the other targets.

The hamburger button (☰) at the top right opens the **data menu**:

| Entry | What it does |
|---|---|
| **Save data** | writes all data to a JSON file (`adressen-singletier-data.json`, one list per entity) |
| **Load data** | replaces the data with the content of such a file; a file that is not valid (not JSON, an unknown entity, a broken rule, a reference to a row that is not there) is refused with a message and **changes nothing** |
| **Reset to example data** | throws the data away and makes the example data again (only with `sampleData`) |

The data is also kept in the browser (`localStorage`, key `adressen-singletier:data`): reload the page and it is still there. It is kept **per address** (here `localhost:8080`) and per browser; another browser or
another address starts anew. Save data is how you move it or keep a copy. End the server with `Ctrl+C`.

<!-- play: tests -->
```bash
npm test                                          # architecture test: no file calls a server
```

You should see: `ℹ pass 2` and `ℹ fail 0`. And the browser tests (they need the dependencies and Chromium, installed once):

<!-- play: slow -->
```bash
npm install
npx playwright install chromium                   # once
npm run test:ui                                   # browser tests, one per page
```

You should see: `5 passed`. They start the development server themselves, create, change and delete a row on every page and check the rules; they use a browser profile of their own, so the data of your browser stays untouched.

## 8. Check: reproduce

<!-- play: slow -->
```bash
cd ..
pisa replay --from adressen-singletier --out adressen-singletier-copy
```

You should see: `… All N generated file(s) match the hashes recorded in the recipe.` Pisa runs the recorded steps (`init`, `generate`) again in a new folder and compares the files with the checksums in the recipe
(`adressen-singletier/.pisa/recipe.json`). The LLM steps are not repeated: their result (`spec/base/architecture.adl`, `spec/base/adressen-singletier.dml`) is copied from the source project. The example data are
the same on every run (a fixed seed).

## 9. Optional: a ZIP file of the site

<!-- play: optional -->
```bash
cd adressen-singletier
npm run package
```

You should see: `dist/adressen-singletier.zip` with the files of `public/` (and nothing else). Unpack it on any web server, or open the pages from any static hosting; they call no server. If you did not run `npm install` in step 7, do it first (the script uses the small library `fflate`).
Without `package zip` in the `.adl` there is no script and no ZIP; add the line and run `pisa init … --force` and `pisa generate` again.

## 10. Optional: put it on GitHub and publish the site (GitHub Pages)

This is an extra. The site is static files, so GitHub can publish it for free as a web page. Add three things to `spec/base/architecture.adl` before the last bracket: `scm` (where the repository lives), `pipeline` with
`ci github` (the tests on every push), `release github` (a GitHub release with the ZIP file on a tag `v*`) and **`deploy pages`** (publishes the site on GitHub Pages, also on a tag `v*`). `deploy pages` is only possible with `storage json`
(a backend would need a server, which GitHub Pages does not run) and needs no `docker` block:

```
    scm { host github }
    pipeline {
        ci github
        release github
        deploy pages
    }
```

The commands do it instead of you (replace the last line of the `.adl`, then `init --force`). Run the **whole** block: `pisa init … --force` alone changes nothing as long as the blocks are not in `spec/base/architecture.adl`, and without them Pisa creates neither a repository nor a commit.

<!-- play: optional -->
```bash
cd adressen-singletier
sed -i.bak '$ d' spec/base/architecture.adl && rm spec/base/architecture.adl.bak
printf '    scm { host github }\n    pipeline {\n        ci github\n        release github\n        deploy pages\n    }\n}\n' >> spec/base/architecture.adl
pisa init --out . --artifact adressen-singletier --adl spec/base/architecture.adl --force
```

You should see: the new files `.github/workflows/ci.yml`, `release.yml` and **`pages.yml`** in the list and `Git repository created, first commit made (branch main …)`. Pisa creates the repository and makes the first commit
(`Initial project (pisa init)`), local only; it does not know your GitHub account, you take care of that. `pages.yml` runs on a tag `v*` and by hand: it runs the tests (`npm test`, which also checks that the pages link with relative paths),
then hands the folder `public/` to the official GitHub Pages actions. There are three cases for getting the project to GitHub, one paragraph each.

**Normal case: Pisa made the commit.** Create the repository on GitHub and upload it (needs the GitHub CLI `gh`, once `gh auth login`). **Make it public:** a free GitHub account publishes Pages only from a public repository (check GitHub's current rules for your plan):

<!-- play: skip -->
```bash
gh repo create adressen-singletier --public --source . --push
```

**Pisa made no repository or no commit.** The `scm`/`pipeline` blocks are missing in `spec/base/architecture.adl` (only the last line was run), `pisa play --fast` left the step out, the folder is already in a Git repository (Pisa does not touch it), or name and e-mail are missing in your Git
configuration (repository, but no commit). `git status` shows it. Then you make the repository and the commit yourself and go on as in the normal case (`git init` does no harm if the repository is already there):

<!-- play: skip -->
```bash
git init -b main
git add -A
git commit -m "Initial project"
```

**Without `gh`.** Create an empty **public** repository on github.com and connect it to your folder (instead of `gh repo create`):

<!-- play: skip -->
```bash
git remote add origin git@github.com:<your-name>/adressen-singletier.git
git push -u origin main
```

The push starts the CI on GitHub (tab "Actions": the jobs `tests` and `browser-tests`). Now set GitHub up for the site, **once per repository and before the first tag**. Two things are needed, and both are `gh` commands (they take the repository of the folder you are in); run them **in this order**:

<!-- play: skip -->
```bash
gh api -X POST 'repos/{owner}/{repo}/pages' -f build_type=workflow
gh api -X POST 'repos/{owner}/{repo}/environments/github-pages/deployment-branch-policies' -f name='v*' -f type=tag
```

The first command switches Pages on (source: GitHub Actions) and so creates the environment `github-pages`; the second allows the tags `v*` to deploy to it. GitHub allows only the branch `main` there by default, so without the second command the run for the tag is rejected
(`Tag "v0.1.0" is not allowed to deploy to github-pages due to environment protection rules`). You should see: `"build_type":"workflow"` and then `"name":"v*"` and `"type":"tag"`. (`GitHub Pages is already enabled` means the first one was done before; that is fine.)
Without `gh`, do both in the browser: **Settings → Pages → Build and deployment → Source: GitHub Actions**, then **Settings → Environments → github-pages → Deployment branches and tags → Add deployment branch or tag rule → Tag: `v*`**.
Without the first command the run of `pages.yml` fails in the step `configure-pages` (`Get Pages site failed`). Then publish with a tag:

<!-- play: skip -->
```bash
git tag v0.1.0
git push origin v0.1.0
```

The tag starts two workflows: `release.yml` (a GitHub release with `adressen-singletier.zip`) and `pages.yml` (the site). When `pages.yml` is green, the site is at `https://<your-name>.github.io/adressen-singletier/` (the address is also in the run, step `deploy`).
Open it: the same pages as with `npm start`, with the example data on the first visit and the data menu. Save data and Load data work there because they run in your browser; the data stays in **your** browser, whoever opens the page has data of their own.
You can also start the publishing by hand: tab "Actions", workflow "Pages", "Run workflow". The files `.github/workflows/*.yml` are yours, even `init --force` does not overwrite them. **Pisa has not checked the workflows on a real GitHub run**; they are checked as valid YAML. If a job turns red, that is a finding for Pisa. More:
User Guide, sections "A single-tier site" and "GitHub CI and releases". `pisa play --fast` leaves this step out.

## What you have now

```
adressen-singletier/
  spec/base/       architecture.md, architecture.adl, domain-spec.md, adressen-singletier.dml,
                   person.ui.md, company.ui.md, use-cases.uc.md, domain-model.puml/.md
  .pisa/           recipe.json (the recipe), architecture.plan.json (the plan, derived from the .adl)
  public/ test/    generated pages, store and tests (never change by hand, `generate` rewrites them)
  scripts/         serve.js (development server), package.js (the ZIP, only with `package zip`)
  doc/             user guide and the tutorials
  .github/workflows/  ci.yml, release.yml, pages.yml (only with step 10), .git (repository, only with step 10)
  package.json, README.md, project.spec.json
```

You write prose and check proposals; **the specs** (`.adl`, `.dml`, `.ui.md`) are the source of truth, the code is derivable from them. The same model gives a Java project with `runtime spring`
([Spring Java tutorial](pisa-tutorial-spring-java.md)) or a TypeScript project with `runtime hono` ([Hono TypeScript tutorial](pisa-tutorial-hono-typescript.md)): **only the `.adl` changes.**

**Limits of the single-tier site (as of now):** no login and no roles; the relations are those of the Hono target (no `manyToMany`, `oneToMany` without `mappedBy`, `oneToOne` without `composed`); the data of one
browser address, not shared between people (Save and Load move it); no browser tests from the use cases; the pages load their libraries from a CDN (so they need internet, and the versions come from the plan:
`versions { … }` in the frontend container pins them). GitHub Pages needs a public repository (free account) and a switch you make once in the repository settings. A desktop app and the like are ideas, not part of Pisa yet.

## When something does not work

| Message | Meaning |
|---|---|
| `… is still the starting text` | The marker line `<!-- pisa:starting-text -->` is still in the description. |
| `ended without an accepted …` | The model did not answer validly through the tool; make the description more precise, repeat. |
| `storage json needs a single frontend container …` | The `.adl` has a backend, a database or a second container together with `storage json`. Remove them: a site with one tier has only the frontend. |
| `servedBy is not allowed together with storage json` / `'docker' is not possible with storage json` | A setting that needs a server. Remove it from the `.adl`. |
| `The Salt mockup in spec/base/<entity>.ui.md can't be used: … missing "x"` | A field in the `.dml` is missing in the mockup (or the other way round). Insert a line `Label \| "x"` into the mockup, `generate` writes nothing beforehand. |
| `not supported by this target yet (supported: manyToOne, oneToMany with mappedBy, oneToOne composed)` | The model uses a relation that the site cannot do. Adjust the model. |
| `spec/base/architecture.adl no longer matches the project: …` | The `.adl` was changed after `init`. `init --out . --artifact <name> --adl spec/base/architecture.adl --force`, then `generate`; **give `--artifact` again**, otherwise Pisa takes the name of the folder. |
| The page is blank or the lists stay empty | The page was opened from a file (`file://`) or the CDN is not reachable. Start `npm start` and open http://localhost:8080/; check the connection. |
| No example data | They are made only on the first visit, when the browser holds no data yet. Use the menu: **Reset to example data**. Without `sampleData` in the `.adl` there are none. |
| `npm run test:ui` says the browser is missing | Install Chromium: `npx playwright install chromium`. |
| `npm run package` says it cannot find `fflate` | Run `npm install` first. |
| `pages.yml` fails in `configure-pages` ("Get Pages site failed" or similar) | Pages is not switched on: `gh api -X POST 'repos/{owner}/{repo}/pages' -f build_type=workflow` (or Settings → Pages → Source: GitHub Actions). Then run the workflow again: `gh run rerun <run-number>` (or tab Actions, Re-run jobs). |
| `Tag "v0.1.0" is not allowed to deploy to github-pages due to environment protection rules` | The environment allows only the branch `main`: `gh api -X POST 'repos/{owner}/{repo}/environments/github-pages/deployment-branch-policies' -f name='v*' -f type=tag`, then `gh run rerun <run-number>` (the number is in `gh run list`). |
| The Pages site shows 404 or no styles | The first run is not done yet, or the address is wrong: it is `https://<your-name>.github.io/<repository>/`, with the name of the repository at the end. |
| Pages cannot be switched on for a private repository | A free account needs a public repository; make it public or check your plan. |
| `No project.spec.json in .` | `generate` needs `pisa init` first (step 3). |
| `… exists already` | The target file exists; `--force` proposes anew and overwrites it. |
| Port 8080 taken | `PORT=8090 npm start`. |

Copyright (c) 2026 Arcware GmbH - Serano Colameo
