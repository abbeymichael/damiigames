async function main() {
  console.log("🌱 Running DAMII Seeder via npm run seed...");
  const urlsToTry = [
    process.env.APP_URL,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ].filter(Boolean);

  let lastError = null;
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const baseUrl of urlsToTry) {
      try {
        const endpoint = `${baseUrl.replace(/\/$/, "")}/api/admin`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "seed" }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
        }

        const data = await res.json();
        console.log("✅ Database Seeding Completed Successfully!");
        console.log("📊 Accounts & Data Seeded:", JSON.stringify(data.accounts || data, null, 2));
        return;
      } catch (err) {
        lastError = err;
      }
    }

    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting for app server (attempt ${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error("❌ Seeder script failed:", lastError ? lastError.message : "Unknown error");
  console.error("💡 Note: Ensure the application server is running (e.g. npm run dev on port 3000) before executing npm run seed.");
  process.exit(1);
}

main();



