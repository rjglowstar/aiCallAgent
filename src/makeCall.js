require("dotenv").config();
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function makeCall(to) {
  try {
    console.log("Calling:", to);

    // 🔥 New: automatic base URL selection
    const baseURL = process.env.NGROK_URL || process.env.RENDER_EXTERNAL_URL;

    if (!baseURL) {
      console.error("❌ Error: No base URL found. Set NGROK_URL (local) or RENDER_EXTERNAL_URL (Render).");
      return;
    }

    const call = await client.calls.create({
      url: `${baseURL}/twilio/voice`,
      to,
      from: process.env.TWILIO_NUMBER
    });

    console.log("✔ Call Started. SID:", call.sid);
  } catch (error) {
    console.error("❌ Twilio Call Error:", error);
  }
}

// Export only — do NOT auto-run
module.exports = { makeCall };

// Only run when called manually
if (require.main === module) {
  makeCall(process.argv[2]);
}
