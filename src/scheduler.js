require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { DateTime } = require('luxon');

const makeCallModule = require('./makeCall'); // expects makeCall exported (you already have that)
const schedulerFile = path.join(__dirname, '../data/scheduler.json');

let task = null;
let currentCron = null;

// Ensure scheduler state file exists
function ensureFile() {
  if (!fs.existsSync(schedulerFile)) {
    const initial = {
      schedule: null,        // cron expression string
      scheduleType: null,    // "daily" | "once" | null
      isActive: false,
      onceDateTime: null     // ISO string for one-time schedules
    };
    fs.writeFileSync(schedulerFile, JSON.stringify(initial, null, 2));
  }
}
ensureFile();

function readState() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(schedulerFile, 'utf8'));
  } catch (e) {
    console.error('Failed to read scheduler state:', e);
    return { schedule: null, scheduleType: null, isActive: false, onceDateTime: null };
  }
}

function writeState(state) {
  fs.writeFileSync(schedulerFile, JSON.stringify(state, null, 2));
}

// Stop existing cron job
function stopTask() {
  if (task) {
    try {
      task.stop();
    } catch (e) { }
    task = null;
    currentCron = null;
  }
}

// Internal handler that triggers the actual calls
async function handlerTrigger() {
  try {
    console.log('Scheduler ► executing scheduled call now...');
    // Read customers directly & call each
    const customersFile = path.join(__dirname, '../data/customers.json');
    let customers = [];
    if (fs.existsSync(customersFile)) {
      customers = JSON.parse(fs.readFileSync(customersFile, 'utf8') || '[]');
    }

    // Use the same makeCall function your project uses.
    for (const c of customers) {
      try {
        console.log('Calling:', c.phone);
        // call directly using makeCall function if available
        if (makeCallModule && typeof makeCallModule.makeCall === 'function') {
          await makeCallModule.makeCall(c.phone);
        } else {
          // fallback to spawning node process (older approach)
          const { exec } = require('child_process');
          exec(`node ./src/makeCall.js ${c.phone}`, (err, stdout, stder) => {
            if (err) console.error('Exec call error:', err);
            else console.log('Exec stdout:', stdout);
          });
        }
      } catch (err) {
        console.error('Error calling customer', c.phone, err);
      }
    }
  } catch (err) {
    console.error('handlerTrigger error:', err);
  }
}

// Start a cron job with timezone (Asia/Kolkata)
function startCron(cronExpr, isOnce, onceISO) {
  stopTask();
  if (!cron.validate(cronExpr)) {
    throw new Error('Invalid cron expression: ' + cronExpr);
  }
  // node-cron timezone: run in Asia/Kolkata
  task = cron.schedule(cronExpr, async () => {
    try {
      await handlerTrigger();
    } finally {
      if (isOnce) {
        // On a once schedule, stop and update state
        stopTask();
        const s = readState();
        s.isActive = false;
        writeState(s);
        console.log('One-time schedule executed — scheduler stopped.');
      }
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  currentCron = cronExpr;
  task.start();
}

// PUBLIC API used by your app.js

// return { schedule, scheduleType, isActive, onceDateTime }
function getInfo() {
  const st = readState();
  // ensure keys exist
  return {
    schedule: st.schedule || '',
    scheduleType: st.scheduleType || null,
    isActive: !!st.isActive,
    onceDateTime: st.onceDateTime || null
  };
}

// setActive(true/false) -> returns updated state
function setActive(flag) {
  const st = readState();
  if (!st.schedule) {
    // nothing to (re)start
    st.isActive = false;
    writeState(st);
    return st;
  }

  if (flag) {
    // start job with existing schedule
    try {
      startCron(st.schedule, st.scheduleType === 'once', st.onceDateTime);
      st.isActive = true;
      writeState(st);
      console.log('Scheduler ▶ started |', st.schedule);
    } catch (err) {
      console.error('Failed to start scheduler:', err);
      throw err;
    }
  } else {
    // stop
    stopTask();
    st.isActive = false;
    writeState(st);
    console.log('Scheduler ⏸ stopped');
  }
  return st;
}

// updateSchedule(cronExpression) -> sets cron, scheduleType="daily" (unless cron has day/month fields != '*')
// returns state
function updateSchedule(cronExpression) {
  if (!cronExpression || !cron.validate(cronExpression)) {
    throw new Error('Invalid cron expression');
  }

  const st = readState();
  st.schedule = cronExpression;

  // Basic heuristic: if cron day and month are '*' then treat as daily; else if day/month numeric, treat as once
  const parts = cronExpression.trim().split(/\s+/);
  const day = parts[2] || '*';
  const month = parts[3] || '*';

  if (day !== '*' || month !== '*') {
    st.scheduleType = 'once';
  } else {
    st.scheduleType = 'daily';
  }

  st.onceDateTime = null; // clear once date (we only set once via scheduleOnce)
  st.isActive = true;
  writeState(st);

  // Start task now
  startCron(cronExpression, st.scheduleType === 'once', st.onceDateTime);
  console.log(
    `⏰ Daily schedule set (IST): ${cronExpression} | Time now: ${DateTime.now()
      .setZone("Asia/Kolkata")
      .toFormat("dd/MM/yyyy hh:mm a")}`
  );

  return st;
}

// scheduleOnce(dateTimeISO)
function scheduleOnce(dateTimeISO) {
  const dt = DateTime.fromISO(String(dateTimeISO), { zone: 'Asia/Kolkata' });
  if (!dt.isValid) throw new Error('Invalid date time format');
  if (dt <= DateTime.now().setZone('Asia/Kolkata')) throw new Error('Datetime must be in the future');

  // build cron expression minute hour day month *
  const cronExpr = `${dt.minute} ${dt.hour} ${dt.day} ${dt.month} *`;

  const st = readState();
  st.schedule = cronExpr;
  st.scheduleType = 'once';
  st.onceDateTime = dt.toISO();
  st.isActive = true;
  writeState(st);

  startCron(cronExpr, true, st.onceDateTime);
  console.log(
    `📅 One-time schedule set for (IST): ${dt.setZone("Asia/Kolkata").toFormat("dd/MM/yyyy hh:mm a")}  | cron: ${cronExpr}`
  );
  return st;

}

// auto-start if state says active on module load
(function initAutoStart() {
  try {
    const st = readState();
    if (st.isActive && st.schedule) {
      // Try to start the cron from persisted cron expression
      try {
        startCron(st.schedule, st.scheduleType === 'once', st.onceDateTime);
        console.log('Auto-start scheduler:', st.schedule);
      } catch (err) {
        console.error('Failed to auto-start scheduler:', err);
      }
    } else {
      console.log('Scheduler loaded: no active schedule in state.');
    }
  } catch (err) {
    console.error('Scheduler init error:', err);
  }
})();

module.exports = {
  getInfo,
  setActive,
  updateSchedule,
  scheduleOnce
};
