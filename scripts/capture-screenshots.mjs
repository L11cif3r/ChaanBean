import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const OUTPUT_DIR = path.resolve("docs/screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Launching headless Chrome with remote debugging on port", PORT);
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    "--window-size=1440,960",
    "--user-data-dir=" + path.resolve(".chrome-profile"),
    "about:blank"
  ]);

  chrome.on("error", (err) => console.error("Chrome process error:", err));

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {
      // retry
    }
  }

  if (!versionData) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port " + PORT);
  }

  console.log("Connected to Chrome:", versionData.Browser);

  const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const pages = await listRes.json();
  const targetPage = pages[0];
  const wsUrl = targetPage.webSocketDebuggerUrl;

  console.log("Connecting WebSocket to:", wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(msg.error);
      } else {
        resolve(msg.result);
      }
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
    height: 960,
    deviceScaleFactor: 2,
    mobile: false
  });

  console.log("Navigating to http://localhost:3000/login to prime session...");
  await send("Page.navigate", { url: "http://localhost:3000/login" });
  await sleep(1500);

  await send("Runtime.evaluate", {
    expression: `
      sessionStorage.setItem("chaanbean_session_active", "true");
      localStorage.setItem("chaanbean_auth", JSON.stringify({
        type: "client",
        user: { id: "demo-client", name: "Acme Industrial Traders", email: "operations@acmetraders.in" }
      }));
      document.cookie = "chaanbean_session=client; path=/; max-age=86400";
    `
  });

  const screenshots = [
    {
      name: "01-executive-dashboard-light.png",
      url: "http://localhost:3000",
      theme: "light",
      label: "Executive Dashboard (Light Mode)"
    },
    {
      name: "02-executive-dashboard-dark.png",
      url: "http://localhost:3000",
      theme: "dark",
      label: "Executive Dashboard (Dark Mode)"
    },
    {
      name: "03-business-background-check-18-tabs.png",
      url: "http://localhost:3000/background-check",
      theme: "light",
      label: "Business Background Check 18 Tabs (Light Mode)"
    },
    {
      name: "04-payment-recovery-workbench.png",
      url: "http://localhost:3000/payment-recovery",
      theme: "light",
      label: "Automated Payment Recovery Workbench"
    },
    {
      name: "05-payment-recovery-dark.png",
      url: "http://localhost:3000/payment-recovery",
      theme: "dark",
      label: "Payment Recovery Desk (Dark Mode)"
    },
    {
      name: "06-trust-hub.png",
      url: "http://localhost:3000/trust-hub",
      theme: "light",
      label: "Trust Hub & Verified Directory"
    },
    {
      name: "07-debtors-credit-risk.png",
      url: "http://localhost:3000/debtors",
      theme: "light",
      label: "Credit Risk Portfolio"
    }
  ];

  for (const item of screenshots) {
    console.log(`Capturing: ${item.label} (${item.name})...`);
    await send("Page.navigate", { url: item.url });
    await sleep(2500);

    await send("Runtime.evaluate", {
      expression: `
        sessionStorage.setItem("chaanbean_session_active", "true");
        localStorage.setItem("chaanbean_auth", JSON.stringify({
          type: "client",
          user: { id: "demo-client", name: "Acme Industrial Traders", email: "operations@acmetraders.in" }
        }));
        localStorage.setItem("chaanbean_theme", "${item.theme}");
        if ("${item.theme}" === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      `
    });
    await sleep(1500);

    const shotResult = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });

    const filePath = path.join(OUTPUT_DIR, item.name);
    fs.writeFileSync(filePath, Buffer.from(shotResult.data, "base64"));
    console.log(`Saved ${item.name} (${fs.statSync(filePath).size} bytes)`);
  }

  ws.close();
  chrome.kill();
  console.log("All screenshots captured successfully in docs/screenshots!");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
