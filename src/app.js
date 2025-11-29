require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { VoiceResponse } = require("twilio").twiml;
const { getAssistantReply } = require("./assistant");

const fs = require("fs");
const path = require("path");
const { makeCall } = require("./makeCall");

// ⭐ Enable auto-calling scheduler
const scheduler = require("./scheduler");

const app = express();

// Parse Twilio webhook (speech)
app.use(bodyParser.urlencoded({ extended: false }));

// Parse JSON for dashboard API
app.use(express.json());

// Serve dashboard static files
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "dashboard.html"));
});

// HEALTH CHECK (Render requirement)
app.get("/healthz", (req, res) => res.send("OK"));


// ====================================================================
//  🔥 ORIGINAL TWILIO AI VOICE WEBHOOK
// ====================================================================
app.post("/twilio/voice", async (req, res) => {
  console.log("\n--- Twilio Webhook HIT ---");
  console.log("Body:", req.body);

  try {
    const twiml = new VoiceResponse();
    const speech = (req.body.SpeechResult || "").trim();

    // FIRST CALL — no speech yet
    if (!speech) {
      console.log("No speech detected yet. Sending greeting...");

      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        speechTimeout: "auto"
      });

      gather.say("નમસ્તે. હું પેમેન્ટ અથવા સર્વિસ અપડેટ માટે ફોન કરી રહ્યો છું. તમારું નામ શું છે?");

      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // AFTER USER SPEAKS
    console.log("User said:", speech);

    const aiReply = await getAssistantReply(speech);
    console.log("AI Reply:", aiReply);

    const gather = twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      speechTimeout: "auto"
    });

    gather.say(aiReply);

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.error("Error in /twilio/voice:", error);

    const twiml = new VoiceResponse();
    twiml.say("માફ કરશો, ટેકનિકલ સમસ્યા છે. પછીથી ફરી પ્રયાસ કરીશું.");

    res.type("text/xml");
    return res.send(twiml.toString());
  }
});
// ====================================================================
//  END ORIGINAL WORKING AI CALL FLOW
// ====================================================================


// FILE PATH FOR JSON DB
const customersFile = path.join(__dirname, "../data/customers.json");


// ----------------------------------------
// GET ALL CUSTOMERS
// ----------------------------------------
app.get("/api/customers", (req, res) => {
  const data = fs.readFileSync(customersFile, "utf8");
  res.json(JSON.parse(data));
});

// ----------------------------------------
// SAVE ALL CUSTOMERS (ADD/EDIT/DELETE)
// ----------------------------------------
app.post("/api/customers", (req, res) => {
  fs.writeFileSync(customersFile, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// ----------------------------------------
// MANUAL CALL NOW
// ----------------------------------------
app.post("/api/call", async (req, res) => {
  const { phone } = req.body;

  try {
    await makeCall(phone);
    res.json({ success: true, message: "Call started" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error starting call" });
  }
});

// ----------------------------------------
// SCHEDULER INFO & CONTROL
// ----------------------------------------
app.get("/api/scheduler/info", (req, res) => {
  const state = scheduler.getState();
  
  // Parse schedule to extract time
  const parts = state.schedule.split(' ');
  const minute = parts[0];
  const hour = parts[1];
  const day = parts[2];
  const month = parts[3];
  
  // Determine schedule type display
  let scheduleDisplay = 'Daily';
  if (state.scheduleType === 'once' && day !== '*' && month !== '*') {
    scheduleDisplay = 'Once';
  }
  
  // Calculate next run time
  const now = new Date();
  let nextRun = new Date();
  nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
  
  // If day is specific (one-time), use that day
  if (day !== '*') nextRun.setDate(parseInt(day));
  if (month !== '*') nextRun.setMonth(parseInt(month) - 1);
  
  // If past scheduled time today, move to tomorrow (for daily)
  if (now > nextRun && state.scheduleType === 'daily') {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  res.json({
    isActive: state.isActive,
    scheduleType: state.scheduleType || 'daily',
    schedule: `${scheduleDisplay} at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    nextRun: nextRun.toLocaleString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    nextRunISO: nextRun.toISOString(),
    cronExpression: state.schedule
  });
});

// Start/Pause scheduler
app.post("/api/scheduler/toggle", (req, res) => {
  try {
    const state = scheduler.getState();
    const newState = scheduler.setActive(!state.isActive);
    res.json({ success: true, isActive: newState.isActive, scheduleType: newState.scheduleType });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update schedule time (expects { hour, minute })
app.post("/api/scheduler/update-time", (req, res) => {
  const { hour, minute } = req.body;
  
  if (hour === undefined || minute === undefined) {
    return res.status(400).json({ error: 'hour and minute required' });
  }
  
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return res.status(400).json({ error: 'Invalid hour or minute' });
  }
  
  // Build new cron expression: minute hour * * *
  const cronExpression = `${minute} ${hour} * * *`;
  
  try {
    const newState = scheduler.updateSchedule(cronExpression);
    res.json({ success: true, ...newState });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update schedule with cron expression (expects { cronExpression })
app.post("/api/scheduler/update-schedule", (req, res) => {
  const { cronExpression } = req.body;
  
  if (!cronExpression) {
    return res.status(400).json({ error: 'cronExpression required' });
  }
  
  try {
    const newState = scheduler.updateSchedule(cronExpression);
    res.json({ success: true, ...newState });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Schedule one-time call (expects { dateTime: ISO string })
app.post("/api/scheduler/schedule-once", (req, res) => {
  const { dateTime } = req.body;
  
  if (!dateTime) {
    return res.status(400).json({ error: 'dateTime (ISO format) required' });
  }
  
  try {
    const dt = new Date(dateTime);
    if (isNaN(dt.getTime())) {
      return res.status(400).json({ error: 'Invalid datetime format' });
    }
    
    const now = new Date();
    if (dt <= now) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }
    
    const newState = scheduler.scheduleOnce(dateTime);
    res.json({ success: true, ...newState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ----------------------------------------
// START SERVER
// ----------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✔ Server running on port ${PORT}`);
});
