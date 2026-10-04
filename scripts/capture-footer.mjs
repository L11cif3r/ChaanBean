import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const OUTPUT_FILE = path.resolve("docs/screenshots/footer-initiatives-strip.png");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    "--window-size=1440,900",
    "--user-data-dir=" + path.resolve(".chrome-profile-footer"),
    "about:blank"
  ]);

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
  }

  if (!versionData) {
    chrome.kill();
    throw new Error("Could not connect to Chrome");
  }

  const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const pages = await listRes.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  function send(method, params = {}) {
    const id = idCounter++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  await send("Page.navigate", { url: "http://localhost:3000/landing" });
  await sleep(2500);

  // Scroll to footer
  await send("Runtime.evaluate", {
    expression: `
      window.scrollTo(0, document.body.scrollHeight);
    `
  });
  await sleep(1500);

  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, Buffer.from(shot.data, "base64"));
  console.log("Footer screenshot saved:", OUTPUT_FILE);

  ws.close();
  chrome.kill();
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
