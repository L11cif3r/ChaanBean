// server.js - Production startup file for GoDaddy Node.js Hosting & Standalone mode
const path = require("path");
const fs = require("fs");

const standalonePath = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standalonePath)) {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  require(standalonePath);
} else {
  console.error("Error: .next/standalone/server.js not found. Please run 'npm run build' first.");
  process.exit(1);
}
