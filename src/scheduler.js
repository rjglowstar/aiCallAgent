const cron = require('node-cron');
const { exec } = require('child_process');
const customers = require('../data/customers.json');

console.log("Scheduler started...");

// TEST MODE: Every 10 seconds
cron.schedule('35 13 * * *', () => {
  console.log("⏰ Auto calling now...");

  customers.forEach(c => {
    console.log("📞 Calling:",c.name, c.phone);
    exec(`node src/makeCall.js ${c.phone}`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Exec Error:", error);
        return;
      }
      console.log("✔ Exec Output:", stdout);
    });
  });
});
