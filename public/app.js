// The script of every page of a single-tier application (an ES module). There is no server: the data lives in the browser (localStorage)
// and in the JSON file the person saves and loads. The pages talk to the store (store.js) the way a page of the other targets talks to a
// REST API: `request(method, url, body)` below gives the same answers and the same errors.
import { createStore } from "./store.js";
import schema from "./schema.js";

let browserStorage;
try {
  browserStorage = window.localStorage;
} catch (ignored) {
  browserStorage = undefined; // storage is blocked: the data lasts as long as the page, Save data still works
}
const firstVisit = !browserStorage || browserStorage.getItem(`${schema.name}:data`) === null;
const store = createStore(schema, browserStorage ? { storage: browserStorage } : {});

// Resolves when the store is ready: on the first visit it is filled with example data (sampleData in the .adl).
const ready = (async () => {
  if (firstVisit) {
    try {
      const { sampleData, fakerOf } = await import("./sample-data.js");
      const library = await import("https://cdn.jsdelivr.net/npm/@faker-js/faker@10.6.0/+esm");
      await sampleData(store, fakerOf(library));
    } catch (e) {
      console.error(e);
      document.addEventListener("DOMContentLoaded", () => {
        const notice = document.createElement("div");
        notice.className = "alert alert-warning m-3";
        notice.textContent = `The example data could not be made (${e.message}). The library comes from a CDN: check the connection, then use the menu, Reset to example data.`;
        document.body.prepend(notice);
      });
    }
  }
  return store;
})();
// The menu (hamburger) with Save data, Load data and Reset to example data.
// Save data: the whole data as a JSON file; Load data: replaces the data with the content of such a file.
document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("data-menu-button");
  const menuList = document.getElementById("data-menu-list");
  if (menuButton && menuList) {
    const setOpen = (open) => {
      menuList.classList.toggle("show", open);
      menuButton.setAttribute("aria-expanded", String(open));
    };
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!menuList.classList.contains("show"));
    });
    menuList.addEventListener("click", () => setOpen(false));
    document.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => event.key === "Escape" && setOpen(false));
  }

  const reset = document.getElementById("reset-data");
  if (reset) {
    reset.hidden = false;
    reset.addEventListener("click", () => {
      if (!confirm("Replace all data with new example data?")) return;
      if (browserStorage) browserStorage.removeItem(`${schema.name}:data`);
      location.reload();
    });
  }
  const save = document.getElementById("save-data");
  const load = document.getElementById("load-data");
  if (save) {
    save.addEventListener("click", async () => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([(await ready).exportJson()], { type: "application/json" }));
      link.download = `${schema.name}-data.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
  if (load) {
    load.addEventListener("change", async () => {
      const file = load.files[0];
      if (!file) return;
      try {
        (await ready).importJson(await file.text());
        location.reload();
      } catch (e) {
        alert(`The file could not be loaded: ${e.message}`);
      }
      load.value = "";
    });
  }
});

// List + form component shared by the generated pages (Alpine.js). Each page sets
// window.PISA_PAGE: the REST path, the id, and how every form field maps to JSON. Field names are
// paths, so a composed part ("address.street") is read and written as a nested object. The list is
// read one page at a time (GET api/<plural>?page=&size=), and so is every table of an inverse
// collection in the form (GET api/<plural>/<id>/<collection>?page=&size=). A link to
// <page>.html#edit=<id> opens that row in the form, <page>.html#view=<id> shows it read-only.
const getPath = (object, path) => path.split(".").reduce((o, key) => (o === null || o === undefined ? undefined : o[key]), object);
function setPath(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  let target = object;
  for (const key of keys) {
    if (target[key] === null || target[key] === undefined) target[key] = {};
    target = target[key];
  }
  target[last] = value;
}

document.addEventListener("alpine:init", () => {
  Alpine.data("crud", (page) => ({
    items: [],
    // Where the list is: the current page (from 0), how many pages and rows there are.
    list: { page: 0, pages: 0, total: 0 },
    // Per table of an inverse collection: its rows on the current page and the same counters.
    tables: {},
    refs: {},
    form: {},
    // Id of the row being edited or viewed; null while creating a new one.
    editing: null,
    // The row is shown read-only (a click on a row): the form is locked and has an Edit button for whoever may change it.
    viewing: false,
    // Field path -> message for the fields that are wrong (found here before sending, or named by the
    // server in a 400 answer); the page marks them red.
    errors: {},
    // Ids of the composed parts of the row being edited (path -> id), so saving updates them in
    // place instead of replacing them.
    partIds: {},
    error: "",


    async init() {

      for (const ref of page.refs) this.refs[ref.key] = [];
      this.reset();
      await this.load();
      const match = /^#(edit|view)=(.+)$/.exec(location.hash);
      if (match) {
        try {
          const item = await this.request("GET", `${page.api}/${match[2]}`);
          if (match[1] === "view") this.view(item);
          else this.edit(item);
        } catch (e) {
          this.error = e.message;
        }
      }
    },

    // The store answers like the REST API of a server does: { status, body }; a status of 400 and above is an error with the
    // message and the fields the page marks.
    async request(method, url, body) {
      const store = await ready;
      const answer = await store.handle(method, url, body);
      if (answer.status >= 400) {
        const failure = new Error((answer.body && answer.body.error) || `Error ${answer.status}`);
        failure.fields = (answer.body && answer.body.fields) || {};
        throw failure;
      }
      return answer.status === 204 ? null : answer.body;
    },

    async load() {
      try {
        let result = await this.request("GET", `${page.api}?page=${this.list.page}&size=${page.pageSize}`);
        // The last row of the last page was deleted: show the page before.
        if (result.items.length === 0 && result.page > 0) {
          result = await this.request("GET", `${page.api}?page=${Math.max(result.pages - 1, 0)}&size=${page.pageSize}`);
        }
        this.items = result.items;
        this.list = { page: result.page, pages: result.pages, total: result.total };
        for (const ref of page.refs) this.refs[ref.key] = await this.request("GET", ref.api);
      } catch (e) {
        this.error = e.message;
      }
    },


    async goTo(number) {
      this.list.page = number;
      await this.load();
    },

    emptyTable() {
      return { items: [], page: 0, pages: 0, total: 0 };
    },

    async loadTable(key, number) {
      try {
        const result = await this.request(
          "GET",
          `${page.api}/${encodeURIComponent(this.editing)}/${key}?page=${number}&size=${page.pageSize}`
        );
        this.tables[key] = { items: result.items, page: result.page, pages: result.pages, total: result.total };
      } catch (e) {
        this.error = e.message;
      }
    },

    reset() {
      this.editing = null;
      this.viewing = false;
      this.partIds = {};
      this.error = "";
      this.errors = {};
      for (const key of page.tables) this.tables[key] = this.emptyTable();
      const form = {};
      if (!page.idGenerated) form[page.id] = "";
      for (const field of page.fields) {
        setPath(form, field.name, field.kind === "boolean" ? false : field.kind === "refs" ? [] : "");
      }
      this.form = form;
    },

    // A click on a row: the entry in the form, locked. Whoever may change it gets an Edit button (startEdit).
    view(item) {
      this.edit(item);
      this.viewing = true;
    },

    startEdit() {
      this.viewing = false;
    },

    edit(item) {
      this.error = "";
      this.viewing = false;
      this.editing = item[page.id];
      this.partIds = {};
      for (const part of page.parts) {
        const id = getPath(item, `${part.path}.${part.idName}`);
        if (id !== null && id !== undefined) this.partIds[part.path] = id;
      }
      const form = { [page.id]: item[page.id] };
      for (const field of page.fields) {
        const value = getPath(item, field.name);
        if (field.kind === "ref") setPath(form, field.name, value ? String(value[field.idName]) : "");
        else if (field.kind === "refs") setPath(form, field.name, (value || []).map((v) => String(v[field.idName])));
        else if (field.kind === "boolean") setPath(form, field.name, Boolean(value));
        else setPath(form, field.name, value === null || value === undefined ? "" : value);
      }
      this.form = form;
      for (const key of page.tables) {
        this.tables[key] = this.emptyTable();
        this.loadTable(key, 0);
      }
    },

    payload() {
      const body = {};
      if (!page.idGenerated && this.editing === null) {
        body[page.id] = page.idNumber ? Number(this.form[page.id]) : this.form[page.id];
      }
      const refId = (field, id) => ({ [field.idName]: field.idNumber ? Number(id) : id });
      for (const field of page.fields) {
        const value = getPath(this.form, field.name);
        let json;
        if (field.kind === "ref") json = value === "" ? null : refId(field, value);
        else if (field.kind === "refs") json = value.map((id) => refId(field, id));
        else if (field.kind === "number") json = value === "" || value === null ? null : Number(value);
        else if (field.kind === "boolean") json = Boolean(value);
        else json = value === "" ? null : value;
        setPath(body, field.name, json);
      }
      for (const part of page.parts) {
        if (this.partIds[part.path] !== undefined) setPath(body, `${part.path}.${part.idName}`, this.partIds[part.path]);
      }
      return body;
    },

    // The rules of the model, checked before anything is sent (the server checks them again): required,
    // length, range, pattern, and an email address or URL with validator.js. Returns path -> message.
    validate() {
      const errors = {};
      if (!page.idGenerated && this.editing === null && String(this.form[page.id] ?? "").trim() === "") {
        errors[page.id] = "is required";
      }
      for (const field of page.fields) {
        const rules = field.rules;
        if (!rules) continue;
        const value = getPath(this.form, field.name);
        const text = value === null || value === undefined ? "" : String(value);
        if (text === "") {
          if (rules.required) errors[field.name] = "is required";
          continue;
        }
        if (rules.minlength !== undefined && text.length < rules.minlength) errors[field.name] = `needs at least ${rules.minlength} characters`;
        else if (rules.maxlength !== undefined && text.length > rules.maxlength) errors[field.name] = `can have at most ${rules.maxlength} characters`;
        else if (rules.min !== undefined && Number(text) < rules.min) errors[field.name] = `must be at least ${rules.min}`;
        else if (rules.max !== undefined && Number(text) > rules.max) errors[field.name] = `must be at most ${rules.max}`;
        else if (rules.format === "email" && !validator.isEmail(text)) errors[field.name] = "must be a well-formed email address";
        else if (rules.format === "url" && !validator.isURL(text, { require_protocol: true, protocols: ["http", "https"] })) errors[field.name] = "must be a URL starting with http:// or https://";
        else if (rules.pattern !== undefined && !new RegExp(`^(?:${rules.pattern})$`).test(text)) errors[field.name] = "has the wrong format";
      }
      return errors;
    },

    async save() {
      if (this.viewing) return;
      this.errors = this.validate();
      if (Object.keys(this.errors).length > 0) {
        this.error = "Some values are not valid.";
        return;
      }
      try {
        if (this.editing === null) await this.request("POST", page.api, this.payload());
        else await this.request("PUT", `${page.api}/${encodeURIComponent(this.editing)}`, this.payload());
        this.reset();
        await this.load();
      } catch (e) {
        this.error = e.message;
        this.errors = e.fields || {};
      }
    },

    async remove(item) {
      if (!confirm("Delete this entry?")) return;
      try {
        await this.request("DELETE", `${page.api}/${encodeURIComponent(item[page.id])}`);
        if (this.editing === item[page.id]) this.reset();
        await this.load();
      } catch (e) {
        this.error = e.message;
      }
    },

    // A referenced row as text: its label member, else its id.
    label(row, labelName, idName) {
      if (!row) return "";
      return row[labelName] !== null && row[labelName] !== undefined ? String(row[labelName]) : String(row[idName]);
    },

    show(value) {
      if (value === null || value === undefined) return "";
      if (value === true) return "yes";
      if (value === false) return "no";
      return String(value);
    },
  }));
});
