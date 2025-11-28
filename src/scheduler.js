const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require("fs");
const path = require("path");

console.log("Scheduler started...");

// Always load latest customers.json (important for dashboard updates)
const customersFile = path.join(__dirname, "../data/customers.json");


// ⭐ Your ORIGINAL time schedule stays SAME
cron.schedule('35 13 * * *', () => {
  console.log("⏰ Auto calling now...");

  // Load fresh customers
  const customers = JSON.parse(fs.readFileSync(customersFile, "utf8"));

  customers.forEach(c => {
    console.log("📞 Calling:", c.name, c.phone);

    // ORIGINAL FUNCTIONALITY (kept exactly the same)
    exec(`node src/makeCall.js ${c.phone}`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Exec Error:", error);
        return;
      }
      console.log("✔ Exec Output:", stdout);
    });
  });
});
