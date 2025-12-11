import { loadEnv, defineConfig, schema } from "envus";

loadEnv();

export const config = defineConfig({
  app: {
    name: schema("APP_NAME").string().default('my-app'),
    port: schema("PORT").number().default(3000),
  },
});
