// The entities of the model: the shape of their JSON and the rules of their fields (what the store checks), and where each one is addressed.
// Generated from spec/base/*.dml - rewritten on every `pisa generate`.
export default {
  "name": "adressen-singletier",
  "entities": {
    "Person": {
      "name": "Person",
      "id": {
        "name": "id",
        "kind": "int",
        "generated": true
      },
      "fields": [
        {
          "name": "firstName",
          "kind": "string",
          "required": true,
          "min": 1,
          "max": 80
        },
        {
          "name": "lastName",
          "kind": "string",
          "required": true,
          "min": 1,
          "max": 80
        },
        {
          "name": "email",
          "kind": "string",
          "required": false,
          "unique": true,
          "format": "email"
        },
        {
          "name": "phone",
          "kind": "string",
          "required": false,
          "pattern": "\\+?[0-9 ()/.-]{6,20}"
        },
        {
          "name": "birthday",
          "kind": "date",
          "required": false
        },
        {
          "name": "status",
          "kind": "enum",
          "required": true,
          "values": [
            "ACTIVE",
            "BLOCKED",
            "ARCHIVED"
          ]
        }
      ],
      "refs": [
        {
          "name": "company",
          "target": "Company",
          "foreignKey": "companyId",
          "idName": "id"
        }
      ],
      "inverse": [],
      "parts": [
        {
          "name": "address",
          "foreignKey": "addressId",
          "meta": {
            "name": "Address",
            "id": {
              "name": "id",
              "kind": "int",
              "generated": true
            },
            "fields": [
              {
                "name": "street",
                "kind": "string",
                "required": true
              },
              {
                "name": "zip",
                "kind": "string",
                "required": true,
                "pattern": "[0-9]{4}"
              },
              {
                "name": "city",
                "kind": "string",
                "required": true
              }
            ],
            "refs": [],
            "inverse": [],
            "parts": []
          }
        }
      ],
      "path": "persons"
    },
    "Address": {
      "name": "Address",
      "id": {
        "name": "id",
        "kind": "int",
        "generated": true
      },
      "fields": [
        {
          "name": "street",
          "kind": "string",
          "required": true
        },
        {
          "name": "zip",
          "kind": "string",
          "required": true,
          "pattern": "[0-9]{4}"
        },
        {
          "name": "city",
          "kind": "string",
          "required": true
        }
      ],
      "refs": [],
      "inverse": [],
      "parts": []
    },
    "Company": {
      "name": "Company",
      "id": {
        "name": "id",
        "kind": "int",
        "generated": true
      },
      "fields": [
        {
          "name": "name",
          "kind": "string",
          "required": true,
          "unique": true
        }
      ],
      "refs": [],
      "inverse": [
        {
          "path": "employees",
          "target": "Person",
          "via": "company"
        }
      ],
      "parts": [],
      "path": "companies"
    }
  }
};
