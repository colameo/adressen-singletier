// Example data: realistic records made from the model with @faker-js/faker, 5 per entity (the architecture says
// `sampleData { entries 5  locale "de-CH" }`). They are created through the store the way the pages create rows, with a fixed
// seed: every run makes the same data. A page makes them on the first visit, when the browser holds no data yet. Written by `pisa generate`;
// the values come from the field names and rules of the model.
const ENTRIES = 5;
const locale = "de-CH";

const COUNTRY_CODES = ["CH", "DE", "AT", "FR", "IT", "ES", "PT", "NL", "BE", "LU", "GB", "IE", "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "GR", "US", "CA", "MX", "BR", "AR", "JP", "CN", "KR", "IN", "AU", "NZ", "ZA", "EG", "TR", "IL"];

/** The faker of the locale out of the module @faker-js/faker: language and region (de-CH), else the language (de), else English. */
export function fakerOf(library) {
  const [language = "en", region] = locale.split("-");
  return (region && library[`faker${language.toUpperCase()}_${region}`]) || library[`faker${language.toUpperCase()}`] || library.fakerEN;
}

/** Fills the store with the records. `faker` is a faker of @faker-js/faker (see fakerOf). */
export async function sampleData(store, faker) {
  faker.seed(42);
  const used = new Set();

  // A value that no earlier record of the same field has (a few tries; a text that is still taken gets a number).
  const unique = (key, make) => {
    let value = make();
    for (let attempt = 0; attempt < 100 && used.has(`${key}=${value}`); attempt++) value = make();
    if (used.has(`${key}=${value}`) && typeof value === "string") value = `${value} ${used.size}`;
    used.add(`${key}=${value}`);
    return value;
  };

  // A text that matches the pattern of the model (made with the pattern, checked against it).
  const matching = (pattern, fallback) => {
    const whole = new RegExp(`^(?:${pattern})$`);
    for (let attempt = 0; attempt < 20; attempt++) {
      const value = faker.helpers.fromRegExp(pattern);
      if (value.length <= 100 && whole.test(value)) return value;
    }
    return fallback;
  };

  // The text cut or filled up to the length the model allows.
  const fit = (text, min, max) => {
    let value = text;
    while (value.length < min) value += ` ${faker.lorem.word()}`;
    return value.length > max ? value.slice(0, max).trim() : value;
  };

  const phrase = (words) => {
    const text = faker.lorem.words(words);
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const pick = (list) => list[faker.number.int({ min: 0, max: list.length - 1 })];

  // A date (YYYY-MM-DD) between `from` and `spread` days after it, and a moment (YYYY-MM-DDTHH:MM:SS) between `from` and `spread` minutes after it.
  const day = (from, spread) => new Date(Date.parse(`${from}T00:00:00Z`) + faker.number.int({ min: 0, max: spread }) * 86_400_000).toISOString().slice(0, 10);
  const moment = (from, spread) => new Date(Date.parse(`${from}Z`) + faker.number.int({ min: 0, max: spread }) * 60_000).toISOString().slice(0, 19);

  const create = async (path, body) => {
    const answer = await store.handle("POST", path, body);
    if (answer.status !== 200) throw new Error(`Sample data for ${path}: ${JSON.stringify(answer.body)}`);
    return answer.body;
  };

  const companyRecords = [];
  for (let i = 0; i < ENTRIES; i++) {
    const companyBody = {};
    companyBody.name = unique("Company.name", () => faker.company.name());
    companyRecords.push(await create("/api/companies", companyBody));
  }

  const personRecords = [];
  for (let i = 0; i < ENTRIES; i++) {
    const personBody = {};
    personBody.firstName = fit(faker.person.firstName(), 1, 80);
    personBody.lastName = fit(faker.person.lastName(), 1, 80);
    personBody.email = unique("Person.email", () => faker.internet.email());
    personBody.phone = faker.helpers.replaceSymbols("+41 79 ### ## ##");
    personBody.birthday = day("1950-01-01", 20000);
    personBody.status = faker.helpers.arrayElement(["ACTIVE", "BLOCKED", "ARCHIVED"]);
    personBody.company = pick(companyRecords);
    const personBodyAddress = {};
    personBodyAddress.street = faker.location.streetAddress();
    personBodyAddress.zip = matching("[0-9]{4}", "0000");
    personBodyAddress.city = faker.location.city();
    personBody.address = personBodyAddress;
    personRecords.push(await create("/api/persons", personBody));
  }
}
