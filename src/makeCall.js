require("dotenv").config();
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function makeCall(to) {
  try {
    console.log("Calling:", to);

    const call = await client.calls.create({
      url: `${process.env.NGROK_URL}/twilio/voice`,
      to,
      from: process.env.TWILIO_NUMBER
    });

    console.log("✔ Call Started. SID:", call.sid);
  } catch (error) {
    console.error("❌ Twilio Call Error:", error);
  }
}

// export only — do NOT auto-run
module.exports = { makeCall };

// Only run when called manually
if (require.main === module) {
  makeCall(process.argv[2]);
}
