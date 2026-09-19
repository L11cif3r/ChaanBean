import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import os from "os";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;

  // If using a non-sqlite external database (e.g. Postgres), use directly
  if (envUrl && !envUrl.startsWith("file:")) {
    return envUrl;
  }

  // If running on Vercel or AWS Lambda serverless (read-only filesystem except /tmp)
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    const tmpDir = process.platform === "win32" ? os.tmpdir() : "/tmp";
    const tmpDbPath = path.join(tmpDir, "dev.db");

    const hasValidDb = fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 0;

    if (!hasValidDb) {
      const candidates = [
        path.join(process.cwd(), "prisma", "seed.db"),
        path.join(process.cwd(), "prisma", "dev.db"),
        path.resolve(__dirname, "../../prisma/seed.db"),
        path.resolve(__dirname, "../../prisma/dev.db"),
        path.resolve(__dirname, "../../../prisma/seed.db"),
        path.resolve(__dirname, "../../../prisma/dev.db"),
        path.join(process.cwd(), ".next", "server", "prisma", "seed.db"),
        path.join(process.cwd(), ".next", "server", "prisma", "dev.db"),
      ];

      let initialized = false;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
          try {
            fs.copyFileSync(candidate, tmpDbPath);
            console.log(`[db] Initialized SQLite database from ${candidate} -> ${tmpDbPath}`);
            initialized = true;
            break;
          } catch (err) {
            console.error(`[db] Failed copying candidate ${candidate}:`, err);
          }
        }
      }

      if (!initialized) {
        console.warn("[db] Warning: no valid seed database found to copy to /tmp/dev.db");
      }
    }

    const sqliteUrl = `file:${tmpDbPath}`;
    process.env.DATABASE_URL = sqliteUrl;
    return sqliteUrl;
  }

  return envUrl;
}

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
