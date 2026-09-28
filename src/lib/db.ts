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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  _prismaInitializedWithAdapter?: boolean;
};

export function cleanUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('\\"') && cleaned.endsWith('\\"'))
  ) {
    if (cleaned.startsWith('\\"') && cleaned.endsWith('\\"')) {
      cleaned = cleaned.slice(2, -2).trim();
    } else {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }
  return cleaned;
}

function getDatabaseUrl(): string | undefined {
  // If running in Node.js and DATABASE_URL is not yet in process.env, try loading dotenv
  if (
    typeof window === "undefined" &&
    !process.env.DATABASE_URL &&
    !process.env.POSTGRES_URL
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dotenv = require("dotenv");
      const candidates = [
        path.join(process.cwd(), ".env.production"),
        path.join(process.cwd(), ".env"),
        path.resolve(__dirname, "../../.env"),
        path.resolve(__dirname, "../../../.env"),
        path.resolve(__dirname, "../../../../.env"),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          dotenv.config({ path: c });
        }
      }
    } catch {
      // Ignore if dotenv is not available
    }
  }

  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL;

  const envUrl = cleanUrl(rawUrl);
  if (!envUrl) return undefined;

  // In production or when using PostgreSQL, use connection URL directly
  if (
    envUrl.startsWith("postgres://") ||
    envUrl.startsWith("postgresql://") ||
    !envUrl.startsWith("file:")
  ) {
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

  // If connected to PostgreSQL/Neon, use the official Neon driver adapter over WSS (port 443)
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    try {
      const parsed = new URL(dbUrl);
      console.log(`[db] Initializing Prisma with PrismaNeon adapter for ${parsed.hostname}`);
    } catch {
      console.log("[db] Initializing Prisma with PrismaNeon adapter");
    }

    const adapter = new PrismaNeon({ connectionString: dbUrl });
    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    globalForPrisma._prismaInitializedWithAdapter = true;
    return client;
  }

  console.warn(
    `[db] Warning: Initializing PrismaClient without Neon adapter (dbUrl: ${
      dbUrl ? "provided (non-postgres)" : "none"
    })`
  );
  globalForPrisma._prismaInitializedWithAdapter = false;
  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Lazy initialization wrapper
let activeClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (activeClient) return activeClient;

  if (globalForPrisma.prisma) {
    activeClient = globalForPrisma.prisma;
    return activeClient;
  }

  activeClient = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = activeClient;
  }
  return activeClient;
}

export function isNeonAdapterActive(): boolean {
  return Boolean(globalForPrisma._prismaInitializedWithAdapter);
}

// Transparent Proxy export: instantiates PrismaClient only upon first query or access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const val = Reflect.get(client, prop, receiver);
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});
