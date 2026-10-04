const fs = require("fs");
const path = require("path");

const standaloneDir = path.join(process.cwd(), ".next", "standalone");

if (fs.existsSync(standaloneDir)) {
  const publicSrc = path.join(process.cwd(), "public");
  const publicDest = path.join(standaloneDir, "public");
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
    console.log("[build] Copied public/ -> .next/standalone/public/");
  }

  const staticSrc = path.join(process.cwd(), ".next", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
    console.log("[build] Copied .next/static/ -> .next/standalone/.next/static/");
  }

  // Copy .env and .env.production to standalone if present in root
  for (const envName of [".env", ".env.production"]) {
    const envSrc = path.join(process.cwd(), envName);
    const envDest = path.join(standaloneDir, envName);
    if (fs.existsSync(envSrc) && !fs.existsSync(envDest)) {
      try {
        fs.copyFileSync(envSrc, envDest);
        console.log(`[build] Copied ${envName} -> .next/standalone/${envName}`);
      } catch {
        // Ignore copy errors
      }
    }
  }
}
