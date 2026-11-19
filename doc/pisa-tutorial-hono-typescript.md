# Pisa — Tutorial: from a description to a running application (TypeScript, Hono)

You build a small **address book** (people with an address and a company) from scratch. You write only
prose; an LLM proposes the architecture and the domain model, Pisa checks the proposals and generates a
working TypeScript project (Node.js, Hono, Prisma) from them. After every step it says what you should see.

> As of `pisa 0.13.0`. Commands in detail: [User Guide](pisa-user-guide.md). Duration: about an hour, `npm install`
> downloads dependencies.

Steps 2 and 4 call an LLM (two short calls); all other steps run without one. Without an LLM you write the
two files yourself, as they are shown in the steps.
At the end there are **optional steps** (10, CI with GitHub Actions; 11, Docker; 12, the cloud; 13, user stories); `pisa play --fast` leaves them out.

## The method in four phases

Pisa works spec-driven, in the manner of [GitHub Spec Kit](https://github.com/github/spec-kit): you describe first, the
description becomes a checked spec, the code is generated from the specs, and tests check the result. The steps of this
tutorial follow four phases; each step title names its phase.

| Phase | What you do | Pisa | Steps |
|---|---|---|---|
| **Specify** | describe in prose what you want; have a spec proposed and correct it | `propose-architecture`, `propose-model` (an LLM proposes, Pisa checks the proposal in the language before it writes anything) | 2, 4 |
| **Plan** | turn the specs into a project plan and into pages and tests | `init` (the architecture plan `.pisa/architecture.plan.json`), `propose-specs` (forms and use cases) | 3, 5 |
| **Implement** | generate the code | `generate` (deterministic: the same specs give the same files, no LLM writes code) | 6 |
| **Check** | run the generated tests, try the application, reproduce the project | `./mvnw test` / `npm test`, `replay` | 7, 9 |

The optional step 13 applies the same method to a **user story** of your application (`pisa story`: specify, plan, test, implement, check).

The specs are ordered in three levels. Steps 2 to 7 build the **base**: the architecture, the domain model, the forms and the use cases, in `spec/base/`. They are the source of truth; the code is derived from them. Everything that follows is a **feature** with **stories** in `spec/features/NNN-<feature>/stories/NNN-<story>/`: a change of the application starts as a story (step 8), and its acceptance is checked with `pisa story`. A change is **another round** of the same phases: change the spec, adjust the plan, generate, check (step 8).

## 0. Requirements

| What | Check |
|---|---|
| Pisa 0.13.0 | `pisa --version` shows `pisa 0.13.0`. Otherwise install it: User Guide, section "Installing Pisa" (`curl`, PowerShell or `brew`, no login) |
| Node.js 24 or newer and npm | `node -v`, `npm -v`. Node.js runs TypeScript directly, there is no build step. Install and switch versions with nvm: `nvm install 24`, `nvm use 24` (User Guide, "Setting up your development environment") |
| LLM access for `pi` | `pi` is set up with a model (see the `pi` documentation); needed only for steps 2 and 4 |
| Optional: Chromium for the browser tests | `npx playwright install chromium` (step 7) |
| Optional: Pisa plugin | IntelliJ or VS Code colors `.dml`/`.adl` and shows errors while you write (User Guide, "Setting up editor and PlantUML") |

## 1. Create a folder and prepare Pisa

```bash
mkdir adressen-hono && cd adressen-hono
pisa init
```

You should see: `Prepared .: doc/ (the user guide and both tutorials) and spec/base/.` and the hint which tutorial you can read.
`pisa init` without arguments creates **no project** yet, only what is the same for every kind of application: the folder **`doc/`** with the user guide and both
tutorials (Spring Boot and Hono) and an empty folder `spec/base/` for the base specs (the stories come later, into `spec/features/`). Which kind of application you want (Java with Spring Boot or TypeScript with Hono) you decide
now, from the tutorials and the description in step 2; a project is created only in step 3. All further commands run in this folder.

## 2. Specify: describe the architecture and have it proposed

<!-- play: llm -->
```bash
pisa propose-architecture --out .
```

You should see: `Created spec/base/architecture.md with a starting text - describe the architecture there, …`.
Open `spec/base/architecture.md`, **delete the line `<!-- pisa:starting-text -->`** and replace the text with
something like this. **Two places decide that it becomes TypeScript:** the technology (TypeScript, Hono) and the
embedded database (with TypeScript that is SQLite):

<!-- play: write spec/base/architecture.md -->
```markdown
# Architecture

Management of people with their address and the companies they work for. It is a
prototype for a demo, the data does not have to survive a restart.

- Style: The code should be layered (controller, service, repository), with DTOs between
  controller and service.
- Database: embedded (SQLite), no separate server.
- Technology: TypeScript on Node.js with Hono, web UI with Alpine.js, served by the backend.
- Docker: The application should also be buildable as a Docker image (only the image, nothing more).
- Example data: For the demo the application starts with 5 realistic example records per entity, Swiss German names and places.
- Login: Users sign in with name and password, there are roles.
  Admin for the administration, has more rights, can e.g. create companies.
  User for normal users, who can read or change companies, but not create or delete them.
- Versions: no special requirements, the newest stable ones are fine.
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
architecture AdressenHono {
    container db : database { engine sqlite }
    container api : backend {
        runtime hono
        authentication session
        roles {
            ADMIN
            USER {
                Company: read, update
            }
        }
        uses db
        components layered
    }
    container web : frontend { technology alpine  servedBy api }
    docker { }
    sampleData { entries 5  locale "de-CH" }
}
```

(The file is formatted over several lines; comments at the top name what the model could not cover.)
If something is wrong, change the file by hand: it is yours from now on.

The line `runtime hono` decides that a TypeScript project is created; a package and versions do not belong to it (those are
Java things). The line `authentication session` (login with users and roles, step 7b) comes from the sentence "Login" in
your description. The roles from the description are in the `roles` block of the `.adl`: `ADMIN` without a block may do everything, `USER` may
only read and change companies (`Company: read, update`), everything else as before. From it `init` writes the `security.yml` (step 7b), and
`generate` generates the tests per role. **If one of these statements is missing** in your file (a model does not always do what the description
says), write it by hand into the `api` container. `engine sqlite` exists only with `runtime hono`; `postgresql` works too.

The empty block `docker { }` (from the sentence "Docker" in your description) makes `init` write a `Dockerfile` and a `.dockerignore`, nothing more. You do not have to use them; how to try them is in the optional step 11. **If the block is missing** in your file, write `docker { }` by hand before the last bracket, or leave it out if you need no image.

The block `sampleData { entries 5  locale "de-CH" }` (from the sentence "Example data" in your description, since Pisa 0.16.0) makes the generated project fill itself with realistic records when it starts: 5 per entity, names and places for German (Switzerland), made from your model with a Faker library (`@faker-js/faker`; the file `src/seed.ts`). Only the development database gets them, never the login users. **If the block is missing** in your file, write it by hand before the last bracket, or leave it out if you want to start with an empty application. Details: User Guide, section "Example data".

**If it does not work:** "ended without an accepted architecture" means the model answered invalidly three times, or not at all through the tool; formulate the description more precisely and repeat. With an
existing `.adl` the command does nothing, except with `--force`.

## 3. Plan: create the project

```bash
pisa init --out . --artifact adressen-hono --adl spec/base/architecture.adl
```

You should see: `Architecture from spec/base/architecture.adl: style layered, database sqlite.` and the list of files
(`package.json`, `tsconfig.json`, `prisma.config.ts`, `src/db.ts`, `src/index.ts`, `application.yml`, …,
`.pisa/architecture.plan.json`, `Dockerfile`, `.dockerignore`). New are also `spec/README.md` (a guide to the specs) and `README.md` with the recipe of the project.
`doc/` from step 1 stays as it is. You do not need a `--target`: Pisa takes the target from `runtime hono`.

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

You should see: `Model proposal complete: spec/base/adressen-hono.dml` (the file name is the project name) and the
line `Check it, then: pisa generate --file spec/base/adressen-hono.dml --out .`.

**Check `spec/base/adressen-hono.dml` closely**, this is the most important step: Are all three entities there? Does `Person`
have a `status` as an `enum`, `Address` the rule for the postal code (`~ "[0-9]{4}"`), `address` on the person as
`composed`, `employees` on the company as `mappedBy company`? Wishes that the language does not express (here:
history, rights) stand as `// Not covered: …` above the first line. The model is a proposal, not the truth:
change by hand what is not right; the plugin shows errors while you write. For comparison, this is what a fitting model looks like:

<!-- play: write spec/base/adressen-hono.dml unless-llm -->
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

The relations must be those the TypeScript target can do: `manyToOne`, `oneToMany … mappedBy` and `oneToOne … composed`.
`manyToMany`, `oneToMany` without `mappedBy` and `oneToOne` without `composed` are rejected by Pisa with `not supported by this target yet`.

## 5. Plan: derive forms and use cases (without an LLM)

```bash
pisa propose-specs --out .
```

You should see: `Wrote spec/base/person.ui.md`, `Wrote spec/base/company.ui.md`, `Wrote spec/base/use-cases.uc.md`.
The forms (`.ui.md`) hold a Salt mockup in a Bootstrap look (navigation bar, form box with the fields, sample table): `generate` reads only the form box, the rest is decoration. You can adjust the forms and the use cases (one browser test each)
later; the command never overwrites existing files. With a login with roles it writes as the **actor** of every use case the role with the
fewest rights that may do it (creating and deleting companies: `ADMIN`; changing companies and everything on people: `USER`), and `generate` lets the browser test run as that role.

## 6. Implement: generate code

```bash
pisa generate --file spec/base/adressen-hono.dml --out .
```

You should see: `Generated hono-prisma files for Person, Address, Company:` and the list of generated files
(models, repositories, services, DTOs, routes, pages, tests) and at the end `Recorded step N in .pisa/recipe.json and README.md.`

| File | Content |
|---|---|
| `prisma/schema.prisma` | the database schema (both sides of every relation, `enum`, table names) |
| `src/model/<Entity>.ts` | the type of the JSON and the metadata of the entity (rules of the fields) |
| `src/repository`, `src/service`, `src/dto`, `src/mapper`, `src/route` | data access, service, DTO, mapper and REST interface (only for entities with a page of their own: `Address` is a part of the person and has none) |
| `public/*.html`, `app.js`, `app.css` | the pages (Alpine.js) |
| `src/lib/*` | the runtime: checking the rules, conversion, pages, login, error answers |
| `test/api/*.test.ts`, `test/architecture.test.ts` | API tests, tests per role and the layer test |
| `test/ui/*.spec.ts` | browser tests (Playwright), per page, menu and use case |

## 7. Check: start and try it out

<!-- play: slow -->
```bash
npm install
```

Then you start the server:

<!-- play: server /login.html -->
```bash
npm start
```

`npm start` generates the Prisma client and the tables (`prisma generate`, `prisma db push`) and starts the server.
You should see: `adressen-hono is running on http://localhost:8080`.

Open http://localhost:8080/ **in the browser, through the running server** (not the files from `public/` directly: Alpine.js and the scripts come from the server, in the file itself buttons and texts are empty): a menu with People and Companies. The lists are not empty: People and Companies already hold 5 example records each (from `sampleData`; at the start you see the console line `Sample data loaded: 5 records for each of … entities` before the `is running` line; with the next start the data stays, because the SQLite file has records already and Pisa makes none twice). The heading of the start page is "AdressenHono", the name from `architecture AdressenHono {` in the `.adl`; it is `app.title` in `application.yml` (change it, restart the application). The application redirects to the login page: sign in with `admin` / `admin` and choose a new password on the "Change password" page (twice, at least 8 characters); who is signed in is shown in the hamburger menu (☰) at the top right. Roles and more users: step 7b. Create a company, then a person with an address
and choose the company. A click on a row of the list shows the entry **read-only** (display mode); whoever may change it has "Edit" there. Try the rules: a postal code with 3 digits, the same e-mail twice, an
empty last name; the field turns red and the server answers 400 with the message per field (for example with `curl` and the session of your login; without it it answers 401):

```json
{"error":"Some values are not valid.","fields":{"address.zip":"must match \"[0-9]{4}\""}}
```

The data is in the SQLite file `adressen-hono.db` in the project folder (open it with any SQLite tool). End with `Ctrl+C`.

<!-- play: tests -->
```bash
npm test                                          # API tests, tests per role, layer test
```

And the browser tests (install Chromium once):

<!-- play: slow -->
```bash
npx playwright install chromium                   # once
npm run test:ui                                   # browser tests
```

You should see: `ℹ pass 59`, `ℹ fail 0` and `22 passed`. (`bun test` works too: it starts `npm test`; Bun itself cannot load the SQLite driver.) Every test run takes a fresh database in a
temporary folder; your `adressen-hono.db` stays untouched. The layer test (`test/architecture.test.ts`) checks
the imports in `src/`: route → service → repository, and only `src/db.ts` knows Prisma.

## 7a. Optional: restrict operations (`@operations`)

Every entity allows **all four operations** by default (create, read, change, delete). Whoever wants to block something writes it into the model, with `@operations` before `entity`. Example: companies should be created, read and changed, but **not deleted**. Add to `spec/base/adressen-hono.dml`:

```
@operations(create, read, update)
entity Company {
    …
}
```

`read` must always be included (lists and selection fields need it). Without the line everything is allowed; Pisa never blocks anything by itself. Then:

<!-- play: skip -->
```bash
pisa generate --file spec/base/adressen-hono.dml --out .
```

You should see: an **abort**, nothing is written:

```
UC6 (spec/base/use-cases.uc.md): Company doesn't allow "delete" (@operations(create, read, update)) but the test line says "delete"
Nothing was written. Allow the operation in @operations of the entity or give the role the right in `roles` of the .adl (then `pisa init … --force` and delete security.yml), or change the Test: line or the Actor:, or delete the use case.
```

This is intended: the use case "Delete company" (UC6) asks for something the company no longer allows, a contradiction between two specs. Three ways out: allow `delete` again, change the `Test:` line, or (here) drop the use case. In `spec/base/use-cases.uc.md` delete the section `## UC6 …` and in the PlantUML diagram the two lines with `UC6`, then run `pisa generate` again. Pisa never deletes files: the old browser test of the use case stays and would fail, delete it by hand (`generate` names it under `Info: browser tests of use cases that are no longer in spec/base/*.uc.md`): `test/ui/UC6.spec.ts`.

Restart the application (`npm start`) and check:

- The "Companies" page has no delete button any more; creating and changing still work.
- The interface blocks deleting as well: `curl -i -X DELETE http://localhost:8080/api/companies/1` answers **405** (Method Not Allowed) with an `Allow` header, the company stays (`GET` still gives 200). People can still be deleted.
- `npm test` checks this for you: the generated test `answers 405 for a delete` expects 405, and the "delete" test of the company is dropped.

More about this (names, error messages, effect in both targets, interplay with roles): User Guide, section "Domain model (`.dml`)", `@operations`. Change the line to `@operations(create, read, update, delete)` or delete it if you want to lift the restriction again.

## 7b. Rights and users

You already switched the login on with the line `authentication session` in the `.adl` (details: User Guide, section "Adding login, users and roles"). For it `init` wrote `security.yml` (roles and users), `login.html` and `change-password.html`, `generate` the login files (`src/lib/security.ts`, `test/api/security.test.ts`, `test/api/roles.test.ts`). The `.dml` and the mockups know no roles: they are not in the domain model. If you write the line only later, `init … --force` and `generate` are needed afterwards.

- Sign in with **`admin` / `admin`** (if you have not yet): the "Change password" page appears, where you enter the new password **twice** (at least 8 characters, not the user name). After that `ADMIN` may do everything the model allows: not even he deletes companies if you did 7a (the rights of a role intersected with `@operations`). Who is signed in is shown in the hamburger menu (☰) at the top right, with "Change password" and "Sign out".
- Sign out and sign in as **`user` / `user`** (choose a new password again): `USER` may edit people fully, companies only read and change (block `roles`, see below). A write access through `curl` without login answers **401**; signed in but without the right, **403**.

**Rights for this example:** They are already in the `.adl` (block `roles`, step 2) and thereby in `security.yml`: `USER` edits people (with their address) fully, companies he may only read and change (so it says in the description of the architecture). `init` wrote the file from the block:

```yaml
  USER:
    "*": [create, read, update, delete]
    "Company": [read, update]            # the list of an entity replaces "*"
```

Sign in as `user`: the "Companies" page has no buttons for creating and deleting any more (changing works), and a `curl` `POST` or `DELETE` on `/api/companies` answers **403**. You can still edit people. A click on a company shows it read-only, with "Edit" for changing; whoever could only read would have no "Edit" there.
You can change the rights in two ways: by hand in `security.yml` (restart the application, no `generate`), or permanently in the `roles` block of the `.adl` (then delete `security.yml`, `init … --adl … --force` and `generate`).
The tests and the use cases follow the `.adl`: `test/api/roles.test.ts` checks for every role and every entity what is allowed (not 403) and what is not (403), and the use cases with `**Actor:** USER` or `ADMIN` (step 5) run in the browser as that role.

About passwords: a user's start password is his name (`admin/admin`, `user/user`); there is no password in `security.yml`. The new password is never in plain text, the hash ends up in the table `usr_password` of the application's database; the application never changes `security.yml`. With SQLite the password stays in the file, with PostgreSQL in the database. Deleting a row of the table resets the user to the start password.

Your own roles and users: enter them in `security.yml` (the hash comes from `pisa hash-password`, which asks for the password twice without echo) and restart the application; no `generate` is needed. `admin/admin` and `user/user` are publicly known, for development only.

`npm test` signs in in the generated tests as test users (they are in `test/security-test.yml`, not in your `security.yml`) and additionally checks 401, 403 and setting the password (`test/api/security.test.ts`).

## 8. The next round: carry through a change

A change is another round of the phases, and it is a **story**: write down in a sentence what the change must achieve (`pisa story --specify "A person can have a title"` creates a feature folder in `spec/features/` with the first story and a table of acceptance criteria; the full course is step 13). Then **specify** the change in the description or the spec, **plan** (the form must know the new field), **implement** (`generate`), **check** (the tests). Change the description, not the code. Two ways:

- **By hand in the model:** add a field in `spec/base/adressen-hono.dml`, say `title: String(..40)?` on `Person`.
  **The form must know it too:** `spec/base/person.ui.md` is a layout in which every field occurs exactly once;
  add a row to the form box of the mockup, say `<b>Title</b> | "title"` (plain `Title | "title"` reads the same) below the last name. Then
  `pisa generate --file spec/base/adressen-hono.dml --out .` and `npm test`. The code, the pages and the tests follow.
  Without the mockup row `generate` aborts and writes nothing: `The Salt mockup in spec/base/person.ui.md can't be
  used: … missing "title"`. (Alternatively delete `spec/base/person.ui.md` and run `pisa propose-specs --out .` again:
  the default mockup contains all fields.)
- **Have it proposed anew:** change `domain-spec.md` and `pisa propose-model --out . --force` (overwrites
  `spec/base/adressen-hono.dml`, so your manual changes there).

## 9. Check: reproduce

<!-- play: slow -->
```bash
cd ..
pisa replay --from adressen-hono --out adressen-hono-copy
```

You should see: `… All N generated file(s) match the hashes recorded in the recipe.` Pisa runs the
recorded steps (`init`, `generate`) again in a new folder and compares files with the
checksums in the recipe (`adressen-hono/.pisa/recipe.json`). The LLM steps are not repeated: their result
(`spec/base/architecture.adl`, `spec/base/adressen-hono.dml`) is copied from the source project.

## 10. Optional: build and test on every push (CI)

This is an extra; you need it for nothing else. If GitHub should build the project on every push and run the tests
(GitHub Actions), add the `pipeline` block to `spec/base/architecture.adl` before the last bracket and apply the `.adl` again:

```
    pipeline {
        ci github
    }
```

The commands do both instead of you (replace the last line of the `.adl`, then `init --force`). Run the **whole** block: `pisa init … --force` alone changes nothing as long as the `pipeline` block is not in `spec/base/architecture.adl`, and without it Pisa creates neither a repository nor a commit.

<!-- play: optional -->
```bash
cd adressen-hono
sed -i.bak '$ d' spec/base/architecture.adl && rm spec/base/architecture.adl.bak
printf '    pipeline {\n        ci github\n    }\n}\n' >> spec/base/architecture.adl
pisa init --out . --artifact adressen-hono --adl spec/base/architecture.adl --force
```

You should see: the new file `.github/workflows/ci.yml` in the list and `Git repository created, first commit made (branch main …)`.
Pisa creates the repository and makes the first commit (`Initial project (pisa init)`), local only; it does not know your GitHub account,
you take care of that. There are three cases, one paragraph each:

**Normal case: Pisa made the commit.** Then you create the repository on GitHub and upload it (needs the
GitHub CLI `gh`, once `gh auth login`):

<!-- play: skip -->
```bash
gh repo create adressen-hono --private --source . --push
```

**Pisa made no repository or no commit.** These are the four cases:

- The `pipeline` block is missing in `spec/base/architecture.adl` (only the last line was run): **neither repository nor commit**.
- `pisa play --fast` left out the whole step: **neither repository nor commit**.
- The folder is already in a Git repository: Pisa does not touch it, it makes **no** commit.
- Name and e-mail are missing in your Git configuration: the repository is there, but **no commit**.

`git status` in the project folder shows it: "not a git repository" means there is none. Then you make the repository and the commit yourself
and go on afterwards as in the normal case (`git init` does no harm if the repository is already there):

<!-- play: skip -->
```bash
git init -b main
git add -A
git commit -m "Initial project"
```

**Without `gh`.** Create an empty repository on github.com and connect it to your folder (instead of `gh repo create`):

<!-- play: skip -->
```bash
git remote add origin git@github.com:<your-name>/adressen-hono.git
git push -u origin main
```

After that the pipeline runs on GitHub (tab "Actions"): the job `tests` and the job `browser-tests`. The file is yours,
even `init --force` does not overwrite it. Pisa has not yet checked it on a real GitHub run; if a job turns red, that
is a finding for Pisa. More about it: User Guide, section "GitHub CI and releases". `pisa play --fast` leaves this step out.

## 11. Optional: try it with Docker and the real database

This is an extra as well. So far everything runs on SQLite in a file. The `Dockerfile` from step 3 is already there; with Docker you can build the
application as an image and run it against a **real PostgreSQL**, much like later in the cloud. You need it for nothing else.
`pisa play` **never** plays this step (everything `skip`, even without `--fast`): try it by hand. Requirement: Docker is running
(`docker version`), ports 8080 and 5432 are free.

**1. Only the image, with a port.** The `Dockerfile` builds the application as an image. A Dockerfile does not publish a port by itself (`EXPOSE` is only a
hint), so `-p 8080:8080` belongs in the command, otherwise you cannot reach the application from outside (in IntelliJ: set "Bind ports" in the run configuration):

<!-- play: skip -->
```bash
docker build -t adressen-hono .
docker run --rm --name adressen-hono -p 8080:8080 -v adressen-hono-data:/data adressen-hono
```

You should see: the application at http://localhost:8080/login.html (SQLite in the container; users `admin/admin` and `user/user`, the chosen password is in the SQLite file in the volume `adressen-hono-data` and stays). Stop with Ctrl-C.

**2. Switch to PostgreSQL.** In `spec/base/architecture.adl` replace the line `engine sqlite` by `engine postgresql`, apply the `.adl` again and
generate the code again (`generate` rewrites the Prisma schema). With PostgreSQL Pisa writes the `compose.yml` with the application (`app`) and
the database (`db`) even without the line `compose` in the `docker` block.

<!-- play: skip -->
```bash
sed -i.bak 's/engine sqlite/engine postgresql/' spec/base/architecture.adl && rm spec/base/architecture.adl.bak
pisa init --out . --artifact adressen-hono --adl spec/base/architecture.adl --force
pisa generate --file spec/base/adressen-hono.dml --out .
```

**3. Start the application and the database.**

<!-- play: skip -->
```bash
docker compose up --build
```

You should see: the image is built (one to two minutes the first time), then `adressen-hono is running on http://localhost:8080`.
Open http://localhost:8080/login.html (users `admin/admin` and `user/user`; the chosen password is in the table `usr_password` of PostgreSQL and stays). Stop with Ctrl-C, clean up with
`docker compose down` (with `-v` also the data).

**4. Only the database (for developing and testing).** `docker compose up -d db` starts only PostgreSQL; `npm start` and the tests take it
(the address is in the plan, `TEST_DATABASE_URL` sets another):

<!-- play: skip -->
```bash
docker compose up -d db
npm test
```

You should see: the same tests as in step 7, now against PostgreSQL (`ℹ pass 59`, `ℹ fail 0`). Afterwards `docker compose down`.

**If it does not work:**

- `port is already allocated`: another PostgreSQL or another application uses 5432 or 8080. Set other ports in the `compose.yml`
  (`"5433:5432"`) or set `database.port` in `.pisa/architecture.plan.json` and apply the `.adl` again.
- `docker compose` hangs at `docker-credential-desktop`: Docker Desktop's credential helper does not answer. Restart Docker Desktop or use
  a `DOCKER_CONFIG` without `credsStore`.
- `npm test` says the database is not reachable: `docker compose up -d db` needs a few seconds until PostgreSQL is ready.

## 12. Optional: into the cloud (Render)

This is an extra as well and needs a GitHub repository (step 10) and an account at [Render](https://render.com). Render runs the application's Docker image
on a **free web service**: it sleeps after 15 minutes without requests (waking up takes about a minute) and has no persistent
disk, `SQLite` and the chosen passwords are gone after every restart. Render's free PostgreSQL expires after 30 days: if you did step 11,
set `engine postgresql` in `spec/base/architecture.adl` back to `engine sqlite`. `pisa play` **never** plays this step (everything `skip`).

**1. The lines in the `.adl`.** The `pipeline` block (step 10) gets `release github` and `deploy render`; `deploy` needs the `docker` block, which you already have
(step 2). If you skipped step 10, write the whole block before the last bracket:

```
    pipeline {
        ci github
        release github
        deploy render
    }
```

Then apply the `.adl` again (`render.yml` and `.github/workflows/cd.yml` are created, once, after that they are yours):

<!-- play: skip -->
```bash
pisa init --out . --artifact adressen-hono --adl spec/base/architecture.adl --force
```

You should see: `render.yml` and `.github/workflows/cd.yml` in the list and `Deploy to Render: the comments at the top of render.yml say how`.

**2. Set up at Render (in the browser).** Push the project to GitHub (step 10). On dashboard.render.com **New ▸ Blueprint**, pick the repository and enter `render.yml` in the field
**Blueprint Path** (Render looks for `render.yaml` by default). Then in the service **Settings ▸ Deploy Hook** copy the URL and save it in the GitHub repository
under **Settings ▸ Secrets and variables ▸ Actions** as the secret `RENDER_DEPLOY_HOOK_URL`. The URL is secret: never write it into a file.

**3. Deploy.** Only the deploy hook deploys, so only a tag `v*` (the release workflow creates the release, `cd.yml` calls the hook):

<!-- play: skip -->
```bash
git add -A && git commit -m "Deploy to Render"
git tag v0.1.0
git push origin main v0.1.0
```

You should see: in the repository under *Actions* the run **Deploy**, at Render a new deploy and after a few minutes the application at the address of the service
(`https://<name>.onrender.com/login.html`). The first access after sleeping takes about a minute. More about it: User Guide, section "Deploying to Render".
Pisa has not yet checked this on a real Render account: whether the service accepts the `healthCheckPath` is unchecked.

## 13. Accept: user stories (optional)

This is an extra as well; `pisa play --llm` plays only the first command (the language model writes the story and `pisa play` answers the question with Y), everything else is by hand (`skip`). So far you checked the generated application with the tests Pisa writes. A **user story** is the other side: someone who asked for something says when it is done as he asked for it. `pisa story` works for a story of your application in the same five phases as the specs of Pisa itself (`pisa extend`), with one folder per story, `spec/features/NNN-<feature>/stories/NNN-<story>/` (a feature is a folder with `feature.md` and its stories, here one feature with one story), and one file per phase: `01-spec.md` (the criteria), `02-plan.md`, `03-test.md` (the frozen acceptance tests), `04-implement.md`, `05-check.md`. Only `--specify` asks the language model, it writes the story from your sentence; `--plan`, `--test` and `--check` ask no model: they create the files, freeze the tests and run them. `pisa story` refuses to run when the environment variable `CI` is set (it asks a model and you), so it never runs in a pipeline.

The acceptance tests of a story run **only on demand**: `npm test` does not look into the folder `stories/` (the tests of the stories live there, outside `spec/`), `npm run test:ac` runs them (it sets `PISA_ACCEPTANCE=1`; the script is part of every generated project). You need the dependencies (`npm install`) as for `npm test`.

**1. Specify.** Write the story as one sentence, in your words. The language model writes the story from it (a description and acceptance criteria), chooses the feature it belongs to (in a project without features it starts the first one) and proposes the next stories. Pisa prints what it understood and asks before it writes:

<!-- play: llm -->
```bash
cd adressen-hono
pisa story --specify "A clerk can archive a person"
```

You should see something like this (a real run; the words of the model differ from run to run):

```
Understood as:
  Feature:   001-person-management (new)
  Story:     001-archive-person: Archive a person
  As a clerk, I want to archive a person so that they no longer appear among the active persons but their data is not lost.
  AC1  A clerk can choose to archive a person from the person's page or the list.
  AC2  After archiving, the person no longer appears in the list of active persons.
  AC3  The clerk sees a confirmation message that the person was archived.
  AC4  The data of an archived person is kept and not deleted.
  AC5  A person who is already archived cannot be archived again; the clerk sees a message instead.
  Next stories (written to feature.md, not created): View the list of archived persons; Restore an archived person; Create a person; Search persons by name
Write? [Y/n/f]
```

Answer `Y` (or just Enter) to write, `n` to stop (nothing is written), `f` to name another feature. A story that is similar to an existing one needs a second yes. Pisa writes `spec/features/001-person-management/feature.md` (goal, scope, the stories and the proposed next stories) and `spec/features/001-person-management/stories/001-archive-person/01-spec.md` with the criteria as a table. Read them. The model wrote five criteria; the tests of this tutorial check two, and a criterion without a test is a red box in `--check`, so replace the table in `01-spec.md` by these two rows (and, in a real project, correct the criteria where the clerk would say it differently). The names of the folders come from the model: if yours differ from `001-person-management` (the feature, which also names the test folder) or `001-archive-person`, use your names in the next steps; `pisa story --list` shows them.

```
| ID | Criterion |
|---|---|
| AC1 | A clerk sets a person to Archived, and the person is still listed with that status |
| AC2 | A clerk cannot give a person a status that does not exist; the person stays as it was |
```

**2. Plan.** One task per criterion, in `02-plan.md`:

<!-- play: llm -->
```bash
pisa story --plan
```

**3. Test.** One acceptance test per criterion, in `stories/001-person-management/tests/archive.test.ts`. Mark each with `acceptance("ACn: …", …)` from `test/support/acceptance.ts` (it skips the test unless `PISA_ACCEPTANCE=1`); the name starts with the ID of the criterion:

```ts
import assert from "node:assert/strict";
import { afterEach } from "node:test";
import { api, cleanDatabase } from "../../../test/support.ts";
import { acceptance } from "../../../test/support/acceptance.ts";

afterEach(cleanDatabase);

const person = { firstName: "Anna", lastName: "Muster", status: "ACTIVE", address: { street: "Bahnhofstrasse 1", zip: "8001", city: "Zürich" } };

acceptance("AC1: A clerk sets a person to Archived, and the person is still listed with that status", async () => {
  const created = await api("POST", "/api/persons", JSON.stringify(person));
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const updated = await api("PUT", `/api/persons/${created.json.id}`, JSON.stringify({ ...person, status: "ARCHIVED" }));
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  const list = await api("GET", "/api/persons");
  assert.equal(list.json.find((p: { id: number }) => p.id === created.json.id).status, "ARCHIVED");
});

acceptance("AC2: A clerk cannot give a person a status that does not exist; the person stays as it was", async () => {
  const created = await api("POST", "/api/persons", JSON.stringify(person));
  const refused = await api("PUT", `/api/persons/${created.json.id}`, JSON.stringify({ ...person, status: "GONE" }));
  assert.equal(refused.status, 400);
  const read = await api("GET", `/api/persons/${created.json.id}`);
  assert.equal(read.json.status, "ACTIVE");
});
```

Then freeze them (`--adopt` takes the tests you wrote, no model, no red check):

<!-- play: skip -->
```bash
pisa story --test --adopt
```

You do not have to write them yourself: `pisa story --test` writes the frame of the test file itself (imports, set-up, one method per criterion with its tag; the set-up is copied from an existing test of the project) and lets the language model write only the body of each test, from `01-spec.md` and `02-plan.md`. Pisa checks the file (plain file names, an `acceptance("ACn: …")` per criterion, no unknown criterion, every relative import points to a file that exists and exports what is imported), runs them and sends back every test that is green or does not compile (three attempts); the tests must fail before the implementation. `--force` writes them anew over existing ones; with `CI` set the command is refused. You should see something like:

<!-- play: llm -->
```bash
pisa story --test --force
```

```
001/001 | Archive a person
  ❌ attempt 1: AC2 is already green before the implementation -> back to the model
  ✅ attempt 2: the tests load, 2 of 2 are red
    ✅ AC1: A clerk sets a person to Archived, and the person is still listed with that status · red
    ✅ AC2: A clerk cannot give a person a status that does not exist; the person stays as it was · red
  ✅ wrote stories/001-person-management/tests/archive.test.ts
  ✅ froze 1 file(s) in 03-test.md
  next: pisa story --implement
```

Pisa prints every step as soon as it is done, as a tree: ✅ is fine, ❌ sends the tests back to the model, ☐ marks a test that is green already (the last attempt accepts it with that mark). In this tutorial the application already does what the story asks, so the tests of the model may be green at once and be sent back; the tests you wrote above are the ones the next steps use.

`03-test.md` now lists the file with its SHA-256 under "Frozen files". From here on the test must not change: if it does, `--check` reports it. (Pisa's own `pisa extend --test` has a language model write the tests and requires them to fail first; `pisa story --test` takes the tests you wrote.)

**4. Implement.** `pisa story --implement` writes `04-implement.md` with the assignment and the open tasks. Here the application already does what the story asks (the generated API accepts every status of the enumeration and refuses others), so there is nothing left to implement; for a story that needs new behavior this is where you, or your coding assistant, work through the plan until the acceptance tests are green.

<!-- play: llm -->
```bash
pisa story --implement
```

A second call lets the language model do the work: it implements the open tasks one by one with checked tools (read, write, finish task; no shell, no network). After every task Pisa runs `npm run test:ac:story` and gives the red criteria and the end of the output back to the model, until all criteria are green or the limits of `pisa extend --implement` are reached. The model may write only the paths of the plan, paths you add with `--allow <path>` and `src/`; never the frozen tests or `spec/`. New files the model writes are not part of the recipe, so `generate` and `replay` leave them unchanged. A generated file (a file of `.pisa/recipe.json`, for example the route `src/route/PersonRoutes.ts`, which a story such as "Archive a person" may need to change) is rejected unless you allow it: exactly that path with `--allow src/route/PersonRoutes.ts`, or every generated file with `--allow-overwrite`, which this tutorial uses. A run that wrote it ends with `warning: changed generated files: src/route/PersonRoutes.ts. pisa generate --force and pisa replay write them again; the change is lost.` With `CI` set the command stops before the model is asked. You should see something like:

<!-- play: llm -->
```bash
pisa story --implement --allow-overwrite
```

```
  ✅ AC1: acceptance test, then the implementation (A clerk sets a person to Archived, and the person is still listed with that status)
  ✅ AC2: acceptance test, then the implementation (A clerk cannot give a person a status that does not exist; the person stays as it was)
Converged: all criteria are green. 05-check.md written.
```

Here the tests are green already, so the model has little to do; for a story that needs new behavior it writes the code. Add a path with `pisa story --implement --allow src/pricing/discount.ts`.

**5. Check.** Pisa runs the acceptance tests, one criterion at a time (`ACCEPTANCE_PATTERN="AC1:" npm run test:ac:story`), and writes `05-check.md`:

<!-- play: llm tests -->
```bash
pisa story --check
```

You should see a tree with the duration of every criterion (✅ for green, ❌ for red):

```
001/001 | Archive a person
  ✅ frozen tests unchanged
  acceptance
    ✅ AC1: A clerk sets a person to Archived, and the person is still listed with that status · 2.1 s
    ✅ AC2: A clerk cannot give a person a status that does not exist; the person stays as it was · 1.8 s
```

The exit code is 0 when every criterion is green, otherwise 1; `05-check.md` says `Converged` only then.

**6. All stories at a glance.** `--list` shows every story with its state, `--check --full` runs all of them and ends with a summary:

<!-- play: llm tests -->
```bash
pisa story --list
pisa story --check --full
```

```
| Status | Story   | Title                        |
| ------ | ------- | ---------------------------- |
| ✅      | 001/001 | Archive a person             |
```

```
| Story   | Title                        | Result | Criteria |
| ------- | ---------------------------- | ------ | -------- |
| 001/001 | Archive a person             | ✅      | 2/2      |

1 of 1 stories accepted
Acceptance criteria: 2 ✅ green, 0 ❌ red (2 in total)
```

`--feature <NNN> --story <NNN>` picks one story (`--story` alone is enough while the story number is unique); `pisa story --specify "…" --feature 1` adds a further story to feature 001; `--full` and `--story` cannot be combined.

## What you have now

```
adressen-hono/
  spec/base/       architecture.md, architecture.adl, domain-spec.md, adressen-hono.dml,
                   person.ui.md, company.ui.md, use-cases.uc.md, domain-model.puml/.md
  .pisa/           recipe.json (the recipe), architecture.plan.json (the plan, derived from the .adl)
  prisma/          schema.prisma (written by generate)
  src/ public/ test/   generated code, pages and tests (never change by hand, `generate` rewrites them)
  doc/             user guide and both tutorials
  spec/features/   the user stories (only with step 13): NNN-<feature>/feature.md and stories/NNN-<story>/01-spec.md … 05-check.md
  stories/         the acceptance tests of the stories (only with step 13): NNN-<feature>/tests/
  .github/workflows/ci.yml   the pipeline (only with step 10), .git (repository, only with step 10)
  Dockerfile, .dockerignore  the image (from the `docker` block); compose.yml (only with step 11)
  render.yml                 the blueprint for Render (only with step 12)
  package.json, README.md, project.spec.json, application.yml (name of the application), security.yml (roles and users)
```

You write prose and check proposals; **the specs** (`.adl`, `.dml`, `.ui.md`, `.uc.md`) are the source
of truth, the code is derivable from them. The same specs give a Java project with `runtime spring`: see the
[Spring Java tutorial](pisa-tutorial-spring-java.md).

**Limits of the TypeScript target (as of now):** no `manyToMany`, `oneToMany` without `mappedBy` and `oneToOne` without
`composed`; ids are always 32-bit `Int`; `engine sqlite` is the embedded database; PostgreSQL (`engine postgresql`, with
`compose.yml`, `docker compose up -d`) ran on 2026-10-21 against `postgres:17`.

## When something does not work

| Message | Meaning |
|---|---|
| `… is still the starting text` | The marker line `<!-- pisa:starting-text -->` is still in the description. |
| `ended without an accepted …` | The model did not answer validly through the tool; make the description more precise, repeat. |
| `The Salt mockup in spec/base/<entity>.ui.md can't be used: … missing "x"` | A field in the `.dml` is missing in the mockup (or the other way round). Insert a line `Label \| "x"` into the mockup, `generate` writes nothing beforehand. |
| `not supported by this target yet (supported: manyToOne, oneToMany with mappedBy, oneToOne composed)` | The model uses a relation that the TypeScript target cannot do. Adjust the model. |
| `spec/base/architecture.adl no longer matches the project: style: …` | The `.adl` was changed after `init`. `init --out . --artifact <name> --adl spec/base/architecture.adl --force`, then `generate`; **give `--artifact` again**, otherwise Pisa takes the name of the folder. |
| Back from `layered` to `crud`: files in `src/service`, `src/dto`, `src/mapper` stay | `generate` deletes the unchanged ones itself (`Info: deleted, no longer used …`); changed ones it lists under `Info: no longer used … changed by you` with an `rm` command. |
| Page shows empty buttons or headings | The page is not served by the server. Start `npm start` and open http://localhost:8080/; Alpine.js sets the texts only in the browser. |
| `npm run test:ui` says the browser is missing | Install Chromium: `npx playwright install chromium`. |
| Start or a test does not find the Prisma client (`src/generated`) | The client is not generated yet: `npm run generate` (`npm start` and `npm test` do it by themselves). |
| `Company doesn't allow "delete" (@operations(…)) but the test line says "delete"` | A use case asks for an operation that `@operations` of the entity blocks. Allow `delete` again, change the `Test:` line or drop the use case (step 7a). |
| After dropping a use case its browser test fails | Pisa never deletes: delete the old test by hand (`test/ui/UC<n>.spec.ts`). |
| `Info: the plan has authentication session, but there is no security.yml` | `security.yml` is missing. `pisa init … --adl … --force` writes it again. |
| Login does not work after switching it on (pages open) | You forgot `init … --force`: only with it `security.yml` and the pages come, then `generate` and a restart. |
| `No project.spec.json in .` | `generate` needs `pisa init` first (step 3). |
| `… exists already` | The target file exists; `--force` proposes anew and overwrites it. |
| Port 8080 taken | `PORT=8090 npm start`. |
| Data gone / new database | Never `prisma db push` with `--force-reset` (deletes everything). Delete the file `<name>.db` and `npm start` creates it anew. |

Copyright (c) 2026 Arcware GmbH - Serano Colameo
