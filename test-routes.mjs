const BASE_URL = "http://localhost:3000";

const routes = [
  "/",
  "/debtors",
  "/background-check",
  "/payment-recovery",
  "/arbitration",
  "/trust-hub",
  "/vendors",
  "/settings",
  "/admin",
  "/admin/pipeline",
  "/admin/customers",
  "/admin/marketing",
  "/admin/financials",
  "/intro",
  "/login"
];

async function checkRoutes() {
  console.log("=== Checking All Frontend Routes HTTP Status ===\n");
  let allOk = true;

  for (const route of routes) {
    try {
      const res = await fetch(`${BASE_URL}${route}`);
      if (res.ok) {
        console.log(`[200 OK] ${route}`);
      } else {
        console.error(`[${res.status} FAIL] ${route}`);
        allOk = false;
      }
    } catch (err) {
      console.error(`[ERROR] ${route}:`, err.message);
      allOk = false;
    }
  }

  if (!allOk) process.exit(1);
  console.log("\nAll 15 frontend routes rendered successfully with 200 OK!");
}

checkRoutes();
