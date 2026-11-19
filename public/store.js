// The data of the application and the rules on it, in the browser. The store answers the requests of the pages the way the REST API of the
// other targets does, so the pages are the same: handle("GET", "api/people?page=0&size=10") -> { status: 200, body: { items, total, page, size, pages } }.
//   GET    api/<plural>            all rows as a list, or one page with ?page=&size=
//   GET    api/<plural>/<id>       one row, 404 if there is none
//   GET    api/<plural>/<id>/<c>   one page of a collection another entity keeps (an author's books)
//   POST   api/<plural>            creates a row (200 with the row); 400 { error, fields } for a value that breaks a rule of the model
//   PUT    api/<plural>/<id>       replaces the row
//   DELETE api/<plural>/<id>       deletes the row and its composed parts (204); 409 while another row still refers to it
// What `@operations` of the entity does not allow is answered with 405. The data is kept in `storage` (localStorage-like: getItem, setItem)
// after every change, and exportJson / importJson are the JSON file of Save data and Load data (one list per entity). No DOM and no network.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SIZE = 100;

const isDate = (value, pattern) => pattern.test(value) && !Number.isNaN(Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value));

function isUrl(text) {
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch (ignored) {
    return false;
  }
}

// The message for a value of the wrong type, or undefined if the type is right.
function typeProblem(field, value) {
  switch (field.kind) {
    case "string":
      return typeof value === "string" ? undefined : "must be a text";
    case "int":
    case "bigint":
      return Number.isInteger(value) ? undefined : "must be a whole number";
    case "float":
    case "decimal":
      return typeof value === "number" && Number.isFinite(value) ? undefined : "must be a number";
    case "boolean":
      return typeof value === "boolean" ? undefined : "must be true or false";
    case "date":
      return typeof value === "string" && isDate(value, DATE) ? undefined : "must be a date (yyyy-mm-dd)";
    case "datetime":
      return typeof value === "string" && isDate(value, DATE_TIME) ? undefined : "must be a date and time (yyyy-mm-ddThh:mm:ss)";
    case "enum":
      return typeof value === "string" && (field.values || []).includes(value) ? undefined : `must be one of ${(field.values || []).join(", ")}`;
    default:
      return undefined;
  }
}

// The message for a value that breaks a rule of the field, or undefined.
function ruleProblem(field, value) {
  const { min, max } = field;
  if (field.kind === "string") {
    if (field.format === "email" && !EMAIL.test(value)) return "must be a well-formed email address";
    if (field.format === "url" && !isUrl(value)) return "must be a URL starting with http:// or https://";
    if (field.pattern !== undefined && !new RegExp(`^(?:${field.pattern})$`).test(value)) return `must match "${field.pattern}"`;
    if ((min !== undefined && value.length < min) || (max !== undefined && value.length > max)) return `size must be between ${min === undefined ? 0 : min} and ${max === undefined ? "any length" : max}`;
  } else if (typeof value === "number") {
    if (min !== undefined && value < min) return `must be greater than or equal to ${min}`;
    if (max !== undefined && value > max) return `must be less than or equal to ${max}`;
  }
  return undefined;
}

// The rules of the model on a JSON body: required values, types, ranges, patterns, formats. Returns path -> message ("address.zip"); empty if valid.
function validate(meta, body, creating, prefix = "") {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { [prefix.replace(/\.$/, "")]: "must be a JSON object" };
  const problems = {};
  const id = body[meta.id.name];
  if (creating && !meta.id.generated && (id === undefined || id === null || id === "")) problems[prefix + meta.id.name] = "must not be null";
  for (const field of meta.fields) {
    const value = body[field.name];
    if (value === undefined || value === null) {
      if (field.required) problems[prefix + field.name] = "must not be null";
      continue;
    }
    const problem = typeProblem(field, value) || ruleProblem(field, value);
    if (problem) problems[prefix + field.name] = problem;
  }
  for (const ref of meta.refs) {
    const target = body[ref.name];
    if (target === undefined || target === null) continue;
    const targetId = typeof target === "object" ? target[ref.idName] : undefined;
    if (targetId === undefined || targetId === null) problems[prefix + ref.name] = `must reference a row by its ${ref.idName}`;
  }
  for (const part of meta.parts) {
    const value = body[part.name];
    if (value !== undefined && value !== null) Object.assign(problems, validate(part.meta, value, false, `${prefix}${part.name}.`));
  }
  return problems;
}

