require('dotenv').config();
const twilio = require('twilio');

// Twilio client
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function startCall(to) {
  try {
    console.log('Calling:', to);

    const call = await client.calls.create({
      url: `${process.env.BASE_URL}/twilio/voice`,   // updated for Render
      to,
      from: process.env.TWILIO_NUMBER
    });

    console.log('✔ Call Started. SID:', call.sid);
  } catch (error) {
    console.error('❌ Twilio Call Error:', error);
  }
}

// Usage example: node src/makeCall.js +9178xxxxxx
startCall(process.argv[2]);

module.exports = { startCall };
