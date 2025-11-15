import path from "node:path";
import { config } from "dotenv";
config(); // Load environment variables
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema", "schema.prisma"),
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
