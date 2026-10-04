// server.js - Production startup file for GoDaddy Node.js Hosting & Standalone mode
const path = require("path");
const fs = require("fs");

// 1. Ensure dotenv is loaded immediately from root directory if available
try {
  const dotenv = require("dotenv");
  const candidates = [
    path.join(__dirname, ".env.production.local"),
    path.join(__dirname, ".env.production"),
    path.join(__dirname, ".env.local"),
    path.join(__dirname, ".env"),
  ];
  for (const envFile of candidates) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
    }
  }
} catch {
  // Ignore if dotenv is not available
}

// 2. Clean and propagate DATABASE_URL across known aliases
const rawDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.NEON_DATABASE_URL;

if (rawDbUrl) {
  let cleaned = rawDbUrl.trim();
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
  process.env.DATABASE_URL = cleaned;

  try {
    const parsed = new URL(cleaned);
    console.log(`[server.js] Database target: ${parsed.protocol}//${parsed.username}@${parsed.hostname}`);
  } catch {
    console.log(`[server.js] Database URL configured (length: ${cleaned.length})`);
  }
} else {
  console.warn("[server.js] WARNING: Neither DATABASE_URL nor POSTGRES_URL is defined at boot!");
}

// 3. Delegate to Next.js standalone server
const standalonePath = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standalonePath)) {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  require(standalonePath);
} else {
  console.error("Error: .next/standalone/server.js not found. Please run 'npm run build' first.");
  process.exit(1);
}
