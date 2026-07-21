import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "postgresql://tracework:tracework@localhost:5432/tracework";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations/generated",
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
