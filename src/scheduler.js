const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require("fs");
const path = require("path");

console.log("Scheduler started...");

// Always load latest customers.json (important for dashboard updates)
const customersFile = path.join(__dirname, "../data/customers.json");

// ⭐ Scheduler state management
let schedulerState = {
  isActive: true,
  schedule: '35 13 * * *',  // default: 13:35 daily
  scheduleType: 'daily',     // 'daily' or 'once'
  nextRunDateTime: null,     // for one-time scheduled calls
  task: null
};

function performCalls() {
  console.log("⏰ Auto calling now...");

  // Load fresh customers
  const customers = JSON.parse(fs.readFileSync(customersFile, "utf8"));

  customers.forEach(c => {
    console.log("📞 Calling:", c.name, c.phone);

    // ORIGINAL FUNCTIONALITY (kept exactly the same)    
    exec(`node ./src/makeCall.js ${c.phone}`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Exec Error:", error);
        return;
      }
      console.log("✔ Exec Output:", stdout);
    });
  });
}

function startScheduler() {
  if (schedulerState.task) {
    console.log('⏸ Stopping previous scheduler task');
    schedulerState.task.stop();
  }

  schedulerState.task = cron.schedule(schedulerState.schedule, () => {
    if (!schedulerState.isActive) return;
    performCalls();
  });

  console.log(`✅ Scheduler active | Schedule: ${schedulerState.schedule}`);
}

// Start scheduler on init
startScheduler();

// Helper to return clean state (without circular task object)
function getCleanState() {
  return {
    isActive: schedulerState.isActive,
    schedule: schedulerState.schedule,
    scheduleType: schedulerState.scheduleType,
    nextRunDateTime: schedulerState.nextRunDateTime
  };
}

// Export for API control
module.exports = {
  getState: () => schedulerState,
  getCleanState: () => getCleanState(),
  setActive: (isActive) => { 
    schedulerState.isActive = isActive;
    console.log(`Scheduler ${isActive ? '▶ started' : '⏸ paused'}`);
    return getCleanState();
  },
  updateSchedule: (cronExpression) => {
    // Validate cron expression (basic check: should have 5 parts)
    if (!cronExpression || cronExpression.split(' ').length !== 5) {
      throw new Error('Invalid cron expression');
    }
    schedulerState.schedule = cronExpression;
    schedulerState.scheduleType = 'daily';
    console.log(`📅 Schedule updated to: ${cronExpression}`);
    // Restart with new schedule
    startScheduler();
    return getCleanState();
  },
  scheduleOnce: (dateTimeISO) => {
    // Parse ISO datetime and create cron for that specific time
    const dt = new Date(dateTimeISO);
    const minute = dt.getMinutes();
    const hour = dt.getHours();
    const day = dt.getDate();
    const month = dt.getMonth() + 1;
    
    // Cron: minute hour day month *
    const cronExpression = `${minute} ${hour} ${day} ${month} *`;
    
    schedulerState.schedule = cronExpression;
    schedulerState.scheduleType = 'once';
    schedulerState.nextRunDateTime = dateTimeISO;
    console.log(`📅 One-time schedule set for: ${dt.toLocaleString()} (cron: ${cronExpression})`);
    startScheduler();
    return getCleanState();
  }
};
