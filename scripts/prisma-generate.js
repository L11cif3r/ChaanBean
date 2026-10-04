// scripts/prisma-generate.js
// Ensures DIRECT_URL is populated before prisma generate runs
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/postgres";
}

const { execSync } = require("child_process");
try {
  execSync("npx prisma generate", { stdio: "inherit", env: process.env });
} catch (err) {
  console.error("Prisma generate failed:", err);
  process.exit(1);
}
