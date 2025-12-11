import { describe, it, expect } from "vitest";
import { generateConfigFile } from "../src/generator";

describe("generator", () => {
  it("generates ESM JS config", () => {
    const items = [
      {
        fullKey: "APP_NAME",
        valueSample: "my-app",
        propertyName: "appName"
      }
    ];

    const code = generateConfigFile({ items }, "js");

    expect(code).toContain(`import { loadEnv, defineConfig, schema } from "envus"`);
    expect(code).toContain(`appName: schema("APP_NAME").string().default('my-app')`);
  });

  it("supports enums", () => {
    const items = [
      {
        fullKey: "LEVEL",
        valueSample: "info|debug",
        propertyName: "level",
        enumValues: ["info", "debug"]
      }
    ];

    const code = generateConfigFile({ items }, "js");

    expect(code).toContain(`.enum(['info', 'debug'])`);
  });
});
