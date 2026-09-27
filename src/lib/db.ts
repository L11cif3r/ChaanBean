import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import fs from "fs";
import path from "path";
import os from "os";

// Configure WebSocket constructor for Neon in Node.js environments
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getDatabaseUrl(): string | undefined {
  let envUrl = process.env.DATABASE_URL;
  if (!envUrl) return undefined;

  // Clean leading and trailing quotes if passed literally
  envUrl = envUrl.trim().replace(/^["']|["']$/g, "");

  // In production or when using PostgreSQL, use connection URL directly
  if (envUrl.startsWith("postgres://") || envUrl.startsWith("postgresql://") || !envUrl.startsWith("file:")) {
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

function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl();

  // If connected to PostgreSQL/Neon, use the official Neon driver adapter
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    const adapter = new PrismaNeon({ connectionString: dbUrl });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
