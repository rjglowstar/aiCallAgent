require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { VoiceResponse } = require("twilio").twiml;
const { getAssistantReply } = require("./assistant");

const fs = require("fs");
const path = require("path");
const { makeCall } = require("./makeCall");

const app = express();

// Parse Twilio webhook (speech)
app.use(bodyParser.urlencoded({ extended: false }));

// Parse JSON for dashboard API
app.use(express.json());

// Serve dashboard static files
app.use(express.static("public"));

// Serve main dashboard page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/dashboard.html"));
});

// HEALTH CHECK (Render requirement)
app.get("/healthz", (req, res) => res.send("OK"));


// ====================================================================
//  🔥 ORIGINAL TWILIO AI VOICE WEBHOOK (UNTOUCHED WORKING CODE)
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
// START SERVER
// ----------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✔ Server running on port ${PORT}`);
});
