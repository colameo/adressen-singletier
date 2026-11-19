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
