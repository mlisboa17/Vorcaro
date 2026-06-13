import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  // @ts-ignore
  seed: "npx tsx prisma/seed.ts",
});
