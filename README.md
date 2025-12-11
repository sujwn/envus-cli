# envus-cli

[![npm version](https://img.shields.io/npm/v/envus-cli)](https://www.npmjs.com/package/envus-cli)
[![envus version](https://img.shields.io/npm/v/envus)](https://www.npmjs.com/package/envus)

> A CLI tool for **[envus](https://www.npmjs.com/package/envus)**

A lightweight command-line tool for generating validated configuration files from `.env.example` using **envus v2.0.0**.

`envus-cli` reads your `.env.example`, analyzes variables, optional grouping hints, enums, and produces a fully validated config file powered by **envus**.

---

## Features

- Generates `config/index.js` or `config/index.ts` automatically
- Supports grouping via:

	- **Explicit groups** (`# @group: app`)
	- **Pattern groups** (`--group pattern` → prefixes such as `DB_`, `APP_`)

- Flat mode (`--flat`) to disable grouping but still validate variables
- Enum detection (`A|B|C`)
- Blank lines automatically break grouping blocks
- Supports ESM (default), CommonJS (`--cjs`), and TypeScript (`--ts`) outputs

---

## Installation

```
npm install -g envus-cli
```

---

## Usage

### Generate config from `.env.example`

```
envus init
```

Produces:

```
config/index.js
```

Using **explicit grouping** if present.

### Force overwrite existing file

```
envus init --force
```

### Pattern-based grouping

```
envus init --group pattern
```

Groups by prefix (e.g., `DB_URL` → `db.url`). Ignores explicit `# @group:` comments.

### Disable grouping (flat)

```
envus init --flat
```

### Generate TypeScript

```
envus init --ts
```

Outputs `index.ts`.

### Generate CommonJS

```
envus init --cjs
```

Outputs `index.js` using `require` and `module.exports`.

---

## Example `.env.example`

```
# @group: app
APP_NAME=my-app
PORT=3000

# @group: database
DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=

JWT_SECRET=

# @group: log
LOG_LEVEL=info|debug
```

---

## Generated output (example)

```js
import { loadEnv, defineConfig, schema } from "envus";

loadEnv();

export const config = defineConfig({
	app: {
		name: schema("APP_NAME").string().default("my-app"),
		port: schema("PORT").number().default(3000),
	},
	database: {
		url: schema("DATABASE_URL").string().required(),
		username: schema("DATABASE_USERNAME").string().required(),
		password: schema("DATABASE_PASSWORD").string().required(),
	},
	jwtSecret: schema("JWT_SECRET").string().required(),
	log: {
		level: schema("LOG_LEVEL").string().enum(["info", "debug"]),
	},
});
```

---

## Requirements

- Node.js 16+
- **envus v2.0.0** or later

---

## License

[MIT](LICENSE)