const sameId = (a, b) => String(a) === String(b);
const compare = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)));

export function createStore(schema, options = {}) {
  const storage = options.storage;
  const key = `${schema.name}:data`;
  const metas = schema.entities;
  // A composed part lives inside its owner: it has no collection and no address of its own.
  const partNames = new Set();
  const collect = (meta) => meta.parts.forEach((part) => {
    partNames.add(part.meta.name);
    collect(part.meta);
  });
  Object.values(metas).forEach(collect);
  const roots = Object.values(metas).filter((meta) => !partNames.has(meta.name));
  const byPath = new Map(roots.map((meta) => [meta.path, meta]));

  // The rows as they are kept: the members of the entity, a reference as the id of the row it points to, a part nested.
  let data = Object.fromEntries(roots.map((meta) => [meta.name, []]));
  let counters = {};

  const allows = (meta, operation) => meta.operations === undefined || meta.operations.includes(operation);
  const nextId = (name) => {
    counters[name] = (counters[name] || 0) + 1;
    return counters[name];
  };
  const find = (meta, id) => data[meta.name].find((row) => sameId(row[meta.id.name], id));

  const flat = (meta, row) => {
    const json = { [meta.id.name]: row[meta.id.name] };
    for (const field of meta.fields) json[field.name] = row[field.name] === undefined ? null : row[field.name];
    return json;
  };
  // A row as the JSON of the API: a reference as the row it points to, a part nested.
  const materialize = (meta, row, source = data) => {
    const json = flat(meta, row);
    for (const ref of meta.refs) {
      const target = row[ref.name] === null || row[ref.name] === undefined ? undefined : source[ref.target].find((r) => sameId(r[metas[ref.target].id.name], row[ref.name]));
      json[ref.name] = target ? flat(metas[ref.target], target) : null;
    }
    for (const part of meta.parts) json[part.name] = row[part.name] ? materialize(part.meta, row[part.name], source) : null;
    return json;
  };

  // A validated body as a kept row. `old` is the row being replaced: a part that comes back with its id is updated in place. `keepIds`: the ids of
  // the parts are the ones of the body (a loaded file), not new ones.
  const build = (meta, body, id, old, keepIds = false) => {
    const row = { [meta.id.name]: id };
    for (const field of meta.fields) row[field.name] = body[field.name] === undefined ? null : body[field.name];
    for (const ref of meta.refs) {
      const target = body[ref.name];
      row[ref.name] = target && target[ref.idName] !== undefined && target[ref.idName] !== null ? target[ref.idName] : null;
    }
    for (const part of meta.parts) {
      const value = body[part.name];
      const before = old ? old[part.name] : null;
      if (!value) {
        row[part.name] = null;
        continue;
      }
      const partId = part.meta.id.name;
      const keeps = before && sameId(value[partId], before[partId]);
      const id = keeps || keepIds || !part.meta.id.generated ? (keeps ? before[partId] : value[partId]) : nextId(part.meta.name);
      row[part.name] = build(part.meta, value, id, keeps ? before : null, keepIds);
    }
    return row;
  };

  // Problems that need the other rows: a reference to a row that is not there, a value that must be unique and is taken, an id that is taken.
  const refProblems = (meta, body, prefix, source) => {
    const problems = {};
    for (const ref of meta.refs) {
      const target = body[ref.name];
      const id = target && typeof target === "object" ? target[ref.idName] : undefined;
      if (id !== undefined && id !== null && !source[ref.target].some((row) => sameId(row[metas[ref.target].id.name], id))) problems[prefix + ref.name] = "refers to a row that does not exist";
    }
    for (const part of meta.parts) {
      if (body[part.name]) Object.assign(problems, refProblems(part.meta, body[part.name], `${prefix}${part.name}.`, source));
    }
    return problems;
  };
  const takenProblems = (meta, body, ownId, rows) => {
    const problems = {};
    const idValue = body[meta.id.name];
    if (!meta.id.generated && idValue !== undefined && idValue !== null && rows.some((row) => sameId(row[meta.id.name], idValue) && !(ownId !== undefined && sameId(row[meta.id.name], ownId)))) problems[meta.id.name] = "is already used";
    for (const field of meta.fields) {
      const value = body[field.name];
      if (field.unique && value !== undefined && value !== null && rows.some((row) => row[field.name] === value && !(ownId !== undefined && sameId(row[meta.id.name], ownId)))) problems[field.name] = "must be unique";
    }
    return problems;
  };

  // Whether another row refers to this one (such a row cannot be deleted).
  const refersTo = (meta, row, target, id) => meta.refs.some((ref) => ref.target === target.name && row[ref.name] !== null && row[ref.name] !== undefined && sameId(row[ref.name], id)) ||
    meta.parts.some((part) => row[part.name] && refersTo(part.meta, row[part.name], target, id));
  const isReferenced = (meta, id) => roots.some((other) => data[other.name].some((row) => refersTo(other, row, meta, id)));

  const maxIds = (meta, row, into) => {
    if (typeof row[meta.id.name] === "number") into[meta.name] = Math.max(into[meta.name] || 0, row[meta.id.name]);
    for (const part of meta.parts) if (row[part.name]) maxIds(part.meta, row[part.name], into);
  };

  const sorted = (meta, rows) => [...rows].sort((a, b) => compare(a[meta.id.name], b[meta.id.name]));
  const pageOf = (items, query) => {
    const number = Number.parseInt(query.get("page") === null ? "0" : query.get("page"), 10);
    const length = Number.parseInt(query.get("size") === null ? "10" : query.get("size"), 10);
    const page = Number.isNaN(number) ? 0 : Math.max(number, 0);
    const size = Number.isNaN(length) ? 10 : Math.min(Math.max(length, 1), MAX_SIZE);
    return { items: items.slice(page * size, page * size + size), total: items.length, page, size, pages: Math.ceil(items.length / size) };
  };

  const persist = () => {
    if (storage) storage.setItem(key, exportJson());
  };

  function exportJson() {
    return JSON.stringify(Object.fromEntries(roots.map((meta) => [meta.name, sorted(meta, data[meta.name]).map((row) => materialize(meta, row))])), null, 2);
  }

  // Replaces all data with the content of a JSON file (one list of rows per entity). A file that is not valid changes nothing and throws.
  function importJson(text) {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("The file must hold a JSON object with one list per entity.");
    const next = Object.fromEntries(roots.map((meta) => [meta.name, []]));
    const ids = {};
    for (const [name, list] of Object.entries(parsed)) {
      const meta = roots.find((m) => m.name === name);
      if (!meta) throw new Error(`The file has an entity "${name}" that this application does not know.`);
      if (!Array.isArray(list)) throw new Error(`"${name}" must be a list of rows.`);
      list.forEach((json, index) => {
        const problems = validate(meta, json, true);
        if (typeof json === "object" && json !== null && (json[meta.id.name] === undefined || json[meta.id.name] === null)) problems[meta.id.name] = "must not be null";
        const first = Object.entries(problems)[0];
        if (first) throw new Error(`${name}[${index}].${first[0]} ${first[1]}`);
        const row = build(meta, json, json[meta.id.name], null, true);
        if (next[name].some((other) => sameId(other[meta.id.name], row[meta.id.name]))) throw new Error(`${name}[${index}]: the ${meta.id.name} ${row[meta.id.name]} is used twice.`);
        next[name].push(row);
        maxIds(meta, row, ids);
      });
    }
    for (const meta of roots) {
      next[meta.name].forEach((row, index) => {
        const missing = Object.entries(refProblems(meta, bodyOf(meta, row), "", next))[0];
        if (missing) throw new Error(`${meta.name}[${index}].${missing[0]} ${missing[1]}`);
      });
    }
    data = next;
    counters = ids;
    persist();
  }

  // The kept row as a body (a reference as { id }), for the check of the references of an imported file.
  function bodyOf(meta, row) {
    const body = { ...row };
    for (const ref of meta.refs) body[ref.name] = row[ref.name] === null || row[ref.name] === undefined ? null : { [ref.idName]: row[ref.name] };
    for (const part of meta.parts) body[part.name] = row[part.name] ? bodyOf(part.meta, row[part.name]) : null;
    return body;
  }

  const answer = (status, body) => ({ status, body });
  const notFound = (meta) => answer(404, { error: `${meta.name} not found.` });
  const invalid = (fields) => answer(400, { error: "Some values are not valid.", fields });

  function create(meta, body) {
    if (!allows(meta, "create")) return answer(405, { error: `${meta.name} doesn't allow create.` });
    const problems = validate(meta, body, true);
    if (Object.keys(problems).length === 0) Object.assign(problems, refProblems(meta, body, "", data), takenProblems(meta, body, undefined, data[meta.name]));
    if (Object.keys(problems).length > 0) return invalid(problems);
    const row = build(meta, body, meta.id.generated ? nextId(meta.name) : body[meta.id.name], null);
    data[meta.name].push(row);
    persist();
    return answer(200, materialize(meta, row));
  }

  function update(meta, id, body) {
    if (!allows(meta, "update")) return answer(405, { error: `${meta.name} doesn't allow update.` });
    const problems = validate(meta, body, false);
    if (Object.keys(problems).length === 0) Object.assign(problems, refProblems(meta, body, "", data), takenProblems(meta, { ...body, [meta.id.name]: id }, id, data[meta.name]));
    if (Object.keys(problems).length > 0) return invalid(problems);
    const old = find(meta, id);
    if (!old) return notFound(meta);
    const row = build(meta, body, old[meta.id.name], old);
    data[meta.name][data[meta.name].indexOf(old)] = row;
    persist();
    return answer(200, materialize(meta, row));
  }

  function remove(meta, id) {
    if (!allows(meta, "delete")) return answer(405, { error: `${meta.name} doesn't allow delete.` });
    const old = find(meta, id);
    if (!old) return notFound(meta);
    if (isReferenced(meta, id)) return answer(409, { error: `${meta.name} ${id} is still used by another row.` });
    data[meta.name].splice(data[meta.name].indexOf(old), 1);
    persist();
    return answer(204, null);
  }

  async function handle(method, url, body) {
    const [path, queryText = ""] = String(url).split("?");
    const query = new URLSearchParams(queryText);
    const segments = path.replace(/^\/+/, "").split("/").filter((part) => part !== "").map(decodeURIComponent);
    const meta = segments[0] === "api" ? byPath.get(segments[1]) : undefined;
    if (!meta) return answer(404, { error: "Not found." });
    const rest = segments.slice(2);
    const idOf = (raw) => (["int", "bigint"].includes(meta.id.kind) ? (Number.isInteger(Number(raw)) ? Number(raw) : undefined) : raw);
    const verb = String(method).toUpperCase();
    if (rest.length === 0) {
      if (verb === "GET") {
        const rows = sorted(meta, data[meta.name]).map((row) => materialize(meta, row));
        return answer(200, query.get("page") === null ? rows : pageOf(rows, query));
      }
      if (verb === "POST") return create(meta, body);
    } else if (rest.length === 1) {
      const id = idOf(rest[0]);
      if (verb === "GET") {
        const row = id === undefined ? undefined : find(meta, id);
        return row ? answer(200, materialize(meta, row)) : notFound(meta);
      }
      if (verb === "PUT") return id === undefined ? notFound(meta) : update(meta, id, body);
      if (verb === "DELETE") return id === undefined ? notFound(meta) : remove(meta, id);
    } else if (rest.length === 2 && verb === "GET") {
      const inverse = meta.inverse.find((i) => i.path === rest[1]);
      const id = idOf(rest[0]);
      if (inverse && id !== undefined) {
        const target = metas[inverse.target];
        const rows = sorted(target, data[target.name].filter((row) => row[inverse.via] !== null && row[inverse.via] !== undefined && sameId(row[inverse.via], id))).map((row) => materialize(target, row));
        return answer(200, pageOf(rows, query));
      }
      return notFound(meta);
    }
    return answer(405, { error: `${verb} is not possible here.` });
  }

  if (storage) {
    const saved = storage.getItem(key);
    if (saved) {
      try {
        importJson(saved);
      } catch (ignored) {
        // what is kept is not readable: start empty (the next change overwrites it)
      }
    }
  }

  return { handle, exportJson, importJson };
}

