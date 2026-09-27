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
}
