import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";
import path from "path";

// Load .env.local first so local variables override production/default ones
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  // @ts-ignore
  seed: "npx tsx prisma/seed.ts",
});
