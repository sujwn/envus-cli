import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import * as path from "path";

describe("CLI - envus init", () => {
  const tmp = path.join(process.cwd(), "tests/tmp");

  beforeAll(() => {
    mkdirSync(tmp, { recursive: true });
  });

  it("generates config/index.js from .env.example", () => {
    const example = `
# @group: app
APP_NAME=my-app
PORT=3000
`;

    const examplePath = path.join(tmp, ".env.example");
    writeFileSync(examplePath, example);

    execSync(`node dist/cli.js init -e ${examplePath} --force -o ${tmp}/config.js`);

    const output = readFileSync(path.join(tmp, "config.js"), "utf-8");

    expect(output).toContain("app:");
    expect(output).toContain("schema(\"APP_NAME\")");
    expect(output).toContain("my-app");
  });
});
