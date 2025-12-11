import { describe, it, expect } from "vitest";
import { parseEnvExample } from "../src/parser";

describe("parser - explicit grouping", () => {
	it("should group using @group and break on blank lines", () => {
		const input = `
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
`;

		const { items, diagnostics } = parseEnvExample(input, {
			enableGrouping: true,
			groupingMode: "explicit",
			breakGroups: true,
			flat: false,
		});

		expect(diagnostics.length).toBe(0);

		const app = items.filter((i) => i.groupPath?.[0] === "app");
		const db = items.filter((i) => i.groupPath?.[0] === "database");
		const topLevel = items.filter((i) => !i.groupPath);
		const log = items.filter((i) => i.groupPath?.[0] === "log");

		expect(app.map((i) => i.propertyName)).toEqual(["name", "port"]);
		expect(db.map((i) => i.propertyName)).toEqual([
			"url",
			"username",
			"password",
		]);
		expect(topLevel.map((i) => i.propertyName)).toEqual(["jwtSecret"]);
		expect(log.map((i) => i.propertyName)).toEqual(["level"]);
	});
});

describe("parser - pattern grouping", () => {
	it("should group by prefix and ignore @group directives", () => {
		const input = `
# @group: app
APP_NAME=my-app
APP_PORT=3000
DB_URL=test
DB_USER=root
`;

		const { items, diagnostics } = parseEnvExample(input, {
			enableGrouping: true,
			groupingMode: "pattern",
			breakGroups: true,
			flat: false,
		});

		expect(diagnostics.length).toBe(0);

		const app = items.filter((i) => i.groupPath?.[0] === "app");
		const db = items.filter((i) => i.groupPath?.[0] === "db");

		expect(app.map((i) => i.propertyName)).toEqual(["name", "port"]);
		expect(db.map((i) => i.propertyName)).toEqual(["url", "user"]);
	});
});

describe("parser - flat mode", () => {
	it("ignores comments + grouping but still validates env lines", () => {
		const input = `
# comment
FOO=123
INVALID LINE
BAR=test
`;

		const { items, diagnostics } = parseEnvExample(input, {
			enableGrouping: false,
			flat: true,
			groupingMode: "explicit",
		});

		expect(items.map((i) => i.propertyName)).toEqual(["foo", "bar"]);

		// INVALID LINE produces warning
		expect(diagnostics.length).toBe(1);
		expect(diagnostics[0].severity).toBe("warning");
	});
});

describe("parser - enum detection", () => {
	it("detects enum values", () => {
		const input = `LOG_LEVEL=info|debug|warn`;

		const { items } = parseEnvExample(input, {
			enableGrouping: false,
			flat: true,
		});

		expect(items[0].enumValues).toEqual(["info", "debug", "warn"]);
	});
});
